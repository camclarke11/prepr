import { DurableObject } from 'cloudflare:workers';
import { buildPushHTTPRequest } from '@pushforge/builder';
import type { Env } from './env';
import type {
  ClientMsg,
  Op,
  ServerMsg,
  SyncItem,
  SyncMember,
  SyncPlan,
  SyncRecipe,
} from './protocol';
import { initialOf, listKey, MEMBER_COLORS, randomToken, round2 } from './lib';

/** The full shared state of a household. */
interface Snapshot {
  items: SyncItem[];
  members: SyncMember[];
  recipes: SyncRecipe[];
  plan: SyncPlan;
  pantry: string[];
}

/** Debounce window for batching a burst of adds into one notification. */
const BATCH_WINDOW_MS = 10_000;

// Type aliases (not interfaces) so they satisfy the SqlStorage row constraint,
// which requires an implicit string index signature.
type ItemRow = {
  key: string;
  name: string;
  emoji: string;
  category: string;
  qty: number;
  unit: string;
  checked: number;
  by: string;
  spec: string | null;
  updated_at: number;
};

type MemberRow = {
  id: string;
  name: string;
  color: string;
  initial: string;
  joined_at: number;
};

interface SocketMeta {
  memberId: string;
}

/** Result of applying an op: messages to broadcast + adds to notify about. */
interface OpResult {
  messages: ServerMsg[];
  /** Items newly added/merged onto the list (for push notifications). */
  added: SyncItem[];
}

/**
 * One Durable Object per household: the source of truth for a shared shopping
 * list, with real-time fan-out over hibernatable WebSockets and (Phase 3) Web
 * Push to the members who aren't the actor.
 */
export class HouseholdDO extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS items (
          key TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL,
          category TEXT NOT NULL,
          qty REAL NOT NULL,
          unit TEXT NOT NULL,
          checked INTEGER NOT NULL DEFAULT 0,
          by TEXT NOT NULL,
          spec TEXT,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          initial TEXT NOT NULL,
          joined_at INTEGER NOT NULL,
          notify_adds INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending_adds (
          id TEXT PRIMARY KEY,
          actor_id TEXT NOT NULL,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plan (
          day TEXT PRIMARY KEY,
          ids TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pantry (
          name TEXT PRIMARY KEY
        );
      `);
      // For DOs created before notify_adds existed (ALTER is idempotent here via
      // the catch — SQLite has no ADD COLUMN IF NOT EXISTS).
      try {
        this.sql.exec(
          'ALTER TABLE members ADD COLUMN notify_adds INTEGER NOT NULL DEFAULT 1',
        );
      } catch {
        /* column already exists */
      }
    });
  }

  // --- RPC (called by the Worker for HTTP requests) -----------------------

  /** Register a new member (first time a device pairs) and return the state. */
  join(name: string): { member: SyncMember } & Snapshot {
    const clean = name.trim().slice(0, 40) || 'Guest';
    const count = this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM members').one()
      .n;
    const member: SyncMember = {
      id: randomToken(12),
      name: clean,
      color: MEMBER_COLORS[count % MEMBER_COLORS.length],
      initial: initialOf(clean),
      joinedAt: Date.now(),
    };
    this.sql.exec(
      'INSERT INTO members (id, name, color, initial, joined_at) VALUES (?, ?, ?, ?, ?)',
      member.id,
      member.name,
      member.color,
      member.initial,
      member.joinedAt,
    );
    this.broadcast({ t: 'members', members: this.allMembers() });
    return { member, ...this.snapshot() };
  }

  getState(): Snapshot {
    return this.snapshot();
  }

  private snapshot(): Snapshot {
    return {
      items: this.allItems(),
      members: this.allMembers(),
      recipes: this.allRecipes(),
      plan: this.planObj(),
      pantry: this.allPantry(),
    };
  }

  /** Apply an op received over HTTP (WebSocket is the primary path). */
  async applyOpHttp(op: Op, memberId: string): Promise<{ ok: boolean }> {
    if (!this.memberExists(memberId)) return { ok: false };
    const result = this.applyOp(op, memberId);
    for (const msg of result.messages) this.broadcast(msg);
    await this.queueNotifications(memberId, result.added);
    return { ok: true };
  }

  /** Store a Web Push subscription for a member (used in Phase 3). */
  subscribe(
    memberId: string,
    sub: { endpoint: string; p256dh: string; auth: string },
  ): { ok: boolean } {
    if (!this.memberExists(memberId)) return { ok: false };
    this.sql.exec(
      `INSERT INTO subscriptions (id, member_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET member_id = excluded.member_id,
         p256dh = excluded.p256dh, auth = excluded.auth`,
      randomToken(12),
      memberId,
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      Date.now(),
    );
    return { ok: true };
  }

  /**
   * Ping the rest of the household with a short message ("heading to the shop —
   * anything else?"). A deliberate poke, so it ignores the notify_adds mute.
   * Returns how many devices it reached.
   */
  async nudge(memberId: string, message: string): Promise<{ ok: boolean; sent: number }> {
    if (!this.memberExists(memberId)) return { ok: false, sent: 0 };
    const body =
      message.trim().slice(0, 140) || 'Heading to the shop — anything else?';
    const sent = await this.sendPush(
      memberId,
      { title: this.memberName(memberId), body, tag: 'prepr-nudge' },
      { onlyNotifyAdds: false },
    );
    return { ok: true, sent };
  }

  // --- WebSocket (hibernatable) -------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const memberId = url.searchParams.get('member') ?? '';
    if (!this.memberExists(memberId)) {
      return new Response('unknown member', { status: 403 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ memberId } satisfies SocketMeta);
    // Send the current state to the freshly-connected client.
    server.send(JSON.stringify({ t: 'state', ...this.snapshot() } satisfies ServerMsg));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(message) as ClientMsg;
    } catch {
      return;
    }
    if (msg.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong' } satisfies ServerMsg));
      return;
    }
    if (msg.t !== 'op') return;
    const meta = ws.deserializeAttachment() as SocketMeta | null;
    const memberId = meta?.memberId ?? '';
    if (!this.memberExists(memberId)) return;
    const result = this.applyOp(msg.op, memberId);
    for (const m of result.messages) this.broadcast(m);
    await this.queueNotifications(memberId, result.added);
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    ws.close(code, reason);
  }

  // --- Op application (server is authoritative) ---------------------------

  private applyOp(op: Op, actorId: string): OpResult {
    const actor = this.memberName(actorId);
    const now = Date.now();

    switch (op.kind) {
      case 'upsert': {
        const unit = (op.unit ?? '').trim();
        const qty = op.qty ?? 1;
        const key = listKey(op.name, unit);
        const existing = this.itemRow(key);
        if (existing) {
          const newQty = round2(existing.qty + qty);
          this.sql.exec(
            'UPDATE items SET qty = ?, checked = 0, updated_at = ? WHERE key = ?',
            newQty,
            now,
            key,
          );
        } else {
          this.sql.exec(
            `INSERT INTO items (key, name, emoji, category, qty, unit, checked, by, spec, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
            key,
            op.name,
            op.emoji,
            op.category,
            round2(qty),
            unit,
            actor,
            op.spec ?? null,
            now,
          );
        }
        const item = this.item(key)!;
        return { messages: [{ t: 'item', item }], added: [item] };
      }

      case 'setQty': {
        if (op.qty <= 0) {
          this.sql.exec('DELETE FROM items WHERE key = ?', op.key);
          return { messages: [{ t: 'remove', key: op.key }], added: [] };
        }
        this.sql.exec(
          'UPDATE items SET qty = ?, updated_at = ? WHERE key = ?',
          round2(op.qty),
          now,
          op.key,
        );
        const item = this.item(op.key);
        return { messages: item ? [{ t: 'item', item }] : [], added: [] };
      }

      case 'checked': {
        this.sql.exec(
          'UPDATE items SET checked = ?, updated_at = ? WHERE key = ?',
          op.checked ? 1 : 0,
          now,
          op.key,
        );
        const item = this.item(op.key);
        return { messages: item ? [{ t: 'item', item }] : [], added: [] };
      }

      case 'field': {
        const existing = this.itemRow(op.key);
        if (!existing) return { messages: [], added: [] };
        if (op.field === 'spec') {
          this.sql.exec(
            'UPDATE items SET spec = ?, updated_at = ? WHERE key = ?',
            op.value || null,
            now,
            op.key,
          );
          const item = this.item(op.key)!;
          return { messages: [{ t: 'item', item }], added: [] };
        }
        // Unit change: recompute the key (it encodes the unit) and merge if it
        // collides with an existing row — mirrors the frontend setItemField.
        const newKey = listKey(existing.name, op.value);
        if (newKey === op.key) {
          this.sql.exec(
            'UPDATE items SET unit = ?, updated_at = ? WHERE key = ?',
            op.value,
            now,
            op.key,
          );
          return { messages: [{ t: 'item', item: this.item(op.key)! }], added: [] };
        }
        const collide = this.itemRow(newKey);
        if (collide) {
          this.sql.exec(
            'UPDATE items SET qty = ?, checked = 0, updated_at = ? WHERE key = ?',
            round2(collide.qty + existing.qty),
            now,
            newKey,
          );
          this.sql.exec('DELETE FROM items WHERE key = ?', op.key);
          return {
            messages: [{ t: 'remove', key: op.key }, { t: 'item', item: this.item(newKey)! }],
            added: [],
          };
        }
        this.sql.exec(
          'UPDATE items SET key = ?, unit = ?, updated_at = ? WHERE key = ?',
          newKey,
          op.value,
          now,
          op.key,
        );
        return {
          messages: [{ t: 'remove', key: op.key }, { t: 'item', item: this.item(newKey)! }],
          added: [],
        };
      }

      case 'remove': {
        this.sql.exec('DELETE FROM items WHERE key = ?', op.key);
        return { messages: [{ t: 'remove', key: op.key }], added: [] };
      }

      case 'clear': {
        this.sql.exec('DELETE FROM items');
        return { messages: [{ t: 'clear' }], added: [] };
      }

      case 'recipeUpsert': {
        const r = op.recipe;
        this.sql.exec(
          `INSERT INTO recipes (id, data, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
          r.id,
          JSON.stringify(r),
          now,
        );
        return { messages: [{ t: 'recipe', recipe: r }], added: [] };
      }

      case 'recipeDelete': {
        this.sql.exec('DELETE FROM recipes WHERE id = ?', op.id);
        const messages: ServerMsg[] = [{ t: 'recipeRemove', id: op.id }];
        // Cascade: strip the deleted recipe from any planned days.
        const days = this.sql
          .exec<{ day: string; ids: string }>('SELECT day, ids FROM plan')
          .toArray();
        for (const d of days) {
          const ids = safeIds(d.ids);
          // Plan entries may be slot-tagged ("dinner:r123"); match on the id part.
          const recipeId = (ref: string) =>
            ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
          if (ids.some((x) => recipeId(x) === op.id)) {
            const nextIds = ids.filter((x) => recipeId(x) !== op.id);
            this.sql.exec(
              'UPDATE plan SET ids = ? WHERE day = ?',
              JSON.stringify(nextIds),
              d.day,
            );
            messages.push({ t: 'plan', day: d.day, ids: nextIds });
          }
        }
        return { messages, added: [] };
      }

      case 'planSet': {
        const ids = op.ids.filter((x): x is string => typeof x === 'string');
        this.sql.exec(
          `INSERT INTO plan (day, ids) VALUES (?, ?)
           ON CONFLICT(day) DO UPDATE SET ids = excluded.ids`,
          op.day,
          JSON.stringify(ids),
        );
        return { messages: [{ t: 'plan', day: op.day, ids }], added: [] };
      }

      case 'pantrySet': {
        if (op.on) this.sql.exec('INSERT OR IGNORE INTO pantry (name) VALUES (?)', op.name);
        else this.sql.exec('DELETE FROM pantry WHERE name = ?', op.name);
        return { messages: [{ t: 'pantry', name: op.name, on: op.on }], added: [] };
      }
    }
  }

  // --- Notifications (Phase 3 stub) ---------------------------------------

  /**
   * Record newly-added items and (re)arm a short debounce alarm, so a burst of
   * adds collapses into a single notification instead of one push per item.
   */
  private async queueNotifications(actorId: string, added: SyncItem[]): Promise<void> {
    if (!added.length) return;
    const now = Date.now();
    for (const item of added) {
      this.sql.exec(
        'INSERT INTO pending_adds (id, actor_id, name, emoji, created_at) VALUES (?, ?, ?, ?, ?)',
        randomToken(10),
        actorId,
        item.name,
        item.emoji,
        now,
      );
    }
    const runAt = now + BATCH_WINDOW_MS;
    const cur = await this.ctx.storage.getAlarm();
    if (cur == null || runAt < cur) await this.ctx.storage.setAlarm(runAt);
  }

  /** Fires after the debounce window: send batched notifications. */
  async alarm(): Promise<void> {
    // Drain atomically BEFORE sending — alarms are at-least-once, so sending
    // first then deleting would double-notify on a retry.
    const rows = this.sql
      .exec<{ actor_id: string; name: string; emoji: string }>(
        'SELECT actor_id, name, emoji FROM pending_adds ORDER BY created_at',
      )
      .toArray();
    if (!rows.length) return;
    this.sql.exec('DELETE FROM pending_adds');

    // Group by actor (different members may have added in the same window).
    const byActor = new Map<string, { name: string; emoji: string }[]>();
    for (const r of rows) {
      const arr = byActor.get(r.actor_id) ?? [];
      arr.push({ name: r.name, emoji: r.emoji });
      byActor.set(r.actor_id, arr);
    }

    for (const [actorId, items] of byActor) {
      const actor = this.memberName(actorId);
      const body =
        items.length === 1
          ? `${actor} added ${items[0].emoji} ${items[0].name}`
          : `${actor} added ${items.length} items: ${items.map((i) => i.name).join(', ')}`;
      await this.pushToOthers(actorId, body);
    }
  }

  /** "Item added" auto-notification — gated by each member's notify_adds. */
  private async pushToOthers(actorId: string, body: string): Promise<void> {
    await this.sendPush(
      actorId,
      { title: 'prepr', body, tag: 'prepr-grocery' },
      { onlyNotifyAdds: true },
    );
  }

  /**
   * Web Push a payload to every member except the actor (best-effort). Returns
   * how many live subscriptions it reached. `onlyNotifyAdds` restricts to
   * members who haven't muted item-add pings; a deliberate nudge ignores it.
   */
  private async sendPush(
    actorId: string,
    payload: { title: string; body: string; tag: string },
    opts: { onlyNotifyAdds: boolean },
  ): Promise<number> {
    const privateJWK = this.env.VAPID_PRIVATE_KEY;
    const adminContact = this.env.VAPID_SUBJECT;
    if (!privateJWK || !adminContact) return 0; // push not configured yet

    const subs = this.sql
      .exec<{ endpoint: string; p256dh: string; auth: string }>(
        `SELECT s.endpoint, s.p256dh, s.auth FROM subscriptions s
         JOIN members m ON m.id = s.member_id
         WHERE s.member_id != ?${
           opts.onlyNotifyAdds ? ' AND COALESCE(m.notify_adds, 1) = 1' : ''
         }`,
        actorId,
      )
      .toArray();
    if (!subs.length) return 0;

    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          const req = await buildPushHTTPRequest({
            privateJWK,
            subscription: {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            message: {
              payload: {
                title: payload.title,
                body: payload.body,
                tag: payload.tag,
                url: '/',
              },
              adminContact,
              options: { ttl: 14400, urgency: 'high', topic: 'prepr' },
            },
          });
          const res = await fetch(req.endpoint, {
            method: 'POST',
            headers: req.headers,
            body: req.body,
          });
          // 404/410 = the subscription is gone for good; prune it.
          if (res.status === 404 || res.status === 410) dead.push(s.endpoint);
        } catch {
          /* transient failure — a missed ping is low-stakes; skip */
        }
      }),
    );
    for (const ep of dead) {
      this.sql.exec('DELETE FROM subscriptions WHERE endpoint = ?', ep);
    }
    return subs.length - dead.length;
  }

  // --- Helpers ------------------------------------------------------------

  private broadcast(msg: ServerMsg): void {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        /* socket going away — ignore */
      }
    }
  }

  private memberExists(id: string): boolean {
    if (!id) return false;
    return (
      this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM members WHERE id = ?', id).one()
        .n > 0
    );
  }

  private memberName(id: string): string {
    const rows = this.sql
      .exec<{ name: string }>('SELECT name FROM members WHERE id = ?', id)
      .toArray();
    return rows[0]?.name ?? 'Someone';
  }

  private itemRow(key: string): ItemRow | undefined {
    return this.sql.exec<ItemRow>('SELECT * FROM items WHERE key = ?', key).toArray()[0];
  }

  private item(key: string): SyncItem | undefined {
    const row = this.itemRow(key);
    return row ? rowToItem(row) : undefined;
  }

  private allItems(): SyncItem[] {
    return this.sql
      .exec<ItemRow>('SELECT * FROM items ORDER BY updated_at')
      .toArray()
      .map(rowToItem);
  }

  private allMembers(): SyncMember[] {
    return this.sql
      .exec<MemberRow>('SELECT * FROM members ORDER BY joined_at')
      .toArray()
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        initial: r.initial,
        joinedAt: r.joined_at,
      }));
  }

  private allRecipes(): SyncRecipe[] {
    return this.sql
      .exec<{ data: string }>('SELECT data FROM recipes ORDER BY updated_at')
      .toArray()
      .map((r) => safeRecipe(r.data))
      .filter((r): r is SyncRecipe => r !== null);
  }

  private planObj(): SyncPlan {
    const out: SyncPlan = {};
    for (const r of this.sql
      .exec<{ day: string; ids: string }>('SELECT day, ids FROM plan')
      .toArray()) {
      out[r.day] = safeIds(r.ids);
    }
    return out;
  }

  private allPantry(): string[] {
    return this.sql
      .exec<{ name: string }>('SELECT name FROM pantry')
      .toArray()
      .map((r) => r.name);
  }
}

function safeIds(json: string): string[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function safeRecipe(json: string): SyncRecipe | null {
  try {
    const v: unknown = JSON.parse(json);
    return v && typeof v === 'object' ? (v as SyncRecipe) : null;
  } catch {
    return null;
  }
}

function rowToItem(r: ItemRow): SyncItem {
  return {
    key: r.key,
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    qty: r.qty,
    unit: r.unit,
    checked: r.checked === 1,
    by: r.by,
    spec: r.spec ?? undefined,
    updatedAt: r.updated_at,
  };
}

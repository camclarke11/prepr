// Client for the prepr sync backend (Cloudflare Worker + Durable Object).
// Wire protocol mirrors server/src/protocol.ts.

export interface SyncItem {
  key: string;
  name: string;
  emoji: string;
  category: string;
  qty: number;
  unit: string;
  checked: boolean;
  by: string;
  spec?: string;
  updatedAt: number;
}

export interface SyncMember {
  id: string;
  name: string;
  color: string;
  initial: string;
  joinedAt: number;
}

export interface SyncIngredient {
  name: string;
  emoji: string;
  qty: number;
  unit: string;
  category: string;
}

export interface SyncRecipe {
  id: string;
  name: string;
  emoji: string;
  servings: number;
  time: string;
  ingredients: SyncIngredient[];
  steps: string[];
  custom?: boolean;
  favorite?: boolean;
}

export type SyncPlan = Record<string, string[]>;

export type Op =
  | {
      kind: 'upsert';
      name: string;
      emoji: string;
      category: string;
      qty?: number;
      unit?: string;
      spec?: string;
    }
  | { kind: 'setQty'; key: string; qty: number }
  | { kind: 'checked'; key: string; checked: boolean }
  | { kind: 'field'; key: string; field: 'unit' | 'spec'; value: string }
  | { kind: 'remove'; key: string }
  | { kind: 'clear' }
  | { kind: 'recipeUpsert'; recipe: SyncRecipe }
  | { kind: 'recipeDelete'; id: string }
  | { kind: 'planSet'; day: string; ids: string[] }
  | { kind: 'pantrySet'; name: string; on: boolean };

export type ServerMsg =
  | {
      t: 'state';
      items: SyncItem[];
      members: SyncMember[];
      recipes: SyncRecipe[];
      plan: SyncPlan;
      pantry: string[];
    }
  | { t: 'item'; item: SyncItem }
  | { t: 'remove'; key: string }
  | { t: 'clear' }
  | { t: 'members'; members: SyncMember[] }
  | { t: 'recipe'; recipe: SyncRecipe }
  | { t: 'recipeRemove'; id: string }
  | { t: 'plan'; day: string; ids: string[] }
  | { t: 'pantry'; name: string; on: boolean }
  | { t: 'pong' };

export interface HouseholdRef {
  id: string;
  memberId: string;
  memberName: string;
}

interface JoinResult {
  member: SyncMember;
  items: SyncItem[];
  members: SyncMember[];
  recipes: SyncRecipe[];
  plan: SyncPlan;
  pantry: string[];
}
interface CreateResult extends JoinResult {
  householdId: string;
}

const API_BASE = (
  (import.meta.env as Record<string, string | undefined>).VITE_API_URL ||
  'https://prepr-api.camlc.dev'
).replace(/\/$/, '');

function wsBase(): string {
  return API_BASE.replace(/^http/, 'ws');
}

/** The shareable invite link that lets a partner join this household. */
export function buildJoinUrl(householdId: string): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : '';
  return `${base}#join=${householdId}`;
}

/** Pull a household id out of a pasted invite link or raw code. */
export function parseJoinInput(input: string): string {
  const s = input.trim();
  const hashIdx = s.indexOf('#join=');
  if (hashIdx >= 0) return s.slice(hashIdx + '#join='.length).trim();
  return s;
}

export async function createHousehold(name: string): Promise<CreateResult> {
  const res = await fetch(`${API_BASE}/api/household`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('create failed');
  return (await res.json()) as CreateResult;
}

export async function joinHousehold(id: string, name: string): Promise<JoinResult> {
  const res = await fetch(`${API_BASE}/api/household/${id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('join failed');
  return (await res.json()) as JoinResult;
}

/** The server's VAPID public key (base64url), or null if push isn't configured. */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vapid-public-key`);
    if (!res.ok) return null;
    const { key } = (await res.json()) as { key: string | null };
    return key ?? null;
  } catch {
    return null;
  }
}

export interface FoodProduct {
  name: string;
  brand: string;
  barcode: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sugars: number | null;
  salt: number | null;
  serving: string;
  image: string;
}

/** Look up nutrition (macros per 100g) for a term via Open Food Facts. */
export async function searchFood(query: string): Promise<FoodProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/api/food?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const d = (await res.json()) as { products?: FoodProduct[] };
    return d.products ?? [];
  } catch {
    return [];
  }
}

export interface SmartItem {
  name: string;
  qty?: number;
  unit?: string;
  product: FoodProduct | null;
  query: string;
  candidates: FoodProduct[];
  /** Estimated UK own-brand price (GBP) for one pack covering the need, or null. */
  price: number | null;
  /** The pack size that estimate assumes, e.g. "400g", "1L". */
  pack: string;
  /** A real product-page URL at the chosen store, or null (name search instead). */
  productUrl: string | null;
  /** The real product title from that page, if resolved. */
  productTitle: string;
}

/** Build a tailored, store-ready shopping list (AI + Open Food Facts). */
export async function buildSmartList(
  items: { name: string; qty?: number; unit?: string }[],
  store?: string | null,
): Promise<SmartItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/smart-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, store: store || undefined }),
    });
    if (!res.ok) return [];
    const d = (await res.json()) as { items?: SmartItem[] };
    return d.items ?? [];
  } catch {
    return [];
  }
}

export interface ImportedRecipe {
  emoji: string;
  name: string;
  servings: string;
  time: string;
  ingredients: { name: string; qty: string; unit: string }[];
  stepsText: string;
}

/** Ask the server to fetch a recipe URL and normalise it into a draft via AI. */
export async function importRecipeFromUrl(
  url: string,
): Promise<{ draft?: ImportedRecipe; error?: string }> {
  return postImport({ url });
}

/** Normalise pasted page content (text or HTML) into a draft via AI. */
export async function importRecipeFromText(
  text: string,
): Promise<{ draft?: ImportedRecipe; error?: string }> {
  return postImport({ text });
}

async function postImport(
  body: { url: string } | { text: string },
): Promise<{ draft?: ImportedRecipe; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/recipe-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as { draft?: ImportedRecipe; error?: string };
  } catch {
    return { error: 'Could not reach the importer.' };
  }
}

/** Preview a household by its invite id — validates the link and names the inviter. */
export async function fetchHouseholdPreview(
  id: string,
): Promise<{ items: SyncItem[]; members: SyncMember[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/household/${id}/state`);
    if (!res.ok) return null;
    return (await res.json()) as { items: SyncItem[]; members: SyncMember[] };
  } catch {
    return null;
  }
}

/** Register a Web Push subscription with the household. */
export async function sendSubscription(
  id: string,
  memberId: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  await fetch(`${API_BASE}/api/household/${id}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, subscription }),
  });
}

/**
 * A resilient WebSocket connection to one household: auto-reconnects with
 * backoff and queues ops sent while offline, flushing them once reconnected.
 */
export class SyncClient {
  private ws: WebSocket | null = null;
  private queue: Op[] = [];
  private closed = false;
  private retry = 0;
  private timer: number | undefined;

  constructor(
    private id: string,
    private memberId: string,
    private onMsg: (msg: ServerMsg) => void,
  ) {}

  connect(): void {
    if (this.closed || typeof WebSocket === 'undefined') return;
    const url = `${wsBase()}/api/household/${this.id}/ws?member=${encodeURIComponent(
      this.memberId,
    )}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      const pending = this.queue.splice(0);
      for (const op of pending) this.rawSend(op);
    };
    ws.onmessage = (e) => {
      try {
        this.onMsg(JSON.parse(e.data as string) as ServerMsg);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = Math.min(1000 * 2 ** this.retry, 15000);
    this.retry++;
    this.timer = window.setTimeout(() => this.connect(), delay);
  }

  send(op: Op): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.rawSend(op);
    else this.queue.push(op);
  }

  private rawSend(op: Op): void {
    this.ws?.send(JSON.stringify({ t: 'op', op }));
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}

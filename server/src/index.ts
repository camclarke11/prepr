import type { Env } from './env';
import type { Op } from './protocol';
import { randomToken } from './lib';
import { importRecipe, importRecipeText } from './recipeImport';
import { searchFood } from './food';
import { buildSmartList } from './smartList';

export { HouseholdDO } from './household';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api','household',':id','ws']

    try {
      // POST /api/recipe/import { url } -> AI-normalised recipe draft
      if (
        request.method === 'POST' &&
        parts.length === 2 &&
        parts[0] === 'api' &&
        parts[1] === 'recipe-import'
      ) {
        const { url, text } = await readJson<{ url?: string; text?: string }>(request);
        if (text && text.trim()) return json(await importRecipeText(text, env), cors);
        if (url) return json(await importRecipe(url, env), cors);
        return json({ error: 'No link or text provided.' }, cors, 400);
      }

      // POST /api/smart-list -> a tailored, store-ready list (AI + Open Food Facts)
      if (
        request.method === 'POST' &&
        parts.length === 2 &&
        parts[0] === 'api' &&
        parts[1] === 'smart-list'
      ) {
        const { items, store } = await readJson<{
          items: { name: string; qty?: number; unit?: string }[];
          store?: string;
        }>(request);
        return json({ items: await buildSmartList(items ?? [], env, store) }, cors);
      }

      // GET /api/food?q=... -> nutrition matches from Open Food Facts
      if (
        request.method === 'GET' &&
        parts.length === 2 &&
        parts[0] === 'api' &&
        parts[1] === 'food'
      ) {
        const q = url.searchParams.get('q') ?? '';
        return json({ products: await searchFood(q) }, cors);
      }

      // GET /api/vapid-public-key -> the public VAPID key for client subscribe
      if (
        request.method === 'GET' &&
        parts.length === 2 &&
        parts[0] === 'api' &&
        parts[1] === 'vapid-public-key'
      ) {
        return json({ key: env.VAPID_PUBLIC_KEY ?? null }, cors);
      }

      // POST /api/household  -> create a household, return its (secret) id
      if (
        request.method === 'POST' &&
        parts.length === 2 &&
        parts[0] === 'api' &&
        parts[1] === 'household'
      ) {
        const { name } = await readJson<{ name?: string }>(request);
        const householdId = randomToken();
        const stub = env.HOUSEHOLD.getByName(householdId);
        const state = await stub.join(name ?? 'Guest');
        return json({ householdId, ...state }, cors);
      }

      // Routes under /api/household/:id/...
      if (parts.length >= 3 && parts[0] === 'api' && parts[1] === 'household') {
        const householdId = parts[2];
        const action = parts[3] ?? '';
        const stub = env.HOUSEHOLD.getByName(householdId);

        // GET .../ws  -> WebSocket upgrade (handled inside the DO)
        if (action === 'ws') {
          if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected websocket', { status: 426, headers: cors });
          }
          if (origin && !isAllowed(origin, env)) {
            return new Response('forbidden origin', { status: 403, headers: cors });
          }
          return stub.fetch(request);
        }

        if (request.method === 'POST' && action === 'join') {
          const { name } = await readJson<{ name?: string }>(request);
          return json(await stub.join(name ?? 'Guest'), cors);
        }

        if (request.method === 'GET' && action === 'state') {
          return json(await stub.getState(), cors);
        }

        if (request.method === 'POST' && action === 'op') {
          const { op, memberId } = await readJson<{ op: Op; memberId: string }>(request);
          return json(await stub.applyOpHttp(op, memberId), cors);
        }

        if (request.method === 'POST' && action === 'nudge') {
          const { memberId, message } = await readJson<{
            memberId: string;
            message?: string;
          }>(request);
          return json(await stub.nudge(memberId, message ?? ''), cors);
        }

        if (request.method === 'POST' && action === 'subscribe') {
          const { memberId, subscription } = await readJson<{
            memberId: string;
            subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
          }>(request);
          return json(
            await stub.subscribe(memberId, {
              endpoint: subscription.endpoint,
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            }),
            cors,
          );
        }
      }

      return new Response('not found', { status: 404, headers: cors });
    } catch (err) {
      return json({ error: (err as Error).message }, cors, 400);
    }
  },
} satisfies ExportedHandler<Env>;

function isAllowed(origin: string, env: Env): boolean {
  return env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .includes(origin);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allow = origin && isAllowed(origin, env) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

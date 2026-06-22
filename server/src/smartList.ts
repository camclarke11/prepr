import type { Env } from './env';
import { searchFood, type FoodProduct } from './food';

/** One item of the tailored shopping list. */
export interface SmartItem {
  name: string;
  qty?: number;
  unit?: string;
  /** The best matched product (macros + brand), or null if none found. */
  product: FoodProduct | null;
  /** A clean, specific supermarket search term for this item. */
  query: string;
  /** Other matches, so the client can let the user swap. */
  candidates: FoodProduct[];
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

const SYSTEM = [
  'You help turn a rough grocery list into a precise supermarket shopping list.',
  'For each item you get candidate products (with an index "ci"). Return STRICT JSON:',
  '{"picks":[{"i":<item index>,"choice":<best ci, or -1 if none fit>,"query":<search term>}]}.',
  'choice = the candidate a typical UK shopper would actually buy (prefer plain, common,',
  'everyday versions; avoid flavoured/novelty/foreign unless the item clearly implies it).',
  'query = a short, specific supermarket search term for the item (2–4 words, e.g.',
  '"milk" -> "semi skimmed milk", "chicken" -> "chicken breast fillets"). One pick per item.',
].join(' ');

const PICKS_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          i: { type: 'number' },
          choice: { type: 'number' },
          query: { type: 'string' },
        },
        required: ['i', 'choice', 'query'],
      },
    },
  },
  required: ['picks'],
};

interface Pick {
  i: number;
  choice: number;
  query: string;
}

export async function buildSmartList(
  items: { name: string; qty?: number; unit?: string }[],
  env: Env,
): Promise<SmartItem[]> {
  const capped = items.slice(0, 30).filter((it) => it && it.name);
  if (!capped.length) return [];

  // Open Food Facts candidates for every item, in parallel.
  const candidatesList = await Promise.all(
    capped.map((it) => searchFood(it.name).catch(() => [] as FoodProduct[])),
  );

  // One AI pass: pick the best candidate + a clean search term per item.
  const aiInput = capped.map((it, i) => ({
    i,
    item: it.name,
    options: candidatesList[i]
      .slice(0, 5)
      .map((c, ci) => ({ ci, name: c.name, brand: c.brand })),
  }));

  let picks: Pick[] = [];
  try {
    const out = (await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(aiInput).slice(0, 9000) },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: 'json_schema', json_schema: PICKS_SCHEMA },
    } as Parameters<typeof env.AI.run>[1])) as { response?: unknown };
    picks = normalizePicks(out.response);
  } catch {
    picks = [];
  }
  const byIndex = new Map<number, Pick>(picks.map((p) => [p.i, p]));

  return capped.map((it, i) => {
    const cands = candidatesList[i];
    const pick = byIndex.get(i);
    const choice =
      pick && pick.choice >= 0 && pick.choice < cands.length ? pick.choice : 0;
    const product = cands[choice] ?? null;
    const query = (pick?.query || product?.name || it.name).trim().slice(0, 60);
    // Surface the chosen product first so the client shows it by default.
    const ordered = product ? [product, ...cands.filter((_, ci) => ci !== choice)] : cands;
    return { name: it.name, qty: it.qty, unit: it.unit, product, query, candidates: ordered };
  });
}

function normalizePicks(resp: unknown): Pick[] {
  let obj = resp;
  if (typeof resp === 'string') {
    const a = resp.indexOf('{');
    const b = resp.lastIndexOf('}');
    if (a < 0 || b <= a) return [];
    try {
      obj = JSON.parse(resp.slice(a, b + 1));
    } catch {
      return [];
    }
  }
  const picks = (obj as { picks?: unknown })?.picks;
  if (!Array.isArray(picks)) return [];
  return picks
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      i: typeof p.i === 'number' ? p.i : -1,
      choice: typeof p.choice === 'number' ? p.choice : -1,
      query: typeof p.query === 'string' ? p.query : '',
    }));
}

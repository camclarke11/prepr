import type { Env } from './env';
import { searchFood, ukTerm, type FoodProduct } from './food';
import { runJson } from './ai';

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
  /** Estimated UK own-brand price (GBP) for one pack covering the need, or null. */
  price: number | null;
  /** The pack size that estimate assumes, e.g. "400g", "1L", "6 pack". */
  pack: string;
}

const SYSTEM = [
  'You turn a rough grocery list into a precise UK supermarket shopping list.',
  'For each item you get its needed quantity and candidate products (each with an index "ci").',
  'Return STRICT JSON: {"picks":[{"i":<item index>,"choice":<best ci, or -1 if none fit>,',
  '"query":<search term>,"price":<number>,"pack":<size>}]}.',
  'choice = the candidate a UK shopper would actually buy for this item (prefer plain, common,',
  'everyday own-brand versions). Set choice to -1 when NONE of the candidates is really this',
  'item (e.g. the candidates are unrelated or a different product) — do not force a wrong match.',
  'query = a short, specific UK supermarket search term in British English (2–4 words, e.g.',
  '"milk" -> "semi skimmed milk", "ground beef" -> "beef mince", "green onions" -> "spring onions").',
  'price = your best estimate of the typical UK own-brand price in GBP for ONE pack that covers',
  'the needed amount — a plain number like 0.85 or 2.50 (no currency symbol).',
  'pack = the size of that pack, e.g. "400g", "1L", "6 pack". One pick per item.',
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
          price: { type: 'number' },
          pack: { type: 'string' },
        },
        required: ['i', 'choice', 'query', 'price', 'pack'],
      },
    },
  },
  required: ['picks'],
};

interface Pick {
  i: number;
  choice: number;
  query: string;
  price: number | null;
  pack: string;
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

  // One AI pass: pick the best candidate, a clean search term, and an estimated
  // price + pack per item. We pass the needed qty/unit so it can size the pack.
  const aiInput = capped.map((it, i) => ({
    i,
    item: it.name,
    need: [it.qty, it.unit].filter(Boolean).join(' ') || undefined,
    options: candidatesList[i]
      .slice(0, 5)
      .map((c, ci) => ({ ci, name: c.name, brand: c.brand })),
  }));

  let picks: Pick[] = [];
  try {
    const resp = await runJson(env, {
      system: SYSTEM,
      user: JSON.stringify(aiInput).slice(0, 9000),
      schema: PICKS_SCHEMA,
      maxTokens: 1500,
      temperature: 0.1,
    });
    picks = normalizePicks(resp);
  } catch {
    picks = [];
  }
  const byIndex = new Map<number, Pick>(picks.map((p) => [p.i, p]));

  return capped.map((it, i) => {
    const cands = candidatesList[i];
    const pick = byIndex.get(i);
    let product: FoodProduct | null = null;
    let ordered: FoodProduct[] = [];
    if (pick) {
      // Respect an explicit "none fit" (-1): show no product, just a search.
      if (pick.choice >= 0 && pick.choice < cands.length) {
        product = cands[pick.choice];
        ordered = [product, ...cands.filter((_, ci) => ci !== pick.choice)];
      }
    } else if (cands.length) {
      // No pick at all (AI failed) — best-effort: default to the top candidate.
      product = cands[0];
      ordered = cands;
    }
    const query = (pick?.query || product?.name || ukTerm(it.name)).trim().slice(0, 60);
    return {
      name: it.name,
      qty: it.qty,
      unit: it.unit,
      product,
      query,
      candidates: ordered,
      price: pick?.price ?? null,
      pack: pick?.pack ?? '',
    };
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
      price: cleanPrice(p.price),
      pack: typeof p.pack === 'string' ? p.pack.trim().slice(0, 24) : '',
    }));
}

// A model price estimate is only useful inside a sane range — clamp it and drop
// anything outside (a stray 0 or a hallucinated 9999) rather than show nonsense.
function cleanPrice(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  if (v > 40) return null;
  return Math.round(v * 100) / 100;
}

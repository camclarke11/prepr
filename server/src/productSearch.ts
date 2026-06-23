import type { Env } from './env';

// Resolve a shopping item to a real product-page URL at the chosen supermarket by
// asking a web-search API (Serper.dev → Google results) for the item restricted
// to that store's domain. Stores/Tesco block direct scraping and JS-render their
// catalogues, so a search index is the only reliable, ToS-friendly way in.

interface StoreInfo {
  /** Host that a real product URL must be on, and the `site:` query filter. */
  domain: string;
  /** Marks a result as a product page (not a category/info page). */
  productPath: RegExp;
}

const STORES: Record<string, StoreInfo> = {
  tesco: { domain: 'tesco.com', productPath: /\/products?\//i },
  sainsburys: { domain: 'sainsburys.co.uk', productPath: /\/product\//i },
  asda: { domain: 'asda.com', productPath: /\/product\//i },
  morrisons: { domain: 'morrisons.com', productPath: /\/products?\//i },
  waitrose: { domain: 'waitrose.com', productPath: /\/products?\//i },
  ocado: { domain: 'ocado.com', productPath: /\/products?\//i },
  aldi: { domain: 'aldi.co.uk', productPath: /\/product|\/p-/i },
};

export interface ProductHit {
  url: string;
  title: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Products that merely *contain* an ingredient as a sub-component — we don't want
// "tuna in olive oil" for "olive oil", or a "fettuccine ready meal" for pasta.
const CROSS_PRODUCTS = [
  'tuna',
  'salmon',
  'sardine',
  'mackerel',
  'anchovy',
  'ready meal',
  'meal kit',
];
// Non-grocery leakage (F&F home/clothing on shared domains like tesco.com) —
// hard reject. "Double cream" must not match a cream-coloured divan bed.
const NON_GROCERY = [
  'divan',
  'mattress',
  'headboard',
  'duvet',
  'bedding',
  'curtain',
  'sofa',
  'wardrobe',
  'plush',
  'kingsize',
  ' bed ',
  'tv bed',
];

/**
 * Score how well a result is the MAIN product for the query (higher = better),
 * or -1 to reject. We require at least one query word in the title — except for
 * Google's #1 result, which we trust for synonyms (parmesan→parmigiano). Reward a
 * clean early phrase/word match; penalise cross-products and long titles; hard
 * reject anything that reads as non-food.
 */
function scoreMatch(query: string, title: string, rank: number): number {
  const q = norm(query);
  const t = ` ${norm(title)} `;
  const qWords = q.split(' ').filter(Boolean);
  const tWords = norm(title).split(' ').filter(Boolean);

  for (const ng of NON_GROCERY) if (t.includes(ng)) return -1; // not food

  const present = qWords.filter((w) => tWords.includes(w));
  if (present.length === 0 && rank !== 0) return -1; // off-topic (unless Google's #1)

  let score = Math.max(0, 8 - rank); // trust Google's relevance order
  score += present.length * 3;
  if (t.includes(q)) score += 5; // full phrase present
  const positions = present.map((w) => tWords.indexOf(w)).filter((i) => i >= 0);
  if (positions.length) score += Math.max(0, 5 - Math.min(...positions)); // match near front
  score -= Math.max(0, tWords.length - qWords.length) * 0.3; // extra words = noise
  for (const cp of CROSS_PRODUCTS) {
    if (t.includes(cp) && !q.includes(cp)) score -= 8; // a different product
  }
  return score;
}

/** Find the best real product-page URL for `query` at `storeId`, or null. */
export async function findProduct(
  query: string,
  storeId: string,
  env: Env,
): Promise<ProductHit | null> {
  const key = env.SERPER_API_KEY;
  const store = STORES[storeId];
  const q = query.trim();
  if (!key || !store || !q) return null;
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${q} site:${store.domain}`, gl: 'gb', num: 10 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      organic?: { title?: string; link?: string }[];
    };
    // Pick the best-scoring product page, not just the first result.
    let best: { hit: ProductHit; score: number } | null = null;
    (data.organic ?? []).forEach((r, rank) => {
      const link = typeof r.link === 'string' ? r.link : '';
      const title = (r.title ?? '').trim();
      if (!link || !title) return;
      let parsed: URL;
      try {
        parsed = new URL(link);
      } catch {
        return;
      }
      if (!parsed.host.endsWith(store.domain)) return;
      if (!store.productPath.test(parsed.pathname)) return;
      const score = scoreMatch(q, title, rank);
      if (score <= 0) return;
      // Drop search/tracking query params for a clean, canonical product URL.
      if (!best || score > best.score) {
        best = {
          hit: { url: parsed.origin + parsed.pathname, title: title.slice(0, 100) },
          score,
        };
      }
    });
    return best?.hit ?? null;
  } catch {
    return null;
  }
}

/** Resolve many queries in parallel (one search each), preserving order. */
export async function findProducts(
  queries: string[],
  storeId: string,
  env: Env,
): Promise<(ProductHit | null)[]> {
  if (!env.SERPER_API_KEY || !STORES[storeId]) return queries.map(() => null);
  return Promise.all(queries.map((q) => findProduct(q, storeId, env)));
}

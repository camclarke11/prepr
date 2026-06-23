import type { Env } from './env';

// Resolve a shopping item to a real product-page URL at the chosen supermarket by
// asking a web-search API (Serper.dev → Google results) for the item restricted
// to that store's domain. Stores/Tesco block direct scraping and JS-render their
// catalogues, so a search index is the only reliable, ToS-friendly way in.

interface StoreInfo {
  /** Host that a real product URL must be on. */
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
      body: JSON.stringify({ q: `${q} site:${store.domain}`, gl: 'gb', num: 8 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      organic?: { title?: string; link?: string }[];
    };
    for (const r of data.organic ?? []) {
      const link = typeof r.link === 'string' ? r.link : '';
      if (!link) continue;
      let host = '';
      try {
        host = new URL(link).host;
      } catch {
        continue;
      }
      if (!host.endsWith(store.domain)) continue;
      if (!store.productPath.test(new URL(link).pathname)) continue;
      return { url: link, title: (r.title ?? '').trim().slice(0, 100) };
    }
    return null;
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

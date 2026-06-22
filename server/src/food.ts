// Nutrition lookup via Open Food Facts — a free, openly-licensed (ODbL) food
// database. We fetch server-side (clean UA, trim the payload) and attribute it.

export interface FoodProduct {
  name: string;
  brand: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sugars: number | null;
  salt: number | null;
  serving: string;
  image: string;
}

// Open Food Facts "Search-a-licious" — the API-grade full-text search service.
const OFF = 'https://search.openfoodfacts.org/search';

export async function searchFood(query: string): Promise<FoodProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `${OFF}?q=${encodeURIComponent(q)}&page_size=6` +
    '&fields=product_name,brands,nutriments,serving_size,image_small_url,code';
  let data: { hits?: unknown[] };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'prepr/1.0 (https://prepr.camlc.dev)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    data = (await res.json()) as { hits?: unknown[] };
  } catch {
    return [];
  }

  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');

  const out: FoodProduct[] = [];
  for (const p of data.hits ?? []) {
    const o = (p ?? {}) as Record<string, unknown>;
    const name = str(o.product_name).trim();
    if (!name) continue;
    const n = (o.nutriments ?? {}) as Record<string, unknown>;
    out.push({
      name: name.slice(0, 80),
      brand: str(o.brands).split(',')[0].trim().slice(0, 40),
      kcal: num(n['energy-kcal_100g']),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
      sugars: num(n['sugars_100g']),
      salt: num(n['salt_100g']),
      serving: str(o.serving_size).slice(0, 40),
      image: str(o.image_small_url),
    });
    if (out.length >= 6) break;
  }
  return out;
}

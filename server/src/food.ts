// Nutrition lookup via Open Food Facts — a free, openly-licensed (ODbL) food
// database. We fetch server-side (clean UA, trim the payload) and attribute it.

export interface FoodProduct {
  name: string;
  brand: string;
  /** GTIN/EAN barcode — lets a store search land on the exact product. */
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

// Open Food Facts "Search-a-licious" — the API-grade full-text search service.
const OFF = 'https://search.openfoodfacts.org/search';

// Common US recipe terms → the word a UK shopper (and UK shelves) actually use,
// so the OFF search lands on real UK products instead of American imports.
const US_TO_UK: Record<string, string> = {
  'ground beef': 'beef mince',
  'ground pork': 'pork mince',
  'ground turkey': 'turkey mince',
  'ground lamb': 'lamb mince',
  'green onion': 'spring onion',
  'green onions': 'spring onions',
  scallion: 'spring onion',
  scallions: 'spring onions',
  cilantro: 'coriander',
  eggplant: 'aubergine',
  zucchini: 'courgette',
  'all purpose flour': 'plain flour',
  'all-purpose flour': 'plain flour',
  'confectioners sugar': 'icing sugar',
  'powdered sugar': 'icing sugar',
  'heavy cream': 'double cream',
  'heavy whipping cream': 'double cream',
  shrimp: 'prawns',
  arugula: 'rocket',
  'garbanzo beans': 'chickpeas',
  'baking soda': 'bicarbonate of soda',
  'superfine sugar': 'caster sugar',
  'corn starch': 'cornflour',
  cornstarch: 'cornflour',
};

/** Rewrite a search term into UK supermarket vocabulary. */
export function ukTerm(name: string): string {
  let s = name.toLowerCase().trim();
  if (US_TO_UK[s]) return US_TO_UK[s];
  for (const [us, uk] of Object.entries(US_TO_UK)) {
    if (s.includes(us)) s = s.replace(us, uk);
  }
  return s;
}

export async function searchFood(query: string): Promise<FoodProduct[]> {
  const q = ukTerm(query.trim());
  if (!q) return [];
  // Constrain to products sold in the UK so the matches (and their barcodes)
  // map to UK shelves rather than US/global imports.
  const full = `${q} countries_tags:"en:united-kingdom"`;
  const url =
    `${OFF}?q=${encodeURIComponent(full)}&page_size=6` +
    '&fields=product_name,brands,nutriments,serving_size,image_small_url,code';
  let data: { hits?: unknown[] };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'prepr/1.0 (https://prepr.camlc.dev)',
        Accept: 'application/json',
      },
      // Don't let one slow lookup stall a whole smart-list build.
      signal: AbortSignal.timeout(8000),
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
      barcode: str(o.code).trim().slice(0, 20),
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

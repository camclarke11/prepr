import type { CategoryName, Ingredient, ListItem, Plan, Recipe } from '../types';
import { DAYS, idify } from '../theme';

export interface NewItemSpec {
  name: string;
  emoji: string;
  category: CategoryName;
  unit?: string;
  qty?: number;
  by?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Unicode vulgar fractions → an ascii " a/b" so "1½" becomes "1 1/2".
const VULGAR: Record<string, string> = {
  '¼': ' 1/4',
  '½': ' 1/2',
  '¾': ' 3/4',
  '⅓': ' 1/3',
  '⅔': ' 2/3',
  '⅕': ' 1/5',
  '⅖': ' 2/5',
  '⅗': ' 3/5',
  '⅘': ' 4/5',
  '⅙': ' 1/6',
  '⅚': ' 5/6',
  '⅛': ' 1/8',
  '⅜': ' 3/8',
  '⅝': ' 5/8',
  '⅞': ' 7/8',
  '⅐': ' 1/7',
  '⅑': ' 1/9',
  '⅒': ' 1/10',
};

/**
 * Parse a recipe quantity string into a number, understanding fractions and
 * mixed numbers ("1/4" → 0.25, "1 1/2" → 1.5, "1½" → 1.5) — plain parseFloat
 * stops at the slash and would read "1/4" as 1. Falls back to 1 when unparseable.
 */
export function parseQty(raw: string): number {
  if (!raw) return 1;
  let s = raw;
  for (const [ch, rep] of Object.entries(VULGAR)) s = s.split(ch).join(rep);
  s = s.trim().replace(/\s+/g, ' ');
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  // Mixed number: "1 1/2" or "1-1/2".
  let m = /^(\d+)[\s-]+(\d+)\/(\d+)/.exec(s);
  if (m && +m[3]) return round3(+m[1] + +m[2] / +m[3]);
  // Simple fraction: "3/4".
  m = /^(\d+)\/(\d+)/.exec(s);
  if (m && +m[2]) return round3(+m[1] / +m[2]);
  // Decimal or integer: "1.5", "2".
  m = /^(\d*\.?\d+)/.exec(s);
  if (m) return round3(parseFloat(m[1]));
  return 1;
}

/** A stable list key from a name + unit pair (the merge identity). */
export function listKey(name: string, unit: string): string {
  return idify(name) + (unit ? '-' + unit : '');
}

/**
 * Add an item to the list, merging by (name, unit). Returns a new list.
 * Merging resets the `checked` flag so re-added items reappear as "to get".
 */
export function mergeIntoList(list: ListItem[], spec: NewItemSpec): ListItem[] {
  const unit = spec.unit ?? '';
  const qty = spec.qty ?? 1;
  const key = listKey(spec.name, unit);
  const next = list.slice();
  // Merge on the stable key so names that normalise to the same id (e.g.
  // "Olive Oil" vs "Olive-Oil", or stray double spaces) never produce two
  // rows sharing a key — which would break per-key edit/remove.
  const i = next.findIndex((x) => x.key === key);
  if (i >= 0) {
    next[i] = { ...next[i], qty: round2(next[i].qty + qty), checked: false };
  } else {
    next.push({
      key,
      name: spec.name,
      emoji: spec.emoji,
      category: spec.category,
      qty: round2(qty),
      unit,
      checked: false,
      by: spec.by ?? 'You',
    });
  }
  return next;
}

/** Change quantity by delta, removing the item when it reaches zero. */
export function changeQty(list: ListItem[], key: string, delta: number): ListItem[] {
  const i = list.findIndex((x) => x.key === key);
  if (i < 0) return list;
  const q = round2(list[i].qty + delta);
  if (q <= 0) return list.filter((x) => x.key !== key);
  const next = list.slice();
  next[i] = { ...next[i], qty: q };
  return next;
}

export function removeItem(list: ListItem[], key: string): ListItem[] {
  return list.filter((x) => x.key !== key);
}

export function setItemField<K extends keyof ListItem>(
  list: ListItem[],
  key: string,
  field: K,
  value: ListItem[K],
): ListItem[] {
  const idx = list.findIndex((x) => x.key === key);
  if (idx < 0) return list;
  const updated: ListItem = { ...list[idx] };
  updated[field] = value;
  // The key encodes the unit (see listKey), so a unit change must recompute it,
  // otherwise the row keeps a key that disagrees with its unit and a later merge
  // produces a duplicate instead of combining.
  if (field === 'unit') {
    const newKey = listKey(updated.name, updated.unit);
    if (newKey !== key) {
      updated.key = newKey;
      const collide = list.findIndex((x, i) => i !== idx && x.key === newKey);
      if (collide >= 0) {
        // Editing the unit lands on an existing row — merge into it and drop
        // the edited duplicate, preserving the unique-key invariant.
        return list
          .filter((_, i) => i !== idx)
          .map((x) =>
            x.key === newKey
              ? { ...x, qty: round2(x.qty + updated.qty), checked: false }
              : x,
          );
      }
    }
  }
  return list.map((x, i) => (i === idx ? updated : x));
}

export function toggleChecked(list: ListItem[], key: string): ListItem[] {
  return list.map((x) => (x.key === key ? { ...x, checked: !x.checked } : x));
}

export function pushRecent(recents: string[], id: string, max = 12): string[] {
  return [id, ...recents.filter((x) => x !== id)].slice(0, max);
}

export interface RecipeAddResult {
  list: ListItem[];
  added: number;
  skipped: number;
}

/**
 * Add a recipe's ingredients to the list, scaled to `servings`.
 * Ingredients already on hand (in the pantry) are skipped.
 */
export function addRecipeToList(
  list: ListItem[],
  recipe: Recipe,
  servings: number,
  pantry: string[],
  by = 'You',
): RecipeAddResult {
  const factor = servings / recipe.servings;
  let added = 0;
  let skipped = 0;
  let next = list;
  for (const ingredient of recipe.ingredients) {
    if (pantry.includes(ingredient.name)) {
      skipped++;
      continue;
    }
    const qty = round2(ingredient.qty * factor);
    // Extreme down-scaling can round an ingredient away to nothing; don't push
    // a zero-quantity row onto the list.
    if (qty <= 0) continue;
    next = mergeIntoList(next, {
      name: ingredient.name,
      emoji: ingredient.emoji,
      category: ingredient.category,
      unit: ingredient.unit,
      qty,
      by,
    });
    added++;
  }
  return { list: next, added, skipped };
}

export interface WeekAddResult {
  list: ListItem[];
  count: number;
}

/** Aggregate every planned meal for the week into the list. */
export function addWeekToList(
  list: ListItem[],
  plan: Plan,
  recipes: Recipe[],
  pantry: string[],
  by = 'You',
): WeekAddResult {
  const totals = new Map<string, NewItemSpec>();
  for (const ids of Object.values(plan)) {
    for (const id of ids) {
      const r = recipes.find((x) => x.id === id);
      if (!r) continue;
      for (const ing of r.ingredients) {
        if (pantry.includes(ing.name)) continue;
        // Aggregate under the same identity the list merges on (listKey), so the
        // reported count matches what actually lands on the list and names that
        // normalise to one key (e.g. "Olive Oil"/"Olive-Oil") don't double-count.
        const k = listKey(ing.name, ing.unit);
        const existing = totals.get(k);
        if (existing) {
          existing.qty = round2((existing.qty ?? 0) + ing.qty);
        } else {
          totals.set(k, {
            name: ing.name,
            emoji: ing.emoji,
            category: ing.category,
            unit: ing.unit,
            qty: ing.qty,
          });
        }
      }
    }
  }
  let next = list;
  for (const spec of totals.values()) {
    next = mergeIntoList(next, { ...spec, by });
  }
  return { list: next, count: totals.size };
}

export interface RecipeDraft {
  emoji: string;
  name: string;
  servings: number | string;
  time: string;
  ingredients: { name: string; qty: string; unit: string }[];
  stepsText: string;
}

/** Build a Recipe from a draft, resolving emojis/categories from the catalog. */
export function recipeFromDraft(
  draft: RecipeDraft,
  catalog: { name: string; emoji: string; category: CategoryName }[],
  id: string,
): Recipe {
  const ingredients: Ingredient[] = draft.ingredients
    .filter((x) => x.name.trim())
    .map((x) => {
      const name = x.name.trim();
      const lower = name.toLowerCase();
      const match =
        catalog.find((c) => c.name.toLowerCase() === lower) ??
        catalog.find((c) => lower.includes(c.name.toLowerCase()));
      return {
        name,
        emoji: match ? match.emoji : '🥘',
        qty: parseQty(x.qty),
        unit: (x.unit || '').trim(),
        category: match ? match.category : ('Pantry' as CategoryName),
      };
    });
  const steps = draft.stepsText
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    id,
    name: draft.name.trim(),
    emoji: draft.emoji || '🍽️',
    servings: parseInt(String(draft.servings), 10) || 4,
    time: draft.time.trim() || '—',
    ingredients,
    steps: steps.length ? steps : ['Enjoy!'],
    custom: true,
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normalizeIngredient(input: unknown): Ingredient {
  const i = asRecord(input);
  return {
    name: typeof i.name === 'string' ? i.name : '',
    emoji: typeof i.emoji === 'string' && i.emoji ? i.emoji : '🥘',
    qty: typeof i.qty === 'number' && Number.isFinite(i.qty) ? i.qty : 1,
    unit: typeof i.unit === 'string' ? i.unit : '',
    category: typeof i.category === 'string' ? (i.category as CategoryName) : 'Pantry',
  };
}

/**
 * Coerce an untrusted recipe-shaped value (imported file / share link) into a
 * valid Recipe, so the UI never crashes on a missing array or a zero serving.
 */
export function normalizeRecipe(input: unknown): Recipe {
  const r = asRecord(input);
  const servings =
    typeof r.servings === 'number' && Number.isFinite(r.servings) && r.servings > 0
      ? Math.round(r.servings)
      : 4;
  return {
    id:
      typeof r.id === 'string' && r.id
        ? r.id
        : 'r' + Math.random().toString(36).slice(2),
    name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Untitled',
    emoji: typeof r.emoji === 'string' && r.emoji ? r.emoji : '🍽️',
    servings,
    time: typeof r.time === 'string' && r.time ? r.time : '—',
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map(normalizeIngredient).filter((x) => x.name)
      : [],
    steps: Array.isArray(r.steps)
      ? r.steps.filter((s): s is string => typeof s === 'string' && !!s.trim())
      : [],
    custom: r.custom === true ? true : undefined,
    favorite: r.favorite === true ? true : undefined,
  };
}

/** Coerce an untrusted value into a clean list of non-empty strings. */
export function normalizeStringArray(input: unknown): string[] {
  return Array.isArray(input)
    ? input.filter((x): x is string => typeof x === 'string' && !!x)
    : [];
}

/**
 * Coerce an untrusted list-item-shaped value (imported file / share link /
 * persisted blob) into a valid ListItem, recomputing the key from name+unit so
 * the merge identity always holds and a missing/garbage qty can never become NaN.
 */
export function normalizeListItem(input: unknown): ListItem {
  const i = asRecord(input);
  const name = typeof i.name === 'string' ? i.name : '';
  const unit = typeof i.unit === 'string' ? i.unit : '';
  const qty =
    typeof i.qty === 'number' && Number.isFinite(i.qty) && i.qty > 0
      ? round2(i.qty)
      : 1;
  return {
    key: listKey(name, unit),
    name,
    emoji: typeof i.emoji === 'string' && i.emoji ? i.emoji : '🛒',
    category: typeof i.category === 'string' ? (i.category as CategoryName) : 'Pantry',
    qty,
    unit,
    checked: i.checked === true,
    by: typeof i.by === 'string' && i.by ? i.by : 'You',
    spec: typeof i.spec === 'string' && i.spec ? i.spec : undefined,
  };
}

/**
 * Coerce an untrusted value into a valid list, dropping nameless rows and
 * merging any items that normalise to the same key (keeps keys unique).
 */
export function normalizeList(input: unknown): ListItem[] {
  if (!Array.isArray(input)) return [];
  const out: ListItem[] = [];
  for (const raw of input) {
    const item = normalizeListItem(raw);
    if (!item.name.trim()) continue;
    const i = out.findIndex((x) => x.key === item.key);
    if (i >= 0) {
      out[i] = { ...out[i], qty: round2(out[i].qty + item.qty) };
    } else {
      out.push(item);
    }
  }
  return out;
}

/**
 * Coerce an untrusted value into a valid Plan: every day present, each mapped to
 * an array of recipe-id strings. Guards the `for…of`/`.filter` callers that would
 * otherwise crash on a non-array day value from a corrupted import.
 */
export function normalizePlan(input: unknown): Plan {
  const src = asRecord(input);
  const plan = {} as Plan;
  for (const day of DAYS) {
    plan[day] = normalizeStringArray(src[day]);
  }
  return plan;
}

export function togglePantry(pantry: string[], name: string): string[] {
  return pantry.includes(name) ? pantry.filter((x) => x !== name) : [...pantry, name];
}

export function assignMeal(plan: Plan, day: keyof Plan, id: string): Plan {
  return { ...plan, [day]: [...(plan[day] || []), id] };
}

export function removeMeal(plan: Plan, day: keyof Plan, index: number): Plan {
  return { ...plan, [day]: (plan[day] || []).filter((_, i) => i !== index) };
}

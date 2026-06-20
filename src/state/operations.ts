import type {
  CategoryName,
  Ingredient,
  ListItem,
  Plan,
  Recipe,
} from '../types';
import { idify } from '../theme';

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
  const next = list.slice();
  const i = next.findIndex((x) => x.name === spec.name && x.unit === unit);
  if (i >= 0) {
    next[i] = { ...next[i], qty: round2(next[i].qty + qty), checked: false };
  } else {
    next.push({
      key: listKey(spec.name, unit),
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
export function changeQty(
  list: ListItem[],
  key: string,
  delta: number,
): ListItem[] {
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
  return list.map((x) => (x.key === key ? { ...x, [field]: value } : x));
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
    next = mergeIntoList(next, {
      name: ingredient.name,
      emoji: ingredient.emoji,
      category: ingredient.category,
      unit: ingredient.unit,
      qty: round2(ingredient.qty * factor),
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
        const k = ing.name + '|' + ing.unit;
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
        qty: parseFloat(x.qty) || 1,
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

export function togglePantry(pantry: string[], name: string): string[] {
  return pantry.includes(name)
    ? pantry.filter((x) => x !== name)
    : [...pantry, name];
}

export function assignMeal(plan: Plan, day: keyof Plan, id: string): Plan {
  return { ...plan, [day]: [...(plan[day] || []), id] };
}

export function removeMeal(plan: Plan, day: keyof Plan, index: number): Plan {
  return { ...plan, [day]: (plan[day] || []).filter((_, i) => i !== index) };
}

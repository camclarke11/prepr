// Build a tailored shop from planned recipes + the current list, cross-referenced
// against the pantry. This is the deterministic half of the "Smart shop": it pools
// and sums ingredients across recipes, drops what's already on hand (recognising
// common name equivalences), and flags what's genuinely new versus the base list.
// Product matching, prices and clean search terms are layered on by the AI pass
// (see lib/sync.ts buildSmartList).

import type { CategoryName, ListItem, Plan, Recipe } from '../types';
import { CATEGORIES } from '../theme';
import { planRecipeId } from '../state/operations';

export type ShopSource = 'plan' | 'list' | 'both';

/** One aggregated line of the shop. */
export interface ShopLine {
  /** Merge identity: canonical name + unit. */
  key: string;
  name: string;
  emoji: string;
  category: CategoryName;
  qty: number;
  unit: string;
  /** Recipes that contributed this ingredient. */
  fromRecipes: string[];
  /** Already on the current shopping list (so not "new"). */
  onList: boolean;
  /** Needed by a recipe but not already on the list. */
  isNew: boolean;
}

export interface ShopPlan {
  /** Things to buy, grouped-ready (sorted by aisle then name). */
  toBuy: ShopLine[];
  /** Needed but already in the pantry — shown, excluded from the total. */
  owned: ShopLine[];
  /** Planned recipes that were considered. */
  recipeNames: string[];
  /** Judgement calls worth surfacing (equivalences applied, merges, caps). */
  assumptions: string[];
}

// Names that mean the same thing on a shopping list. First entry is the label we
// show; the rest are folded into it so we never buy the same thing twice under a
// different name. UK ⇄ US and granule ⇄ powder are the common culprits.
const EQUIVALENCE_GROUPS: string[][] = [
  ['onion powder', 'onion granules'],
  ['garlic powder', 'garlic granules'],
  ['coriander', 'cilantro', 'fresh coriander'],
  ['spring onion', 'scallion', 'green onion', 'spring onions'],
  ['aubergine', 'eggplant'],
  ['courgette', 'zucchini'],
  ['beef mince', 'minced beef', 'ground beef'],
  ['pork mince', 'minced pork', 'ground pork'],
  ['chopped tomatoes', 'tinned tomatoes', 'canned tomatoes', 'tin of tomatoes'],
  ['passata', 'sieved tomatoes'],
  ['chickpeas', 'garbanzo beans'],
  ['plain flour', 'all purpose flour', 'all-purpose flour'],
  ['caster sugar', 'superfine sugar'],
  ['bicarbonate of soda', 'baking soda'],
  ['prawns', 'shrimp'],
  ['rocket', 'arugula'],
  ['double cream', 'heavy cream'],
  ['kitchen roll', 'paper towels', 'paper towel'],
];

const CANONICAL = new Map<string, string>();
for (const group of EQUIVALENCE_GROUPS) {
  const head = group[0];
  for (const member of group) CANONICAL.set(norm(member), head);
}

/** Lowercase, strip punctuation and collapse whitespace — a forgiving identity. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Fold a name onto its equivalence-group label, or its normalised self. */
export function canonical(name: string): string {
  const n = norm(name);
  return CANONICAL.get(n) ?? n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function catOrder(c: CategoryName): number {
  const i = CATEGORIES.findIndex((x) => x.name === c);
  return i < 0 ? CATEGORIES.length : i;
}

const MAX_LINES = 40;

interface Acc extends ShopLine {
  /** Distinct display names folded into this line (for the merge note). */
  names: Set<string>;
  hasRecipe: boolean;
}

/**
 * Pool ingredients across the chosen source, subtract the pantry, and flag
 * net-new items. Pure and deterministic so it can be unit-tested and the panel
 * can rebuild it instantly when the source toggle changes.
 */
export function aggregateShop(input: {
  list: ListItem[];
  plan: Plan;
  recipes: Recipe[];
  pantry: string[];
  source: ShopSource;
}): ShopPlan {
  const { list, plan, recipes, pantry, source } = input;
  const usePlan = source === 'plan' || source === 'both';
  const useList = source === 'list' || source === 'both';

  // What's already on the base list — checked by canonical name only (ignoring
  // unit) so "flour 200g" from a recipe still counts as already-listed "flour".
  const listCanon = new Set(list.map((i) => canonical(i.name)));

  // Pantry, by canonical name, remembering the on-hand label for the note.
  const pantryCanon = new Map<string, string>();
  for (const name of pantry) pantryCanon.set(canonical(name), name);

  const acc = new Map<string, Acc>();
  const recipeNames: string[] = [];

  const add = (
    spec: {
      name: string;
      emoji: string;
      category: CategoryName;
      qty: number;
      unit: string;
    },
    fromRecipe?: string,
    onList?: boolean,
  ) => {
    const key = canonical(spec.name) + '|' + spec.unit;
    const cur = acc.get(key);
    if (cur) {
      cur.qty = round2(cur.qty + spec.qty);
      cur.names.add(spec.name);
      if (fromRecipe && !cur.fromRecipes.includes(fromRecipe)) {
        cur.fromRecipes.push(fromRecipe);
        cur.hasRecipe = true;
      }
      if (onList) cur.onList = true;
    } else {
      acc.set(key, {
        key,
        name: spec.name,
        emoji: spec.emoji,
        category: spec.category,
        qty: round2(spec.qty),
        unit: spec.unit,
        fromRecipes: fromRecipe ? [fromRecipe] : [],
        onList: !!onList,
        isNew: false,
        names: new Set([spec.name]),
        hasRecipe: !!fromRecipe,
      });
    }
  };

  if (usePlan) {
    for (const ids of Object.values(plan)) {
      for (const ref of ids) {
        const r = recipes.find((x) => x.id === planRecipeId(ref));
        if (!r) continue;
        if (!recipeNames.includes(r.name)) recipeNames.push(r.name);
        for (const ing of r.ingredients) {
          if (!ing.name.trim() || ing.qty <= 0) continue;
          add(ing, r.name, listCanon.has(canonical(ing.name)));
        }
      }
    }
  }

  if (useList) {
    for (const it of list) {
      if (!it.name.trim()) continue;
      add(
        {
          name: it.name,
          emoji: it.emoji,
          category: it.category,
          qty: it.qty,
          unit: it.unit,
        },
        undefined,
        true,
      );
    }
  }

  const assumptions: string[] = [];
  const toBuy: ShopLine[] = [];
  const owned: ShopLine[] = [];

  for (const a of acc.values()) {
    a.isNew = a.hasRecipe && !a.onList;
    if (a.names.size > 1) {
      assumptions.push(`Combined ${[...a.names].map((n) => `“${n}”`).join(' + ')}`);
    }
    const onHand = pantryCanon.get(canonical(a.name));
    const line: ShopLine = {
      key: a.key,
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      qty: a.qty,
      unit: a.unit,
      fromRecipes: a.fromRecipes,
      onList: a.onList,
      isNew: a.isNew,
    };
    if (onHand !== undefined) {
      owned.push(line);
      if (norm(onHand) !== norm(a.name)) {
        assumptions.push(`Skipped “${a.name}” — “${onHand}” already in your pantry`);
      }
    } else {
      toBuy.push(line);
    }
  }

  const byAisle = (x: ShopLine, y: ShopLine) =>
    catOrder(x.category) - catOrder(y.category) || x.name.localeCompare(y.name);
  toBuy.sort(byAisle);
  owned.sort(byAisle);

  if (toBuy.length > MAX_LINES) {
    assumptions.push(
      `Capped at ${MAX_LINES} items — ${toBuy.length - MAX_LINES} more not shown`,
    );
  }

  return { toBuy: toBuy.slice(0, MAX_LINES), owned, recipeNames, assumptions };
}

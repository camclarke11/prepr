import { describe, expect, it } from 'vitest';
import {
  addRecipeToList,
  addWeekToList,
  changeQty,
  listKey,
  mergeIntoList,
  parseQty,
  recipeFromDraft,
  removeMeal,
  moveMeal,
  assignMeal,
  parsePlanEntry,
  planRef,
  planRecipeId,
  setItemField,
  togglePantry,
  normalizeList,
  normalizePlan,
  normalizeRecipe,
  normalizeStringArray,
} from './operations';
import type { ListItem, Plan, Recipe } from '../types';

const apple = {
  name: 'Apples',
  emoji: '🍎',
  category: 'Produce' as const,
};

function makeList(): ListItem[] {
  return [
    {
      key: 'apples',
      name: 'Apples',
      emoji: '🍎',
      category: 'Produce',
      qty: 2,
      unit: '',
      checked: false,
      by: 'You',
    },
  ];
}

describe('mergeIntoList', () => {
  it('adds a new item', () => {
    const out = mergeIntoList([], { ...apple, qty: 3 });
    expect(out).toHaveLength(1);
    expect(out[0].qty).toBe(3);
    expect(out[0].key).toBe('apples');
  });

  it('merges by (name, unit), summing quantity and clearing checked', () => {
    const list = makeList();
    list[0].checked = true;
    const out = mergeIntoList(list, { ...apple, qty: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].qty).toBe(3);
    expect(out[0].checked).toBe(false);
  });

  it('treats different units as different items', () => {
    const out = mergeIntoList(makeList(), { ...apple, qty: 1, unit: 'kg' });
    expect(out).toHaveLength(2);
    expect(out[1].key).toBe('apples-kg');
  });

  it('does not mutate the input list', () => {
    const list = makeList();
    const snapshot = JSON.stringify(list);
    mergeIntoList(list, { ...apple, qty: 5 });
    expect(JSON.stringify(list)).toBe(snapshot);
  });

  it('rounds fractional quantities to two decimals', () => {
    const out = mergeIntoList([], { ...apple, qty: 0.333333 });
    expect(out[0].qty).toBe(0.33);
  });

  it('keeps non-Latin / emoji-only names as distinct rows', () => {
    let list = mergeIntoList([], {
      name: '牛奶',
      emoji: '🥛',
      category: 'Dairy & Eggs',
      qty: 1,
    });
    list = mergeIntoList(list, {
      name: '巧克力',
      emoji: '🍫',
      category: 'Snacks',
      qty: 1,
    });
    expect(list).toHaveLength(2);
    expect(new Set(list.map((x) => x.key)).size).toBe(2);
  });

  it('merges names that normalise to the same key (no duplicate keys)', () => {
    let list = mergeIntoList([], {
      name: 'Olive Oil',
      emoji: '🫒',
      category: 'Pantry',
      qty: 1,
    });
    list = mergeIntoList(list, {
      name: 'Olive-Oil',
      emoji: '🫒',
      category: 'Pantry',
      qty: 2,
    });
    expect(list).toHaveLength(1);
    expect(list[0].qty).toBe(3);
    expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
  });
});

describe('changeQty', () => {
  it('increments', () => {
    expect(changeQty(makeList(), 'apples', 1)[0].qty).toBe(3);
  });
  it('removes the item when it hits zero', () => {
    expect(changeQty(makeList(), 'apples', -2)).toHaveLength(0);
  });
  it('removes when going negative', () => {
    expect(changeQty(makeList(), 'apples', -5)).toHaveLength(0);
  });
  it('ignores unknown keys', () => {
    const list = makeList();
    expect(changeQty(list, 'nope', 1)).toBe(list);
  });
});

describe('setItemField', () => {
  it('updates a free-text field in place without touching the key', () => {
    const out = setItemField(makeList(), 'apples', 'spec', 'organic');
    expect(out[0].spec).toBe('organic');
    expect(out[0].key).toBe('apples');
  });

  it('recomputes the key when the unit changes', () => {
    const out = setItemField(makeList(), 'apples', 'unit', 'kg');
    expect(out).toHaveLength(1);
    expect(out[0].unit).toBe('kg');
    expect(out[0].key).toBe('apples-kg');
  });

  it('merges into the existing row when a unit edit collides with another key', () => {
    let list = makeList(); // apples (no unit), qty 2
    list = mergeIntoList(list, { ...apple, qty: 1, unit: 'kg' }); // apples-kg, qty 1
    const out = setItemField(list, 'apples', 'unit', 'kg');
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('apples-kg');
    expect(out[0].qty).toBe(3);
  });

  it('ignores unknown keys', () => {
    const list = makeList();
    expect(setItemField(list, 'nope', 'spec', 'x')).toBe(list);
  });
});

const recipe: Recipe = {
  id: 'r1',
  name: 'Test',
  emoji: '🍲',
  servings: 2,
  time: '10 min',
  ingredients: [
    { name: 'Apples', emoji: '🍎', qty: 2, unit: '', category: 'Produce' },
    { name: 'Salt', emoji: '🧂', qty: 1, unit: 'tsp', category: 'Pantry' },
  ],
  steps: ['Mix'],
};

describe('addRecipeToList', () => {
  it('scales ingredients by servings', () => {
    const { list, added, skipped } = addRecipeToList([], recipe, 4, []);
    expect(added).toBe(2);
    expect(skipped).toBe(0);
    expect(list.find((x) => x.name === 'Apples')!.qty).toBe(4);
    expect(list.find((x) => x.name === 'Salt')!.qty).toBe(2);
  });

  it('skips pantry items', () => {
    const { list, added, skipped } = addRecipeToList([], recipe, 2, ['Salt']);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
    expect(list.find((x) => x.name === 'Salt')).toBeUndefined();
  });

  it('merges into an existing list entry', () => {
    const { list } = addRecipeToList(makeList(), recipe, 2, []);
    expect(list.find((x) => x.name === 'Apples')!.qty).toBe(4);
  });

  it('skips ingredients that scale down to zero', () => {
    const tiny: Recipe = {
      ...recipe,
      servings: 1000,
      ingredients: [
        { name: 'Saffron', emoji: '🌸', qty: 1, unit: 'pinch', category: 'Pantry' },
      ],
    };
    const { list, added } = addRecipeToList([], tiny, 1, []);
    expect(added).toBe(0);
    expect(list).toHaveLength(0);
  });
});

describe('addWeekToList', () => {
  const recipes: Recipe[] = [recipe];
  const plan: Plan = {
    Mon: ['r1'],
    Tue: ['r1'],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };

  it('aggregates across days and skips pantry', () => {
    const { list, count } = addWeekToList([], plan, recipes, ['Salt']);
    expect(count).toBe(1);
    expect(list.find((x) => x.name === 'Apples')!.qty).toBe(4);
  });

  it('returns count 0 for an empty plan', () => {
    const empty: Plan = {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    };
    expect(addWeekToList([], empty, recipes, []).count).toBe(0);
  });

  it('aggregates ingredients that normalise to one key as a single item', () => {
    const twoRecipes: Recipe[] = [
      {
        id: 'a',
        name: 'A',
        emoji: '🍲',
        servings: 1,
        time: '',
        steps: [],
        ingredients: [
          { name: 'Olive Oil', emoji: '🫒', qty: 1, unit: 'tbsp', category: 'Pantry' },
        ],
      },
      {
        id: 'b',
        name: 'B',
        emoji: '🍲',
        servings: 1,
        time: '',
        steps: [],
        ingredients: [
          { name: 'Olive-Oil', emoji: '🫒', qty: 2, unit: 'tbsp', category: 'Pantry' },
        ],
      },
    ];
    const wk: Plan = {
      Mon: ['a'],
      Tue: ['b'],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    };
    const { list, count } = addWeekToList([], wk, twoRecipes, []);
    // The count must match what actually lands on the list (one merged row, qty 3),
    // not the number of distinct display names.
    expect(count).toBe(1);
    expect(list).toHaveLength(1);
    expect(list[0].qty).toBe(3);
  });
});

describe('togglePantry', () => {
  it('adds then removes', () => {
    const a = togglePantry([], 'Salt');
    expect(a).toContain('Salt');
    expect(togglePantry(a, 'Salt')).not.toContain('Salt');
  });
});

describe('meal-plan slots', () => {
  it('encodes and decodes a slot-tagged entry', () => {
    expect(planRef('r1', 'breakfast')).toBe('breakfast:r1');
    expect(parsePlanEntry('breakfast:r1')).toEqual({ slot: 'breakfast', id: 'r1' });
    expect(planRecipeId('lunch:r2')).toBe('r2');
  });
  it('reads a legacy untagged entry as dinner', () => {
    expect(parsePlanEntry('r9')).toEqual({ slot: 'dinner', id: 'r9' });
    expect(planRecipeId('r9')).toBe('r9');
  });
  it('treats an unknown prefix as part of the id (defaults to dinner)', () => {
    expect(parsePlanEntry('brunch:r3')).toEqual({ slot: 'dinner', id: 'brunch:r3' });
  });
});

describe('plan operations', () => {
  const plan: Plan = {
    Mon: ['a', 'b'],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };
  it('assigns a meal, defaulting to the dinner slot', () => {
    expect(assignMeal(plan, 'Tue', 'c').Tue).toEqual(['dinner:c']);
    expect(assignMeal(plan, 'Tue', 'c', 'lunch').Tue).toEqual(['lunch:c']);
  });
  it('removes a meal by index', () => {
    expect(removeMeal(plan, 'Mon', 0).Mon).toEqual(['b']);
  });
  it('moves a meal between days and can retag its slot', () => {
    const out = moveMeal(plan, 'Mon', 0, 'Tue', 'lunch');
    expect(out.Mon).toEqual(['b']);
    expect(out.Tue).toEqual(['lunch:a']);
  });
  it('leaves the plan untouched when moving an unknown meal', () => {
    expect(moveMeal(plan, 'Mon', 5, 'Tue')).toBe(plan);
  });
});

describe('parseQty', () => {
  it('parses integers and decimals', () => {
    expect(parseQty('2')).toBe(2);
    expect(parseQty('1.5')).toBe(1.5);
  });
  it('parses simple and mixed fractions', () => {
    expect(parseQty('1/4')).toBe(0.25);
    expect(parseQty('3/4')).toBe(0.75);
    expect(parseQty('1 1/2')).toBe(1.5);
    expect(parseQty('1-1/2')).toBe(1.5);
  });
  it('parses unicode vulgar fractions, standalone and mixed', () => {
    expect(parseQty('½')).toBe(0.5);
    expect(parseQty('1½')).toBe(1.5);
    expect(parseQty('¼')).toBe(0.25);
  });
  it('ignores trailing text and falls back to 1', () => {
    expect(parseQty('2 cups')).toBe(2);
    expect(parseQty('')).toBe(1);
    expect(parseQty('a pinch')).toBe(1);
  });
});

describe('recipeFromDraft', () => {
  const catalog = [{ name: 'Apples', emoji: '🍎', category: 'Produce' as const }];
  it('parses ingredients and steps, resolving emoji from catalog', () => {
    const r = recipeFromDraft(
      {
        emoji: '🥧',
        name: '  Apple Pie ',
        servings: '6',
        time: '1 hr',
        ingredients: [
          { name: 'Apples', qty: '5', unit: '' },
          { name: '', qty: '', unit: '' },
        ],
        stepsText: 'Peel\nBake\n',
      },
      catalog,
      'r9',
    );
    expect(r.name).toBe('Apple Pie');
    expect(r.servings).toBe(6);
    expect(r.ingredients).toHaveLength(1);
    expect(r.ingredients[0].emoji).toBe('🍎');
    expect(r.steps).toEqual(['Peel', 'Bake']);
    expect(r.custom).toBe(true);
  });

  it('falls back to defaults for empty fields', () => {
    const r = recipeFromDraft(
      {
        emoji: '',
        name: 'Bare',
        servings: '',
        time: '',
        ingredients: [],
        stepsText: '',
      },
      catalog,
      'r10',
    );
    expect(r.emoji).toBe('🍽️');
    expect(r.servings).toBe(4);
    expect(r.time).toBe('—');
    expect(r.steps).toEqual(['Enjoy!']);
  });
});

describe('normalizeRecipe', () => {
  it('fills in safe defaults for a malformed recipe', () => {
    const r = normalizeRecipe({ name: 'X', servings: 0 });
    expect(r.servings).toBe(4);
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
    expect(r.emoji).toBe('🍽️');
    expect(typeof r.id).toBe('string');
  });

  it('drops junk ingredients and non-string steps', () => {
    const r = normalizeRecipe({
      name: 'Y',
      servings: 2,
      ingredients: [{ name: 'Eggs', qty: 2 }, { qty: 1 }, 'nope'],
      steps: ['Crack', 42, '', 'Fry'],
    });
    expect(r.ingredients).toHaveLength(1);
    expect(r.ingredients[0].name).toBe('Eggs');
    expect(r.steps).toEqual(['Crack', 'Fry']);
  });

  it('survives null / non-object input', () => {
    expect(normalizeRecipe(null).servings).toBe(4);
    expect(normalizeRecipe(undefined).ingredients).toEqual([]);
  });
});

describe('listKey', () => {
  it('builds keys with and without units', () => {
    expect(listKey('Greek Yogurt', '')).toBe('greek-yogurt');
    expect(listKey('Greek Yogurt', 'cup')).toBe('greek-yogurt-cup');
  });
});

describe('normalizeStringArray', () => {
  it('keeps only non-empty strings', () => {
    expect(normalizeStringArray(['a', '', 2, null, 'b'])).toEqual(['a', 'b']);
  });
  it('returns [] for non-array input', () => {
    expect(normalizeStringArray('x')).toEqual([]);
    expect(normalizeStringArray(null)).toEqual([]);
  });
});

describe('normalizeList', () => {
  it('coerces a missing/garbage qty to a finite number (never NaN)', () => {
    const out = normalizeList([
      { name: 'Milk', unit: '', emoji: '🥛', category: 'Dairy & Eggs' },
    ]);
    expect(out).toHaveLength(1);
    expect(Number.isFinite(out[0].qty)).toBe(true);
    expect(out[0].qty).toBe(1);
    expect(out[0].key).toBe('milk');
  });

  it('drops nameless/junk rows and merges duplicate keys', () => {
    const out = normalizeList([
      { name: 'Eggs', qty: 2, unit: '' },
      { name: 'Eggs', qty: 3, unit: '' },
      { qty: 5 },
      'junk',
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Eggs');
    expect(out[0].qty).toBe(5);
  });

  it('returns [] for non-array input', () => {
    expect(normalizeList(null)).toEqual([]);
    expect(normalizeList({})).toEqual([]);
  });
});

describe('normalizePlan', () => {
  it('coerces non-array day values to empty arrays and filters non-strings', () => {
    const out = normalizePlan({ Mon: ['a', 1, 'b'], Tue: 'nope', Wed: 42 });
    expect(out.Mon).toEqual(['a', 'b']);
    expect(out.Tue).toEqual([]);
    expect(out.Wed).toEqual([]);
  });

  it('always returns every day of the week', () => {
    const out = normalizePlan(null);
    expect(Object.keys(out).sort()).toEqual([
      'Fri',
      'Mon',
      'Sat',
      'Sun',
      'Thu',
      'Tue',
      'Wed',
    ]);
    expect(out.Mon).toEqual([]);
  });
});

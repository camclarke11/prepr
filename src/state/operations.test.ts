import { describe, expect, it } from 'vitest';
import {
  addRecipeToList,
  addWeekToList,
  changeQty,
  listKey,
  mergeIntoList,
  recipeFromDraft,
  removeMeal,
  assignMeal,
  togglePantry,
  normalizeRecipe,
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
});

describe('togglePantry', () => {
  it('adds then removes', () => {
    const a = togglePantry([], 'Salt');
    expect(a).toContain('Salt');
    expect(togglePantry(a, 'Salt')).not.toContain('Salt');
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
  it('assigns a meal', () => {
    expect(assignMeal(plan, 'Tue', 'c').Tue).toEqual(['c']);
  });
  it('removes a meal by index', () => {
    expect(removeMeal(plan, 'Mon', 0).Mon).toEqual(['b']);
  });
});

describe('recipeFromDraft', () => {
  const catalog = [
    { name: 'Apples', emoji: '🍎', category: 'Produce' as const },
  ];
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

import { describe, it, expect } from 'vitest';
import { aggregateShop, canonical } from './shop';
import type { CategoryName, Ingredient, ListItem, Plan, Recipe } from '../types';

function ing(
  name: string,
  qty: number,
  unit = '',
  category: CategoryName = 'Pantry',
): Ingredient {
  return { name, emoji: '🥘', qty, unit, category };
}

function recipe(id: string, name: string, ingredients: Ingredient[]): Recipe {
  return { id, name, emoji: '🍽️', servings: 4, time: '20 min', ingredients, steps: [] };
}

function item(name: string, qty = 1, unit = ''): ListItem {
  return {
    key: name.toLowerCase() + (unit ? '-' + unit : ''),
    name,
    emoji: '🛒',
    category: 'Pantry',
    qty,
    unit,
    checked: false,
    by: 'You',
  };
}

const emptyPlan = (): Plan => ({
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: [],
});

describe('canonical', () => {
  it('folds equivalent names onto one label', () => {
    expect(canonical('Onion Granules')).toBe(canonical('onion powder'));
    expect(canonical('Ground Beef')).toBe(canonical('beef mince'));
    expect(canonical('Courgette')).toBe(canonical('zucchini'));
  });
  it('normalises punctuation and case for non-equivalents', () => {
    expect(canonical('Olive  Oil')).toBe(canonical('olive-oil'));
  });
});

describe('aggregateShop', () => {
  it('pools and sums an ingredient across recipes', () => {
    const recipes = [
      recipe('a', 'Curry', [ing('Chicken Breast', 600, 'g', 'Meat & Fish')]),
      recipe('b', 'Stir fry', [ing('Chicken Breast', 500, 'g', 'Meat & Fish')]),
    ];
    const plan = { ...emptyPlan(), Mon: ['a'], Tue: ['b'] };
    const { toBuy } = aggregateShop({
      list: [],
      plan,
      recipes,
      pantry: [],
      source: 'plan',
    });
    const chicken = toBuy.filter((l) => l.name === 'Chicken Breast');
    expect(chicken).toHaveLength(1);
    expect(chicken[0].qty).toBe(1100);
    expect(chicken[0].fromRecipes).toEqual(['Curry', 'Stir fry']);
  });

  it('skips pantry staples, directly and via equivalence', () => {
    const recipes = [
      recipe('a', 'Dhal', [ing('Onion Powder', 1), ing('Cumin', 1), ing('Lentils', 1)]),
    ];
    const plan = { ...emptyPlan(), Mon: ['a'] };
    const { toBuy, owned, assumptions } = aggregateShop({
      list: [],
      plan,
      recipes,
      pantry: ['Cumin', 'Onion Granules'],
      source: 'plan',
    });
    expect(toBuy.map((l) => l.name)).toEqual(['Lentils']);
    expect(owned.map((l) => l.name).sort()).toEqual(['Cumin', 'Onion Powder']);
    // The equivalence (granules ⇄ powder) is surfaced; the exact match isn't.
    expect(assumptions.some((a) => a.includes('Onion Granules'))).toBe(true);
    expect(assumptions.some((a) => a.includes('Cumin'))).toBe(false);
  });

  it('flags recipe items not on the list as new, list items as not new', () => {
    const recipes = [recipe('a', 'Pasta', [ing('Fusilli', 300, 'g'), ing('Basil', 1)])];
    const plan = { ...emptyPlan(), Mon: ['a'] };
    const { toBuy } = aggregateShop({
      list: [item('Fusilli')],
      plan,
      recipes,
      pantry: [],
      source: 'both',
    });
    const fusilli = toBuy.find((l) => l.name === 'Fusilli');
    const basil = toBuy.find((l) => l.name === 'Basil');
    expect(fusilli?.isNew).toBe(false); // already on the base list
    expect(fusilli?.onList).toBe(true);
    expect(basil?.isNew).toBe(true); // net-new from the recipe
  });

  it("source 'list' ignores the plan", () => {
    const recipes = [recipe('a', 'Pasta', [ing('Fusilli', 300, 'g')])];
    const plan = { ...emptyPlan(), Mon: ['a'] };
    const { toBuy } = aggregateShop({
      list: [item('Milk')],
      plan,
      recipes,
      pantry: [],
      source: 'list',
    });
    expect(toBuy.map((l) => l.name)).toEqual(['Milk']);
  });

  it('merges differently-named equivalents and notes the combination', () => {
    const recipes = [
      recipe('a', 'Bolognese', [ing('Beef Mince', 500, 'g', 'Meat & Fish')]),
      recipe('b', 'Tacos', [ing('Ground Beef', 400, 'g', 'Meat & Fish')]),
    ];
    const plan = { ...emptyPlan(), Mon: ['a'], Tue: ['b'] };
    const { toBuy, assumptions } = aggregateShop({
      list: [],
      plan,
      recipes,
      pantry: [],
      source: 'plan',
    });
    const beef = toBuy.filter((l) => l.category === 'Meat & Fish');
    expect(beef).toHaveLength(1);
    expect(beef[0].qty).toBe(900);
    expect(assumptions.some((a) => a.startsWith('Combined'))).toBe(true);
  });
});

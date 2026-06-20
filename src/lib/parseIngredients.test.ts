import { describe, expect, it } from 'vitest';
import { parseIngredients } from './parseIngredients';

describe('parseIngredients', () => {
  it('parses qty + unit + name', () => {
    expect(parseIngredients('2 cups flour')).toEqual([
      { qty: '2', unit: 'cups', name: 'flour' },
    ]);
  });

  it('parses mixed numbers and unicode fractions', () => {
    expect(parseIngredients('1 1/2 cups sugar')[0]).toEqual({
      qty: '1.5',
      unit: 'cups',
      name: 'sugar',
    });
    expect(parseIngredients('½ tsp salt')[0]).toEqual({
      qty: '0.5',
      unit: 'tsp',
      name: 'salt',
    });
  });

  it('handles a quantity with no unit', () => {
    expect(parseIngredients('3 onions')[0]).toEqual({
      qty: '3',
      unit: '',
      name: 'onions',
    });
  });

  it('handles a name with no quantity', () => {
    expect(parseIngredients('Olive oil')[0]).toEqual({
      qty: '',
      unit: '',
      name: 'Olive oil',
    });
  });

  it('strips bullets and skips blank lines', () => {
    const out = parseIngredients('- 2 eggs\n\n• 1 cup milk\n');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ qty: '2', unit: '', name: 'eggs' });
    expect(out[1]).toEqual({ qty: '1', unit: 'cup', name: 'milk' });
  });

  it('parses fraction quantities like 1/4', () => {
    expect(parseIngredients('1/4 cup oats')[0]).toEqual({
      qty: '0.25',
      unit: 'cup',
      name: 'oats',
    });
  });
});

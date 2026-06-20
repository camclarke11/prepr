import { describe, expect, it } from 'vitest';
import { fmtQty, fmtQtyUnit } from './format';

describe('fmtQty', () => {
  it('keeps integers plain', () => {
    expect(fmtQty(3)).toBe('3');
  });
  it('uses unicode fractions', () => {
    expect(fmtQty(0.5)).toBe('½');
    expect(fmtQty(0.25)).toBe('¼');
    expect(fmtQty(0.75)).toBe('¾');
  });
  it('combines whole numbers with fractions', () => {
    expect(fmtQty(1.5)).toBe('1½');
    expect(fmtQty(2.25)).toBe('2¼');
  });
  it('falls back to a decimal for unusual values', () => {
    expect(fmtQty(1.1)).toBe('1.1');
  });
});

describe('fmtQtyUnit', () => {
  it('omits the unit when empty', () => {
    expect(fmtQtyUnit(2, '')).toBe('2');
  });
  it('includes the unit', () => {
    expect(fmtQtyUnit(1.5, 'cup')).toBe('1½ cup');
  });
});

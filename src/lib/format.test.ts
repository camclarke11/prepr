import { describe, expect, it } from 'vitest';
import { fmtQty, fmtQtyUnit, ingredientLines, timeAgo } from './format';

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

describe('ingredientLines', () => {
  it('builds a scaled bulleted list', () => {
    const out = ingredientLines(
      [
        { name: 'Flour', qty: 2, unit: 'cups' },
        { name: 'Eggs', qty: 3, unit: '' },
      ],
      2,
    );
    expect(out).toBe('• 4 cups Flour\n• 6 Eggs');
  });
});

describe('timeAgo', () => {
  const now = 1_000_000_000_000;
  const ago = (ms: number) => timeAgo(now - ms, now);
  it('says "just now" within ~45s', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(30_000)).toBe('just now');
  });
  it('counts minutes and hours', () => {
    expect(ago(5 * 60_000)).toBe('5m ago');
    expect(ago(3 * 3_600_000)).toBe('3h ago');
  });
  it('counts days and weeks, with "yesterday"', () => {
    expect(ago(24 * 3_600_000)).toBe('yesterday');
    expect(ago(3 * 24 * 3_600_000)).toBe('3d ago');
    expect(ago(14 * 24 * 3_600_000)).toBe('2w ago');
  });
  it('clamps future timestamps to "just now"', () => {
    expect(timeAgo(now + 5000, now)).toBe('just now');
  });
});

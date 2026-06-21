import { describe, expect, it } from 'vitest';
import { suggestEmoji, categoryForEmoji } from './emoji';

describe('suggestEmoji', () => {
  it('suggests the obvious emoji for a known name', () => {
    expect(suggestEmoji('mango')[0].emoji).toBe('🥭');
    expect(suggestEmoji('banana')[0].emoji).toBe('🍌');
  });

  it('matches on multi-word names', () => {
    const out = suggestEmoji('olive oil').map((f) => f.emoji);
    expect(out).toContain('🫗'); // oil
  });

  it('carries a sensible category with each suggestion', () => {
    const [top] = suggestEmoji('chicken');
    expect(top.emoji).toBe('🍗');
    expect(top.category).toBe('Meat & Fish');
  });

  it('returns nothing for empty or single-letter queries', () => {
    expect(suggestEmoji('')).toEqual([]);
    expect(suggestEmoji('a')).toEqual([]);
  });

  it('returns nothing for a totally unknown word', () => {
    expect(suggestEmoji('qwxz')).toEqual([]);
  });

  it('never returns more than the requested maximum', () => {
    expect(suggestEmoji('e', 3).length).toBeLessThanOrEqual(3);
    expect(suggestEmoji('berry', 2).length).toBeLessThanOrEqual(2);
  });
});

describe('categoryForEmoji', () => {
  it('returns the category for a known emoji', () => {
    expect(categoryForEmoji('🥦')).toBe('Produce');
    expect(categoryForEmoji('🥛')).toBe('Dairy & Eggs');
  });

  it('returns undefined for an unknown emoji', () => {
    expect(categoryForEmoji('🦄')).toBeUndefined();
  });
});

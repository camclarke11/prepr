import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from './share';
import type { PersistedState } from '../types';

const sample: Partial<PersistedState> = {
  list: [
    {
      key: 'café',
      name: 'Café Crème ☕',
      emoji: '☕',
      category: 'Pantry',
      qty: 1.5,
      unit: 'kg',
      checked: false,
      by: 'Sam',
    },
  ],
  pantry: ['Salt'],
  theme: 'dark',
};

describe('share codec', () => {
  it('round-trips data including unicode', () => {
    const out = decodeShare(encodeShare(sample));
    expect(out).toEqual(sample);
  });

  it('produces a URL-safe string (no + / =)', () => {
    const s = encodeShare(sample);
    expect(s).not.toMatch(/[+/=]/);
  });

  it('returns null for garbage', () => {
    expect(decodeShare('not-valid-base64!!!')).toBeNull();
    expect(decodeShare('')).toBeNull();
  });

  it('rejects encoded arrays (must be an object)', () => {
    expect(decodeShare(encodeShare([] as never))).toBeNull();
  });
});

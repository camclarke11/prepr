import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAppBadge } from './badge';

// The Badging API isn't present in jsdom; mutate navigator through a loose
// record so we can install / remove mocks without fighting the DOM types.
const nav = navigator as unknown as Record<string, unknown>;

afterEach(() => {
  delete nav.setAppBadge;
  delete nav.clearAppBadge;
  vi.restoreAllMocks();
});

describe('updateAppBadge', () => {
  it('sets the badge to the count when positive', () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    nav.setAppBadge = set;
    nav.clearAppBadge = clear;
    updateAppBadge(3);
    expect(set).toHaveBeenCalledWith(3);
    expect(clear).not.toHaveBeenCalled();
  });

  it('clears the badge when the count is zero', () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    nav.setAppBadge = set;
    nav.clearAppBadge = clear;
    updateAppBadge(0);
    expect(clear).toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('does nothing when the Badging API is unavailable', () => {
    expect(() => updateAppBadge(2)).not.toThrow();
  });

  it('swallows a rejected promise (app not installed)', () => {
    nav.setAppBadge = vi.fn().mockRejectedValue(new Error('not installed'));
    expect(() => updateAppBadge(1)).not.toThrow();
  });
});

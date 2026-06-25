import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { STORAGE_KEY, WELCOME_KEY } from '../state/store';
import {
  seedList,
  seedPlan,
  SEED_RECIPES,
  SEED_PANTRY,
  SEED_RECENTS,
  SEED_FREQUENCY,
} from '../data/seed';
import { SAMPLE_MEMBERS } from '../theme';

beforeEach(() => {
  // Production now starts on an empty clean slate; the suite runs against the
  // sample dataset, seeded here so makeInitialState loads it. The welcome flag
  // is pre-set so the first-run tutorial doesn't overlay every test.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      list: seedList(),
      recipes: SEED_RECIPES,
      plan: seedPlan(),
      pantry: SEED_PANTRY,
      recents: SEED_RECENTS,
      frequency: SEED_FREQUENCY,
      members: SAMPLE_MEMBERS,
      activeMember: 'You',
      theme: 'light',
    }),
  );
  localStorage.setItem(WELCOME_KEY, '1');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  // The hash-routing feature writes to the global location; reset it so tests
  // don't start on a tab left over from a previous case.
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
});

// jsdom has no matchMedia — default to the desktop breakpoint.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}

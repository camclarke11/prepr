import { useEffect, useState } from 'react';
import { DARK, LIGHT, type Palette } from './theme';
import { useStore } from './state/store';
import type { ThemeMode } from './types';

/** Reactive media query hook. */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 899px)');
}

/** Resolve "system" to the current OS colour scheme. */
export function useResolvedTheme(theme: ThemeMode): 'light' | 'dark' {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

/** The active colour palette, following the user's theme choice. */
export function usePalette(): Palette {
  const { state } = useStore();
  return useResolvedTheme(state.theme) === 'dark' ? DARK : LIGHT;
}

/**
 * Hold a screen Wake Lock while `enabled` (keeps the display awake during Cook
 * mode). Re-acquires on tab refocus — the browser drops the lock whenever the
 * page is hidden. A no-op where the API is unsupported.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* denied (e.g. low battery, tab not visible) — leave it */
      }
    };
    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}

import type { PersistedState } from '../types';

/**
 * Encode app data into a compact, URL-safe string so a list can be shared via a
 * link — no backend required. Uses UTF-8 + base64url.
 */
export function encodeShare(data: Partial<PersistedState>): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(s: string): Partial<PersistedState> | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

export const SHARE_PREFIX = '#data=';

export function buildShareUrl(data: Partial<PersistedState>): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : '';
  return base + SHARE_PREFIX + encodeShare(data);
}

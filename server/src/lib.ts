// Item-key helpers, kept identical to the frontend (src/theme.ts, src/state/
// operations.ts) so the server and clients merge items on the same identity.

/** Stable id from a display name. */
export function idify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (slug) return slug;
  // Names with no ASCII alphanumerics (other scripts, emoji-only) — derive a
  // stable token from their code points so they don't all collide on ''.
  return (
    'x' +
    Array.from(s.trim())
      .map((c) => (c.codePointAt(0) ?? 0).toString(36))
      .join('')
  );
}

/** A stable list key from a name + unit pair (the merge identity). */
export function listKey(name: string, unit: string): string {
  return idify(name) + (unit ? '-' + unit : '');
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A URL-safe random token used as the (secret, unguessable) household id. */
export function randomToken(bytes = 18): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** First grapheme of a name, uppercased — for the avatar initial. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0] ?? '?';
  return first.toUpperCase();
}

/** Avatar colours, matched to the frontend MEMBER_COLORS palette. */
export const MEMBER_COLORS = [
  '#3f7a4f',
  '#b35e54',
  '#5577ad',
  '#856aa8',
  '#c2933f',
  '#4f9aa6',
  '#c0795f',
];

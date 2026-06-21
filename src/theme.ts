import type { Category, CategoryName, Member } from './types';

/** Shopping categories with their accent + tint colours (from the design). */
export const CATEGORIES: Category[] = [
  { name: 'Produce', color: '#5d8a4a', tint: '#eef2e8' },
  { name: 'Bakery', color: '#b3823f', tint: '#f5efe3' },
  { name: 'Meat & Fish', color: '#b35e54', tint: '#f4e8e6' },
  { name: 'Dairy & Eggs', color: '#5577ad', tint: '#e9eef5' },
  { name: 'Pantry', color: '#c2933f', tint: '#f5efe0' },
  { name: 'Frozen', color: '#4f9aa6', tint: '#e6f1f2' },
  { name: 'Drinks', color: '#856aa8', tint: '#eee9f3' },
  { name: 'Snacks', color: '#c0795f', tint: '#f4ebe5' },
  { name: 'Household', color: '#84847b', tint: '#eeede9' },
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// A fresh install starts solo — just you. (Sample data uses SAMPLE_MEMBERS.)
export const DEFAULT_MEMBERS: Member[] = [
  { name: 'You', initial: 'Y', color: '#3f7a4f' },
];

/** The two-person roster used by the "Reset to sample" demo + tests. */
export const SAMPLE_MEMBERS: Member[] = [
  { name: 'You', initial: 'Y', color: '#3f7a4f' },
  { name: 'Sam', initial: 'S', color: '#b35e54' },
];

/** Avatar palette used when adding new members. */
export const MEMBER_COLORS = [
  '#3f7a4f',
  '#b35e54',
  '#5577ad',
  '#856aa8',
  '#c2933f',
  '#4f9aa6',
  '#c0795f',
];

export function categoryByName(name: string): Category {
  return CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Light + dark palette. The design ships light; dark is a tuned complement. */
export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunk: string;
  card: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentDeep: string;
  accentTintBg: string;
  accentTintBorder: string;
  accentTintText: string;
  headerBg: string;
  navBg: string;
  overlay: string;
  toastBg: string;
  toastText: string;
  toastAction: string;
  shadow: string;
}

export const LIGHT: Palette = {
  bg: '#f1efe9',
  surface: '#fbfaf7',
  surfaceAlt: '#f7f5ef',
  surfaceSunk: '#faf9f5',
  card: '#ffffff',
  border: '#e7e3da',
  borderSoft: '#ece9e1',
  text: '#1c1c1a',
  textMuted: '#7c7a72',
  textFaint: '#9a988f',
  accent: '#3f7a4f',
  accentDeep: '#2f5d3a',
  accentTintBg: '#eef3ec',
  accentTintBorder: '#d9e2d6',
  accentTintText: '#2f5d3a',
  headerBg: 'rgba(241,239,233,0.86)',
  navBg: '#fbfaf7',
  overlay: 'rgba(28,28,26,0.45)',
  toastBg: '#1c1c1a',
  toastText: '#ffffff',
  toastAction: '#9fd2a6',
  shadow: 'rgba(0,0,0,0.08)',
};

export const DARK: Palette = {
  bg: '#161715',
  surface: '#1e201d',
  surfaceAlt: '#24261f',
  surfaceSunk: '#202219',
  card: '#23251f',
  border: '#34372e',
  borderSoft: '#2c2f27',
  text: '#ece9e1',
  textMuted: '#a3a194',
  textFaint: '#7c7a6f',
  accent: '#5fa572',
  accentDeep: '#9fd2a6',
  accentTintBg: '#22301f',
  accentTintBorder: '#34472f',
  accentTintText: '#9fd2a6',
  headerBg: 'rgba(22,23,21,0.86)',
  navBg: '#1e201d',
  overlay: 'rgba(0,0,0,0.6)',
  toastBg: '#34372e',
  toastText: '#ffffff',
  toastAction: '#9fd2a6',
  shadow: 'rgba(0,0,0,0.4)',
};

/** Stable id from a display name. */
export function idify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (slug) return slug;
  // Names with no ASCII alphanumerics (other scripts, emoji-only) would all
  // slug to '' and collide — derive a stable token from their code points.
  return (
    'x' +
    Array.from(s.trim())
      .map((c) => (c.codePointAt(0) ?? 0).toString(36))
      .join('')
  );
}

export type { CategoryName };

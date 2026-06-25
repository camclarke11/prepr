// Pull a cooking duration out of a recipe step so Cook mode can offer a one-tap
// timer. Steps read like "Simmer 6–8 min" or "Roast 20–25 min until done"; we
// take the upper bound of a range (never undercook) and ignore oven temps,
// which have no time unit attached.

const DURATION = /(\d+)\s*(?:[–—-]\s*(\d+))?\s*(min(?:ute)?s?|hrs?|hours?)\b/i;

/** Seconds for the first timeable duration in a step, or null if there isn't one. */
export function parseStepDuration(text: string): number | null {
  const m = DURATION.exec(text);
  if (!m) return null;
  const lo = parseInt(m[1], 10);
  const hi = m[2] ? parseInt(m[2], 10) : lo;
  const value = Math.max(lo, hi);
  if (!value) return null;
  const isHour = /^h/i.test(m[3]);
  return value * (isHour ? 3600 : 60);
}

/** Format seconds as a clock, e.g. 90 → "1:30", 3600 → "60:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Format a quantity, preferring nice unicode fractions for common values. */
export function fmtQty(q: number): string {
  q = Math.round(q * 100) / 100;
  if (Number.isInteger(q)) return String(q);
  const fractions: Record<string, string> = {
    '0.25': '¼',
    '0.5': '½',
    '0.75': '¾',
    '0.33': '⅓',
    '0.67': '⅔',
    '0.2': '⅕',
    '0.4': '⅖',
    '0.6': '⅗',
    '0.8': '⅘',
    '0.13': '⅛',
    '0.38': '⅜',
    '0.63': '⅝',
    '0.88': '⅞',
  };
  const whole = Math.floor(q);
  const frac = (Math.round((q - whole) * 100) / 100).toString();
  if (fractions[frac]) return (whole ? whole : '') + fractions[frac];
  return String(q);
}

/** A quantity with an optional unit, e.g. "1½ cup" or "3". */
export function fmtQtyUnit(q: number, unit?: string): string {
  const base = fmtQty(q);
  return unit ? `${base} ${unit}` : base;
}

interface QtyNamed {
  name: string;
  qty: number;
  unit: string;
}

/** A plain-text bulleted ingredient list, scaled by `factor` — for clipboard. */
export function ingredientLines(items: QtyNamed[], factor = 1): string {
  return items
    .map((i) => `• ${fmtQtyUnit(i.qty * factor, i.unit)} ${i.name}`.trim())
    .join('\n');
}

/** A short, friendly "time ago" label for an activity timestamp. */
export function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  return `${w}w ago`;
}

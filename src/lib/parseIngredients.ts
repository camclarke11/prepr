export interface ParsedIngredient {
  name: string;
  qty: string;
  unit: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
};

const UNITS = new Set([
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'g',
  'gram',
  'grams',
  'kg',
  'ml',
  'l',
  'litre',
  'liter',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'clove',
  'cloves',
  'head',
  'heads',
  'can',
  'cans',
  'pack',
  'packs',
  'packet',
  'bunch',
  'bunches',
  'slice',
  'slices',
  'pinch',
  'pinches',
  'stick',
  'sticks',
  'handful',
  'jar',
  'jars',
  'tin',
  'tins',
  'sprig',
  'sprigs',
]);

function fractionToNumber(token: string): number | null {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split('/').map(Number);
    return b ? a / b : null;
  }
  if (/^\d+(\.\d+)?$/.test(token)) return parseFloat(token);
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseLine(raw: string): ParsedIngredient | null {
  const line = raw.trim().replace(/^[-*•·]\s*/, '');
  if (!line) return null;

  const tokens = line.split(/\s+/);
  let qtyNum: number | null = null;
  let idx = 0;

  const first = fractionToNumber(tokens[0]);
  if (first !== null) {
    qtyNum = first;
    idx = 1;
    // Mixed number, e.g. "1 1/2" or "1 ½".
    if (Number.isInteger(first) && tokens[1]) {
      const second = fractionToNumber(tokens[1]);
      if (second !== null && second < 1) {
        qtyNum = first + second;
        idx = 2;
      }
    }
  }

  let unit = '';
  if (idx < tokens.length) {
    const candidate = tokens[idx].toLowerCase().replace(/\.$/, '');
    if (UNITS.has(candidate)) {
      unit = tokens[idx].replace(/\.$/, '');
      idx++;
    }
  }

  const name = tokens.slice(idx).join(' ');
  const qty = qtyNum !== null ? String(round2(qtyNum)) : '';

  // A bare quantity with no name isn't a useful row — keep the raw text as name.
  if (!name) return { name: line, qty: '', unit: '' };
  return { name, qty, unit };
}

/** Parse pasted free-text (one ingredient per line) into structured rows. */
export function parseIngredients(text: string): ParsedIngredient[] {
  return text
    .split('\n')
    .map(parseLine)
    .filter((x): x is ParsedIngredient => x !== null);
}

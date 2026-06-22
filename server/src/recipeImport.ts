import type { Env } from './env';

/** A recipe draft in the exact shape the frontend's RecipeDraft expects. */
export interface ImportedRecipe {
  emoji: string;
  name: string;
  servings: string;
  time: string;
  ingredients: { name: string; qty: string; unit: string }[];
  stepsText: string;
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

// A real browser UA — many recipe sites 404/403 a generic bot.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SYSTEM = [
  'You turn recipe data from a webpage into STRICT JSON only — no markdown, no prose.',
  'Schema: {"emoji": string, "name": string, "servings": number, "time": string,',
  '"ingredients": [{"qty": string, "unit": string, "name": string}], "steps": [string]}.',
  'Split EVERY ingredient line into qty (e.g. "2", "1/2", ""), unit (e.g. "cup", "g", "tbsp", "")',
  'and a short name with no quantity in it. Keep ALL ingredients and ALL steps.',
  'emoji = one emoji that best represents the finished dish (never a flag or random emoji).',
  'time = a short human string like "30 min" or "1 hr 15 min" ("" if unknown). Do not invent.',
].join(' ');

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    emoji: { type: 'string' },
    name: { type: 'string' },
    servings: { type: 'number' },
    time: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          qty: { type: 'string' },
          unit: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['qty', 'unit', 'name'],
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['emoji', 'name', 'servings', 'time', 'ingredients', 'steps'],
};

/** Pull recipe content from a URL and normalise it into our draft via the LLM. */
export async function importRecipe(
  url: string,
  env: Env,
): Promise<{ draft?: ImportedRecipe; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'That doesn’t look like a valid link.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http(s) links are supported.' };
  }

  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) return { error: `Couldn’t fetch that page (${res.status}).` };
    html = (await res.text()).slice(0, 600_000);
  } catch {
    return { error: 'Couldn’t reach that page.' };
  }

  // Prefer the page's schema.org Recipe JSON-LD (compacted), else cleaned text.
  const title = pageTitle(html);
  let recipe = pickBestRecipe(html, title);
  // Guard against pages that embed an unrelated recipe in their JSON-LD: if the
  // chosen recipe's name shares nothing with the page title, read the article.
  if (recipe && !nameMatchesTitle(recipe, title)) recipe = null;
  const content = recipe
    ? JSON.stringify(compactRecipe(recipe))
    : cleanText(html).slice(0, 8000);
  if (!content.trim()) return { error: 'No readable recipe found on that page.' };

  let resp: unknown;
  try {
    const out = (await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Recipe data:\n${content.slice(0, 9000)}` },
      ],
      max_tokens: 2048,
      temperature: 0.2,
      response_format: { type: 'json_schema', json_schema: DRAFT_SCHEMA },
    } as Parameters<typeof env.AI.run>[1])) as { response?: unknown };
    resp = out.response;
  } catch {
    return { error: 'The importer is unavailable right now.' };
  }

  const draft =
    resp && typeof resp === 'object'
      ? toDraftFromRaw(resp as RawRecipe)
      : typeof resp === 'string'
        ? parseDraft(resp)
        : null;
  if (!draft || !draft.name) {
    return { error: 'Couldn’t read a recipe from that page.' };
  }
  return { draft };
}

// --- JSON-LD extraction ------------------------------------------------------

type Obj = Record<string, unknown>;

/** All schema.org Recipe objects across every ld+json block (incl. @graph). */
function collectRecipes(html: string): Obj[] {
  const out: Obj[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      walk(JSON.parse(m[1].trim()), out);
    } catch {
      /* skip malformed block */
    }
  }
  return out;
}

function walk(node: unknown, out: Obj[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out);
    return;
  }
  const o = node as Obj;
  const t = o['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) out.push(o);
  if (o['@graph']) walk(o['@graph'], out);
}

/** Pick the recipe that best matches the page (title match, then most ingredients). */
function pickBestRecipe(html: string, title: string): Obj | null {
  const recipes = collectRecipes(html);
  if (recipes.length <= 1) return recipes[0] ?? null;
  const t = title.toLowerCase();
  let best = recipes[0];
  let bestScore = -1;
  for (const r of recipes) {
    const name = typeof r.name === 'string' ? r.name.toLowerCase() : '';
    const ings = Array.isArray(r.recipeIngredient) ? r.recipeIngredient.length : 0;
    let score = ings;
    if (name && t && (t.includes(name) || name.includes(t.split('|')[0].trim())))
      score += 100;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/** Reduce a JSON-LD Recipe to just what the model needs. */
function compactRecipe(r: Obj): {
  name: string;
  servings: string;
  time: string;
  ingredients: string[];
  instructions: string[];
} {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const yieldRaw = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
  const servings =
    typeof yieldRaw === 'number' ? String(yieldRaw) : str(yieldRaw).trim();
  const time = humanizeDuration(
    str(r.totalTime) || str(r.cookTime) || str(r.prepTime),
  );
  const ingredients = Array.isArray(r.recipeIngredient)
    ? r.recipeIngredient.map(str).filter(Boolean)
    : [];
  return {
    name: str(r.name).trim(),
    servings,
    time,
    ingredients,
    instructions: flattenInstructions(r.recipeInstructions),
  };
}

function flattenInstructions(ri: unknown): string[] {
  if (typeof ri === 'string') return [ri];
  if (!Array.isArray(ri)) return [];
  const out: string[] = [];
  for (const x of ri) {
    if (typeof x === 'string') {
      out.push(x);
    } else if (x && typeof x === 'object') {
      const o = x as Obj;
      if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) {
        for (const s of o.itemListElement) {
          const so = (s ?? {}) as Obj;
          if (typeof so.text === 'string') out.push(so.text);
        }
      } else if (typeof o.text === 'string') {
        out.push(o.text);
      } else if (typeof o.name === 'string') {
        out.push(o.name);
      }
    }
  }
  return out;
}

/** ISO-8601 duration (PT1H15M) -> "1 hr 15 min". Passes through human strings. */
function humanizeDuration(v: string): string {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec((v || '').trim());
  if (!m) return v || '';
  const total = (m[1] ? +m[1] : 0) * 60 + (m[2] ? +m[2] : 0);
  if (!total) return '';
  const h = Math.floor(total / 60);
  const min = total % 60;
  return [h ? `${h} hr` : '', min ? `${min} min` : ''].filter(Boolean).join(' ');
}

/** Decode the HTML entities that JSON-LD text often carries (&#39; etc.). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Strip a full HTML page down to readable text (fallback when no JSON-LD). */
function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Does the recipe name share a meaningful word with the page title? */
function nameMatchesTitle(recipe: Obj, title: string): boolean {
  const name = typeof recipe.name === 'string' ? recipe.name.toLowerCase() : '';
  const t = title.toLowerCase();
  if (!name || !t) return true; // can't judge — keep it
  const words = name.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  return words.length === 0 || words.some((w) => t.includes(w));
}

function pageTitle(html: string): string {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) return og[1];
  const t = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return t ? t[1] : '';
}

// --- Model output -> draft ---------------------------------------------------

interface RawRecipe {
  emoji?: unknown;
  name?: unknown;
  servings?: unknown;
  time?: unknown;
  ingredients?: unknown;
  steps?: unknown;
}

function parseDraft(text: string): ImportedRecipe | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return toDraftFromRaw(JSON.parse(text.slice(start, end + 1)) as RawRecipe);
  } catch {
    return null;
  }
}

function toDraftFromRaw(raw: RawRecipe): ImportedRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i) => {
          const o = (i ?? {}) as Obj;
          let qty = str(o.qty).trim();
          let unit = str(o.unit).trim();
          // The model sometimes leaves the unit in qty ("100g"); split it out.
          const mm = /^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞-]+)([a-zA-Z]+)$/.exec(qty);
          if (mm && (!unit || unit.toLowerCase() === mm[2].toLowerCase())) {
            qty = mm[1].trim();
            unit = unit || mm[2];
          }
          return { name: decodeEntities(str(o.name)).trim(), qty, unit };
        })
        .filter((i) => i.name)
    : [];
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => decodeEntities(str(s)).trim()).filter(Boolean)
    : [];
  const servings =
    typeof raw.servings === 'number' && Number.isFinite(raw.servings)
      ? String(Math.round(raw.servings))
      : str(raw.servings).replace(/[^0-9]/g, '');
  // Keep only a real emoji — the model occasionally returns a ":shortcode:".
  const emojiMatch = str(raw.emoji).match(/\p{Extended_Pictographic}/u);
  return {
    emoji: emojiMatch ? emojiMatch[0] : '',
    name: decodeEntities(str(raw.name)).trim().slice(0, 80),
    servings,
    time: humanizeDuration(str(raw.time).trim()).slice(0, 24),
    ingredients,
    stepsText: steps.join('\n'),
  };
}

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

const SYSTEM = [
  'You extract a single recipe from webpage content and return STRICT JSON only.',
  'No markdown, no code fences, no commentary — just one JSON object.',
  'Schema: {"emoji": string, "name": string, "servings": number, "time": string,',
  '"ingredients": [{"qty": string, "unit": string, "name": string}], "steps": [string]}.',
  'emoji is a single emoji for the dish. time is like "30 min" or "" if unknown.',
  'Split each ingredient into qty (e.g. "2", "1/2", ""), unit (e.g. "cup", "g", "") and a',
  'short name with no quantity in it. steps is an ordered list of instruction sentences.',
  'Use "" or [] for anything missing. Do not invent ingredients or steps.',
].join(' ');

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
        'User-Agent': 'preprbot/1.0 (+https://prepr.camlc.dev)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) return { error: `Couldn’t fetch that page (${res.status}).` };
    html = (await res.text()).slice(0, 400_000);
  } catch {
    return { error: 'Couldn’t reach that page.' };
  }

  // Prefer the page's schema.org Recipe JSON-LD; fall back to cleaned text.
  const content = extractRecipeJsonLd(html) ?? cleanText(html);
  if (!content.trim()) return { error: 'No readable recipe found on that page.' };

  let resp: unknown;
  try {
    const out = (await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: content.slice(0, 8000) },
      ],
      max_tokens: 1024,
      temperature: 0.2,
      // Constrain the model to valid JSON in our exact shape (LLMs otherwise
      // emit subtly-broken JSON that fails to parse).
      response_format: { type: 'json_schema', json_schema: DRAFT_SCHEMA },
    } as Parameters<typeof env.AI.run>[1])) as { response?: unknown };
    resp = out.response;
  } catch {
    return { error: 'The importer is unavailable right now.' };
  }

  // With json_schema the response is usually already an object; tolerate a string.
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

/** Find a schema.org Recipe object inside <script type="application/ld+json">. */
function extractRecipeJsonLd(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (recipe) return JSON.stringify(recipe).slice(0, 8000);
  }
  return null;
}

function findRecipe(node: unknown): unknown | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
  if (isRecipe) return obj;
  if (obj['@graph']) return findRecipe(obj['@graph']);
  return null;
}

/** Strip a full HTML page down to readable text. */
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

interface RawRecipe {
  emoji?: unknown;
  name?: unknown;
  servings?: unknown;
  time?: unknown;
  ingredients?: unknown;
  steps?: unknown;
}

/** Parse a JSON string of the model's output into a safe ImportedRecipe. */
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

/** Coerce a parsed object into a safe ImportedRecipe. */
function toDraftFromRaw(raw: RawRecipe): ImportedRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i) => {
          const o = (i ?? {}) as Record<string, unknown>;
          return { name: str(o.name).trim(), qty: str(o.qty).trim(), unit: str(o.unit).trim() };
        })
        .filter((i) => i.name)
    : [];
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => str(s).trim()).filter(Boolean)
    : [];
  const servings =
    typeof raw.servings === 'number' && Number.isFinite(raw.servings)
      ? String(Math.round(raw.servings))
      : str(raw.servings).replace(/[^0-9]/g, '');
  return {
    emoji: str(raw.emoji).trim().slice(0, 4),
    name: str(raw.name).trim().slice(0, 80),
    servings,
    time: str(raw.time).trim().slice(0, 24),
    ingredients,
    stepsText: steps.join('\n'),
  };
}

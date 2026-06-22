import type { Env } from './env';

// The chat model for recipe import + smart-list. Centralised so swapping is a
// one-line change.
//
// Llama 4 Scout — the newest generation on Workers AI and a big step up from the
// 3.1-8B we started with. (Google's Gemma 3 was removed on 2026-05-30 and there
// is no Gemma 4 on Workers AI.) For maximum quality over speed, swap to
// '@cf/meta/llama-3.3-70b-instruct-fp8-fast' — both use the response_format path.
export const CHAT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

// Google's Gemma takes its JSON schema via `guided_json` and has no system role;
// the Llama family uses a system message + `response_format: json_schema`. Adapt
// per model so the model is a one-line swap.
const IS_GEMMA = CHAT_MODEL.includes('gemma');

/**
 * Run the chat model with a JSON schema and return its raw `response` (a JSON
 * object or string — callers already parse defensively). Throws on inference
 * failure so callers can fall back.
 */
export async function runJson(
  env: Env,
  opts: {
    system: string;
    user: string;
    schema: object;
    maxTokens?: number;
    temperature?: number;
  },
): Promise<unknown> {
  const { system, user, schema, maxTokens = 1024, temperature = 0.2 } = opts;
  const input = IS_GEMMA
    ? {
        // Gemma has no system role — fold the instructions into the user turn.
        messages: [{ role: 'user', content: `${system}\n\n${user}` }],
        max_tokens: maxTokens,
        temperature,
        guided_json: schema,
      }
    : {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_schema', json_schema: schema },
      };
  const out = (await env.AI.run(
    CHAT_MODEL,
    input as Parameters<typeof env.AI.run>[1],
  )) as { response?: unknown };
  return out.response;
}

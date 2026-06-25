import type { Env } from './env';
import { randomToken } from './lib';

// Optional recipe photos live in an R2 bucket. The Worker accepts an upload
// (already downscaled client-side), stores it under a random key, and serves it
// back. Keys are unguessable, so a public GET is fine for non-sensitive photos.

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous; the client sends ~<300 KB.

/** Store an uploaded image in R2; returns its served URL. */
export async function uploadPhoto(
  request: Request,
  env: Env,
): Promise<{ url?: string; error?: string }> {
  const type = (request.headers.get('Content-Type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const ext = EXT[type];
  if (!ext) return { error: 'Unsupported image type' };
  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return { error: 'Empty image' };
  if (body.byteLength > MAX_BYTES) return { error: 'Image too large' };
  const key = `${randomToken(16)}.${ext}`;
  await env.PHOTOS.put(key, body, { httpMetadata: { contentType: type } });
  return { url: `${new URL(request.url).origin}/api/image/${key}` };
}

/** Serve a stored image by key (immutable, long-cached). */
export async function servePhoto(key: string, env: Env): Promise<Response> {
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

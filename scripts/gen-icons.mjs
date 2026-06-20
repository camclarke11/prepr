// Generates prepr's icon set from a single vector source.
// Run with: npm install --no-save sharp && node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');
mkdirSync(pub, { recursive: true });

const GREEN = '#3f7a4f';

// A geometric lowercase "p": a rounded stem (the descender) plus a ring bowl.
const glyph = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="116" fill="${GREEN}"/>
  <g fill="#ffffff">
    <rect x="172" y="150" width="60" height="250" rx="20"/>
    <path fill-rule="evenodd" d="
      M 250 140
      a 94 94 0 1 1 0 188
      a 94 94 0 1 1 0 -188
      z
      M 258 192
      a 42 42 0 1 0 0 84
      a 42 42 0 1 0 0 -84
      z"/>
  </g>
</svg>`;

const svgSource = glyph(512).trim();
writeFileSync(join(pub, 'favicon.svg'), svgSource);

const targets = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
];

for (const [name, size] of targets) {
  await sharp(Buffer.from(glyph(size)))
    .resize(size, size)
    .png()
    .toFile(join(pub, name));
  console.log('wrote', name);
}
console.log('wrote favicon.svg');

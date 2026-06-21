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
const P_GLYPH = `
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
  </g>`;

// Standard icon: rounded-rect background, full-bleed glyph (used for 'any').
const glyph = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="116" fill="${GREEN}"/>
  ${P_GLYPH}
</svg>`;

// Maskable icon: square (no corner radius — the platform applies the mask) with
// the glyph scaled into the ~80% safe zone so circular/squircle masks don't crop it.
const maskable = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${GREEN}"/>
  <g transform="translate(256 270) scale(0.7) translate(-256 -270)">
    ${P_GLYPH}
  </g>
</svg>`;

const svgSource = glyph(512).trim();
writeFileSync(join(pub, 'favicon.svg'), svgSource);

const targets = [
  ['pwa-192.png', 192, glyph],
  ['pwa-512.png', 512, glyph],
  ['apple-touch-icon.png', 180, glyph],
  ['favicon-32.png', 32, glyph],
  ['maskable-192.png', 192, maskable],
  ['maskable-512.png', 512, maskable],
];

for (const [name, size, render] of targets) {
  await sharp(Buffer.from(render(size)))
    .resize(size, size)
    .png()
    .toFile(join(pub, name));
  console.log('wrote', name);
}
console.log('wrote favicon.svg');

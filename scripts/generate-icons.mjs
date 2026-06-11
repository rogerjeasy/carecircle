/**
 * Generate the PWA icon set (public/icons/*) from an inline brand SVG — the Kintwadi heart on
 * the evergreen-teal brand color (--primary, #0F766E). Run once (or whenever the brand changes):
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs: icon-192.png, icon-512.png (any-purpose, rounded look comes from the OS mask),
 * icon-maskable-512.png (extra safe-zone padding for Android maskable), apple-touch-icon.png (180).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

/**
 * The brand mark: a filled heart (lucide heart outline, filled) centered on teal.
 * `pad` = fraction of the canvas kept as margin around the heart (maskable wants ~0.2+).
 */
function brandSvg(size, pad) {
  const inner = size * (1 - 2 * pad);
  const offset = size * pad;
  // The lucide heart path lives in a 24x24 viewBox.
  const scale = inner / 24;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#0F766E"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </g>
</svg>`);
}

const jobs = [
  { file: 'icon-192.png', size: 192, pad: 0.16 },
  { file: 'icon-512.png', size: 512, pad: 0.16 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.24 }, // safe zone for Android masks
  { file: 'apple-touch-icon.png', size: 180, pad: 0.16 },
];

for (const { file, size, pad } of jobs) {
  await sharp(brandSvg(size, pad)).png().toFile(path.join(outDir, file));
  console.log('wrote', path.join('public', 'icons', file));
}

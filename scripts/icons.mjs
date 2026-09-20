// Draws the app icons from the same mark the pages use: "RN", white on
// the wine circle. Run with `node scripts/icons.mjs` after changing it.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const wine = "#8b1e3f";
// Maskable icons get cropped to a circle by Android, so the mark stays in
// the middle 80%; the same file serves everywhere.
const svg = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${wine}"/>
  <circle cx="50" cy="50" r="${50 - pad}" fill="${wine}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="40" fill="#ffffff">RN</text>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["public/icons/icon-192.png", 192, 8],
  ["public/icons/icon-512.png", 512, 8],
  ["public/icons/apple-touch-icon.png", 180, 4],
];
for (const [file, size, pad] of jobs) {
  await sharp(Buffer.from(svg(size, pad))).resize(size, size).png().toFile(file);
  console.log(file, size);
}

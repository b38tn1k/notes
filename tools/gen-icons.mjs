// Generate the app icons from the same symmetric-critter algorithm as the app
// (genSprite) and the OG card. Pure Node — no browser, no deps. Emits:
//   public/icon.svg            crisp tab favicon (black square, neon critter)
//   public/favicon-32.png      PNG fallback for older browsers
//   public/apple-touch-icon.png  180x180 iOS home-screen icon
//   public/icon-512.png        512x512 high-res / PWA
// Run: node tools/gen-icons.mjs
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';

// same seeded PRNG the app + OG card use (mulberry32)
const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// the app's genSprite, returning filled cells in a (w*2) x h grid (left half + mirror)
function critterCells(w, h, seed) {
  const rand = mulberry32(seed);
  const grid = []; let max = 0;
  for (let i = 0; i < w; i++) { grid[i] = []; for (let j = 0; j < h; j++) { let v = rand() * 2; v += Math.sin((Math.PI / 180) * (90 * i / w)); v += Math.sin((Math.PI / 180) * (180 * (j / h))); grid[i][j] = v; if (v > max) max = v; } }
  let sum = 0, cnt = 0; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { grid[i][j] /= max; sum += grid[i][j]; cnt++; }
  const thresh = sum / cnt; const cells = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (grid[i][j] > thresh) { cells.push([i, j]); cells.push([w * 2 - 1 - i, j]); }
  return cells;
}

// --- minimal PNG encoder (RGBA, no deps) ---
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// paint the critter (scaled + centered). opaque=true → black bg (touch icons);
// opaque=false → transparent bg (favicon floats on the tab, no square).
function renderPNG(size, cells, [r, g, b], opaque = true) {
  const buf = Buffer.alloc(size * size * 4);                            // zeroed = transparent
  if (opaque) for (let i = 0; i < size * size; i++) buf[i * 4 + 3] = 255;   // black, opaque
  const gw = 14, gh = 9;                                                // critter grid is 14 wide, 9 tall
  const scale = Math.floor(Math.min(size * 0.86 / gw, size * 0.86 / gh));
  const offX = Math.round((size - gw * scale) / 2), offY = Math.round((size - gh * scale) / 2);
  for (const [cx, cy] of cells)
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const px = offX + cx * scale + x, py = offY + cy * scale + y;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const i = (py * size + px) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  return encodePNG(size, size, buf);
}

// icon critter = the OG card's first green critter (same w/h/seed), for a matched set
const cells = critterCells(7, 9, 101);
const GREEN = [0, 255, 0];

// crisp SVG favicon: TRANSPARENT bg, critter centered in an 18×18 box with margin
// (so it floats on the tab instead of a black square, and won't clip when rounded)
const rects = cells.map(([cx, cy]) => `<rect x="${2 + cx}" y="${4 + cy}" width="1" height="1"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" shape-rendering="crispEdges"><g fill="#0f0">${rects}</g></svg>\n`;

writeFileSync('public/icon.svg', svg);
writeFileSync('public/favicon-32.png', renderPNG(32, cells, GREEN, false));   // transparent, matches the SVG
writeFileSync('public/apple-touch-icon.png', renderPNG(180, cells, GREEN, true));   // opaque black (iOS renders transparency as black anyway)
writeFileSync('public/icon-512.png', renderPNG(512, cells, GREEN, true));
console.log('icons written:', cells.length, 'cells → icon.svg, favicon-32.png, apple-touch-icon.png, icon-512.png');

const fs = require('fs');
const path = require('path');

const SIZES = [32, 48, 64, 128, 256];

function aaEllipse(pixels, w, cx, cy, rx, ry, r, g, b, a, angle) {
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const bb = Math.max(Math.ceil(rx), Math.ceil(ry)) + 2;
  for (let y = Math.max(0, cy - bb); y < Math.min(w, cy + bb); y++) {
    for (let x = Math.max(0, cx - bb); x < Math.min(w, cx + bb); x++) {
      const dx = x - cx, dy = y - cy;
      const tx = dx * cosA + dy * sinA;
      const ty = -dx * sinA + dy * cosA;
      const d = (tx * tx) / (rx * rx) + (ty * ty) / (ry * ry);
      if (d <= 1.2) {
        const alpha = Math.round(a * Math.max(0, Math.min(1, 1 - d)));
        if (alpha > 0) {
          const i = (y * w + x) * 4;
          const blend = alpha / 255;
          pixels[i] = Math.round(pixels[i] * (1 - blend) + b * blend);
          pixels[i + 1] = Math.round(pixels[i + 1] * (1 - blend) + g * blend);
          pixels[i + 2] = Math.round(pixels[i + 2] * (1 - blend) + r * blend);
          pixels[i + 3] = Math.round(pixels[i + 3] * (1 - blend) + 255 * blend);
        }
      }
    }
  }
}

function aaRect(pixels, w, x1, y1, x2, y2, r, g, b, a) {
  for (let y = Math.max(0, y1 - 1); y < Math.min(w, y2 + 1); y++) {
    for (let x = Math.max(0, x1 - 1); x < Math.min(w, x2 + 1); x++) {
      const dx = Math.max(x1 - x, 0, x - x2);
      const dy = Math.max(y1 - y, 0, y - y2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 1) {
        const alpha = Math.round(a * Math.max(0, Math.min(1, 1 - d)));
        if (alpha > 0) {
          const i = (y * w + x) * 4;
          const blend = alpha / 255;
          pixels[i] = Math.round(pixels[i] * (1 - blend) + b * blend);
          pixels[i + 1] = Math.round(pixels[i + 1] * (1 - blend) + g * blend);
          pixels[i + 2] = Math.round(pixels[i + 2] * (1 - blend) + r * blend);
          pixels[i + 3] = Math.round(pixels[i + 3] * (1 - blend) + 255 * blend);
        }
      }
    }
  }
}

function drawPixels(size) {
  const w = size, h = size;
  const pixels = new Uint8Array(w * h * 4);
  // Start fully transparent
  for (let i = 0; i < pixels.length; i++) pixels[i] = 0;

  const cx = w / 2, cy = h / 2;
  const s = size / 64;

  // Background circle with gradient
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const rMax = cx * 0.92;
      if (dist < rMax) {
        const t = dist / rMax;
        const br = Math.round(80 + (1 - t) * 60);
        const bg = Math.round(40 + (1 - t) * 70);
        const bb = Math.round(170 + (1 - t) * 85);
        const alpha = Math.round(255 * Math.max(0, Math.min(1, (rMax - dist + 0.5))));
        const i = (y * w + x) * 4;
        pixels[i] = bb; pixels[i + 1] = bg; pixels[i + 2] = br; pixels[i + 3] = alpha;
      }
    }
  }

  // Note head (tilted filled ellipse)
  aaEllipse(pixels, w,
    cx - s * 12, cy + s * 0.5,
    s * 10, s * 7.5,
    255, 255, 255, 255, 0.3);

  // Stem (vertical rectangle)
  const stemX1 = cx + s * 3;
  const stemX2 = cx + s * 5.5;
  const stemY1 = cy - s * 32;
  const stemY2 = cy + s * 16;
  aaRect(pixels, w, stemX1, stemY1, stemX2, stemY2, 255, 255, 255, 255);

  // Flag (curved shape - drawn as overlapping circles)
  const flagCx1 = cx + s * 2;
  const flagCy1 = cy - s * 32;
  aaEllipse(pixels, w, flagCx1, flagCy1, s * 8, s * 5, 255, 255, 255, 255, -0.1);

  const flagCx2 = cx + s * 6;
  const flagCy2 = cy - s * 27;
  aaEllipse(pixels, w, flagCx2, flagCy2, s * 7, s * 4, 255, 255, 255, 255, 0.1);

  const flagCx3 = cx + s * 10;
  const flagCy3 = cy - s * 22;
  aaEllipse(pixels, w, flagCx3, flagCy3, s * 6, s * 3, 255, 255, 255, 255, 0.2);

  return pixels;
}

function createIco(sizes) {
  const imageBuffers = [];

  for (const s of sizes) {
    const pixels = drawPixels(s);
    const rowSize = ((s * 32 + 31) >> 5) << 2;
    const bmp = Buffer.alloc(rowSize * s, 0);

    for (let y = 0; y < s; y++) {
      const irow = (s - 1 - y) * rowSize;
      for (let x = 0; x < s; x++) {
        const src = (y * s + x) * 4;
        const dst = irow + x * 4;
        bmp[dst] = pixels[src];
        bmp[dst + 1] = pixels[src + 1];
        bmp[dst + 2] = pixels[src + 2];
        bmp[dst + 3] = pixels[src + 3];
      }
    }

    const andRow = ((s + 31) >> 5) << 2;
    const ih = Buffer.alloc(40);
    ih.writeUInt32LE(40, 0);
    ih.writeInt32LE(s, 4);
    ih.writeInt32LE(s * 2, 8);
    ih.writeUInt16LE(1, 12);
    ih.writeUInt16LE(32, 14);
    ih.writeUInt32LE(0, 16);
    ih.writeUInt32LE(bmp.length + andRow * s, 20);

    imageBuffers.push(Buffer.concat([ih, bmp, Buffer.alloc(andRow * s, 0)]));
  }

  let off = 6 + sizes.length * 16;
  const entries = sizes.map((s, i) => {
    const e = { w: s === 256 ? 0 : s, h: s === 256 ? 0 : s, size: imageBuffers[i].length, offset: off };
    off += imageBuffers[i].length;
    return e;
  });

  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(sizes.length, 4);

  const dir = Buffer.alloc(sizes.length * 16);
  for (let i = 0; i < sizes.length; i++) {
    const b = i * 16;
    dir.writeUInt8(entries[i].w, b);
    dir.writeUInt8(entries[i].h, b + 1);
    dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4); dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(entries[i].size, b + 8);
    dir.writeUInt32LE(entries[i].offset, b + 12);
  }

  return Buffer.concat([hdr, dir, ...imageBuffers]);
}

const outPath = path.join(__dirname, '..', 'build', 'icon.ico');
fs.writeFileSync(outPath, createIco(SIZES));
console.log('Icon generated:', outPath);

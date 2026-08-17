// One-off generator for Feature 036 bespoke player vehicle PNGs (T046).
// Writes four VISIBLY DISTINCT top-down racer silhouettes to
// public/assets/race/vehicles/player-<entrant>.png. To match the established
// player-vehicle.svg convention, the nose of every vehicle points toward +x
// (right), so GameObjects.setRotation(headingRadians) points the nose along
// the retained track heading. Provenance is tracked in
// specs/036-race-visual-spectacle/vehicle-asset-manifest.md (generated).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- minimal PNG encoder (RGBA, 8-bit) -----------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
// ---- vehicle drawing ------------------------------------------------------
const W = 88;
const H = 50;

function inEllipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
function inRect(px, py, x0, y0, x1, y1) {
  return px >= x0 && px <= x1 && py >= y0 && py <= y1;
}

// Returns a layer name for the pixel, or null for transparent. The nose faces
// +x (right); shapes intentionally differ per silhouette (T046/T048).
function layerOf(type, px, py) {
  switch (type) {
    case "highwheel": { // boxy coachworks touring racer
      if (
        inEllipse(px, py, 22, 14, 8, 7) || inEllipse(px, py, 66, 14, 8, 7)
        || inEllipse(px, py, 22, 36, 8, 7) || inEllipse(px, py, 66, 36, 8, 7)
      ) return "wheel";
      if (inRect(px, py, 18, 12, 72, 38)) {
        if (inEllipse(px, py, 74, 25, 3.5, 7)) return "lamp";
        if (inRect(px, py, 58, 16, 68, 20) || inRect(px, py, 58, 30, 68, 34)) return "accent";
        if (inRect(px, py, 58, 18, 70, 32)) return "glass";
        return "body";
      }
      return null;
    }
    case "needle": { // long, slim velodrome speedster (tapered tail)
      if (inEllipse(px, py, 24, 25, 6, 6) || inEllipse(px, py, 66, 25, 6, 6)) return "wheel";
      if (inEllipse(px, py, 44, 25, 40, 10)) {
        if (inEllipse(px, py, 62, 25, 20, 5)) return "glass";
        if (inEllipse(px, py, 46, 25, 33, 8)) return "accent";
        if (inEllipse(px, py, 40, 25, 30, 7)) return "body";
        return "body";
      }
      return null;
    }
    case "lark": { // broad fieldworks crossbreed with exposed wheels + rear wing
      if (
        inEllipse(px, py, 12, 15, 6, 6) || inEllipse(px, py, 76, 15, 6, 6)
        || inEllipse(px, py, 12, 35, 6, 6) || inEllipse(px, py, 76, 35, 6, 6)
      ) return "wheel";
      if (inRect(px, py, 6, 22, 18, 42)) return "wing";
      if (inEllipse(px, py, 46, 27, 32, 18)) {
        if (inEllipse(px, py, 62, 27, 15, 8)) return "glass";
        if (inEllipse(px, py, 40, 28, 20, 13)) return "accent";
        if (inEllipse(px, py, 42, 27, 18, 11)) return "body";
        return "body";
      }
      return null;
    }
    case "hush": { // low, rounded backroads coupe with a roof band
      if (
        inEllipse(px, py, 26, 15, 6, 6) || inEllipse(px, py, 60, 15, 6, 6)
        || inEllipse(px, py, 26, 35, 6, 6) || inEllipse(px, py, 60, 35, 6, 6)
      ) return "wheel";
      if (inRect(px, py, 20, 13, 66, 37)) {
        if (inRect(px, py, 34, 18, 54, 24)) return "glass";
        if (inEllipse(px, py, 52, 25, 16, 9)) return "accent";
        if (inRect(px, py, 34, 13, 58, 37)) return "body";
        return "body";
      }
      return null;
    }
    default:
      return null;
  }
}

const PALETTES = {
  "player-evelyn-mercer.png": {
    type: "highwheel",
    body: [0x9e, 0x2b, 0x2b],
    accent: [0x6e, 0x1a, 0x1a],
    glass: [0xc9, 0x6a, 0x6a],
  },
  "player-lucien-soto.png": {
    type: "needle",
    body: [0x2a, 0x5a, 0x8f],
    accent: [0x1c, 0x3f, 0x64],
    glass: [0x5f, 0x8f, 0xc4],
  },
  "player-inez-rook.png": {
    type: "lark",
    body: [0x4a, 0x6b, 0x32],
    accent: [0x32, 0x4a, 0x1f],
    glass: [0x7d, 0x9c, 0x5f],
  },
  "player-nell-voss.png": {
    type: "hush",
    body: [0x3c, 0x3a, 0x50],
    accent: [0x27, 0x26, 0x38],
    glass: [0x6f, 0x6c, 0x88],
  },
};

const WHEEL = [0x18, 0x1c, 0x1e];
const LAMP = [0xfb, 0xe0, 0x6a];
const WING = [0x24, 0x2c, 0x2e];

function renderVehicle(palette) {
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const layer = layerOf(palette.type, x, y);
      let c = null;
      if (layer === "body") c = palette.body;
      else if (layer === "accent") c = palette.accent;
      else if (layer === "glass") c = palette.glass;
      else if (layer === "wheel") c = WHEEL;
      else if (layer === "lamp") c = LAMP;
      else if (layer === "wing") c = WING;
      if (!c) continue;
      const offset = (y * W + x) * 4;
      rgba[offset] = c[0];
      rgba[offset + 1] = c[1];
      rgba[offset + 2] = c[2];
      rgba[offset + 3] = 255;
    }
  }
  return encodePng(W, H, rgba);
}

const outDir = join(__dirname, "..", "public", "assets", "race", "vehicles");
mkdirSync(outDir, { recursive: true });
for (const [file, palette] of Object.entries(PALETTES)) {
  const out = join(outDir, file);
  writeFileSync(out, renderVehicle(palette));
  console.log("wrote", out, `silhouette=${palette.type}`);
}


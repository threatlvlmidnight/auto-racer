import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

/**
 * Feature 032 T006: validation of the approved control-sheet masters.
 * The transparent working master drives US5's crop/nine-slice regions
 * (T089-T096); the chroma source is preserved for provenance. Decoding is
 * dependency-free (PNG IHDR + zlib-inflated unfiltered scanlines).
 */

export interface DecodedPng {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  /** Row-major pixels, `bytesPerPixel` channels each (RGBA or RGB). */
  pixels: Uint8Array;
  bytesPerPixel: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function decodePng(bytes: Uint8Array): DecodedPng {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) throw new Error("Not a PNG file");
  }
  const readU32 = (offset: number) =>
    (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = readU32(offset) >>> 0;
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === "IHDR") {
      width = readU32(offset + 8) >>> 0;
      height = readU32(offset + 12) >>> 0;
      bitDepth = bytes[offset + 16];
      colorType = bytes[offset + 17];
    } else if (type === "IDAT") {
      idat.push(bytes.slice(offset + 8, offset + 8 + length));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`Unsupported PNG encoding (bitDepth=${bitDepth}, colorType=${colorType})`);
  }

  const total = idat.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(total);
  let cursor = 0;
  idat.forEach((chunk) => { combined.set(chunk, cursor); cursor += chunk.length; });

  const raw = inflateSync(combined);
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const pixels = new Uint8Array(height * stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const sample = raw[rawOffset];
      rawOffset += 1;
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[prevStart + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[prevStart + x - bytesPerPixel] : 0;
      let value: number;
      switch (filter) {
        case 0: value = sample; break;
        case 1: value = sample + left; break;
        case 2: value = sample + up; break;
        case 3: value = sample + ((left + up) >> 1); break;
        case 4: value = sample + paeth(left, up, upLeft); break;
        default: throw new Error(`Unsupported PNG filter ${filter}`);
      }
      pixels[rowStart + x] = value & 0xff;
    }
  }
  return { width, height, bitDepth, colorType, pixels, bytesPerPixel };
}

const MASTER_PATH = join(__dirname, "../../public/assets/ui/feature-032-controls-sheet.png");
const CHROMA_PATH = join(__dirname, "../../public/assets/ui/source/feature-032-controls-sheet-chroma.png");

const EXPECTED_WIDTH = 1672;
const EXPECTED_HEIGHT = 941;

describe("feature 032 approved control-sheet masters (T006)", () => {
  const master = decodePng(readFileSync(MASTER_PATH));
  const chroma = decodePng(readFileSync(CHROMA_PATH));

  it("both masters are exactly 1672x941 as approved", () => {
    expect(master.width).toBe(EXPECTED_WIDTH);
    expect(master.height).toBe(EXPECTED_HEIGHT);
    expect(chroma.width).toBe(EXPECTED_WIDTH);
    expect(chroma.height).toBe(EXPECTED_HEIGHT);
  });

  it("the working master carries an alpha channel; the chroma source is preserved RGB", () => {
    expect(master.colorType).toBe(6); // RGBA
    expect(chroma.colorType).toBe(2); // RGB
  });

  it("the working master has fully transparent corners (alpha-safe crop bounds)", () => {
    const alpha = (x: number, y: number) => master.pixels[(y * master.width + x) * 4 + 3];
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(EXPECTED_WIDTH - 1, 0)).toBe(0);
    expect(alpha(0, EXPECTED_HEIGHT - 1)).toBe(0);
    expect(alpha(EXPECTED_WIDTH - 1, EXPECTED_HEIGHT - 1)).toBe(0);
  });

  it("the working master contains real opaque control content (not a blank sheet)", () => {
    let opaque = 0;
    let sampled = 0;
    for (let y = 0; y < master.height; y += 7) {
      for (let x = 0; x < master.width; x += 7) {
        sampled += 1;
        if (master.pixels[(y * master.width + x) * 4 + 3] > 200) opaque += 1;
      }
    }
    expect(opaque / sampled).toBeGreaterThan(0.1);
  });

  it("provenance: chroma source lives under public/assets/ui/source/ and matches master dimensions", () => {
    // quickstart.md Asset source pins these exact paths; the crop pipeline
    // (T094) reads only the transparent master at runtime.
    expect(MASTER_PATH.endsWith("public/assets/ui/feature-032-controls-sheet.png")).toBe(true);
    expect(CHROMA_PATH.endsWith("public/assets/ui/source/feature-032-controls-sheet-chroma.png")).toBe(true);
    expect([chroma.width, chroma.height]).toEqual([master.width, master.height]);
  });
});

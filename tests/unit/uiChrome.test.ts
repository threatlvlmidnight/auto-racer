import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import {
  EMPTY_UI_CHROME_REGISTRY,
  APPROVED_UI_CHROME_REGISTRY,
  UI_CHROME_MASTER_SIZE,
  UI_CHROME_STATES,
  UI_CHROME_TEXT_COLORS,
  UI_CHROME_STATE_REGION_KEYS,
  nineSliceMarginsValid,
  sourceRectInBounds,
  uiChromeRegionForState,
  uiChromeRegionByKey,
  withUIChromeRegion,
  type UIChromeRegion,
} from "../../src/scenes/uiChrome";

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

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((value >> 16) & 0xff)
    + 0.7152 * channel((value >> 8) & 0xff)
    + 0.0722 * channel(value & 0xff);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("chrome-backed button text contrast", () => {
  it("keeps every semantic-state label above WCAG AA against the lightest crop interior", () => {
    for (const state of UI_CHROME_STATES) {
      expect(contrast(UI_CHROME_TEXT_COLORS[state], "#fffdf7"), state).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// --- Feature 032 T011: semantic crop-region registry contract ----------

const sampleRegion: UIChromeRegion = {
  key: "primary-button",
  family: "primary",
  sourceRect: { x: 16, y: 16, width: 320, height: 96 },
  nineSliceMargins: { left: 24, top: 24, right: 24, bottom: 24 },
};

describe("semantic crop-region registry (T011)", () => {
  it("starts empty: no region exists before T094 measures the master", () => {
    expect(EMPTY_UI_CHROME_REGISTRY.regions).toEqual([]);
  });

  it("registers validated regions under stable unique keys", () => {
    const registry = withUIChromeRegion(EMPTY_UI_CHROME_REGISTRY, sampleRegion);
    expect(registry.regions).toHaveLength(1);
    expect(uiChromeRegionByKey(registry, "primary-button")).toEqual(sampleRegion);
    expect(uiChromeRegionByKey(registry, "missing")).toBeNull();
    // The empty registry is never mutated.
    expect(EMPTY_UI_CHROME_REGISTRY.regions).toEqual([]);
  });

  it("rejects duplicate keys, out-of-bounds rects, and invalid margins", () => {
    const registry = withUIChromeRegion(EMPTY_UI_CHROME_REGISTRY, sampleRegion);
    expect(() => withUIChromeRegion(registry, sampleRegion)).toThrow(/already registered/);
    expect(() => withUIChromeRegion(EMPTY_UI_CHROME_REGISTRY, {
      ...sampleRegion,
      sourceRect: { x: UI_CHROME_MASTER_SIZE.width - 4, y: 16, width: 320, height: 96 },
    })).toThrow(/outside the approved master/);
    expect(() => withUIChromeRegion(EMPTY_UI_CHROME_REGISTRY, {
      ...sampleRegion,
      nineSliceMargins: { left: 300, top: 24, right: 300, bottom: 24 },
    })).toThrow(/invalid nine-slice margins/);
  });

  it("keeps the semantic state vocabulary complete and non-color-only", () => {
    expect(UI_CHROME_STATES).toEqual(["normal", "hover", "focus", "pressed", "disabled"]);
  });

  it("bounds and margin validators agree with registration guards", () => {
    expect(sourceRectInBounds(sampleRegion.sourceRect)).toBe(true);
    expect(sourceRectInBounds({ x: -1, y: 0, width: 10, height: 10 })).toBe(false);
    expect(nineSliceMarginsValid(sampleRegion)).toBe(true);
    expect(nineSliceMarginsValid({
      ...sampleRegion,
      nineSliceMargins: { left: 0, top: 0, right: 0, bottom: 97 },
    })).toBe(false);
  });
});

describe("approved crop and nine-slice contract (T089/T090)", () => {
  it("registers named crops in bounds without overlap", () => {
    const regions = APPROVED_UI_CHROME_REGISTRY.regions;
    expect(regions.length).toBeGreaterThanOrEqual(15);
    regions.forEach((region) => {
      expect(region.key).toMatch(/^[a-z0-9-]+$/);
      expect(sourceRectInBounds(region.sourceRect)).toBe(true);
      expect(nineSliceMarginsValid(region)).toBe(true);
    });
    for (let i = 0; i < regions.length; i += 1) {
      for (let j = i + 1; j < regions.length; j += 1) {
        const a = regions[i].sourceRect;
        const b = regions[j].sourceRect;
        const overlap = a.x < b.x + b.width && a.x + a.width > b.x
          && a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlap, `${regions[i].key} overlaps ${regions[j].key}`).toBe(false);
      }
    }
  });

  it("maps every interactive state to a stable semantic region or explicit fallback", () => {
    (["primary", "secondary", "compact", "danger", "selector"] as const).forEach((family) => {
      UI_CHROME_STATES.forEach((state) => {
        const region = uiChromeRegionForState(family, state);
        expect(region).not.toBeNull();
        expect(UI_CHROME_STATE_REGION_KEYS[family][state]).toBe(region?.key);
        expect(nineSliceMarginsValid(region!)).toBe(true);
      });
    });
    expect(uiChromeRegionForState("divider", "normal")).toBeNull();
  });

  it("keeps nine-slice source minimums larger than the retained corner margins", () => {
    APPROVED_UI_CHROME_REGISTRY.regions.forEach((region) => {
      expect(region.sourceRect.width).toBeGreaterThanOrEqual(region.nineSliceMargins.left + region.nineSliceMargins.right);
      expect(region.sourceRect.height).toBeGreaterThanOrEqual(region.nineSliceMargins.top + region.nineSliceMargins.bottom);
    });
  });
});

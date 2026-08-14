/**
 * Minimal ambient declarations for Node.js APIs used by static source-audit
 * tests (tests/integration/playback-controls-boundaries.test.ts). This project
 * targets the browser (`tsconfig.json` lib: ES2020/DOM, no `@types/node`);
 * vitest runs in Node.js at runtime, so these declarations let `tsc --noEmit`
 * type-check the audit tests without adding a runtime dependency.
 */
declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function readdirSync(path: string): string[];
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}

declare const __dirname: string;

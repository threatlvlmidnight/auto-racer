/**
 * Minimal ambient declarations for Node.js APIs used by static source-audit
 * tests (tests/integration/playback-controls-boundaries.test.ts) and the
 * feature 031-demo-deployment boundary/artifact/smoke suites. This project
 * targets the browser (`tsconfig.json` lib: ES2020/DOM, no `@types/node`);
 * vitest runs in Node.js at runtime, so these declarations let `tsc --noEmit`
 * type-check the audit tests without adding a runtime dependency.
 */
declare module "node:fs" {
  export interface Dirent {
    name: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  }
  export interface Stats {
    size: number;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  }
  export function readFileSync(path: string, encoding: string): string;
  export function readdirSync(path: string): string[];
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function existsSync(path: string): boolean;
  export function statSync(path: string): Stats;
  export function lstatSync(path: string): Stats;
  export function writeFileSync(path: string, data: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function symlinkSync(target: string, path: string): void;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function dirname(path: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:child_process" {
  export interface ExecSyncOptions {
    cwd?: string;
    env?: Record<string, string | undefined>;
    encoding?: string;
    input?: string;
    timeout?: number;
    stdio?: unknown;
  }
  export interface SpawnSyncResult {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  }
  export interface ExecFileError extends Error {
    code?: number | string;
  }
  export function execFileSync(command: string, args: string[], options?: ExecSyncOptions): string;
  export function spawnSync(command: string, args: string[], options?: ExecSyncOptions): SpawnSyncResult;
  export function execFile(
    command: string,
    args: string[],
    options: ExecSyncOptions,
    callback: (error: ExecFileError | null, stdout: string, stderr: string) => void,
  ): void;
}

declare module "node:http" {
  export interface IncomingMessage {
    url?: string;
    method?: string;
  }
  export interface ServerResponse {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body?: string): void;
  }
  export interface Server {
    listen(port: number, host: string, callback: () => void): Server;
    close(callback?: () => void): void;
    closeAllConnections(): void;
    address(): { port: number } | string | null;
  }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Server;
}

declare const __dirname: string;

declare const process: {
  execPath: string;
  env: Record<string, string | undefined>;
};

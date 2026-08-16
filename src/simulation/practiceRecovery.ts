import { TEST_DAY_CONFIG, type LockedPracticeBuild, type PracticeConfig, type PracticeReturnContext } from "./practice";
import type { Run } from "./run";

// This module intentionally reads/writes an injectable storage rather than the
// global sessionStorage directly, so its pure canonicalization/validation logic
// stays testable under the project's DOM-free `environment: "node"` Vitest config
// (see vitest.config.ts) while still defaulting to real sessionStorage at runtime.

export const PRACTICE_RECOVERY_VERSION = "test-day-recovery-v1";
export const PRACTICE_RECOVERY_STORAGE_KEY = "auto-racer:test-day-recovery:v1";

export interface PracticeRecoveryPayload {
  runId: string;
  run: Run;
  returnContext: PracticeReturnContext;
  snapshot: LockedPracticeBuild;
  config: PracticeConfig;
}

export interface PracticeRecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PracticeRecoveryFailureCode = "unsupported-version" | "fingerprint-mismatch" | "payload-mismatch";

export interface PracticeRecoveryFailure {
  ok: false;
  code: PracticeRecoveryFailureCode;
  reason: string;
}

export interface PracticeRecoverySuccess {
  ok: true;
  payload: PracticeRecoveryPayload;
}

export type PracticeRecoveryReadResult = PracticeRecoverySuccess | PracticeRecoveryFailure;

function defaultRecoveryStorage(): PracticeRecoveryStorage | null {
  const globalStorage = (globalThis as { sessionStorage?: PracticeRecoveryStorage }).sessionStorage;
  return globalStorage ?? null;
}

export function canonicalizeRecoveryPayload(payload: unknown): string {
  return canonicalizeValue(payload, new Set());
}

function canonicalizeValue(value: unknown, seen: Set<unknown>): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "undefined" || type === "function" || type === "symbol") {
    throw new Error(`Cannot canonicalize unsupported value type: ${type}`);
  }
  if (type === "number") {
    if (!Number.isFinite(value as number)) throw new Error("Cannot canonicalize a non-finite number");
    return JSON.stringify(value);
  }
  if (type === "boolean" || type === "string") return JSON.stringify(value);
  if (type !== "object") throw new Error(`Cannot canonicalize unsupported value type: ${type}`);
  if (seen.has(value)) throw new Error("Cannot canonicalize a cyclic value");
  seen.add(value);
  const result = Array.isArray(value)
    ? `[${value.map((entry) => canonicalizeValue(entry, seen)).join(",")}]`
    : `{${Object.entries(value as Record<string, unknown>)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalizeValue(entry, seen)}`)
        .join(",")}}`;
  seen.delete(value);
  return result;
}

export function fingerprintRecoveryPayload(canonicalPayload: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonicalPayload)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64-v1:${hash.toString(16).padStart(16, "0")}`;
}

export function writePracticeRecovery(
  payload: PracticeRecoveryPayload,
  storage: PracticeRecoveryStorage | null = defaultRecoveryStorage(),
): void {
  if (!storage) return;
  // Match the storage medium's JSON semantics: optional object properties
  // with value `undefined` are omitted before strict canonicalization. This
  // keeps integrity checks strict while allowing typed optional evidence such
  // as track feature metadata and setup focus state.
  const serializablePayload = JSON.parse(JSON.stringify(payload)) as PracticeRecoveryPayload;
  const canonicalPayload = canonicalizeRecoveryPayload(serializablePayload);
  const record = {
    version: PRACTICE_RECOVERY_VERSION,
    payload: canonicalPayload,
    fingerprint: fingerprintRecoveryPayload(canonicalPayload),
  };
  storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify(record));
}

export function readPracticeRecovery(
  storage: PracticeRecoveryStorage | null = defaultRecoveryStorage(),
): PracticeRecoveryReadResult {
  if (!storage) return failure("payload-mismatch", "No recovery data is available.");
  const raw = storage.getItem(PRACTICE_RECOVERY_STORAGE_KEY);
  if (!raw) return failure("payload-mismatch", "No recovery data is available.");

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return failure("payload-mismatch", "Recovery data is not valid JSON.");
  }
  if (!isRecordShape(record)) {
    return failure("payload-mismatch", "Recovery data has an unexpected shape.");
  }
  if (record.version !== PRACTICE_RECOVERY_VERSION) {
    return failure("unsupported-version", `Recovery data version "${record.version}" is not supported.`);
  }
  const expectedFingerprint = fingerprintRecoveryPayload(record.payload);
  if (record.fingerprint !== expectedFingerprint) {
    return failure("fingerprint-mismatch", "Recovery data failed its integrity check.");
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(record.payload);
  } catch {
    return failure("payload-mismatch", "Recovery payload is not valid JSON.");
  }
  if (!isPracticeRecoveryPayloadShape(parsedPayload)) {
    return failure("payload-mismatch", "Recovery payload is missing required fields.");
  }

  let reserialized: string;
  try {
    reserialized = canonicalizeRecoveryPayload(parsedPayload);
  } catch {
    return failure("payload-mismatch", "Recovery payload contains unsupported values.");
  }
  if (reserialized !== record.payload) {
    return failure("payload-mismatch", "Recovery payload is not in canonical form.");
  }

  const crossCheckReason = crossCheckPayload(parsedPayload);
  if (crossCheckReason) return failure("payload-mismatch", crossCheckReason);

  return { ok: true, payload: parsedPayload };
}

export function clearPracticeRecovery(
  storage: PracticeRecoveryStorage | null = defaultRecoveryStorage(),
): void {
  storage?.removeItem(PRACTICE_RECOVERY_STORAGE_KEY);
}

function failure(code: PracticeRecoveryFailureCode, reason: string): PracticeRecoveryFailure {
  return { ok: false, code, reason };
}

function isRecordShape(
  value: unknown,
): value is { version: unknown; payload: string; fingerprint: unknown } {
  return !!value
    && typeof value === "object"
    && "version" in value
    && "payload" in value
    && "fingerprint" in value
    && typeof (value as { payload: unknown }).payload === "string";
}

function isPracticeRecoveryPayloadShape(value: unknown): value is PracticeRecoveryPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PracticeRecoveryPayload>;
  return typeof candidate.runId === "string"
    && !!candidate.run
    && typeof candidate.run === "object"
    && !!candidate.returnContext
    && typeof candidate.returnContext === "object"
    && !!candidate.snapshot
    && typeof candidate.snapshot === "object"
    && !!candidate.config
    && typeof candidate.config === "object";
}

function crossCheckPayload(payload: PracticeRecoveryPayload): string | null {
  if (payload.runId !== payload.run.id) return "Recovery run identity does not match its own run.";
  if (payload.returnContext.runId !== payload.runId) {
    return "Recovery return context does not match this run.";
  }
  if (payload.snapshot.capturedRunId !== payload.runId) {
    return "Recovery snapshot does not match this run.";
  }
  const currentEncounterId = payload.run.activeEncounter?.id ?? null;
  if (payload.returnContext.encounterId !== null && payload.returnContext.encounterId !== currentEncounterId) {
    return "Recovery origin encounter no longer matches this run.";
  }
  if (canonicalizeRecoveryPayload(payload.config) !== canonicalizeRecoveryPayload(TEST_DAY_CONFIG)) {
    return "Recovery configuration no longer matches the disclosed Test Day configuration.";
  }
  return null;
}

import { describe, expect, it } from "vitest";
import {
  PRACTICE_RECOVERY_STORAGE_KEY,
  PRACTICE_RECOVERY_VERSION,
  canonicalizeRecoveryPayload,
  clearPracticeRecovery,
  fingerprintRecoveryPayload,
  readPracticeRecovery,
  writePracticeRecovery,
  type PracticeRecoveryPayload,
  type PracticeRecoveryStorage,
} from "../../src/simulation/practiceRecovery";
import { createPracticeReturnContext, createPracticeSession, TEST_DAY_CONFIG } from "../../src/simulation/practice";
import { runHubPracticeFixture } from "../fixtures/practice-run-fixtures";

function createFakeStorage(): PracticeRecoveryStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

function buildRecoveryPayload(): PracticeRecoveryPayload {
  const fixture = runHubPracticeFixture();
  const returnContext = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  const session = createPracticeSession(fixture.run, returnContext);
  return {
    runId: fixture.run.id,
    run: fixture.run,
    returnContext: session.returnContext as unknown as PracticeRecoveryPayload["returnContext"],
    snapshot: session.snapshot as unknown as PracticeRecoveryPayload["snapshot"],
    config: TEST_DAY_CONFIG as unknown as PracticeRecoveryPayload["config"],
  };
}

describe("canonicalizeRecoveryPayload", () => {
  it("recursively sorts object keys regardless of insertion order", () => {
    const a = canonicalizeRecoveryPayload({ b: 1, a: 2, c: { z: 1, y: 2 } } as unknown as PracticeRecoveryPayload);
    const b = canonicalizeRecoveryPayload({ c: { y: 2, z: 1 }, a: 2, b: 1 } as unknown as PracticeRecoveryPayload);
    expect(a).toBe(b);
  });

  it("preserves array order rather than sorting array contents", () => {
    const a = canonicalizeRecoveryPayload([3, 1, 2] as unknown as PracticeRecoveryPayload);
    const b = canonicalizeRecoveryPayload([1, 2, 3] as unknown as PracticeRecoveryPayload);
    expect(a).not.toBe(b);
    expect(a).toBe("[3,1,2]");
  });

  it.each([
    ["undefined", undefined],
    ["a function", () => {}],
    ["a symbol", Symbol("x")],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects %s", (_label, value) => {
    expect(() => canonicalizeRecoveryPayload({ value } as unknown as PracticeRecoveryPayload)).toThrow();
  });

  it("rejects cyclic values", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalizeRecoveryPayload(cyclic as unknown as PracticeRecoveryPayload)).toThrow();
  });
});

describe("fingerprintRecoveryPayload", () => {
  it("returns a deterministic fnv1a64-v1 fingerprint of 16 lowercase hex characters", () => {
    const fingerprint = fingerprintRecoveryPayload("abc");
    expect(fingerprint).toMatch(/^fnv1a64-v1:[0-9a-f]{16}$/);
    expect(fingerprintRecoveryPayload("abc")).toBe(fingerprint);
  });

  it("changes when the input changes", () => {
    expect(fingerprintRecoveryPayload("abc")).not.toBe(fingerprintRecoveryPayload("abd"));
  });
});

describe("practice recovery read/write", () => {
  it("round-trips a valid payload with the current schema version", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    writePracticeRecovery(payload, storage);
    const result = readPracticeRecovery(storage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toStrictEqual(payload);
    }
    const raw = JSON.parse(storage.getItem(PRACTICE_RECOVERY_STORAGE_KEY)!);
    expect(raw.version).toBe(PRACTICE_RECOVERY_VERSION);
  });

  it("returns payload-mismatch when no recovery record exists", () => {
    const storage = createFakeStorage();
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });

  it("clears the record so a later read finds nothing", () => {
    const storage = createFakeStorage();
    writePracticeRecovery(buildRecoveryPayload(), storage);
    clearPracticeRecovery(storage);
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
  });

  it("returns unsupported-version for any other version string", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const canonical = canonicalizeRecoveryPayload(payload);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: "test-day-recovery-v2",
      payload: canonical,
      fingerprint: fingerprintRecoveryPayload(canonical),
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsupported-version");
  });

  it("returns fingerprint-mismatch when the payload no longer matches its checksum", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const canonical = canonicalizeRecoveryPayload(payload);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: PRACTICE_RECOVERY_VERSION,
      payload: canonical,
      fingerprint: "fnv1a64-v1:0000000000000000",
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("fingerprint-mismatch");
  });

  it("returns payload-mismatch for non-JSON storage contents", () => {
    const storage = createFakeStorage();
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, "{not json");
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });

  it("returns payload-mismatch for a non-canonical payload string even with a correctly recomputed fingerprint", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const canonical = canonicalizeRecoveryPayload(payload);
    const parsed = JSON.parse(canonical) as Record<string, unknown>;
    const reversedKeyOrder = Object.fromEntries([...Object.entries(parsed)].reverse());
    const reordered = JSON.stringify(reversedKeyOrder);
    expect(reordered).not.toBe(canonical);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: PRACTICE_RECOVERY_VERSION,
      payload: reordered,
      fingerprint: fingerprintRecoveryPayload(reordered),
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });

  it("returns payload-mismatch for a schema-incomplete payload", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const broken = { ...payload } as Partial<PracticeRecoveryPayload>;
    delete broken.snapshot;
    const canonical = canonicalizeRecoveryPayload(broken as PracticeRecoveryPayload);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: PRACTICE_RECOVERY_VERSION,
      payload: canonical,
      fingerprint: fingerprintRecoveryPayload(canonical),
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });

  it("returns payload-mismatch for a syntactically valid canonical payload whose run/origin state was mutated, even with a correctly recomputed fingerprint", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const mutated: PracticeRecoveryPayload = {
      ...payload,
      runId: `${payload.runId}-mutated`,
    };
    const canonical = canonicalizeRecoveryPayload(mutated);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: PRACTICE_RECOVERY_VERSION,
      payload: canonical,
      fingerprint: fingerprintRecoveryPayload(canonical),
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });

  it("returns payload-mismatch when the stored config no longer matches TEST_DAY_CONFIG", () => {
    const storage = createFakeStorage();
    const payload = buildRecoveryPayload();
    const mutated: PracticeRecoveryPayload = {
      ...payload,
      config: { ...payload.config, lapCount: 11 } as unknown as PracticeRecoveryPayload["config"],
    };
    const canonical = canonicalizeRecoveryPayload(mutated);
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, JSON.stringify({
      version: PRACTICE_RECOVERY_VERSION,
      payload: canonical,
      fingerprint: fingerprintRecoveryPayload(canonical),
    }));
    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payload-mismatch");
  });
});

import { describe, expect, it } from "vitest";
import {
  captureProtectedRunState,
  createPracticeReturnContext,
  createPracticeSession,
  latestPracticeComparison,
  TEST_DAY_CONFIG,
  type PracticeReturnContext,
} from "../../src/simulation/practice";
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
import { runHubPracticeFixture, supplierPracticeFixture } from "../fixtures/practice-run-fixtures";

function createFakeStorage(): PracticeRecoveryStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

function beginRecoverableSession(fixture: ReturnType<typeof runHubPracticeFixture>) {
  const returnContext: PracticeReturnContext = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  const session = createPracticeSession(fixture.run, returnContext);
  const payload: PracticeRecoveryPayload = {
    runId: fixture.run.id,
    run: fixture.run,
    returnContext: session.returnContext as unknown as PracticeRecoveryPayload["returnContext"],
    snapshot: session.snapshot as unknown as PracticeRecoveryPayload["snapshot"],
    config: TEST_DAY_CONFIG as unknown as PracticeRecoveryPayload["config"],
  };
  return { session, returnContext, payload };
}

describe("Test Day interruption recovery", () => {
  it("restores the exact unchanged origin run and context from a valid recovery capsule", () => {
    const storage = createFakeStorage();
    const fixture = supplierPracticeFixture();
    const protectedBefore = captureProtectedRunState(fixture.run);
    const { payload } = beginRecoverableSession(fixture);

    writePracticeRecovery(payload, storage);
    const result = readPracticeRecovery(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.run).toStrictEqual(fixture.run);
    expect(captureProtectedRunState(result.payload.run as never)).toStrictEqual(protectedBefore);
    expect(result.payload.returnContext).toStrictEqual(payload.returnContext);
    expect(result.payload.snapshot).toStrictEqual(payload.snapshot);
  });

  it("clears the recovery capsule after a successful return so no stale capsule remains", () => {
    const storage = createFakeStorage();
    const fixture = runHubPracticeFixture();
    const { payload } = beginRecoverableSession(fixture);
    writePracticeRecovery(payload, storage);

    clearPracticeRecovery(storage);

    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
  });

  const corruptions: Array<[string, (raw: string) => string]> = [
    ["corrupt JSON", (): string => "{not-json"],
    ["unsupported version", (raw: string): string => {
      const record = JSON.parse(raw);
      return JSON.stringify({ ...record, version: "test-day-recovery-v0" });
    }],
    ["broken fingerprint", (raw: string): string => {
      const record = JSON.parse(raw);
      return JSON.stringify({ ...record, fingerprint: "fnv1a64-v1:1111111111111111" });
    }],
    ["non-canonical payload", (raw: string): string => {
      const record = JSON.parse(raw);
      const reparsed = JSON.parse(record.payload);
      const reordered = JSON.stringify(Object.fromEntries([...Object.entries(reparsed)].reverse()));
      return JSON.stringify({ ...record, payload: reordered, fingerprint: fingerprintRecoveryPayload(reordered) });
    }],
    ["mutated run id with recomputed fingerprint", (raw: string): string => {
      const record = JSON.parse(raw);
      const reparsed = JSON.parse(record.payload);
      reparsed.runId = "another-run-entirely";
      const canonical = canonicalizeRecoveryPayload(reparsed);
      return JSON.stringify({ ...record, payload: canonical, fingerprint: fingerprintRecoveryPayload(canonical) });
    }],
    ["mismatched config with recomputed fingerprint", (raw: string): string => {
      const record = JSON.parse(raw);
      const reparsed = JSON.parse(record.payload);
      reparsed.config = { ...reparsed.config, lapCount: 12 };
      const canonical = canonicalizeRecoveryPayload(reparsed);
      return JSON.stringify({ ...record, payload: canonical, fingerprint: fingerprintRecoveryPayload(canonical) });
    }],
  ];

  it.each(corruptions)("never falls back to a substitute run/opponent/result on %s", (_label, corrupt) => {
    const storage = createFakeStorage();
    const fixture = runHubPracticeFixture();
    const { payload } = beginRecoverableSession(fixture);
    writePracticeRecovery(payload, storage);

    const raw = storage.getItem(PRACTICE_RECOVERY_STORAGE_KEY)!;
    storage.setItem(PRACTICE_RECOVERY_STORAGE_KEY, corrupt(raw));

    const result = readPracticeRecovery(storage);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("payload");
  });

  it("keeps recovery data isolated from practice comparison history", () => {
    const storage = createFakeStorage();
    const fixture = runHubPracticeFixture();
    const { payload } = beginRecoverableSession(fixture);
    writePracticeRecovery(payload, storage);

    expect(latestPracticeComparison(fixture.run)).toBeNull();
    expect(PRACTICE_RECOVERY_VERSION).toBe("test-day-recovery-v1");
  });
});

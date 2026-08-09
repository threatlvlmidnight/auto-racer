import { SAMPLE_GHOST } from "../content/sample-data";
import { resolveContest } from "./contest";
import { buildPlaybackSchedule, type PlaybackSchedule } from "./playback";
import { installedItems, storedItems } from "./slots";
import type { Run } from "./run";
import type {
  Build,
  ContestResult,
  ContributionEffectKind,
  ContributionEvidence,
  ContributionSourceArea,
  SampleGhost,
} from "./types";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type PracticeOriginCategory = "run-hub" | "acquisition" | "pvp-briefing";
export type PracticeOriginContext = "run-hub" | "supplier" | "reward-draft" | "pvp-briefing";
export type PracticeRoute = "RunScene" | "PrepareScene";

export interface PracticeNavigationState {
  viewToken: string;
  focusToken: string;
  scrollToken: string;
}

export interface PracticeOriginInput {
  context: PracticeOriginContext;
  selection: string | null;
  navigation: PracticeNavigationState;
}

export interface ProtectedPreparationOrigin {
  category: PracticeOriginCategory;
  context: PracticeOriginContext;
  route: PracticeRoute;
  encounterId: string | null;
  encounterPayload: unknown | null;
  selection: string | null;
  purchases: readonly string[];
  restockUsed: boolean;
  navigation: PracticeNavigationState;
}

export interface PracticeReturnContext {
  route: PracticeRoute;
  runId: string;
  encounterId: string | null;
  origin: PracticeOriginCategory;
  originState: ProtectedPreparationOrigin;
  focusToken: string;
}

export interface PracticeConfig {
  id: "test-day-v1";
  rival: SampleGhost;
  lapCount: 10;
  randomPolicy: "none";
}

export const TEST_DAY_CONFIG: DeepReadonly<PracticeConfig> = deepFreeze({
  id: "test-day-v1",
  rival: structuredClone(SAMPLE_GHOST),
  lapCount: 10,
  randomPolicy: "none",
});

export interface LockedPracticeBuild {
  build: Build;
  fingerprint: string;
  capturedRunId: string;
}

export type PracticeUnstableKind =
  | "drag"
  | "purchase-confirmation"
  | "restock-confirmation"
  | "replacement-confirmation"
  | "eviction-confirmation"
  | "sponsor-confirmation";

export interface PracticeUiStability {
  stable: boolean;
  kind?: PracticeUnstableKind;
  reason?: string;
}

export interface PracticeActivityStatus {
  contestActive?: boolean;
  settlementActive?: boolean;
}

export interface PracticeRecoveryStatus {
  mismatched: boolean;
  reason?: string;
}

export type PracticeFailureCode =
  | "no-run"
  | "malformed-run"
  | "run-ended"
  | "invalid-build"
  | "unstable-preparation"
  | "unstable-drag"
  | "unstable-purchase"
  | "unstable-restock"
  | "unstable-replacement"
  | "unstable-eviction"
  | "unstable-sponsor"
  | "contest-active"
  | "settlement-active"
  | "missing-origin"
  | "origin-mismatch"
  | "recovery-mismatch"
  | "reconciliation-failed";

export interface TestDayAvailability {
  available: boolean;
  origin: PracticeOriginCategory | null;
  returnContext: PracticeReturnContext | null;
  reason: string | null;
  code: PracticeFailureCode | null;
}

const UNSTABLE_REASONS: Record<PracticeUnstableKind, { code: PracticeFailureCode; reason: string }> = {
  drag: { code: "unstable-drag", reason: "Finish placing the item you are dragging before starting Test Day." },
  "purchase-confirmation": {
    code: "unstable-purchase",
    reason: "Finish or cancel the pending purchase before starting Test Day.",
  },
  "restock-confirmation": {
    code: "unstable-restock",
    reason: "Finish or cancel the pending restock before starting Test Day.",
  },
  "replacement-confirmation": {
    code: "unstable-replacement",
    reason: "Finish or cancel the pending item replacement before starting Test Day.",
  },
  "eviction-confirmation": {
    code: "unstable-eviction",
    reason: "Finish or cancel the pending item eviction before starting Test Day.",
  },
  "sponsor-confirmation": {
    code: "unstable-sponsor",
    reason: "Finish or cancel the pending sponsor decision before starting Test Day.",
  },
};

export interface ReconciliationCheck {
  key: string;
  valid: boolean;
  expected: number | string;
  actual: number | string;
}

export interface ReconciliationReport {
  valid: boolean;
  checks: ReconciliationCheck[];
}

export interface PracticeResult {
  sessionId: string;
  configId: "test-day-v1";
  snapshotFingerprint: string;
  contest: ContestResult;
  playback: PlaybackSchedule;
  reconciliation: ReconciliationReport;
  authority: "practice-only";
}

export type PracticeSessionState =
  | "briefing"
  | "resolving"
  | "completed"
  | "returning"
  | "unavailable";

export interface PracticeSession {
  id: string;
  runId: string;
  state: PracticeSessionState;
  returnContext: DeepReadonly<PracticeReturnContext>;
  config: DeepReadonly<PracticeConfig>;
  snapshot: LockedPracticeBuild;
  result: PracticeResult | null;
  failure: { code: PracticeFailureCode; message: string } | null;
}

export interface PracticeComparisonProjection {
  contest: ContestResult;
  playback: PlaybackSchedule;
  contributions: ContributionEvidence[];
  reconciliation: ReconciliationReport;
}

export interface ProtectedRunState {
  runId: string;
  seed: number;
  status: Run["status"];
  stageIndex: number;
  stages: DeepReadonly<Run["stages"]>;
  availableChoices: DeepReadonly<Run["availableChoices"]>;
  activeEncounter: DeepReadonly<Run["activeEncounter"]>;
  credits: number;
  creditTransactions: DeepReadonly<Run["creditTransactions"]>;
  sponsor: DeepReadonly<Run["activeSponsorContract"]>;
  build: DeepReadonly<Run["build"]>;
  history: DeepReadonly<Run["history"]>;
  nextScoredOpponent: { id: string; lapTime: number; lapCount: number | null };
  scoredResultCount: number;
  rngRelevant: {
    seed: number;
    availableChoices: DeepReadonly<Run["availableChoices"]>;
    activeEncounterPayload: unknown | null;
  };
  wholeRun: DeepReadonly<Run>;
}

export interface PracticeReturnData {
  route: PracticeRoute;
  run: Run;
  encounterId: string | null;
  originState: DeepReadonly<ProtectedPreparationOrigin>;
  focusToken: string;
}

let nextSessionId = 1;
const activeSessions = new Map<string, PracticeSession>();
const practiceHistory = new Map<string, PracticeSession[]>();

export function createPracticeReturnContext(
  run: Run,
  input: PracticeOriginInput,
): PracticeReturnContext {
  const category = categoryFor(input.context);
  const route: PracticeRoute = input.context === "supplier" || input.context === "reward-draft"
    ? "PrepareScene"
    : "RunScene";
  const encounterId = input.context === "run-hub" ? null : run.activeEncounter?.id ?? null;
  validateOrigin(run, input.context, encounterId);
  const payload = run.activeEncounter?.payload ?? null;
  const supplierPayload = payload?.kind === "parts-supplier"
    ? payload as unknown as { purchases: string[]; restockUsed: boolean }
    : null;
  return deepFreeze({
    route,
    runId: run.id,
    encounterId,
    origin: category,
    originState: {
      category,
      context: input.context,
      route,
      encounterId,
      encounterPayload: structuredClone(payload),
      selection: input.selection,
      purchases: structuredClone(supplierPayload?.purchases ?? []),
      restockUsed: supplierPayload?.restockUsed ?? false,
      navigation: structuredClone(input.navigation),
    },
    focusToken: input.navigation.focusToken,
  }) as PracticeReturnContext;
}

export function testDayAvailability(
  run: Run | null | undefined,
  origin: PracticeOriginInput | null,
  uiStability: PracticeUiStability,
  activity: PracticeActivityStatus = {},
  recovery: PracticeRecoveryStatus | null = null,
): TestDayAvailability {
  if (!run) return unavailable("no-run", "No active run is available for Test Day.");
  if (isMalformedRun(run)) {
    return unavailable("malformed-run", "The current run's data is incomplete and cannot be tested.");
  }
  if (run.status !== "active") {
    clearPracticeComparisonHistory(run.id);
    return unavailable("run-ended", "Test Day is available only during an active run.");
  }
  if (!isValidBuild(run.build)) {
    clearPracticeComparisonHistory(run.id);
    return unavailable("invalid-build", "The current build cannot be tested.");
  }
  if (activity.contestActive) {
    return unavailable("contest-active", "Finish the current contest playback before starting Test Day.");
  }
  if (activity.settlementActive) {
    return unavailable("settlement-active", "Finish scored result settlement before starting Test Day.");
  }
  if (recovery?.mismatched) {
    return unavailable(
      "recovery-mismatch",
      recovery.reason ?? "Saved Test Day recovery data no longer matches this run.",
    );
  }
  if (!uiStability.stable) {
    const known = uiStability.kind ? UNSTABLE_REASONS[uiStability.kind] : null;
    return unavailable(
      known?.code ?? "unstable-preparation",
      uiStability.reason ?? known?.reason ?? "Finish or cancel the current preparation action first.",
    );
  }
  if (!origin) return unavailable("missing-origin", "The Test Day return point is missing.");
  try {
    const returnContext = createPracticeReturnContext(run, origin);
    return { available: true, origin: returnContext.origin, returnContext, reason: null, code: null };
  } catch {
    clearPracticeComparisonHistory(run.id);
    return unavailable("origin-mismatch", "The Test Day return point no longer matches this run.");
  }
}

export function lockPracticeBuild(run: Run, returnContext: PracticeReturnContext): LockedPracticeBuild {
  if (run.id !== returnContext.runId || !isValidBuild(run.build)) {
    throw new Error("Cannot lock a mismatched or invalid practice build");
  }
  const build = deepFreeze(structuredClone(run.build));
  return deepFreeze({
    build,
    fingerprint: `build-v1:${fnv1a64(canonicalize(build))}`,
    capturedRunId: run.id,
  }) as LockedPracticeBuild;
}

export function createPracticeSession(run: Run, returnContext: PracticeReturnContext): PracticeSession {
  const existing = activeSessions.get(run.id);
  if (existing && (existing.state === "briefing" || existing.state === "resolving")) return existing;
  const session = deepFreeze({
    id: `practice-session-${nextSessionId++}`,
    runId: run.id,
    state: "briefing" as const,
    returnContext: structuredClone(returnContext),
    config: structuredClone(TEST_DAY_CONFIG),
    snapshot: lockPracticeBuild(run, returnContext),
    result: null,
    failure: null,
  }) as PracticeSession;
  activeSessions.set(run.id, session);
  return session;
}

export function resolvePractice(session: PracticeSession): PracticeSession {
  if (session.state === "completed") return session;
  if (session.state !== "briefing") {
    return deepFreeze({
      ...session,
      state: "unavailable" as const,
      failure: { code: "origin-mismatch" as const, message: "Practice cannot resolve from this state." },
    }) as PracticeSession;
  }
  const contest = resolveContest(
    session.snapshot.build as Build,
    TEST_DAY_CONFIG.rival as SampleGhost,
    TEST_DAY_CONFIG.lapCount,
  );
  const playback = buildPlaybackSchedule(contest);
  const reconciliation = reconcilePracticeResult(contest);
  if (!reconciliation.valid) {
    return deepFreeze({
      ...session,
      state: "unavailable" as const,
      failure: {
        code: "reconciliation-failed" as const,
        message: "Practice result facts did not reconcile.",
      },
    }) as PracticeSession;
  }
  const completed = deepFreeze({
    ...session,
    state: "completed" as const,
    result: {
      sessionId: session.id,
      configId: TEST_DAY_CONFIG.id,
      snapshotFingerprint: session.snapshot.fingerprint,
      contest,
      playback,
      reconciliation,
      authority: "practice-only" as const,
    },
  }) as PracticeSession;
  activeSessions.set(session.runId, completed);
  recordCompletedPracticeSession(completed);
  return completed;
}

export function cancelPracticeSession(session: PracticeSession): PracticeSession {
  activeSessions.delete(session.runId);
  return deepFreeze({
    ...session,
    state: "returning" as const,
    result: null,
    failure: null,
  }) as PracticeSession;
}

export function practiceReturnData(run: Run, session: PracticeSession): PracticeReturnData {
  const context = session.returnContext;
  if (run.id !== context.runId || run.status !== "active") {
    throw new Error("Practice return run no longer matches its origin");
  }
  const currentEncounterId = run.activeEncounter?.id ?? null;
  const currentPayload = run.activeEncounter?.payload ?? null;
  if (
    currentEncounterId !== context.encounterId
    || canonicalize(currentPayload) !== canonicalize(context.originState.encounterPayload)
  ) {
    throw new Error("Practice return encounter no longer matches its protected origin");
  }
  activeSessions.delete(run.id);
  return {
    route: context.route,
    run,
    encounterId: context.encounterId,
    originState: context.originState,
    focusToken: context.focusToken,
  };
}

export function reconcilePracticeResult(contest: ContestResult): ReconciliationReport {
  const checks: ReconciliationCheck[] = [];
  const playerTotal = contest.laps.reduce((total, lap) => total + lap.playerLapTime, 0);
  const ghostTotal = contest.laps.reduce((total, lap) => total + lap.ghostLapTime, 0);
  checks.push(check("lap-count", contest.lapCount, contest.laps.length));
  checks.push(check("player-total", contest.playerTime, playerTotal));
  checks.push(check("ghost-total", contest.ghostTime, ghostTotal));
  checks.push(check("gap", contest.gap, playerTotal - ghostTotal));
  const expectedOutcome = contest.gap < 0 ? "win" : contest.gap > 0 ? "loss" : "tie";
  checks.push(check("outcome", expectedOutcome, contest.outcome));
  contest.laps.forEach((lap) => {
    const evidence = lap.contributions ?? [];
    if (evidence.length === 0) return;
    const representative = evidence[0];
    checks.push(check(
      `lap-${lap.lap}-contributions`,
      lap.playerLapTime,
      representative.resultingLapTime,
    ));
    checks.push(check(
      `lap-${lap.lap}-shared-pre-clamp`,
      representative.preClampLapTime,
      evidence.every((entry) => Object.is(entry.preClampLapTime, representative.preClampLapTime))
        ? representative.preClampLapTime
        : "mismatch",
    ));
  });
  return { valid: checks.every(({ valid }) => valid), checks };
}

export function toPracticeComparisonProjection(
  contest: ContestResult,
  playback: PlaybackSchedule,
  contributions: readonly ContributionEvidence[] | undefined,
  reconciliation: ReconciliationReport,
): PracticeComparisonProjection {
  const orderedContributions = [...(contributions ?? [])]
    .map((entry) => ({
      ...structuredClone(entry),
      buffApplications: [...entry.buffApplications].sort((first, second) =>
        `${first.sourceItemId}:${first.targetItemId}:${first.type}`.localeCompare(
          `${second.sourceItemId}:${second.targetItemId}:${second.type}`,
        )),
    }))
    .sort((first, second) =>
      first.lap - second.lap
      || first.sourceItemId.localeCompare(second.sourceItemId)
      || first.sourceLocation.area.localeCompare(second.sourceLocation.area)
      || first.sourceLocation.index - second.sourceLocation.index
      || first.effectKind.localeCompare(second.effectKind),
    );
  return deepFreeze({
    contest: structuredClone(contest),
    playback: structuredClone(playback),
    contributions: orderedContributions,
    reconciliation: {
      valid: reconciliation.valid,
      checks: [...reconciliation.checks]
        .map((entry) => structuredClone(entry))
        .sort((first, second) => first.key.localeCompare(second.key)),
    },
  }) as PracticeComparisonProjection;
}

export type PracticeChangeDirection = "improved" | "worsened" | "unchanged";

export interface PracticeBuildChange {
  area: "board" | "storage";
  index: number;
  beforeItemId: string | null;
  afterItemId: string | null;
}

export interface PracticeLapDelta {
  lap: number;
  playerTimeDelta: number;
  rivalTimeDelta: number;
  gapDelta: number;
}

export interface PracticeContributionDelta {
  lap: number;
  sourceItemId: string;
  sourceLocationArea: ContributionSourceArea;
  sourceLocationIndex: number;
  effectKind: ContributionEffectKind;
  resultingContributionDelta: number;
  resultingLapTimeDelta: number;
}

export interface PracticeComparisonSummary {
  sessionId: string;
  snapshotFingerprint: string;
  build: DeepReadonly<Build>;
  contest: ContestResult;
  contributions: readonly ContributionEvidence[];
}

export interface PracticeComparison {
  runId: string;
  previous: PracticeComparisonSummary;
  current: PracticeComparisonSummary;
  buildChanges: readonly PracticeBuildChange[];
  totalDelta: number;
  gapDelta: number;
  outcomeChanged: boolean;
  direction: PracticeChangeDirection;
  laps: readonly PracticeLapDelta[];
  contributions: readonly PracticeContributionDelta[];
}

export function comparePracticeResults(previous: PracticeSession, current: PracticeSession): PracticeComparison {
  if (!previous.result || !current.result) {
    throw new Error("Cannot compare practice sessions without completed results");
  }
  const previousSummary = toComparisonSummary(previous);
  const currentSummary = toComparisonSummary(current);
  const totalDelta = currentSummary.contest.playerTime - previousSummary.contest.playerTime;
  const gapDelta = currentSummary.contest.gap - previousSummary.contest.gap;
  const outcomeChanged = currentSummary.contest.outcome !== previousSummary.contest.outcome;
  const direction: PracticeChangeDirection = totalDelta < 0 ? "improved" : totalDelta > 0 ? "worsened" : "unchanged";
  const laps = previousSummary.contest.laps.map((previousLap, index) => {
    const currentLap = currentSummary.contest.laps[index];
    return {
      lap: previousLap.lap,
      playerTimeDelta: currentLap.playerLapTime - previousLap.playerLapTime,
      rivalTimeDelta: currentLap.ghostLapTime - previousLap.ghostLapTime,
      gapDelta: (currentLap.playerLapTime - currentLap.ghostLapTime)
        - (previousLap.playerLapTime - previousLap.ghostLapTime),
    };
  });
  return deepFreeze({
    runId: current.runId,
    previous: previousSummary,
    current: currentSummary,
    buildChanges: diffPracticeBuilds(previous.snapshot.build, current.snapshot.build),
    totalDelta,
    gapDelta,
    outcomeChanged,
    direction,
    laps,
    contributions: diffPracticeContributions(previousSummary.contributions, currentSummary.contributions),
  }) as PracticeComparison;
}

export function latestPracticeComparison(run: Run | null | undefined): PracticeComparison | null {
  if (!run) return null;
  const history = practiceHistory.get(run.id);
  if (!history) return null;
  if (run.status !== "active") {
    practiceHistory.delete(run.id);
    return null;
  }
  if (history.length < 2) return null;
  const [previous, current] = history;
  return comparePracticeResults(previous, current);
}

export function clearPracticeComparisonHistory(runId: string): void {
  practiceHistory.delete(runId);
}

function recordCompletedPracticeSession(session: PracticeSession): void {
  const existing = practiceHistory.get(session.runId) ?? [];
  practiceHistory.set(session.runId, [...existing, session].slice(-2));
}

function toComparisonSummary(session: PracticeSession): PracticeComparisonSummary {
  const result = session.result!;
  return {
    sessionId: session.id,
    snapshotFingerprint: session.snapshot.fingerprint,
    build: session.snapshot.build as DeepReadonly<Build>,
    contest: result.contest,
    contributions: result.contest.contributions ?? [],
  };
}

function diffPracticeBuilds(previous: Build, current: Build): PracticeBuildChange[] {
  const changes: PracticeBuildChange[] = [];
  const itemsFor = (build: Build, area: "board" | "storage") =>
    (area === "board" ? installedItems(build) : storedItems(build));
  (["board", "storage"] as const).forEach((area) => {
    const previousSlots = itemsFor(previous, area);
    const currentSlots = itemsFor(current, area);
    const length = Math.max(previousSlots.length, currentSlots.length);
    for (let index = 0; index < length; index += 1) {
      const beforeItemId = previousSlots[index]?.id ?? null;
      const afterItemId = currentSlots[index]?.id ?? null;
      if (beforeItemId !== afterItemId) changes.push({ area, index, beforeItemId, afterItemId });
    }
  });
  return changes;
}

function contributionDeltaKey(entry: ContributionEvidence): string {
  return `${entry.lap}:${entry.sourceItemId}:${entry.sourceLocation.area}:${entry.sourceLocation.index}:${entry.effectKind}`;
}

function diffPracticeContributions(
  previous: readonly ContributionEvidence[],
  current: readonly ContributionEvidence[],
): PracticeContributionDelta[] {
  const previousByKey = new Map(previous.map((entry) => [contributionDeltaKey(entry), entry] as const));
  const currentByKey = new Map(current.map((entry) => [contributionDeltaKey(entry), entry] as const));
  const keys = new Set([...previousByKey.keys(), ...currentByKey.keys()]);
  const deltas: PracticeContributionDelta[] = [];
  keys.forEach((key) => {
    const previousEntry = previousByKey.get(key);
    const currentEntry = currentByKey.get(key);
    const reference = currentEntry ?? previousEntry!;
    deltas.push({
      lap: reference.lap,
      sourceItemId: reference.sourceItemId,
      sourceLocationArea: reference.sourceLocation.area,
      sourceLocationIndex: reference.sourceLocation.index,
      effectKind: reference.effectKind,
      resultingContributionDelta: (currentEntry?.resultingContribution ?? 0) - (previousEntry?.resultingContribution ?? 0),
      resultingLapTimeDelta: (currentEntry?.resultingLapTime ?? 0) - (previousEntry?.resultingLapTime ?? 0),
    });
  });
  return deltas.sort((first, second) =>
    first.lap - second.lap
    || first.sourceItemId.localeCompare(second.sourceItemId)
    || first.sourceLocationArea.localeCompare(second.sourceLocationArea)
    || first.sourceLocationIndex - second.sourceLocationIndex
    || first.effectKind.localeCompare(second.effectKind),
  );
}

export function captureProtectedRunState(run: Run): ProtectedRunState {
  const nextPvp = run.stages.slice(run.stageIndex).find((stage) => stage.kind === "pvp");
  return deepFreeze({
    runId: run.id,
    seed: run.seed,
    status: run.status,
    stageIndex: run.stageIndex,
    stages: structuredClone(run.stages),
    availableChoices: structuredClone(run.availableChoices),
    activeEncounter: structuredClone(run.activeEncounter),
    credits: run.credits,
    creditTransactions: structuredClone(run.creditTransactions),
    sponsor: structuredClone(run.activeSponsorContract),
    build: structuredClone(run.build),
    history: structuredClone(run.history),
    nextScoredOpponent: {
      id: SAMPLE_GHOST.id,
      lapTime: SAMPLE_GHOST.lapTime,
      lapCount: nextPvp?.lapCount ?? null,
    },
    scoredResultCount: run.history.filter((entry) => entry.pvpOutcome !== undefined).length,
    rngRelevant: {
      seed: run.seed,
      availableChoices: structuredClone(run.availableChoices),
      activeEncounterPayload: structuredClone(run.activeEncounter?.payload ?? null),
    },
    wholeRun: structuredClone(run),
  }) as ProtectedRunState;
}

export function protectedRunStateEquals(before: ProtectedRunState, run: Run): boolean {
  return canonicalize(before) === canonicalize(captureProtectedRunState(run));
}

function validateOrigin(run: Run, context: PracticeOriginContext, encounterId: string | null): void {
  if (run.status !== "active") throw new Error("Run is not active");
  if (context === "run-hub") {
    if (run.activeEncounter !== null) throw new Error("Run hub requires no active encounter");
    return;
  }
  const expectedKind = context === "supplier"
    ? "parts-supplier"
    : context === "reward-draft" ? "reward-draft" : "pvp";
  if (!run.activeEncounter || run.activeEncounter.id !== encounterId || run.activeEncounter.type !== expectedKind) {
    throw new Error("Origin does not match the active encounter");
  }
}

function categoryFor(context: PracticeOriginContext): PracticeOriginCategory {
  if (context === "supplier" || context === "reward-draft") return "acquisition";
  return context;
}

function isMalformedRun(run: Run): boolean {
  return typeof run.id !== "string"
    || typeof run.status !== "string"
    || !Array.isArray(run.stages)
    || !Array.isArray(run.history)
    || !Array.isArray(run.creditTransactions)
    || !Array.isArray(run.availableChoices);
}

function isValidBuild(build: Build | null | undefined): build is Build {
  return !!build
    && Number.isFinite(build.car?.baseLapTime)
    && Array.isArray(build.slots)
    && Array.isArray(build.storage);
}

function unavailable(code: PracticeFailureCode, reason: string): TestDayAvailability {
  return { available: false, origin: null, returnContext: null, reason, code };
}

function check(key: string, expected: number | string, actual: number | string): ReconciliationCheck {
  return { key, valid: Object.is(expected, actual), expected, actual };
}

export function canonicalizePracticeValue(value: unknown): string {
  return canonicalize(value);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
    .join(",")}}`;
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((entry) => deepFreeze(entry));
  }
  return value as DeepReadonly<T>;
}
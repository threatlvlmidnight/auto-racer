import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEM_POOL, SAMPLE_GHOST } from "../src/content/sample-data.ts";
import { resolveContest } from "../src/simulation/contest.ts";
import { createEmptyVehicleBuild } from "../src/simulation/build.ts";
import { installedItems, storedItems } from "../src/simulation/slots.ts";
import { createRun, runIdentityForEntrant } from "../src/simulation/run.ts";
import {
  createPracticeReturnContext,
  createPracticeSession,
  reconcilePracticeResult,
  resolvePractice,
} from "../src/simulation/practice.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(repositoryRoot, "logs/simulation-result.json");
const practiceOutputPath = resolve(repositoryRoot, "logs/practice-result.json");
// Representative named-vehicle build: topology-ordered installed items plus
// three storage positions (feature 010).
const identity = runIdentityForEntrant("evelyn-mercer");
const emptyBuild = createEmptyVehicleBuild(identity.vehicleId);
const installed = [ITEM_POOL[0], ITEM_POOL[11], ITEM_POOL[13], null];
const stored = [ITEM_POOL[12], null, null];
const build = {
  ...emptyBuild,
  slots: emptyBuild.slots.map((slot, index) => ({ ...slot, item: installed[index] ?? null })),
  storage: emptyBuild.storage.map((position, index) => ({ ...position, item: stored[index] ?? null })),
};
const result = resolveContest(build, SAMPLE_GHOST);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Simulation log written to ${outputPath}`);
console.log(
  `Vehicle: ${identity.vehicleId} (${identity.entrantId}, ${identity.origin}); ` +
    `topology ${build.slots.map((slot) => slot.slotType).join("/")}`
);
console.log(
  `Installed: ${installedItems(build).map((item) => item?.id ?? "empty").join(", ")}; ` +
    `stored: ${storedItems(build).map((item) => item?.id ?? "empty").join(", ")}`
);
console.log(
  `Outcome: ${result.outcome}; player ${result.playerTime.toFixed(2)}s; ` +
    `ghost ${result.ghostTime.toFixed(2)}s; laps ${result.laps.length}`
);

// Fixed representative Test Day practice run — never written into run history,
// mirrors the same build used for the scored log above so the two are comparable.
const practiceRun = createRun({
  runId: "log-simulation-practice-run",
  seed: 1901,
  identityTag: "performance",
  identity,
  build,
  rng: Math.random,
});
const practiceContext = createPracticeReturnContext(practiceRun, {
  context: "run-hub",
  selection: null,
  navigation: { viewToken: "run-hub", focusToken: "test-day-control", scrollToken: "top" },
});
const practiceSession = resolvePractice(createPracticeSession(practiceRun, practiceContext));
const practiceResult = practiceSession.result;
const reconciliation = practiceResult ? reconcilePracticeResult(practiceResult.contest) : null;

const practiceLog = {
  configId: practiceResult?.configId ?? null,
  snapshotFingerprint: practiceSession.snapshot.fingerprint,
  playerTime: practiceResult?.contest.playerTime ?? null,
  ghostTime: practiceResult?.contest.ghostTime ?? null,
  gap: practiceResult?.contest.gap ?? null,
  outcome: practiceResult?.contest.outcome ?? null,
  reconciled: reconciliation?.valid ?? false,
  authority: practiceResult?.authority ?? null,
};

await writeFile(practiceOutputPath, `${JSON.stringify(practiceLog, null, 2)}\n`, "utf8");

console.log(`Practice (Test Day) log written to ${practiceOutputPath}`);
console.log(
  `Practice outcome: ${practiceLog.outcome}; player ${practiceLog.playerTime?.toFixed(2)}s; ` +
    `ghost ${practiceLog.ghostTime?.toFixed(2)}s; reconciled: ${practiceLog.reconciled}; ` +
    `authority: ${practiceLog.authority}`
);

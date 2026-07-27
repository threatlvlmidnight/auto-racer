import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_CAR, ITEM_POOL, SAMPLE_GHOST } from "../src/content/sample-data.ts";
import { resolveContest } from "../src/simulation/contest.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(repositoryRoot, "logs/simulation-result.json");
const build = {
  car: BASELINE_CAR,
  board: [ITEM_POOL[0], ITEM_POOL[11], ITEM_POOL[13]],
  storage: [ITEM_POOL[12], null, null],
};
const result = resolveContest(build, SAMPLE_GHOST);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Simulation log written to ${outputPath}`);
console.log(
  `Outcome: ${result.outcome}; player ${result.playerTime.toFixed(2)}s; ` +
    `ghost ${result.ghostTime.toFixed(2)}s; laps ${result.laps.length}`
);
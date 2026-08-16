import { ENTRANTS } from "./entrants";
import {
  RACE_ENRICHMENT_THRESHOLD_KEYS,
  type DriverPassive,
  type DriverPassiveCondition,
  type DriverRaceIdentity,
  type Origin,
  type SignatureContext,
  type SignatureTemporaryEffect,
  type StatTarget,
  type TemporaryEffectKind,
} from "../simulation/types";

/**
 * Feature 033 (T014): the four player driver identities and the deterministic
 * generated-opponent schema.
 *
 * Passive tendencies always apply; named signatures are eligible when the build's
 * resolved relevant stat reaches the config threshold for the signature's
 * `thresholdKey` (research Decision 4). Signatures carry only structural facts —
 * the numeric threshold and temporary-effect cap live in RaceEnrichmentConfig —
 * so no content literal acts as a hidden stock-stat scalar (constitution Product
 * Constraints).
 */

const PASSIVE_CONDITION: DriverPassiveCondition = "always";

interface PassiveSpec {
  stat: StatTarget;
  magnitude: number;
}

function passive(spec: PassiveSpec, name: string, description: string): DriverPassive {
  return {
    name,
    description,
    condition: PASSIVE_CONDITION,
    modifier: { stat: spec.stat, magnitude: spec.magnitude },
  };
}

const CONTEXTS: readonly SignatureContext[] = ["final-push", "contested", "corner-exit"];
const STAT_TARGETS: readonly StatTarget[] = ["acceleration", "topSpeed", "brakingPower", "corneringSpeed"];
const ORIGINS: readonly Origin[] = ["coachworks", "velodrome", "fieldworks", "backroads"];
const THRESHOLD_KEYS: readonly string[] = RACE_ENRICHMENT_THRESHOLD_KEYS as readonly string[];

interface PlayerSignatureSpec {
  id: string;
  name: string;
  statTarget: StatTarget;
  thresholdKey: string;
  context: SignatureContext;
  priority: number;
  temporaryEffect: { kind: TemporaryEffectKind };
}

function playerIdentity(
  entrantId: string,
  passiveSpec: PassiveSpec,
  passiveName: string,
  passiveDescription: string,
  signatureSpec: PlayerSignatureSpec,
): DriverRaceIdentity {
  const entrant = ENTRANTS.find((candidate) => candidate.id === entrantId);
  if (!entrant) throw new Error(`Unknown player entrant: ${entrantId}`);
  return {
    id: entrant.id,
    displayName: entrant.name,
    origin: entrant.origin,
    passive: passive(passiveSpec, passiveName, passiveDescription),
    signature: {
      id: signatureSpec.id,
      name: signatureSpec.name,
      statTarget: signatureSpec.statTarget,
      thresholdKey: signatureSpec.thresholdKey,
      context: signatureSpec.context,
      composureCostKey: "signature",
      priority: signatureSpec.priority,
      temporaryEffect: { stat: signatureSpec.statTarget, kind: signatureSpec.temporaryEffect.kind },
    },
  };
}

export const DRIVER_RACE_IDENTITIES: readonly DriverRaceIdentity[] = [
  playerIdentity(
    "evelyn-mercer",
    { stat: "corneringSpeed", magnitude: 3 },
    "Road Sense",
    "Reads corners far ahead; a modest cornering benefit on every lap regardless of build tier.",
    {
      id: "supreme-cornering-line",
      name: "Supreme Cornering Line",
      statTarget: "corneringSpeed",
      thresholdKey: THRESHOLD_KEYS[0],
      context: "corner-exit",
      priority: 0,
      temporaryEffect: { kind: "stat-window" },
    },
  ),
  playerIdentity(
    "lucien-soto",
    { stat: "acceleration", magnitude: 3 },
    "Draftmaster",
    "Settles cleanly behind the field; a small acceleration benefit applies every lap.",
    {
      id: "sprint-launch",
      name: "Sprint Launch",
      statTarget: "acceleration",
      thresholdKey: THRESHOLD_KEYS[1],
      context: "contested",
      priority: 1,
      temporaryEffect: { kind: "target-pace" },
    },
  ),
  playerIdentity(
    "inez-rook",
    { stat: "topSpeed", magnitude: 3 },
    "Tailwind Engineer",
    "Keeps the machine fast on the straights; a modest top-speed benefit applies every lap.",
    {
      id: "slipstream-egress",
      name: "Slipstream Egress",
      statTarget: "topSpeed",
      thresholdKey: THRESHOLD_KEYS[2],
      context: "final-push",
      priority: 2,
      temporaryEffect: { kind: "target-pace" },
    },
  ),
  playerIdentity(
    "nell-voss",
    { stat: "brakingPower", magnitude: 3 },
    "Late Braker",
    "Commits to the limit of the rules; a modest braking benefit applies every lap.",
    {
      id: "ambush-brake",
      name: "Ambush Brake",
      statTarget: "brakingPower",
      thresholdKey: THRESHOLD_KEYS[3],
      context: "corner-exit",
      priority: 3,
      temporaryEffect: { kind: "stat-window" },
    },
  ),
];

/** Deterministic FNV-1a over the (seed, index) pair — stable across processes. */
function rivalHash(seed: number, index: number): number {
  const key = `${String(seed)}:${String(index)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A generated opponent with the exact same schema as a player identity and no
 * hidden stock-stat bonus. Deterministic from (seed, index); rivals reference the
 * same central threshold keys, so origin never gates eligibility.
 */
export function generatedRivalIdentity(seed: number, index: number): DriverRaceIdentity {
  const hash = rivalHash(seed, index);
  const stat = STAT_TARGETS[hash % STAT_TARGETS.length];
  const context = CONTEXTS[hash % CONTEXTS.length];
  const origin = ORIGINS[hash % ORIGINS.length];
  const temporaryEffect: SignatureTemporaryEffect = {
    stat,
    kind: index % 2 === 0 ? "target-pace" : "stat-window",
  };
  return {
    id: `rival-${String(seed)}-${String(index)}`,
    displayName: `Rival ${String(index)}`,
    origin,
    passive: {
      name: "Field Scout",
      description: "A generated opponent tendency; same schema and bounds as player passives.",
      condition: PASSIVE_CONDITION,
      modifier: { stat, magnitude: 3 },
    },
    signature: {
      id: `rival-signature-${String(index)}`,
      name: `Rival Signature ${String(index)}`,
      statTarget: stat,
      thresholdKey: THRESHOLD_KEYS[hash % THRESHOLD_KEYS.length],
      context,
      composureCostKey: "signature",
      priority: index,
      temporaryEffect,
    },
  };
}

/** Look up a player identity by entrant id. */
export function identityForEntrant(entrantId: string): DriverRaceIdentity | undefined {
  return DRIVER_RACE_IDENTITIES.find((identity) => identity.id === entrantId);
}
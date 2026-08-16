import {
  RARITY_SEMANTICS,
  type ItemDefinition,
  type ItemRarity,
  type RaritySemantics,
} from "../simulation/types";

/**
 * Feature 035 — pure card feedback projection (spec.md US2/FR-006..FR-008,
 * contracts/interface-clarity-contract.md "Rarity and card state"). Rarity and
 * tier-upgrade facts are read from authored catalog truth and existing
 * availability/upgrade resolution; the projection never performs tiering or
 * purchases. Every consequential state is represented through text/icon/
 * structure — never color alone.
 */

export type CardRole = "offer" | "held" | "result" | "inventory";
export type CardAvailability = "available" | "unavailable";
export type MotionMode = "motion" | "reduced";

/** Structural precedence used only for framing emphasis — never suppresses a fact. */
export type CardFramePriority = "unavailable" | "rarity" | "upgrade" | "selection" | "focus";

export interface CardFeedbackState {
  itemId: string;
  rarity: ItemRarity;
  rarityLabel: string;
  rarityFrame: RaritySemantics["frame"];
  a11yToken: string;
  role: CardRole;
  availability: CardAvailability;
  selected: boolean;
  focused: boolean;
  upgradeEligible: boolean;
  upgradeReason: string | null;
  motionMode: MotionMode;
  framePriority: readonly CardFramePriority[];
}

export function raritySemantics(rarity: ItemRarity): RaritySemantics {
  return RARITY_SEMANTICS[rarity];
}

export interface CardFeedbackInput {
  item: ItemDefinition;
  role: CardRole;
  availability?: CardAvailability;
  selected?: boolean;
  focused?: boolean;
  upgradeEligible?: boolean;
  upgradeReason?: string | null;
  reducedMotion?: boolean;
}

export function cardFeedbackState(input: CardFeedbackInput): CardFeedbackState {
  const semantics = RARITY_SEMANTICS[input.item.rarity];
  const framePriority: CardFramePriority[] = [];
  const unavailable = input.availability === "unavailable";
  const upgradeEligible = input.upgradeEligible === true;

  // Structural precedence: unavailable action state, then rarity identity,
  // then upgrade eligibility, then transient selection/focus.
  if (unavailable) framePriority.push("unavailable");
  framePriority.push("rarity");
  if (upgradeEligible) framePriority.push("upgrade");
  if (input.selected) framePriority.push("selection");
  if (input.focused) framePriority.push("focus");

  return {
    itemId: input.item.id,
    rarity: input.item.rarity,
    rarityLabel: semantics.label,
    rarityFrame: semantics.frame,
    a11yToken: semantics.a11yToken,
    role: input.role,
    availability: unavailable ? "unavailable" : "available",
    selected: input.selected === true,
    focused: input.focused === true,
    upgradeEligible,
    upgradeReason: upgradeEligible ? (input.upgradeReason ?? "A held duplicate can upgrade this item.") : null,
    motionMode: input.reducedMotion ? "reduced" : "motion",
    framePriority,
  };
}
// --- Feature 035 US3: validated finite audit matrix -------------------------

/** Fixed landscape acceptance viewports (spec.md FR-010). Narrow portrait is out of scope (Feature 026). */
export const AUDIT_VIEWPORTS: readonly { id: string; width: number; height: number }[] = [
  { id: "1920-1080", width: 1920, height: 1080 },
  { id: "1366-768", width: 1366, height: 768 },
  { id: "1024-768", width: 1024, height: 768 },
  { id: "800-450", width: 800, height: 450 },
] as const;

export type AuditInputMode = "pointer" | "keyboard" | "touch";

/** One repeatable acceptance case (data-model.md "UiAuditCase"). */
export interface UiAuditCase {
  caseId: string;
  scene: string;
  fixture: string;
  viewportId: string;
  inputMode: AuditInputMode;
  /** Consequential actions that MUST be visible and reachable. */
  expectedControls: readonly string[];
  /** Consequential identity/card facts that MUST be visible and reachable. */
  expectedFacts: readonly string[];
}

/** Build one audit case across all four fixed viewports and input modes. */
function auditRow(caseId: string, scene: string, fixture: string): UiAuditCase[] {
  const controls = ["primary-action"];
  const facts = ["identity", "price", "state"];
  const rows: UiAuditCase[] = [];
  for (const viewport of AUDIT_VIEWPORTS) {
    for (const inputMode of ["pointer", "keyboard", "touch"] as const) {
      rows.push({
        caseId: `${caseId}-${viewport.id}-${inputMode}`,
        scene,
        fixture,
        viewportId: viewport.id,
        inputMode,
        expectedControls: controls,
        expectedFacts: facts,
      });
    }
  }
  return rows;
}

/** The finite primary-scene/state/viewport audit matrix approved in acceptance-evidence.md. */
export const AUDIT_CASES: readonly UiAuditCase[] = [
  ...auditRow("audit-title", "TitleScene", "title-default"),
  ...auditRow("audit-entrant", "EntrantSelectScene", "entrant-selection"),
  ...auditRow("audit-destination", "DestinationScene", "destination-offer"),
  ...auditRow("audit-run", "RunScene", "run-route"),
  ...auditRow("audit-supplier", "PrepareScene", "parts-supplier"),
  ...auditRow("audit-inventory", "InventoryScene", "inventory"),
  ...auditRow("audit-pretrace", "PreRaceScene", "pre-race-setup"),
  ...auditRow("audit-race", "ContestScene", "watched-race"),
  ...auditRow("audit-result", "ResultScene", "result-summary"),
  ...auditRow("audit-testday", "TestDayScene", "test-day-briefing"),
  ...auditRow("audit-encounter", "RunScene", "encounter-card"),
  ...auditRow("audit-practice", "PracticeResultScene", "test-day-result"),
];

/** Validate that a matrix is finite and its viewport set is exactly the approved landscape set. */
export function validateAuditCases(cases: readonly UiAuditCase[]): { kind: "valid" } | { kind: "invalid"; issues: string[] } {
  const issues: string[] = [];
  const approved = new Set(AUDIT_VIEWPORTS.map((viewport) => viewport.id));
  const seen = new Set<string>();
  for (const entry of cases) {
    if (seen.has(entry.caseId)) issues.push(`duplicate caseId: ${entry.caseId}`);
    seen.add(entry.caseId);
    if (!approved.has(entry.viewportId)) issues.push(`${entry.caseId}: unsupported viewport ${entry.viewportId}`);
    if (!entry.expectedControls.length && !entry.expectedFacts.length) {
      issues.push(`${entry.caseId}: case asserts no facts or controls`);
    }
  }
  return issues.length ? { kind: "invalid", issues } : { kind: "valid" };
}

// --- Feature 035 US3/T033/T035: compact / pinned layout decisions -----------

/** A deliberate, readable secondary-inspection layout choice (never shrink-and-clip). */
export interface CardLayoutDecision {
  treatment: "full" | "pinned" | "compact";
  /** Line count the metadata block is allowed to occupy (never one line when dense). */
  metadataLines: number;
  /** How many effect lines fit before the "+ N MORE · PIN FOR DETAILS" hint. */
  effectLinesVisible: number;
  /** True when content exceeds the visible box and must be read via inspect/pin. */
  truncateToDetail: boolean;
  reason: string;
}

/**
 * Decide a card's layout from its box and incoming content length so dense or
 * long-copy cards use a deliberate compact/pinned treatment instead of
 * overlapping or clipping (T033 combined-card-state + longest-copy fixtures).
 */
export function resolveCardLayout(input: {
  width: number;
  height: number;
  nameLength: number;
  effectCount: number;
  metadataDensity: number;
}): CardLayoutDecision {
  // Never squeeze metadata into a single clipped line (review B finding).
  const metadataLines = input.metadataDensity > 0 ? 2 : 1;

  // Compact width leaves no room for a readable side-by-side layout.
  if (input.width < 120) {
    const effectLinesVisible = input.height >= 90 ? 2 : 1;
    return {
      treatment: "compact",
      metadataLines,
      effectLinesVisible,
      truncateToDetail: input.effectCount > effectLinesVisible,
      reason: "compact width — constrain metadata and effect lines; keep facts via inspect",
    };
  }

  // Dense combined card state: pin the essential facts and push detail to inspect.
  if (input.effectCount > 3 || input.nameLength > 24) {
    const effectLinesVisible = 2;
    return {
      treatment: "pinned",
      metadataLines,
      effectLinesVisible,
      truncateToDetail: input.effectCount > effectLinesVisible,
      reason: "dense/long-copy card — pinned identity + price + upgrade/state, effect detail via inspect",
    };
  }

  return {
    treatment: "full",
    metadataLines,
    effectLinesVisible: input.effectCount,
    truncateToDetail: false,
    reason: "fits the supported box",
  };
}



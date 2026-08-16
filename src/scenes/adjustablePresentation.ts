import type {
  EligibleSetupControl,
  HeldItemLocation,
  ItemDefinition,
  SetupPositionId,
  SetupSelections,
} from "../simulation/types";

/**
 * Feature 035 — pure Adjustable capability projection (spec.md US1, FR-004/FR-005,
 * contracts/interface-clarity-contract.md "Adjustable semantics"). An item is
 * Adjustable exactly when its installed state contributes its
 * `configurableSetup.family` to the current eligible setup controls. It never
 * creates a control and never derives a new stat delta — current value and
 * consequence come only from the existing authoritative setup evidence.
 */

export type AdjustableStatus = "available" | "unavailable" | "absent";

export interface AdjustablePresentation {
  itemId: string;
  status: AdjustableStatus;
  /** Exactly one "ADJUSTABLE" badge; null whenever the control is unavailable/absent. */
  badgeLabel: "ADJUSTABLE" | null;
  controlFamily: string | null;
  controlLabel: string | null;
  /** The shared control's resolved current position label (from selections). */
  currentValueLabel: string | null;
  /** Non-color explanation for accessibility/no-hover reach. */
  explanation: string;
}

export interface AdjustableInput {
  item: ItemDefinition;
  /** Null when the item is not being presented at all. Absent for stored/non-configurable. */
  heldLocation: HeldItemLocation | null;
  eligibleControls: readonly EligibleSetupControl[];
  /** Uncommitted setup selections (missing resolves to balanced). */
  selections?: SetupSelections;
}

/** Resolve the current selection label for a control; missing resolves to balanced. */
export function currentSetupValueLabel(
  control: EligibleSetupControl,
  selections: SetupSelections = {},
): string {
  const position = control.positions.find((candidate) => candidate.id === (selections[control.family] ?? "balanced"));
  return position?.label ?? "Balanced";
}

export function adjustablePresentation(input: AdjustableInput): AdjustablePresentation {
  const { item } = input;
  const family = item.configurableSetup?.family;

  // Stored or non-configurable items are always absent — never imply an available control.
  if (!family || input.heldLocation?.area !== "vehicle") {
    return {
      itemId: item.id,
      status: "absent",
      badgeLabel: null,
      controlFamily: family ?? null,
      controlLabel: null,
      currentValueLabel: null,
      explanation: "No pre-race control is available for this item.",
    };
  }

  // Installed + configurable: available only if the family's control is eligible
  // (i.e. the installed item itself is a member of the eligible control's sources).
  const control = input.eligibleControls.find((entry) => entry.sourceItemIds.includes(item.id));
  if (!control) {
    return {
      itemId: item.id,
      status: "unavailable",
      badgeLabel: null,
      controlFamily: family,
      controlLabel: null,
      currentValueLabel: null,
      explanation: "This item's control is not eligible for the current build.",
    };
  }

  const currentValueLabel = currentSetupValueLabel(control, input.selections);
  return {
    itemId: item.id,
    status: "available",
    badgeLabel: "ADJUSTABLE",
    controlFamily: control.family,
    controlLabel: control.label,
    currentValueLabel,
    explanation: `${control.label} is ${currentValueLabel.toLowerCase()} and can be adjusted before this race.`,
  };
}

/** Stable adjustability input type alias for call sites/tests. */
export type AdjustablePositionId = SetupPositionId;

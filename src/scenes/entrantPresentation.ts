import { ENTRANTS, entrantById, vehicleForEntrant } from "../content/entrants";
import {
  VEHICLE_SLOT_COUNT,
  VEHICLE_STORAGE_CAPACITY,
  type EntrantId,
  type Origin,
  type SlotType,
} from "../simulation/types";

// Pure presentation selectors for entrant selection. These never create a run,
// touch RNG, or read scene state — inspecting an entrant must be completely
// free of consequence until the player explicitly confirms (spec US1 #5).

const ORIGIN_LABELS: Record<Origin, string> = {
  coachworks: "Coachworks",
  velodrome: "Velodrome",
  fieldworks: "Fieldworks",
  backroads: "Backroads",
};

/**
 * Stated on the selection screen itself so no entrant can read as an advantage
 * (spec FR-004). Identity changes *which* opportunities appear, never capacity.
 */
export const ENTRANT_EQUALITY_STATEMENT =
  "Every entrant has the same baseline pace, four active slots, three storage spaces, and "
  + "identical contest rules. Only slot layout and draft weighting differ.";

export interface EntrantTopologySummary {
  power: number;
  chassis: number;
  flex: number;
  total: number;
}

export interface EntrantChoiceModel {
  entrantId: EntrantId;
  order: number;
  name: string;
  role: string;
  vehicleName: string;
  originLabel: string;
  topologyLabel: string;
  portraitAssetKey: string;
  selected: boolean;
  available: boolean;
  locked: boolean;
  /** Text state so selection never depends on color alone (FR-021). */
  stateLabel: string;
  keyBinding: string;
  pointer: true;
  touch: true;
}

export interface EntrantDetailModel {
  entrantId: EntrantId;
  name: string;
  role: string;
  approach: string;
  strategyDirections: readonly string[];
  originLabel: string;
  originWeightingNote: string;
  vehicleName: string;
  vehicleId: string;
  topology: EntrantTopologySummary;
  topologyLabel: string;
  slotTypes: readonly SlotType[];
  storageCapacity: number;
  /** Present only when the vehicle genuinely has zero Flex slots. */
  noFlexDisclosure: string | null;
  portraitAssetKey: string;
  silhouetteAssetKey: string;
}

export interface EntrantConfirmModel {
  label: string;
  enabled: boolean;
  disabledReason: string | null;
  keyBinding: string;
}

export interface EntrantSelectionModel {
  title: string;
  choices: EntrantChoiceModel[];
  selectedEntrantId: EntrantId | null;
  detail: EntrantDetailModel | null;
  equalityStatement: string;
  confirm: EntrantConfirmModel;
  unavailable: { reason: string } | null;
}

export interface EntrantSelectionAvailability {
  blocked: boolean;
  reason?: string;
}

function topologyFor(entrantId: EntrantId): EntrantTopologySummary & { slotTypes: SlotType[] } {
  const slotTypes = (vehicleForEntrant(entrantId)?.slots ?? []).map((slot) => slot.type);
  return {
    power: slotTypes.filter((type) => type === "power").length,
    chassis: slotTypes.filter((type) => type === "chassis").length,
    flex: slotTypes.filter((type) => type === "flex").length,
    total: slotTypes.length,
    slotTypes,
  };
}

export function entrantTopologyLabel(entrantId: EntrantId): string {
  const { power, chassis, flex } = topologyFor(entrantId);
  return `${power} Power · ${chassis} Chassis · ${flex} Flex`;
}

export function entrantDetailModel(entrantId: EntrantId): EntrantDetailModel | null {
  const entrant = entrantById(entrantId);
  const vehicle = vehicleForEntrant(entrantId);
  if (!entrant || !vehicle) return null;

  const topology = topologyFor(entrantId);
  return {
    entrantId,
    name: entrant.name,
    role: entrant.role,
    approach: entrant.approach,
    strategyDirections: entrant.strategyDirections,
    originLabel: ORIGIN_LABELS[entrant.origin],
    // Deliberately phrased as a bias, never as ownership or a legality rule.
    originWeightingNote:
      `Draft offers are weighted toward ${ORIGIN_LABELS[entrant.origin]} items — you will see them `
      + "more often, and items from every other ecosystem still appear and still fit.",
    vehicleName: vehicle.name,
    vehicleId: vehicle.id,
    topology: {
      power: topology.power,
      chassis: topology.chassis,
      flex: topology.flex,
      total: topology.total,
    },
    topologyLabel: entrantTopologyLabel(entrantId),
    slotTypes: topology.slotTypes,
    storageCapacity: vehicle.storageCapacity,
    noFlexDisclosure: topology.flex === 0
      ? `${vehicle.name} has no Flex slots: every item is either Fitted or Improvised.`
      : null,
    portraitAssetKey: entrant.portraitAssetKey,
    silhouetteAssetKey: vehicle.silhouetteAssetKey,
  };
}

export function entrantSelectionModel(
  selectedEntrantId: EntrantId | null,
  availability: EntrantSelectionAvailability = { blocked: false },
): EntrantSelectionModel {
  const detail = selectedEntrantId ? entrantDetailModel(selectedEntrantId) : null;
  const blocked = availability.blocked;

  const choices: EntrantChoiceModel[] = ENTRANTS.map((entrant, index) => {
    const vehicle = vehicleForEntrant(entrant.id);
    const selected = entrant.id === selectedEntrantId;
    return {
      entrantId: entrant.id,
      order: index,
      name: entrant.name,
      role: entrant.role,
      vehicleName: vehicle?.name ?? "",
      originLabel: ORIGIN_LABELS[entrant.origin],
      topologyLabel: entrantTopologyLabel(entrant.id),
      portraitAssetKey: entrant.portraitAssetKey,
      selected,
      // Every entrant is always available; there is no unlock or progression gate.
      available: true,
      locked: false,
      stateLabel: selected ? "SELECTED" : "AVAILABLE",
      keyBinding: String(index + 1),
      pointer: true,
      touch: true,
    };
  });

  const canConfirm = !blocked && detail !== null;
  return {
    title: "CHOOSE YOUR ENTRANT",
    choices: blocked ? [] : choices,
    selectedEntrantId: detail ? selectedEntrantId : null,
    detail,
    equalityStatement: ENTRANT_EQUALITY_STATEMENT,
    confirm: {
      label: "ENTER CHAMPIONSHIP",
      enabled: canConfirm,
      disabledReason: canConfirm
        ? null
        : blocked
          ? (availability.reason ?? "Entrant selection is unavailable.")
          : "Choose an entrant to enter the championship.",
      keyBinding: "Enter",
    },
    unavailable: blocked ? { reason: availability.reason ?? "Entrant selection is unavailable." } : null,
  };
}

export const ENTRANT_SLOT_COUNT = VEHICLE_SLOT_COUNT;
export const ENTRANT_STORAGE_CAPACITY = VEHICLE_STORAGE_CAPACITY;

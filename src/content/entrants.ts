import { BASELINE_CAR } from "./sample-data";
import {
  VEHICLE_SLOT_COUNT,
  VEHICLE_STORAGE_CAPACITY,
  type EntrantDefinition,
  type EntrantId,
  type SlotType,
  type VehicleDefinition,
  type VehicleId,
} from "../simulation/types";

// Authored launch roster (specs/launch-roster.md, specs/vehicle-topology.md).
// Entrant choice defines an *approach*, never a stat advantage: every vehicle
// shares the same baseline car, four active slots, and three storage positions.
// Only the distribution of Power/Chassis/Flex slots differs.

function slots(vehicleId: VehicleId, types: readonly SlotType[]) {
  return types.map((type, index) => ({
    id: `${vehicleId}-slot-${index + 1}`,
    type,
    presentationAnchor: `${vehicleId}-anchor-${index + 1}`,
  }));
}

export const ENTRANTS: readonly EntrantDefinition[] = [
  {
    id: "evelyn-mercer",
    name: "Evelyn Mercer",
    origin: "coachworks",
    role: "Master coachwright and accomplished carriage racer",
    approach:
      "Motor racing may be new, but craftsmanship, road sense, and competitive driving are not. "
      + "Evelyn treats the championship as both a race and the first true public trial of the coachbuilder's art.",
    strategyDirections: [
      "Dependable recurring effects and conventional direct performance",
      "Durable builds that protect an accumulated advantage",
      "Wheel, material, and matching-set synergies",
      "Value builds based on appraising, refurbishing, and trading items",
    ],
    vehicleId: "the-highwheel",
    portraitAssetKey: "entrant-evelyn-mercer",
  },
  {
    id: "lucien-soto",
    name: "Lucien Soto",
    origin: "velodrome",
    role: "Champion bicycle racer and celebrated velodrome sprinter",
    approach:
      "The machine is an extension of the competitor. Lucien understands rhythm, drafting, positioning, "
      + "endurance, and the precise instant a race can be won.",
    strategyDirections: [
      "Frequent triggers and cooldown coordination",
      "Momentum and cadence that reward maintaining a sequence",
      "Lightweight, precisely curated builds",
      "Late-race stamina scaling and explosive sprint finishes",
    ],
    vehicleId: "the-needle",
    portraitAssetKey: "entrant-lucien-soto",
  },
  {
    id: "inez-rook",
    name: "Inez Rook",
    origin: "fieldworks",
    role: "Expedition engineer, field mechanic, and compulsive rescuer of broken machinery",
    approach:
      "There is no such thing as the wrong component, only a component whose next purpose has not yet been "
      + "understood. Inez expects a machine to change whenever circumstances do.",
    strategyDirections: [
      "Salvage and transformation of unwanted or damaged items",
      "Tool, spare-part, and storage-count synergies",
      "Heat, pressure, and controlled-risk overclocking",
      "Hybrid assemblies that connect otherwise unrelated synergy tags",
    ],
    vehicleId: "the-lark",
    portraitAssetKey: "entrant-inez-rook",
  },
  {
    id: "nell-voss",
    name: "Nell Voss",
    origin: "backroads",
    role: "Customs runner, illicit courier, and veteran of races that were never officially announced",
    approach:
      "Officials have given a name and a rulebook to something Nell has done for years. Rules, patrols, bad "
      + "roads, and other competitors are all obstacles to be read, redirected, or escaped.",
    strategyDirections: [
      "Contraband value builds that balance cargo against a later payout",
      "Risk and exposure builds that become lucrative under pressure",
      "Evasion, redirection, and protection from opposing effects",
      "Sudden escape bursts and decisive high-speed laps",
    ],
    vehicleId: "the-hush",
    portraitAssetKey: "entrant-nell-voss",
  },
];

export const VEHICLES: readonly VehicleDefinition[] = [
  {
    id: "the-highwheel",
    name: "The Highwheel",
    entrantId: "evelyn-mercer",
    baseCarId: BASELINE_CAR.id,
    silhouetteAssetKey: "vehicle-the-highwheel",
    // 1 Power / 2 Chassis / 1 Flex — a coachbuilt chassis specialist.
    slots: slots("the-highwheel", ["power", "chassis", "chassis", "flex"]),
    storageCapacity: VEHICLE_STORAGE_CAPACITY,
  },
  {
    id: "the-needle",
    name: "The Needle",
    entrantId: "lucien-soto",
    baseCarId: BASELINE_CAR.id,
    silhouetteAssetKey: "vehicle-the-needle",
    // 2 Power / 1 Chassis / 1 Flex — engine-forward and lightly built.
    slots: slots("the-needle", ["power", "power", "chassis", "flex"]),
    storageCapacity: VEHICLE_STORAGE_CAPACITY,
  },
  {
    id: "the-lark",
    name: "The Lark",
    entrantId: "inez-rook",
    baseCarId: BASELINE_CAR.id,
    silhouetteAssetKey: "vehicle-the-lark",
    // 1 Power / 1 Chassis / 2 Flex — the most adaptable, least specialised.
    slots: slots("the-lark", ["power", "chassis", "flex", "flex"]),
    storageCapacity: VEHICLE_STORAGE_CAPACITY,
  },
  {
    id: "the-hush",
    name: "The Hush",
    entrantId: "nell-voss",
    baseCarId: BASELINE_CAR.id,
    silhouetteAssetKey: "vehicle-the-hush",
    // 2 Power / 2 Chassis / 0 Flex — no Flex at all: every slot is committed,
    // so every placement is either Fitted or Improvised.
    slots: slots("the-hush", ["power", "power", "chassis", "chassis"]),
    storageCapacity: VEHICLE_STORAGE_CAPACITY,
  },
];

export function entrantById(id: EntrantId): EntrantDefinition | undefined {
  return ENTRANTS.find((entrant) => entrant.id === id);
}

export function vehicleById(id: VehicleId): VehicleDefinition | undefined {
  return VEHICLES.find((vehicle) => vehicle.id === id);
}

export function vehicleForEntrant(id: EntrantId): VehicleDefinition | undefined {
  const entrant = entrantById(id);
  if (!entrant) return undefined;
  const vehicle = vehicleById(entrant.vehicleId);
  // Reciprocity is part of the contract, not an assumption.
  return vehicle?.entrantId === id ? vehicle : undefined;
}

export type RosterCatalogValidation =
  | { kind: "valid" }
  | { kind: "invalid"; code: "invalid-roster-pairing" | "invalid-vehicle-topology" };

/**
 * Content-integrity check for the authored roster. Never infers or substitutes
 * an entrant/vehicle — a broken catalog is a build-time content bug, and the
 * caller is expected to surface it rather than silently pick a default.
 */
export function validateRosterCatalog(
  entrants: readonly EntrantDefinition[],
  vehicles: readonly VehicleDefinition[],
): RosterCatalogValidation {
  const invalid = (code: "invalid-roster-pairing" | "invalid-vehicle-topology") =>
    ({ kind: "invalid", code }) as const;

  for (const entrant of entrants) {
    const vehicle = vehicles.find((candidate) => candidate.id === entrant.vehicleId);
    if (!vehicle || vehicle.entrantId !== entrant.id) return invalid("invalid-roster-pairing");
  }
  for (const vehicle of vehicles) {
    const entrant = entrants.find((candidate) => candidate.id === vehicle.entrantId);
    if (!entrant || entrant.vehicleId !== vehicle.id) return invalid("invalid-roster-pairing");
  }

  for (const vehicle of vehicles) {
    if (vehicle.slots.length !== VEHICLE_SLOT_COUNT) return invalid("invalid-vehicle-topology");
    if (vehicle.storageCapacity !== VEHICLE_STORAGE_CAPACITY) return invalid("invalid-vehicle-topology");
    if (vehicle.baseCarId !== BASELINE_CAR.id) return invalid("invalid-vehicle-topology");
    const slotIds = vehicle.slots.map((slot) => slot.id);
    if (new Set(slotIds).size !== slotIds.length) return invalid("invalid-vehicle-topology");
  }

  const allSlotIds = vehicles.flatMap((vehicle) => vehicle.slots.map((slot) => slot.id));
  if (new Set(allSlotIds).size !== allSlotIds.length) return invalid("invalid-vehicle-topology");

  return { kind: "valid" };
}

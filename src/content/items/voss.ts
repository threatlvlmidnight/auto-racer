import type { ItemDefinition } from "../../simulation/types";

const NONE = { kind: "none", description: "Fitted: no additional consequence." } as const;
const IMP = { kind: "none", description: "Improvised: no additional consequence." } as const;
const TIGHT = 55;
type VossItem = Omit<ItemDefinition, "origin" | "timeModifier" | "fittedBehavior" | "improvisedBehavior">;
const item = (value: VossItem): ItemDefinition => ({ ...value, origin: "backroads", timeModifier: 0, fittedBehavior: NONE, improvisedBehavior: IMP });

export const VOSS_ITEMS: readonly ItemDefinition[] = [
  item({ id: "voss-stamped-compliance-plate", name: "Stamped Compliance Plate", price: 5, installationCategory: "power", synergyTags: ["loophole", "provenance"], physics: { topSpeedDelta: 2 }, synergyEffects: [{ target: { kind: "category", category: "chassis" }, appliesTo: "self", condition: { kind: "exact-other-count", count: 2, bonusPercent: 50 }, targetStat: "topSpeed", description: "Exactly two declared Chassis items add +50% to this item's top-speed effect." }] }),
  item({ id: "voss-late-braking-equalizer", name: "Late-Braking Equalizer", price: 5, installationCategory: "chassis", synergyTags: ["control", "exposure"], physics: { brakingPowerDelta: 39, topSpeedDelta: -1 }, conditionalPhysics: [{ condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: TIGHT }, delta: { corneringSpeedDelta: 4 } }] }),
  item({ id: "voss-lookouts-timing-board", name: "Lookout's Timing Board", price: 5, installationCategory: "chassis", synergyTags: ["information", "evasion"], buff: { boostPercent: 20, targetStat: "brakingPower" } }),
  item({ id: "voss-auxiliary-starting-tank", name: "Auxiliary Starting Tank", price: 5, installationCategory: "power", synergyTags: ["fuel", "momentum"], buff: { boostPercent: 3, targetStat: "acceleration" }, cooldown: 2 }),
  item({ id: "voss-declared-fuel-measure", name: "Declared Fuel Measure", price: 4, installationCategory: "power", synergyTags: ["loophole", "fuel"], physics: { accelerationDelta: 13 } }),
  item({ id: "voss-oversize-reserve-line", name: "Oversize Reserve Line", price: 4, installationCategory: "power", synergyTags: ["fuel", "pressure"], physics: { topSpeedDelta: 2 } }),
  item({ id: "voss-chopped-flywheel", name: "Chopped Flywheel", price: 4, installationCategory: "power", synergyTags: ["exposure", "momentum"], physics: { accelerationDelta: 19, topSpeedDelta: -1 } }),
  item({ id: "voss-quick-change-final-drive", name: "Quick-Change Final Drive", price: 4, installationCategory: "power", synergyTags: ["momentum", "evasion"], physics: { accelerationDelta: 6, topSpeedDelta: 1 } }),
  item({ id: "voss-sealed-instrument-case", name: "Sealed Instrument Case", price: 2, installationCategory: "power", synergyTags: ["information", "provenance"], buff: { boostPercent: 10, targetStat: "corneringSpeed" } }),
  item({ id: "voss-bookmakers-declared-margin", name: "Bookmaker's Declared Margin", price: 2, installationCategory: "power", synergyTags: ["wager", "loophole"] }),
  item({ id: "voss-removable-inspection-ballast", name: "Removable Inspection Ballast", price: 4, installationCategory: "chassis", synergyTags: ["loophole", "exposure"], physics: { corneringSpeedDelta: 4, accelerationDelta: -6 } }),
  item({ id: "voss-adjustable-bodywork-stay", name: "Adjustable Bodywork Stay", price: 4, installationCategory: "chassis", synergyTags: ["loophole", "control"], conditionalPhysics: [{ condition: { kind: "corner-tightness", direction: "at-most", turnDegrees: 40 }, delta: { topSpeedDelta: 2 } }] }),
  item({ id: "voss-split-circuit-brake-valve", name: "Split-Circuit Brake Valve", price: 4, installationCategory: "chassis", synergyTags: ["control", "pressure"], physics: { brakingPowerDelta: 26 } }),
  item({ id: "voss-unmarked-route-book", name: "Unmarked Route Book", price: 2, installationCategory: "chassis", synergyTags: ["information", "evasion"], conditionalPhysics: [{ condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: TIGHT }, delta: { corneringSpeedDelta: 3 } }] }),
  item({ id: "voss-quick-release-lamp-shutters", name: "Quick-Release Lamp Shutters", price: 2, installationCategory: "chassis", synergyTags: ["evasion", "exposure"], physics: { topSpeedDelta: 1 } }),
];

import type { ItemDefinition } from "../../simulation/types";

const NONE = { kind: "none", description: "Fitted: no additional consequence." } as const;
const IMP = { kind: "none", description: "Improvised: no additional consequence." } as const;
const TIGHT = 55;
type RookItem = Omit<ItemDefinition, "origin" | "timeModifier" | "fittedBehavior" | "improvisedBehavior">;
const item = (value: RookItem): ItemDefinition => ({ ...value, origin: "fieldworks", timeModifier: 0, fittedBehavior: NONE, improvisedBehavior: IMP });

export const ROOK_ITEMS: readonly ItemDefinition[] = [
  item({ id: "rook-variable-pitch-propeller", name: "Variable-Pitch Propeller", price: 5, installationCategory: "power", synergyTags: ["airflow", "experimental"], physics: { topSpeedDelta: 2 }, synergyEffects: [{ target: { kind: "tag", tag: "airflow" }, appliesTo: "self", condition: { kind: "linear-per-count", percentPerMatch: 15 }, targetStat: "topSpeed", description: "Each other airflow experiment adds +15% to this item's top-speed effect." }], configurableSetup: { family: "propeller-pitch", magnitude: 1 } }),
  item({ id: "rook-six-wheel-tracking-bogie", name: "Six-Wheel Tracking Bogie", price: 5, installationCategory: "chassis", synergyTags: ["control", "suspension"], physics: { brakingPowerDelta: 26, corneringSpeedDelta: 3, topSpeedDelta: -1 } }),
  item({ id: "rook-calibrated-pressure-manifold", name: "Calibrated Pressure Manifold", price: 5, installationCategory: "power", synergyTags: ["pressure", "information"], buff: { boostPercent: 6, targetStat: "acceleration", perCount: true } }),
  item({ id: "rook-interchangeable-test-mounts", name: "Interchangeable Test Mounts", price: 5, installationCategory: "chassis", synergyTags: ["experimental", "information"], physics: { corneringSpeedDelta: 2 }, synergyEffects: [{ target: { kind: "category", category: "power" }, appliesTo: "self", condition: { kind: "exact-other-count", count: 2, bonusPercent: 50 }, targetStat: "corneringSpeed", description: "Exactly two Power experiments add +50% to this item's cornering effect." }] }),
  item({ id: "rook-rotary-aero-engine", name: "Rotary Aero Engine", price: 4, installationCategory: "power", synergyTags: ["airflow", "heat", "experimental"], physics: { accelerationDelta: 13, topSpeedDelta: 2, brakingPowerDelta: -13 } }),
  item({ id: "rook-pressure-fed-carburetor", name: "Pressure-Fed Carburetor", price: 4, installationCategory: "power", synergyTags: ["pressure", "heat"], physics: { accelerationDelta: 13 } }),
  item({ id: "rook-high-pressure-fuel-pump", name: "High-Pressure Fuel Pump", price: 2, installationCategory: "power", synergyTags: ["pressure", "experimental"], physics: { accelerationDelta: 6 } }),
  item({ id: "rook-instrumented-cooling-jacket", name: "Instrumented Cooling Jacket", price: 4, installationCategory: "power", synergyTags: ["heat", "information"], buff: { boostPercent: 15, targetStat: "topSpeed" } }),
  item({ id: "rook-dynamometer-takeoff", name: "Dynamometer Takeoff", price: 2, installationCategory: "power", synergyTags: ["information", "gearing"], physics: { topSpeedDelta: 1 } }),
  item({ id: "rook-variable-ratio-test-gearbox", name: "Variable-Ratio Test Gearbox", price: 4, installationCategory: "power", synergyTags: ["experimental", "gearing"], physics: { accelerationDelta: 6, topSpeedDelta: 1 } }),
  item({ id: "rook-streamlined-balloon-fabric", name: "Streamlined Balloon Fabric", price: 2, installationCategory: "chassis", synergyTags: ["airflow", "lightweight"], physics: { topSpeedDelta: 1 } }),
  item({ id: "rook-articulated-steering-linkage", name: "Articulated Steering Linkage", price: 4, installationCategory: "chassis", synergyTags: ["control", "suspension"], physics: { corneringSpeedDelta: 3 } }),
  item({ id: "rook-differential-braking-valve", name: "Differential Braking Valve", price: 4, installationCategory: "chassis", synergyTags: ["pressure", "control"], physics: { brakingPowerDelta: 26 }, configurableSetup: { family: "brake-balance", magnitude: 1 } }),
  item({ id: "rook-gyroscopic-stabilizer", name: "Gyroscopic Stabilizer", price: 4, installationCategory: "chassis", synergyTags: ["control", "experimental"], conditionalPhysics: [{ condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: TIGHT }, delta: { corneringSpeedDelta: 6 } }], configurableSetup: { family: "racing-line", magnitude: 1 } }),
  item({ id: "rook-airflow-test-vane", name: "Airflow Test Vane", price: 2, installationCategory: "chassis", synergyTags: ["airflow", "information"], buff: { boostPercent: 10, targetStat: "topSpeed" } }),
];

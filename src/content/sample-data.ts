import type { OfferedItem, SampleGhost, SpecCar } from "../simulation/types";

// Static, illustrative content. The real catalog and theme remain later
// features; these varied values make slot and eviction choices observable.

export const BASELINE_CAR: SpecCar = {
  id: "spec-car-baseline",
  baseLapTime: 6,
};

export const ITEM_POOL: OfferedItem[] = [
  {
    id: "item-001",
    name: "Close-Ratio Gearset",
    timeModifier: -3,
    identityTag: "performance",
    cooldown: 1,
  },
  {
    id: "item-002",
    name: "Lightweight Flywheel",
    timeModifier: -1.25,
    identityTag: "performance",
    cooldown: 2,
  },
  {
    id: "item-003",
    name: "Experimental Brake Bias",
    timeModifier: 0.75,
    cooldown: 3,
  },
  {
    id: "item-004",
    name: "Track-Spec Dampers",
    timeModifier: -2.1,
    identityTag: "performance",
    cooldown: 2,
  },
  {
    id: "item-005",
    name: "Blueprinted Engine",
    timeModifier: -4.5,
    identityTag: "performance",
    cooldown: 4,
  },
  {
    id: "item-006",
    name: "Low-Drag Mirror Set",
    timeModifier: -0.6,
    cooldown: 1,
  },
  {
    id: "item-007",
    name: "Forged Control Arms",
    timeModifier: -1.8,
    identityTag: "performance",
    cooldown: 3,
  },
  {
    id: "item-008",
    name: "Ceramic Heat Shield",
    timeModifier: 0.4,
    cooldown: 2,
  },
  {
    id: "item-009",
    name: "Limited-Slip Differential",
    timeModifier: -2.7,
    identityTag: "performance",
    cooldown: 4,
  },
  {
    id: "item-010",
    name: "Reinforced Skid Plate",
    timeModifier: 1.1,
    cooldown: 1,
  },
  {
    id: "item-011",
    name: "Compact Data Logger",
    timeModifier: -0.9,
    cooldown: 2,
  },
  {
    id: "item-012",
    name: "Performance Calibration Suite",
    timeModifier: 0,
    identityTag: "performance",
    buff: { boostPercent: 5 },
  },
  {
    id: "item-013",
    name: "Tyre Rack",
    timeModifier: -0.35,
    cooldown: 3,
    activeWhileStored: true,
  },
  {
    id: "item-014",
    name: "Adaptive Telemetry Loop",
    timeModifier: 0,
    identityTag: "performance",
    cooldown: 3,
    buff: { boostPercent: 1 },
  },
];

export const SAMPLE_GHOST: SampleGhost = {
  id: "ghost-001",
  lapTime: 5.85,
};

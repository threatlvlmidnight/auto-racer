import type { ItemDefinition } from "../../simulation/types";

// 020-character-item-pools: the locked Neutral pool (data-model.md Appendix).
// Reachable by every entrant regardless of pool membership (Decision 1) —
// `origin` here is flavor/draft-weighting only, never a gate. Every physics
// item's Fitted/Improvised behavior is `{kind: "none"}`: that installation
// path is still physics-blind ([[physics-blind-installation]]), so only
// Trackside Tachometer (a Buff-role item) carries a real Fitted bonus. Items
// 4/5/10 are the three authored Economy placeholders — complete, valid
// ItemDefinitions with no numeric effect until the deferred Economy
// capability feature lands ([[economy-items-capability-deferred]]).

const NONE: ItemDefinition["fittedBehavior"] = { kind: "none", description: "Fitted: no additional consequence." };
const NONE_IMPROVISED: ItemDefinition["improvisedBehavior"] = {
  kind: "none",
  description: "Improvised: no additional consequence.",
};

export const NEUTRAL_ITEMS: readonly ItemDefinition[] = [
  {
    id: "neutral-forged-pistons",
    name: "Forged Pistons",
    price: 4,
    timeModifier: 0,
    origin: "fieldworks",
    installationCategory: "power",
    synergyTags: ["gearing", "heat"],
    physics: { accelerationDelta: 6 },
    synergyEffects: [
      {
        target: { kind: "category", category: "power" },
        appliesTo: "self",
        condition: { kind: "linear-per-count", percentPerMatch: 10 },
        targetStat: "acceleration",
        description:
          "Synergy: forged to work the whole engine bay together — +10% acceleration effect per other Power item held.",
      },
    ],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-copper-core-radiator",
    name: "Copper-Core Radiator",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["heat", "gearing"],
    physics: { topSpeedDelta: 1 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-reinforced-connecting-rods",
    name: "Reinforced Connecting Rods",
    price: 4,
    timeModifier: 0,
    origin: "fieldworks",
    installationCategory: "power",
    synergyTags: ["gearing", "material"],
    physics: { accelerationDelta: 13 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-bookmakers-chit",
    name: "Bookmaker's Chit",
    price: 2,
    timeModifier: 0,
    origin: "backroads",
    installationCategory: "power",
    synergyTags: ["wager"],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-engine-builders-nameplate",
    name: "Engine Builder's Nameplate",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["provenance"],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-reinforced-spare-wheel",
    name: "Reinforced Spare Wheel",
    price: 2,
    timeModifier: 0,
    origin: "fieldworks",
    installationCategory: "chassis",
    synergyTags: ["wheel", "material"],
    physics: { corneringSpeedDelta: 1 },
    activeWhileStored: true,
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-leaf-sprung-axle-set",
    name: "Leaf-Sprung Axle Set",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["suspension"],
    physics: { corneringSpeedDelta: 3 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-hardened-wheel-hubs",
    name: "Hardened Wheel Hubs",
    price: 4,
    timeModifier: 0,
    origin: "fieldworks",
    installationCategory: "chassis",
    synergyTags: ["wheel", "material"],
    physics: { brakingPowerDelta: 26 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-trackside-tachometer",
    name: "Trackside Tachometer",
    price: 4,
    timeModifier: 0,
    origin: "velodrome",
    installationCategory: "chassis",
    synergyTags: ["information", "momentum"],
    buff: { boostPercent: 20, targetStat: "topSpeed" },
    fittedBehavior: {
      kind: "buff-boost",
      buffBoostPercent: 5,
      description: "Fitted: reads the drivetrain it was calibrated for — amplifies by a further 5%.",
    },
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "neutral-patrons-brass-plaque",
    name: "Patron's Brass Plaque",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["patronage"],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
];

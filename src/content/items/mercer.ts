import type { ItemDefinition } from "../../simulation/types";

// 020-character-item-pools: Evelyn Mercer's (Coachworks) 15-item exclusive
// pool. Locked concept list (2026-08-12) after interactive authoring with
// the user — a coachbuilder who distrusts untested, new-fangled trends and
// builds toward four archetypes, each anchored by a "chase" card (#1-#4):
// matching wheel/material sets, proven (stacking) reliability, load-bearing
// durability, and appraised value. Magnitudes follow 021's measured
// per-stat lap-time sensitivity (topSpeed ~0.14s/lap/point, corneringSpeed
// ~0.10s/lap/point, acceleration ~0.02s/lap/point, brakingPower
// ~0.0096s/lap/point) — Cheap (2cr, ~0.10-0.15s/lap equivalent), Mid (4cr,
// ~0.25s/lap equivalent), Chase (5cr, priced above starting credits so the
// build-defining pick is never turn-one-affordable). Every Fitted/
// Improvised behavior is `{kind: "none"}`: that installation path is still
// physics-blind ([[physics-blind-installation]]). No item sets
// `identityTag` ([[identity-tag-deferred-retirement]]) — the two stacking
// Buffs (#2, #9) target a physical stat, not legacy "time", for exactly
// that reason. `55` degrees is this codebase's own existing "sharp/tight
// corner" threshold (tracks.ts SHARP_CORNER_DEGREES), reused rather than
// inventing a second one.

const NONE: ItemDefinition["fittedBehavior"] = { kind: "none", description: "Fitted: no additional consequence." };
const NONE_IMPROVISED: ItemDefinition["improvisedBehavior"] = {
  kind: "none",
  description: "Improvised: no additional consequence.",
};
const TIGHT_CORNER = 55;

export const MERCER_ITEMS: readonly ItemDefinition[] = [
  // --- Chase cards (#1-#4), one per build archetype ---
  {
    id: "mercer-matched-coachwork-wheelset",
    name: "Matched Coachwork Wheelset",
    price: 5,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["wheel", "material"],
    physics: { corneringSpeedDelta: 3 },
    synergyEffects: [
      {
        target: { kind: "tag", tag: "wheel" },
        appliesTo: "self",
        condition: { kind: "linear-per-count", percentPerMatch: 15 },
        targetStat: "corneringSpeed",
        description:
          "Synergy: a true matching set turns as one — +15% cornering effect per other wheel-tagged item held.",
      },
    ],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-journeymans-logbook",
    name: "Journeyman's Logbook",
    price: 5,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["material", "provenance"],
    buff: { boostPercent: 3, targetStat: "acceleration" },
    cooldown: 2,
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-ironbound-axle-assembly",
    name: "Ironbound Axle Assembly",
    price: 5,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["material", "suspension"],
    physics: { brakingPowerDelta: 30 },
    conditionalPhysics: [
      {
        condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: TIGHT_CORNER },
        delta: { corneringSpeedDelta: 4 },
      },
    ],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-appraisers-ledger",
    name: "Appraiser's Ledger",
    price: 5,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["provenance", "material"],
    buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },

  // --- Supporting items (#5-#15) ---
  {
    id: "mercer-double-doweled-wheel-hub",
    name: "Double-Doweled Wheel Hub",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["wheel", "material"],
    physics: { corneringSpeedDelta: 1 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-ash-framed-running-board",
    name: "Ash-Framed Running Board",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["material", "suspension"],
    physics: { brakingPowerDelta: 26 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-hand-forged-axle-pin",
    name: "Hand-Forged Axle Pin",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["wheel", "material"],
    physics: { accelerationDelta: 13 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-tested-leaf-spring",
    name: "Tested Leaf Spring",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["suspension", "material"],
    physics: { corneringSpeedDelta: 1 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-journeymans-wrench-set",
    name: "Journeyman's Wrench Set",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["material"],
    buff: { boostPercent: 2, targetStat: "corneringSpeed" },
    cooldown: 3,
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-reinforced-brake-drum",
    name: "Reinforced Brake Drum",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["material", "suspension"],
    physics: { brakingPowerDelta: 13 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-hand-fitted-steering-knuckle",
    name: "Hand-Fitted Steering Knuckle",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["suspension", "material"],
    conditionalPhysics: [
      {
        condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: TIGHT_CORNER },
        delta: { corneringSpeedDelta: 6 },
      },
    ],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-lacquered-coach-panel",
    name: "Lacquered Coach Panel",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["material"],
    physics: { topSpeedDelta: 1 },
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-oilskin-driving-coat",
    name: "Oilskin Driving Coat",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["material", "provenance"],
    physics: { brakingPowerDelta: 13 },
    activeWhileStored: true,
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-trade-ledger-chit",
    name: "Trade Ledger Chit",
    price: 2,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "power",
    synergyTags: ["provenance", "wager"],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
  {
    id: "mercer-brass-fitted-toolbox",
    name: "Brass-Fitted Toolbox",
    price: 4,
    timeModifier: 0,
    origin: "coachworks",
    installationCategory: "chassis",
    synergyTags: ["material", "provenance"],
    synergyEffects: [
      {
        target: { kind: "tag", tag: "material" },
        appliesTo: "self",
        condition: { kind: "linear-per-count", percentPerMatch: 4 },
        targetStat: "brakingPower",
        description:
          "Synergy: every well-made part in the kit tells the same story — +4% braking effect per other material-tagged item held.",
      },
    ],
    fittedBehavior: NONE,
    improvisedBehavior: NONE_IMPROVISED,
  },
];

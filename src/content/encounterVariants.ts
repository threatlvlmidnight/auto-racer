import type { EncounterType, EncounterVariant } from "../simulation/types";

/**
 * Authored encounter variants (034 tasks T024/T052, spec volume gate: at least
 * three early/mid/late variants per new encounter type, with entrant and
 * route-position coverage). Presentation reads `title`/`description`; cadence
 * and legality are simulation-owned.
 */

export const NEW_ENCOUNTER_TYPES: readonly Exclude<EncounterType, "parts-supplier" | "reward-draft" | "cross-pollination" | "sponsor-meeting">[] = [
  "exhibition-trial",
  "scrutineering",
  "factory-development",
  "upgrade-workshop",
  "privateer-exchange",
  "experimental-rebuild",
  "tag-specialist",
];

export const ENCOUNTER_VARIANTS: readonly EncounterVariant[] = [
  // --- Exhibition Trial (3 variants) ---
  { variantId: "exhibition-early-smoke", type: "exhibition-trial", routePosition: "early", title: "Smoke the Telegram", description: "A loose timing run against the clock, no rivals." , supportsEntrantLine: true },
  { variantId: "exhibition-mid-mile", type: "exhibition-trial", routePosition: "mid", title: "Hundred-Mile Scramble", description: "An unscored solo race; bank reputation from the machinery's habits.", supportsEntrantLine: true },
  { variantId: "exhibition-late-record", type: "exhibition-trial", routePosition: "late", title: "Course Record Attempt", description: "Chase three exact objectives, earn a reputation for every one you land.", supportsEntrantLine: true },
  // --- Scrutineering (3 variants) ---
  { variantId: "scrutineering-early-gaffer", type: "scrutineering", routePosition: "early", title: "Gaffer's Inspection", description: "Voluntarily surrender one part for the next scored race to sharpen the others.", supportsEntrantLine: false },
  { variantId: "scrutineering-mid-slate", type: "scrutineering", routePosition: "mid", title: "The Long Slate", description: "Trade one installed part's next race for a measured boost to the rest.", supportsEntrantLine: true },
  { variantId: "scrutineering-late-admin", type: "scrutineering", routePosition: "late", title: "Administrator's Bench", description: "A heavier sacrifice toward the finale; choose which part the bench impounds.", supportsEntrantLine: false },
  // --- Factory Development (3 variants) ---
  { variantId: "factory-early-works", type: "factory-development", routePosition: "early", title: "Back-Room Works", description: "Have a compatible part permanently re-tuned by the factory.", supportsEntrantLine: true },
  { variantId: "factory-mid-silent", type: "factory-development", routePosition: "mid", title: "Silent Development", description: "Attach a run-persistent behavior to one held part.", supportsEntrantLine: true },
  { variantId: "factory-late-final", type: "factory-development", routePosition: "late", title: "Final Assembly", description: "A last factory pass before the finale; pick the exact behavior to graft.", supportsEntrantLine: true },
  // --- Upgrade Workshop (3 variants) ---
  { variantId: "upgrade-early-press", type: "upgrade-workshop", routePosition: "early", title: "The Press", description: "A guaranteed free tier-upgrade offer, optional to accept.", supportsEntrantLine: false },
  { variantId: "upgrade-mid-jig", type: "upgrade-workshop", routePosition: "mid", title: "Serviceable Jig", description: "Raise one held part by a tier at no cost — if you want it.", supportsEntrantLine: true },
  { variantId: "upgrade-late-honed", type: "upgrade-workshop", routePosition: "late", title: "Honed Finale", description: "One last free tier on a part below its ceiling.", supportsEntrantLine: false },
  // --- Privateer Exchange (3 variants) ---
  { variantId: "exchange-early-patroon", type: "privateer-exchange", routePosition: "early", title: "Patroon's Yard", description: "Swap a held part for a same-tier foreign-origin part.", supportsEntrantLine: true },
  { variantId: "exchange-mid-broker", type: "privateer-exchange", routePosition: "mid", title: "The Broker", description: "Trade one part across origins, staying at the same tier.", supportsEntrantLine: true },
  { variantId: "exchange-late-tong", type: "privateer-exchange", routePosition: "late", title: "The Long Trade", description: "A same-tier cross-origin barter before the run's end.", supportsEntrantLine: true },
  // --- Experimental Rebuild (3 variants) ---
  { variantId: "rebuild-early-lathe", type: "experimental-rebuild", routePosition: "early", title: "Willow Lathe", description: "Pay two credits to rebuild a tier-1 or tier-2 part one tier higher.", supportsEntrantLine: false },
  { variantId: "rebuild-mid-gamble", type: "experimental-rebuild", routePosition: "mid", title: "The Gamble", description: "Surrender a part and two credits for a same-category replacement above it.", supportsEntrantLine: true },
  { variantId: "rebuild-late-forge", type: "experimental-rebuild", routePosition: "late", title: "Final Forge", description: "A last experimental forge destroys the old part's modification for a higher copy.", supportsEntrantLine: false },
  // --- Tag Specialist (3 variants) ---
  { variantId: "tags-early-circuit", type: "tag-specialist", routePosition: "late", title: "Circuit Vendor", description: "A niche vendor who stocks parts sharing a tag your garage already holds.", supportsEntrantLine: true },
  { variantId: "tags-mid-cart", type: "tag-specialist", routePosition: "late", title: "The Specialist's Cart", description: "Cross-origin stock tuned to one tag you've committed to.", supportsEntrantLine: true },
  { variantId: "tags-late-fasten", type: "tag-specialist", routePosition: "late", title: "Fasten the Livery", description: "Snap up matching-tag parts, one already re-worked for a premium.", supportsEntrantLine: true },
];

/** The authored variants for one encounter type. */
export function variantsFor(type: EncounterType): readonly EncounterVariant[] {
  return ENCOUNTER_VARIANTS.filter((variant) => variant.type === type);
}

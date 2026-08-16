import { familyFor, isAcquisitionPrimary } from "../simulation/encounterCadence";
import type { EncounterFamily, EncounterType } from "../simulation/types";

/**
 * Feature 034 encounter presentation view models (034 tasks T021/T029/T045,
 * contract §Presentation). Pure, Phaser-free: scenes render these exact models
 * and never recompute legality or copy. Keeps interaction type, input, cost,
 * consequence, and disabled reasons legible without hover/color-only meaning.
 */

const INTERACTION_KIND: Readonly<Record<EncounterType, string>> = {
  "reward-draft": "choose-one-or-decline",
  "cross-pollination": "choose-one-or-decline",
  "parts-supplier": "shop",
  "sponsor-meeting": "choose-one-or-decline",
  "tag-specialist": "shop",
  "exhibition-trial": "solo-race",
  scrutineering: "select-sacrifice",
  "factory-development": "select-item-then-modification",
  "upgrade-workshop": "optional-free-upgrade",
  "privateer-exchange": "select-source-then-target",
  "experimental-rebuild": "pay-then-select-replacement",
};

const REQUIRED_INPUT: Readonly<Record<EncounterType, string>> = {
  "reward-draft": "none",
  "cross-pollination": "none",
  "parts-supplier": "credits + destination",
  "sponsor-meeting": "none",
  "tag-specialist": "a qualifying tag",
  "exhibition-trial": "none (auto-briefed objectives)",
  scrutineering: "one installed part to surrender",
  "factory-development": "a held part, then one compatible behavior",
  "upgrade-workshop": "one sub-tier-3 held part (or decline)",
  "privateer-exchange": "a held part, then a foreign-origin same-tier target",
  "experimental-rebuild": "a tier-1 or tier-2 held part + 2 credits",
};

const COST_LABEL: Readonly<Record<EncounterType, string>> = {
  "reward-draft": "none (pick one, or decline all)",
  "cross-pollination": "none (pick one, or decline all)",
  "parts-supplier": "credits per purchase; 1 credit to restock",
  "sponsor-meeting": "none now; optional 7-credit objective",
  "tag-specialist": "normal price; 2 extra credits on the one modified entry",
  "exhibition-trial": "none (unscored solo race)",
  scrutineering: "the surrendered installed part (returned after the next scored race)",
  "factory-development": "no credit cost",
  "upgrade-workshop": "none (free, optional)",
  "privateer-exchange": "the traded part",
  "experimental-rebuild": "2 credits + the surrendered source part",
};

const CONSEQUENCE_LABEL: Readonly<Record<EncounterType, string>> = {
  "reward-draft": "gain one offered part",
  "cross-pollination": "gain one guest-origin part",
  "parts-supplier": "gain purchased parts",
  "sponsor-meeting": "2 credits now, or 7 on a met objective",
  "tag-specialist": "gain matching-tag parts; the modified entry already re-worked",
  "exhibition-trial": "+1 reputation per completed objective; no Championship points",
  scrutineering: "permanent beneficial-race boost to the other installed parts (capped at 25%)",
  "factory-development": "a run-persistent Workshop Modification on the selected part",
  "upgrade-workshop": "the selected part rises one tier",
  "privateer-exchange": "the selected part is replaced by the same-tier foreign part",
  "experimental-rebuild": "source is removed and a +1-tier same-category replacement is obtained",
};

export interface EncounterTypeView {
  type: EncounterType;
  family: EncounterFamily;
  acquisitionPrimary: boolean;
  interaction: string;
  requiredInput: string;
  cost: string;
  consequence: string;
  summary: string;
}

/** The exact, reusable view model for one encounter type. */
export function encounterTypeView(type: EncounterType, summary: string): EncounterTypeView {
  return {
    type,
    family: familyFor(type),
    acquisitionPrimary: isAcquisitionPrimary(type),
    interaction: INTERACTION_KIND[type],
    requiredInput: REQUIRED_INPUT[type],
    cost: COST_LABEL[type],
    consequence: CONSEQUENCE_LABEL[type],
    summary,
  };
}

export type DisabledReason = "pending-effect-occupied" | "no-eligible-item" | "no-installed-source" | "not-in-window" | "max-tier";

/** A disabled encounter's plain-text reason (never color-only). */
export interface EncounterStateView {
  interactive: boolean;
  disabledReason: DisabledReason | null;
  disabledText: string | null;
}

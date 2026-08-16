/**
 * Feature 035 — reusable keyboard/selection/disabled focus semantics
 * (US3, FR-012, T031/T035). These pure tokens drive structural (non-color)
 * focus, selected, disabled, and pressed rendering and their accessibility
 * labels, shared across primary scenes.
 */

/** Pure keyboard-focus styling contract shared by scene tests and renderers. */
export function practiceFocusVisible(hasKeyboardFocus: boolean): boolean {
  return hasKeyboardFocus;
}

export type FocusSemantic = "idle" | "focused" | "selected" | "disabled" | "pressed";

export interface FocusState {
  semantic: FocusSemantic;
  /** Structural, non-color focus cue rendered on the object. */
  structuralToken: "none" | "ring" | "underline" | "strike" | "lowlight" | "invert";
  /** Screen-reader/accessibility description of the current focus state. */
  accessibleLabel: string;
}

/** Single-source focus-state vocabulary so every scene presents the same cues. */
export function focusState(semantic: FocusSemantic): FocusState {
  switch (semantic) {
    case "focused":
      return { semantic, structuralToken: "ring", accessibleLabel: "Focused — use arrow keys or tab to move." };
    case "selected":
      return { semantic, structuralToken: "underline", accessibleLabel: "Selected" };
    case "disabled":
      return { semantic, structuralToken: "strike", accessibleLabel: "Unavailable" };
    case "pressed":
      return { semantic, structuralToken: "invert", accessibleLabel: "Pressed" };
    default:
      return { semantic, structuralToken: "none", accessibleLabel: "" };
  }
}

/** Highest-precedence focus cue when multiple states combine (disabled wins). */
export function effectiveFocusState(active: readonly FocusSemantic[]): FocusState {
  if (active.includes("disabled")) return focusState("disabled");
  if (active.includes("focused")) return focusState("focused");
  if (active.includes("selected")) return focusState("selected");
  if (active.includes("pressed")) return focusState("pressed");
  return focusState("idle");
}


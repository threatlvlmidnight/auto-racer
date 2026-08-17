# Feature 040 Intake: Translucent Glass UI

**Created**: 2026-08-16

**Status**: Intake — clarify visual direction, surface coverage, and rendering
budget before planning.

## Problem

The current menus and information panels often sit over illustrated scene
backgrounds as opaque blocks. They preserve readability, but hide too much of
the artwork and do not yet provide a distinctive, premium material language.
Introduce a translucent, layered glass treatment inspired by modern “liquid
glass” interfaces so backgrounds remain present through menus, panels, and
selected overlays without sacrificing clarity or performance.

This is an art-direction reference, not a request to reproduce Apple UI or its
platform behavior exactly. The game needs its own Motor Age interpretation of
the material language.

## Intended scope

- Define reusable glass-material tokens for tint, opacity, edge highlight,
  border, shadow, internal glow, backdrop diffusion or blur, and layered depth.
- Apply the system first to high-value menu and chrome surfaces such as title
  menus, modal panels, navigation trays, selectors, inspectors, and contextual
  overlays; establish explicit rules for when an opaque panel remains better.
- Preserve enough illustrated background context to make screens feel layered
  while keeping item rules, stats, prices, race evidence, and controls readable.
- Support material variants for neutral, selected, focused, disabled, warning,
  beneficial, and harmful states without relying on color alone.
- Provide restrained transitions or highlight movement where useful, with a
  static reduced-motion equivalent and no decorative motion that obscures game
  state.
- Establish a shared implementation path that can use real backdrop blur where
  the renderer supports it and a deterministic simulated-glass fallback—tinted
  translucency, softened backdrop derivative, edge lighting, and shadow—where
  it does not.
- Validate the treatment across supported desktop, compact, portrait, and
  high-DPI layouts, including layered panels over bright and visually busy art.

## Dependencies and boundaries

- Extends Feature 026's visual language and Feature 035's interface hierarchy;
  it does not reopen or replace their gameplay and information contracts.
- May consume backgrounds from Feature 026 and item artwork from Feature 037,
  but neither artwork pipeline should need gameplay-code changes for this UI
  material pass.
- Must preserve existing keyboard, pointer, and touch targets, focus visibility,
  semantic state, safe areas, and responsive fallback behavior.
- Must meet explicit contrast/readability thresholds. Reduced transparency,
  reduced motion, unavailable shader/filter support, or a lower performance tier
  must fall back to an opaque or simplified panel without hiding information.
- Decorative refraction, blur, shimmer, or parallax remains presentation-only
  and cannot alter simulation, playback, navigation authority, or hit testing.
- Excludes a wholesale scene-layout redesign, new gameplay systems, platform-
  native iOS components, and copying proprietary Apple assets or animations.

## Initial decisions needed

- Which surfaces receive glass in V1: menus and modals only, all shared chrome,
  or selected cards and race overlays as well?
- Should V1 use true real-time backdrop blur/refraction, pre-softened background
  derivatives, a shader-based approximation, or a hybrid selected by renderer
  capability and performance tier?
- How transparent can each content-density tier be while retaining readable
  text and state indicators over the brightest supported backgrounds?
- What Motor Age-specific material treatment differentiates this from generic
  mobile glass—smoked glass, enamel edging, brass highlights, etched labels,
  instrument lenses, or another direction?
- Which motion treatments, if any, ship initially, and what exact reduced-motion
  and reduced-transparency fallbacks are required?
- What frame-time, draw-call, texture-memory, and supported-device budget gates
  determine whether an effect is enabled?

## Early acceptance targets

- A shared component or token change updates every opted-in surface without
  scene-by-scene restyling.
- Illustrated backgrounds remain perceptible through glass surfaces, while all
  consequential text and controls pass the agreed readability and contrast
  checks.
- Dense information surfaces can automatically choose a more opaque material
  than lightweight navigation without creating inconsistent styling.
- Unsupported or low-performance rendering paths retain the same content,
  hierarchy, interaction targets, and semantic states with simplified visuals.
- The treatment remains recognizably part of Auto Racer's Motor Age art
  direction rather than appearing as an unmodified mobile operating-system UI.


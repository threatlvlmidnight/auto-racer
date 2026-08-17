# Feature 043 Intake: Track Segment Art System

**Created**: 2026-08-17

**Status**: Intake — clarify segment grammar, material flavors, regional
mapping, asset pipeline, joins, and rendering budget before planning.

## Problem

The generated circuit now reads as a thick flat graphic laid over illustrated
environments. Give the existing deterministic track grammar a modular authored
art vocabulary so straights, curves, hairpins, switchbacks, chicanes, junction
transitions, and start/finish areas look like credible constructed racing
surfaces while still following the retained generated path exactly.

The system should support several coherent visual flavors, such as asphalt,
brick/paver, concrete, packed dirt, or region-specific combinations, without
implying different physics unless a later gameplay feature explicitly authors
that distinction.

## Intended scope

- Inventory the actual segment/feature grammar produced by track generation.
- Define reusable visual pieces or procedural materials for straights, curve
  radii, hairpins, switchbacks, chicanes, start/finish, pit/marshal landmarks,
  shoulders, curbs, barriers, markings, and transitions.
- Generate or author multiple coherent surface-flavor kits, beginning with
  asphalt and brick/paver candidates.
- Map a retained track and region to one deterministic visual kit and stable
  decoration seed without changing path, demand, distance, lap count, or race
  resolution.
- Build seamless joins across segment types, widths, orientations, and compact
  loops without gaps, texture swimming, doubled outlines, or impossible curb
  placement.
- Preserve player/rival readability over every material using non-color
  identity, contrast treatment, and a simplified fallback.
- Establish asset provenance, generation prompts/source files, texture keys,
  dimensions, compression, memory budget, and regeneration tooling.
- Provide low-detail and missing-asset fallbacks that preserve the same track
  geometry and race result.

## Dependencies and boundaries

- Extends Feature 036's retained-geometry spectacle renderer. Feature 036 must
  first repair the current scale/readability regression and cannot defer its
  failed T044 acceptance to this feature.
- This feature changes presentation only. Surface flavor does not alter grip,
  braking demand, corner speed, incidents, or AI.
- Background environments and surface kits may be region-coordinated, but the
  renderer must not infer gameplay location or generate a replacement track.
- Generated assets must remain modular and reusable; do not produce a bespoke
  full-track image for every seed.
- Do not begin bulk asset production until the segment inventory, join rules,
  target resolutions, material direction, and budget are accepted.

## Initial decisions needed

- Should the runtime use tiled sprites, path-following meshes, procedural
  strokes with material textures, prebaked segment atlases, or a hybrid?
- Which generated track features need distinct authored pieces?
- How many surface flavors ship first, and are they selected by region, circuit
  identity, deterministic variety, or an authored schedule?
- Are brick, asphalt, concrete, and dirt purely cosmetic in this feature?
- How are curves quantized or warped without visible seams?
- What road width and edge hierarchy keeps the full field readable?
- Which landmarks belong to the track kit versus the environment background?
- What texture size, memory, draw-call, and load-time budgets apply?
- Which source/generation pipeline provides acceptable provenance and repeatable
  variants?

## Early acceptance targets

- Every supported generated circuit can be rendered with no missing segment,
  gap, self-overlap, or invalid join.
- Identical retained track, region, and presentation seed produce identical art
  selection and placement.
- Switching visual flavor changes no authoritative track or contest evidence.
- Asphalt and brick/paver examples are recognizably different through texture,
  construction, markings, and edge treatment rather than tint alone.
- Cars and labels remain readable over every material at supported viewports.
- Missing assets fall back to a coherent simplified road instead of a broken or
  invisible track.

# Feature 033 Intake: Race Enrichment

**Created**: 2026-08-15

**Status**: Clarification complete — formal specification created.

## Problem

Watched races become strategically and visually settled too early. After about
the first lap, an early leader commonly pulls away and the remaining playback
offers too few credible changes or dramatic payoffs to reward watching.

Feature 033 will explore simulation-backed race phases, overtaking and comeback
opportunities, signature driver/vehicle moments, crash risk, and their
presentation. It also adds basic race engine audio and shared UI feedback sounds;
background music remains deferred. It also replaces same-direction polygonal
track variants with recognizable deterministic circuits containing features
such as hairpins and switchbacks, and derives truthful braking demand from their
braking zones. It must enrich the actual contest rather than fabricate spectacle.

## Uma Musume analysis

Uma Musume does not rely on one universal random “ultimate.” Its races combine:

- early-, mid-, late-race, and last-spurt phases with different pace behavior;
- skills conditioned on context such as phase, position, corners, blocking,
  nearby overtake targets, or prior overtakes;
- acceleration that controls how quickly a racer reaches raised target speed;
- stamina trade-offs, positioning modes, blocking, duels, and late spurts;
- visible indicators and signature presentation for resolved moments.

Research references:

- [GameTora Race Mechanics Handbook](https://gametora.com/umamusume/race-mechanics)
- [GameTora Skill Condition Viewer](https://gametora.com/umamusume/skill-condition-viewer?skill=100301)

GameTora is a detailed community reference rather than an official developer
manual, so exact formulas are research input, not Auto Racer design authority.

## Transferable design leads

1. Give the race a dramatic structure: early positioning, a contested middle,
   and a late push can make different strengths matter at different times.
2. Trigger opportunities from context: being within passing range, defending a
   narrow lead, exiting a corner, or entering the final phase.
3. Separate target pace from current pace so a boost creates an opportunity
   whose success still depends on acceleration, track, traffic, and opponents.
4. Spend aggression, heat, reliability, grip, or another limited resource so an
   attack is a trade-off rather than free rubber-banding.
5. Make spectacle truthful: cut-ins and overtake staging present retained
   contest events and never invent passes or alter settlement during playback.

## Candidate directions — not yet approved

- Three broad race phases with different stat weighting or behavior rules.
- Deterministic “push” or signature activations derived from committed build,
  driver behavior, track, race state, and contest seed.
- Overtake windows requiring proximity and sufficient pace/acceleration.
- Driver identities expressed as conditional strengths rather than a hidden
  scalar or unequal stock vehicle stats.
- Deterministic incidents or crashes with inspectable risk and consequences.
- Cut-ins for rare important activations and quieter treatment for routine ones.

## Non-negotiable boundaries

- Async participants receive the same rules and authoritative result.
- Outcome-affecting events resolve before playback from committed inputs and
  deterministic seed/state, then remain as immutable evidence.
- Playback speed, camera, cut-ins, and Skip never alter events or settlement.
- Every shown overtake corresponds to authoritative position/time evidence.
- Stock vehicles retain identical starting physical stats unless explicitly
  reopened by a later feature.
- The same retained track geometry must drive physics, summaries, rendering,
  replay, and async viewing; scenes may not invent decorative geometry.

## Questions for `/speckit.clarify`

The complete one-round questionnaire, recommendations, rationale, and response
template are in `clarification-questionnaire.md`. The original seed questions
below remain as intake history.

- Are signatures guaranteed when conditions are met, or driven by a fully
  inspectable deterministic pre-race roll?
- Are phases global, track-authored, lap-relative, or segment-relative?
- What cost prevents repeated pushes from becoming automatic?
- How large may a comeback be without invalidating build quality?
- Do crashes cause delay, retirement, damage, economy loss, or only race time?
- How much activation planning and risk is visible before the race?
- Does each driver have one signature or several smaller tendencies?
- Which moments deserve cut-ins, and how do they behave at `1x`, `2x`, and Skip?

# Feature 039 Intake: Recorded Race Audio

**Created**: 2026-08-15

**Status**: Intake — clarify and plan after Feature 038 planning.

## Problem

Feature 033 has a tested, lifecycle-safe synthetic engine/UI audio fallback, but
the watched race still needs more convincing engine sound. Add a small,
licensable recorded engine-audio library without putting downloads, playback, or
asset failure on the authoritative race path.

## Intended scope

- Find, vet, download, and document legally usable recorded engine assets for
  race playback, beginning with engine loops and optional start/finish details.
- Normalize, compress, package, and preload a small local library with stable
  asset keys and provenance/license records.
- Blend or select recorded engine layers from existing presentation-only race
  state (such as playback rate) while retaining Feature 033's mute, browser
  unlock, pause, skip, finish, visibility, and scene-shutdown guarantees.
- Fall back silently to the existing synthetic engine presentation when assets
  are unavailable, blocked, unsupported, or disabled.

## Dependencies and boundaries

- Extends Feature 033's completed `audioPresentation.ts` lifecycle and asset-free
  synthesis; it does not replace its authority or safety tests.
- May complement Feature 036's visual spectacle but cannot alter PiP/event
  selection, playback timing, or contest results.
- Requires a source/license review before any external audio is committed.
- Excludes background music, voice-over, live microphones, streaming downloads,
  and any gameplay advantage from audio.

## Initial decisions needed

- License/provenance standard and acceptable audio source repositories.
- Engine palette: one shared loop, a small vehicle-family palette, or per-player
  vehicle loops.
- Whether the first release includes only running engine loops or also start,
  idle, pass-by, and finish accents.
- Asset size, codec/browser compatibility, and direct-production budget.

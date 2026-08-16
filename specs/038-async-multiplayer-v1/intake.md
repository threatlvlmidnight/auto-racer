# Feature 038 Intake: Async Multiplayer V1

**Created**: 2026-08-15

**Status**: Intake — architecture and product clarification required before planning.

## Problem

The game is currently a local static demo with generated rivals. Players cannot
publish a committed build, receive another player's recorded ghost, or verify a
shared race result across devices. Async Multiplayer V1 should add that loop
without introducing live matchmaking, synchronous race control, or a mandatory
backend dependency for the demo.

## Intended scope

- Optional account/session identity, opt-in ghost submission, discovery, and
  retrieval for asynchronous contests.
- Versioned, canonical committed build/setup/track/rules evidence and server
  validation or verification sufficient for cross-viewer replay parity.
- Remote race result/provenance records, typed unavailable/offline states, and
  privacy/moderation/rate-limit boundaries.
- A deployment/secrets/runbook extension that preserves the current static demo
  as fully playable without the service.

## Dependencies and boundaries

- Constitution Principles I and VI prohibit synchronous matchmaking, live
  opponents, player steering, or playback-time outcome computation.
- Feature 033 must finish its versioned race-event/result contracts before the
  backend contract is frozen; Feature 034 must stabilize item-instance and
  versioned encounter/run evidence before submitted builds are durable.
- This feature does not include chat, friends, real-time spectators, payments,
  cloud saves for the whole run, or mandatory login.
- Feature 031's GitHub Pages demo remains static and usable with no account,
  secret, or backend service.

## Initial decisions needed

- Account model (anonymous/device identity, email/social login, or optional
  account linking).
- Backend provider/hosting and data-retention budget.
- Match discovery shape (direct challenge, daily/global pool, or both).
- Trust model (server authoritative resolution, client submission with server
  verification, or verified replay only).


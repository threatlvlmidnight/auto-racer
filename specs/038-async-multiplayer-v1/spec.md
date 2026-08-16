# Feature Specification: Async Multiplayer V1

**Feature Branch**: [038-async-multiplayer-v1]

**Created**: 2026-08-15

**Status**: Draft — clarification required

**Input**: Add an optional asynchronous multiplayer loop where a player can
submit a committed build, discover another player’s recorded ghost, and replay a
shared, verifiable race across devices—without live matchmaking, live steering,
or making the current static demo depend on an online service.

## User Scenarios & Testing

### User Story 1 — Publish a committed ghost (Priority: P1)

As a player, I can opt into publishing a committed, versioned race-ready build
as a ghost while understanding what data is shared and retaining a usable local
game if the service is unavailable.

**Why this priority**: Publishing a durable, verifiable ghost is the foundation
of every asynchronous contest.

**Independent Test**: Create a committed local build, publish it through a
test service, retrieve its immutable record, and confirm failed/offline publish
does not alter the local run or block local play.

**Acceptance Scenarios**:

1. **Given** a player has a valid committed build, **When** they opt into
   submission, **Then** the service stores an immutable versioned ghost record
   with its build/setup/rules evidence and clear sharing/provenance information.
2. **Given** a build cannot be submitted, **When** the player retries or stays
   offline, **Then** a typed error explains the outcome and the local game
   remains fully playable.

---

### User Story 2 — Discover and race a recorded opponent (Priority: P1)

As a player, I can find an eligible recorded ghost, start a normal watched race
against it, and see the same deterministic result evidence without waiting for
the other player.

**Why this priority**: Discovery and an honest replay turn published ghosts into
meaningful asynchronous competition.

**Independent Test**: Retrieve a known compatible ghost from a test service,
resolve/replay it on two devices or clients, and compare version identity,
result, event order, and provenance.

**Acceptance Scenarios**:

1. **Given** compatible ghosts are available, **When** a player requests one,
   **Then** discovery presents only records compatible with the local rules and
   clearly identifies origin, version, and availability.
2. **Given** a player accepts a ghost, **When** the race begins, **Then** its
   outcome resolves before watched playback and retains the same contest/race
   evidence as a local race.
3. **Given** no compatible remote ghost is available, **When** the player wants
   to race, **Then** the existing local-rival path remains available.

---

### User Story 3 — Trust shared records and control participation (Priority: P2)

As a player, I can inspect where a ghost came from, remove my participation, and
trust that invalid, incompatible, abusive, or unavailable records will not
silently affect my game.

**Why this priority**: A low-friction async loop only works if it has privacy,
integrity, and moderation boundaries.

**Independent Test**: Submit malformed, incompatible, duplicate, expired, and
withdrawn records; confirm they are rejected or hidden with an understandable
reason, while local gameplay stays intact.

**Acceptance Scenarios**:

1. **Given** a remote ghost is selected, **When** the player inspects it,
   **Then** the displayed provenance, rules/content versions, and verification
   status are sufficient to decide whether to race it.
2. **Given** a player withdraws a published ghost or disables multiplayer,
   **When** the action completes, **Then** future discovery stops serving that
   ghost according to the retention policy and local content remains intact.

### Edge Cases

- A client is offline, the service times out, or a request is rate-limited.
- A submitted build references content, items, rules, or a Feature 033 result
  version the receiving client does not support.
- A record is forged, malformed, duplicate, expired, withdrawn, or moderated.
- A device has no remote identity yet or loses local identity storage.
- The service is disabled, unconfigured, or unavailable in the static demo.
- Two clients replay the same compatible record with different display settings;
  visual/audio presentation must not affect outcome evidence.

## Requirements

### Functional Requirements

- **FR-001**: The feature MUST keep multiplayer optional; the static demo and
  local ghost/rival gameplay MUST remain fully playable with no account,
  secret, backend, or network connection.
- **FR-002**: The feature MUST submit only an explicitly opted-in, immutable,
  versioned committed ghost record with build, setup, rules/content, track, and
  provenance evidence sufficient to validate compatibility and replay.
- **FR-003**: The feature MUST provide typed publish, discovery, retrieval,
  compatibility, offline, unavailable, and retry states that do not mutate the
  local run on service failure.
- **FR-004**: The feature MUST resolve every remote contest before watched
  playback from recorded data; it MUST NOT introduce live matchmaking, player
  steering, live opponent interaction, or playback-time outcome computation.
- **FR-005**: The feature MUST expose compatible remote ghosts through
  [NEEDS CLARIFICATION: direct invitation/challenge, a rotating public pool,
  or both] and retain the local-rival alternative when none is available.
- **FR-006**: The feature MUST validate remote ghost integrity through
  [NEEDS CLARIFICATION: server-authoritative resolution, server verification of
  client submissions, or client-verified replay with clear trust status].
- **FR-007**: The feature MUST provide an optional identity and participation
  model using [NEEDS CLARIFICATION: anonymous device identity, optional account
  linking, or required account login], with a clear shared-data disclosure.
- **FR-008**: The feature MUST support record withdrawal, expiration/retention,
  abuse reporting/moderation, and rate limiting appropriate to the chosen
  identity/discovery model.
- **FR-009**: The feature MUST reject or quarantine malformed, duplicated,
  tampered, incompatible, expired, withdrawn, or moderated records without
  changing local item/run/race state.
- **FR-010**: The feature MUST version and document the client/service contract,
  deployment configuration, secrets handling, backup/recovery, observability,
  and rollback procedure for the optional service.
- **FR-011**: The feature MUST preserve the authoritative Feature 033 event and
  result contract and the Feature 034 item-instance/versioned run contract; it
  MUST not freeze a remote payload until those dependencies are stable.

### Key Entities

- **Participant identity**: optional local/remote identity and participation
  consent, separate from game mechanics.
- **Ghost submission**: immutable player-approved versioned build/setup/track/
  rules evidence and publication metadata.
- **Ghost record**: discoverable remote submission with compatibility,
  verification, retention, moderation, and provenance state.
- **Async contest receipt**: remote-contest input identity, result/event digest,
  verifier/version, and replay provenance.
- **Service capability**: configured/unconfigured/offline/available status used
  only for display and request routing.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In compatible cross-client fixtures, 100% of accepted ghost
  records produce equal recorded result/event digest and replay provenance.
- **SC-002**: In unavailable, timeout, offline, and rate-limited fixtures, 100%
  of multiplayer actions show a typed recoverable state and local play remains
  available without changed run/race evidence.
- **SC-003**: 100% of malformed, tampered, incompatible, expired, withdrawn,
  duplicate, or moderated test records are rejected or quarantined before they
  become playable opponents.
- **SC-004**: A published ghost can be withdrawn and stops appearing in future
  discovery within the selected retention/service policy window.
- **SC-005**: Full contract, integration, replay-parity, privacy/moderation,
  deployment/runbook, lint, type-check, and production-build checks pass with
  no regression to static-demo local play.

## Assumptions

- Features 033 and 034 stabilize their versioned authoritative contracts before
  remote payloads are frozen.
- A backend may be introduced only as an optional service; no source secret is
  included in the static demo bundle.
- This V1 excludes chat, friends, real-time spectators, payments, global cloud
  saves, and mandatory login.

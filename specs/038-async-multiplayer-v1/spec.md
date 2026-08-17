# Feature Specification: Async Multiplayer V1

**Feature Branch**: [038-async-multiplayer-v1]

**Created**: 2026-08-15

**Status**: Planned and analyzed — implementation-ready after Features 041/042

**Input**: Add an optional asynchronous multiplayer loop where a player can
submit a committed build, discover another player’s recorded ghost, and replay a
shared, verifiable race across devices—without live matchmaking, live steering,
or making the current static demo depend on an online service.

## Clarifications

### Session 2026-08-15

- Q: Which identity model ships in V1? → A: Use a durable anonymous device
  identity with optional account linking reserved for a later feature; login is
  not required for local play or V1 participation.
- Q: How are ghosts discovered? → A: Use a rotating public compatible-ghost
  pool only. Direct invitations/challenges are explicitly deferred.
- Q: Which trust model ships in V1? → A: The optional service is
  server-authoritative: it accepts committed inputs, resolves the contest, and
  stores the resulting evidence before discovery/replay.
- Q: What privacy/retention rule ships first? → A: Use pseudonymous profiles
  with seven-day discovery retention. Withdrawal immediately stops future
  discovery; no email, chat, or precise location is collected.
- Q: Which abuse/cost guardrails ship? → A: Provide report/block controls,
  server-side rate limits, and a fixed monthly service-spend alert/cap; the
  numeric cap is still to be selected.
- Q: What monthly service cap ships in the development pilot? → A: Use a $0
  development-only pilot. Do not enable a paid production service or overages
  without explicit owner approval; the static/local game is the fallback if the
  free optional service pauses or is unavailable.
- Q: Which optional service platform is selected? → A: Supabase. Use its
  anonymous identity, relational data, and optional server function capability
  while keeping the service unconfigured/optional in the static demo.

### Planning resolutions 2026-08-17

- Remote V1 contests are explicitly unscored exhibitions. They never settle a
  world-tour stage, consume an encounter, or award credits, reputation, points,
  or history. This prevents optional service availability and pool strength from
  changing progression.
- A remote exhibition reuses the normal watched eight-car race and Results UI:
  the challenger, six existing deterministic local rivals, and one verified
  remote ghost. It is not a separate 1v1 test screen.
- Discovery carries the publisher's exact versioned circuit. The challenger
  commits setup for that retained circuit through a short-lived bound offer;
  independent local runs do not need matching random track seeds.
- Pseudonyms are assigned by the service from authored neutral vocabulary. V1
  contains no user-authored name, profile copy, report text, or chat.
- The $0 pilot is closed development infrastructure. Public promotion requires
  a separate CAPTCHA/anti-abuse, moderation, load, privacy, and cost review.

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
  a rotating public compatible-ghost pool only and retain the local-rival
  alternative when none is available. Direct challenges are out of scope.
- **FR-006**: The feature MUST validate remote ghost integrity through
  server-authoritative resolution from committed inputs, storing resulting
  evidence before the ghost becomes discoverable.
- **FR-007**: The feature MUST provide an optional identity and participation
  model using durable anonymous device identity, with optional future account
  linking and a clear shared-data disclosure.
- **FR-008**: The feature MUST support record withdrawal, expiration/retention,
  report/block moderation controls, server-side rate limiting, and a fixed
  monthly service-spend alert/cap appropriate to the chosen identity/discovery
  model. The development pilot has a $0 service cap: no paid tier or overages
  may be enabled without explicit owner approval. Discovery retention is seven
  days and withdrawal immediately removes a record from future discovery.
- **FR-009**: The feature MUST reject or quarantine malformed, duplicated,
  tampered, incompatible, expired, withdrawn, or moderated records without
  changing local item/run/race state.
- **FR-010**: The feature MUST version and document the client/service contract,
  deployment configuration, secrets handling, backup/recovery, observability,
  rollback procedure, and Supabase-specific optional-service setup for the
  optional service.
- **FR-011**: The feature MUST preserve the authoritative Feature 033 event and
  result contract and the Feature 034 item-instance/versioned run contract; it
  MUST not freeze a remote payload until those dependencies are stable.
- **FR-012**: Every V1 remote contest MUST be an unscored exhibition that cannot
  settle or mutate a championship run, encounter, economy, standings, history,
  RNG, or local race evidence.
- **FR-013**: Remote contests MUST reuse the normal eight-car watched race and
  Results presentation with one verified remote ghost and six deterministic
  local rivals; they MUST NOT use a separate 1v1 test screen.
- **FR-014**: Discovery MUST bind the selected ghost and its exact versioned
  retained circuit before the challenger commits setup and the server resolves
  the contest.
- **FR-015**: V1 MUST accept no user-authored profile, pseudonym, report, or chat
  text; pseudonyms MUST be service-authored and reports MUST use fixed reasons.
- **FR-016**: A disabled, unconfigured, or unconsented client MUST NOT create an
  identity, instantiate the concrete service, or make a multiplayer network
  request during boot or local play.

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
- **SC-006**: In 100% of success and failure fixtures, the supplied local run,
  encounter, economy, history, standings, RNG evidence, and existing local race
  result remain deep-equal before and after multiplayer actions.

## Assumptions

- Features 033 and 034 stabilize their versioned authoritative contracts before
  remote payloads are frozen.
- A backend may be introduced only as an optional service; no source secret is
  included in the static demo bundle.
- Supabase is the selected optional platform. Its free tier is development-only;
  no paid plan or overages are enabled without explicit owner approval.
- This V1 excludes chat, friends, real-time spectators, payments, global cloud
  saves, and mandatory login.
- The development pilot has a $0 service cap and must not enable a paid tier or
  overages without owner approval.

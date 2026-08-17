# Async Multiplayer V1 Contract

This contract binds the browser adapter, optional Supabase functions/database,
shared simulation, watched playback, and Results. Exact implementation names may
follow repository conventions; the authority, validation, ordering, failure,
privacy, and fallback rules below are mandatory.

## 1. Static/local boundary

- `VITE_ASYNC_MULTIPLAYER_MODE` defaults to `disabled`. Missing/unknown values
  resolve to disabled, not pilot.
- A disabled or unconfigured production artifact must not instantiate the
  Supabase client, create an Auth user, call `fetch`, or attempt DNS/network
  access during boot or local play.
- Local run creation, shops, garage, setup, championship contest, playback,
  Results, Test Day internals, and local rivals cannot import the concrete
  Supabase adapter.
- Every async failure leaves the supplied `Run`, RNG/call count, active
  encounter, offers, track, setup draft, credits, history, standings, and local
  contest output deep-equal.
- The concrete adapter is constructed only after explicit disclosure consent
  and complete public configuration. Service absence is a typed UI state.

## 2. Consent and anonymous identity

- Consent copy lists the shared categories: anonymous service ID, server-made
  pseudonym, entrant/vehicle, item instance IDs/tiers/modifications, setup,
  circuit seed/region/fingerprint, exact version manifest, and verified result
  evidence. It states seven-day payload retention and identity loss behavior.
- Decline/close creates no Auth user. Reopening repeats disclosure until a
  compatible enabled preference exists.
- Anonymous Auth is the only V1 sign-in. Email, phone, OAuth, direct invitations,
  user-authored names, chat, location, analytics IDs, and whole-run cloud saves
  are forbidden.
- The participant pseudonym is server-selected from checked-in words plus a
  non-identifying suffix. The client cannot submit or edit it.
- A missing prior Auth session with enabled local consent returns
  `identity-lost` and offers a clearly disclosed new identity; it never guesses
  or links by fingerprint.

## 3. Canonical/version contract

- Canonical JSON sorts object keys by Unicode code point, preserves array order,
  emits normal JSON strings/booleans/null/numbers, and rejects `undefined`,
  sparse arrays, non-finite/negative-zero ambiguity, bigint, functions, symbols,
  cycles, unknown fields, and unknown discriminants.
- Numeric serialization uses ECMAScript JSON number text after normalizing
  `-0` to `0`; validators reject values outside each domain bound before digest.
- UTF-8 canonical bytes are hashed with SHA-256. Digests are lowercase hex and
  always recomputed on the server.
- The exact manifest from `data-model.md` is required. Compatibility is equality
  of every member and equality of its recomputed digest.
- Missing Feature 033/034/041/042 evidence or an unknown track/content/result
  version is `incompatible`, never a legacy reconstruction.
- Publish/resolve/safety commands use participant-scoped UUID idempotency keys.
  Exact retries return the stored response; reuse with different canonical input
  returns `idempotency-conflict`.

## 4. Publication authority

`POST /functions/v1/ghost-publish`

1. Require allowed origin, valid publishable key, valid anonymous-user JWT,
   enabled service mode, request size, content type, and rate bucket.
2. Validate the transport envelope and exact compatibility manifest.
3. Rehydrate every `ItemInstance` against the server's versioned catalog;
   validate unique IDs, definitions, topology, tiers, modifications, bonuses,
   adjacency/Loot evidence, and complete Feature 034 compatibility.
4. Regenerate the exact track from generator version/seed/level/region, compare
   the canonical fingerprint, derive setup eligibility, and independently call
   `validateLockedRaceSetup`.
5. Recompute the committed digest. Reject client result/time claims if present.
6. Enforce three active records and participant/idempotency uniqueness.
7. Insert a verified `discoverable` ghost and separate rotation row in one
   transaction with `discoverable_until = published_at + interval '7 days'`.
8. Return only `GhostSummary`; no owner ID or full public payload.

A record is never visible while `verifying`. Transaction failure publishes
nothing. The local run is not modified by success or failure.

## 5. Rotating discovery authority

`POST /functions/v1/ghost-discover`

- Require exact compatibility key and authenticated participant.
- Eligible rows are `discoverable`, moderation `clear`, before TTL, not owned by
  requester, not blocked in either relevant direction, not already excluded by
  the bounded request, and not attached to an unexpired offer for this requester.
- Order by least recent serve time, then serve count; select among exact ties
  with server randomness. Selection randomness is not a simulation seed.
- Create a requester-owned 15-minute offer and atomically update rotation state.
- Return `success(null)` when no row is eligible. This is not an error and the UI
  keeps the local-rival route prominent.
- The response exposes summary/provenance/circuit/setup binding only, never the
  full private payload or owner Auth ID.

## 6. Server-authoritative resolution

`POST /functions/v1/contest-resolve`

1. Lock the requester-owned offer and reject expired/consumed/foreign offers.
2. Recheck ghost status, TTL, moderation, compatibility, and block state.
3. Validate/recompute the challenger's build, circuit, setup, and digest using
   the same publication path. The setup encounter ID must equal the offer.
4. Revalidate the stored ghost instead of trusting historic validation alone.
5. Regenerate/deep-fingerprint the retained track.
6. Resolve exactly eight entrants in this canonical pre-ranking order:
   challenger (`player`), the first six canonical local profiles, remote ghost.
   The remote profile/build/setup/driver identity comes from the verified ghost;
   local rivals use existing deterministic generation.
7. Call the same Feature 033 enriched simulation and Feature 034/041/042 stat
   authority used locally. Add only the minimal retained-track and explicit
   rival-identity seams; do not create a second formula.
8. Build one immutable receipt, canonicalize/hash complete result and ordered
   events, insert it, and consume the offer in one transaction.
9. Return the stored receipt. Playback is not started by the function.

If the resolver exceeds the performance limit, returns non-finite/malformed
evidence, or cannot preserve parity, return `resolver-limit`/`service-unavailable`
and store no playable receipt. Client-side resolution is forbidden as a remote
fallback.

## 7. Playback and non-settlement

- `ContestScene` accepts either its existing local input or a validated
  `AsyncContestReceipt`. In receipt mode it assigns `receipt.result` once and
  never calls `resolveEnrichedContest`, `generateTrack`, rival selection, or a
  remote service during playback.
- Existing playback schedules, pause, 1x/2x, skip, visibility, audio, PiP,
  focus, standings, event callouts, and Results consume retained evidence.
- Async provenance is always visible through non-color text: pseudonym,
  server-verified status, circuit, expiry at discovery, compatibility/version
  access, and unscored exhibition status.
- Remote ghost is presented as a rival, not as the local player, and retains
  its server-selected pseudonym/visual identity.
- Results provide Report, Block, and Return controls. No Next Stage/settlement
  action is available in async mode.
- Closing, retrying, reporting, blocking, or replaying cannot change the stored
  receipt or local run.

## 8. Withdrawal, report, block, disable

`POST /functions/v1/ghost-withdraw`

- Owner-only; atomically set `withdrawn` before response. Subsequent discovery
  cannot return it even if cleanup has not run. Exact retries succeed.

`POST /functions/v1/safety-control`

- `report`: requester cannot report self; fixed enum only; rate/uniqueness
  enforced; response reveals no moderation state.
- `block`: requester cannot block self; exact pair is idempotent; future
  requester discovery excludes that participant. `unblock` removes only the
  requester's pair.
- `disable-participation`: mark disabled and withdraw every owned ghost in one
  transaction. Local preferences/session may then be cleared without touching
  game saves.
- None of these operations accepts free text or changes a completed result.

## 9. Database/RLS contract

- Migrations enable RLS on every table in `public` and explicitly revoke direct
  table/view/RPC access from `anon` and `authenticated` unless a narrow function
  is documented and tested. Browser operations route through Edge Functions.
- Edge Functions validate JWT ownership before using the server secret. Never
  accept participant/owner IDs from the request as authority.
- Database constraints cover enum/status values, timestamp ordering, payload
  byte limits, unique idempotency, active-count function, no self blocks, report
  uniqueness, offer ownership/expiry, and one receipt per offer.
- Rate checks/increments are atomic with the protected operation or occur before
  expensive validation in a transaction-safe server function. Invalid attempts
  count.
- Discovery SQL itself includes status/TTL/moderation/block predicates. Cron is
  not an authorization dependency.

## 10. Retention and cleanup

- Discoverability ends exactly seven days after publication or immediately on
  withdrawal/disable/moderation, whichever is first.
- Hourly Cron deletes expired/withdrawn ghost payloads, expired offers, related
  contest payloads, and expired rate buckets. It records bounded aggregate
  counts, not deleted payloads.
- Reports retain opaque references/status for 30 days. Disabled anonymous Auth
  users are eligible for deletion after 30 days when no retained safety record
  requires the reference.
- Cleanup is idempotent and safe to rerun. Tests delay/disable Cron and prove
  discovery still excludes ineligible records.

## 11. Rate, origin, and payload policy

- Enforce the exact limits in `research.md` Decision 9 with server time.
- Request canonical JSON maximum is 512 KiB. Stored or returned canonical result
  maximum is 2 MiB. Oversize is rejected before logging or database insert.
- Only configured localhost origins and the exact GitHub Pages origin receive
  CORS responses. Do not use wildcard origin with authenticated requests.
- Timeouts use abortable browser requests and one bounded retry only for
  idempotent/exact-key operations. `Retry-After` is retained in typed failures.
- Closed pilot activation requires a CAPTCHA seam test even while provider
  configuration remains off; public activation requires the provider enabled.

## 12. Configuration, secrets, cost, and recovery

- Browser bundle may contain only the project URL, publishable key, explicit
  pilot mode, and public origin. Static artifact audit rejects secret/service
  role keys and unexpected service URLs.
- Function secrets/server credentials stay in Supabase secrets/local ignored
  env files. Logs and error bodies never contain them.
- Free plan only; no payment method, Pro upgrade, paid add-on, or automated
  scaling. Usage thresholds are 70% review, 85% read-only, 95% disabled.
- Checked-in migrations/functions are the backup. Pilot data is ephemeral and
  may be lost. A fresh optional project can be restored without affecting the
  static game.
- Rollback first disables client pilot mode and server `service_control`, then
  rolls back functions/schema only after traffic is stopped. Local play needs
  no rollback.

## 13. Error and logging contract

- Every response uses the typed success/failure envelope from `data-model.md`
  and a request ID. Expected client/service failures do not throw through a
  scene.
- HTTP mapping: 400 malformed/invalid, 401 missing/invalid session, 403
  blocked/moderated/disabled authority, 404 absent, 409 duplicate/idempotency or
  consumed offer, 410 expired/withdrawn, 413 oversize, 429 rate/quota with
  `Retry-After`, 503 paused/unavailable/read-only resolver, 504 timeout.
- One bounded structured log summary per request; never log Auth IDs, JWTs, IPs,
  pseudonyms, reports, builds, items, setups, tracks, results, events, or bodies.

## 14. Coding/manual boundary

- `[CODE-DEEPSEEK]` owns code, SQL, local stack, automated tests, objective
  layout bounds, artifact/secret audits, benchmark evidence, and runbook text.
- `[OWNER-OPTIONAL-PILOT]` owns hosted project creation, credentials, billing
  confirmation, dashboard configuration, and activation.
- `[MANUAL-FRONTIER-OR-OWNER]` owns qualitative browser/cross-device review and
  screenshots. DeepSeek must leave those tasks open.

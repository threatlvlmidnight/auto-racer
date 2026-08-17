# Research: Async Multiplayer V1

## Decision 1: Keep the service opt-in and lazy

**Decision**: The shipped Pages build constructs a local disabled adapter by
default. It imports no Supabase client, creates no identity, and makes no network
request until all three conditions are true: pilot mode is explicitly enabled at
build time, public project configuration is present, and the player accepts the
sharing disclosure.

**Rationale**: Feature 031 and FR-001 require the static game to remain complete
without a backend. Lazy construction also makes a paused Free project a normal
typed capability state rather than a boot failure.

**Rejected**: Anonymous sign-in on page load, mandatory service configuration,
or silently attempting the service before consent.

## Decision 2: Use Supabase anonymous Auth, but disclose its durability limit

**Decision**: Opt-in calls `signInAnonymously()` and persists the Supabase
session through the injected browser storage adapter. No email, phone, social
identity, chat, or user-authored profile text is collected. The service assigns
a neutral pseudonym from an authored word list. Losing browser storage creates a
new participant; V1 does not claim identity recovery.

**Rationale**: Supabase anonymous users receive unique Auth IDs and the
`authenticated` Postgres role, while collecting no login PII. Supabase documents
that an anonymous identity cannot be recovered after sign-out, cleared browser
data, or changing device, and that later identity linking is supported. That
matches the clarified product decision without promising cross-device accounts.

**Security consequence**: Anonymous users must be distinguished with the JWT
`is_anonymous` claim where relevant; RLS is enabled on every exposed table;
anonymous sign-up and application operations are separately rate-limited. A
CAPTCHA/Turnstile seam is specified but remains disabled in the closed pilot;
public expansion is forbidden until it is configured.

**Sources**: [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous),
[Security of Anonymous Sign-ins](https://supabase.com/docs/guides/troubleshooting/security-of-anonymous-sign-ins-iOrGCL),
[Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Decision 3: Remote contests are unscored exhibitions

**Decision**: Publishing, discovery, and remote races never settle a world-tour
stage, award credits/reputation/points, consume an encounter, or mutate the
player's run. A remote contest uses the normal eight-car watched race and Results
presentation, but carries explicit `async-exhibition` provenance. One verified
remote ghost occupies the final rival position in canonical roster order; six
existing deterministic local rivals fill the other positions. If the service is
unavailable, the normal seven-local-rival championship remains unchanged.

**Rationale**: Optional service availability and a rotating public pool must not
change championship difficulty or progression. An exhibition still delivers
the requested build-versus-build spectacle while preserving fairness and local
authority.

**Rejected**: Replacing a championship rival, awarding remote-only progression,
a separate 1v1 test screen, or client-side settlement.

## Decision 4: Discovery carries the publisher's circuit

**Decision**: A publisher commits an immutable build, setup, entrant identity,
and exact track descriptor/fingerprint. Discovery may return any unexpired
record with an exact compatibility key; the challenger then commits setup for
that retained circuit. A short-lived 15-minute discovery offer binds the chosen
ghost, circuit, and challenger before resolution.

**Rationale**: Requiring independently generated runs to share an exact random
track would make the compatible pool effectively empty. Carrying the recorded
circuit gives both players identical conditions without adding a global daily
challenge system.

**Rejected**: Matching only identical current-run tracks, regenerating a new
track after discovery, or allowing the client to replace the server-selected
ghost.

## Decision 5: The server validates publication and resolves the full race

**Decision**: Publication rehydrates instance IDs from the versioned catalog,
validates the Feature 034 instance build, regenerates and fingerprints the
track, validates the locked setup, canonicalizes the payload, and stores a
verified immutable record. Accepting a discovery offer submits the challenger's
committed input; the Edge Function repeats validation, resolves the full
eight-car enriched contest with the shared pure simulation, stores the result
and digests transactionally, and only then returns a replay receipt.

The browser never inserts verified rows, never supplies a claimed result, and
never falls back to a client-authoritative remote outcome. If server resolution
cannot run within the hosted function limit, the pilot remains disabled while
local races stay available.

**Rationale**: This is the clarified trust model and preserves Features 033/034.
Supabase Edge Functions are appropriate for short authenticated operations, but
hosted functions currently allow only 2 seconds of CPU per request. A mandatory
benchmark therefore gates pilot enablement.

**Sources**: [Supabase Edge Functions](https://supabase.com/docs/guides/functions),
[Edge Function limits](https://supabase.com/docs/guides/functions/limits).

## Decision 6: Freeze an exact-match compatibility manifest

**Decision**: `async-multiplayer-v1` embeds a canonical manifest covering the
transport schema, canonicalization/digest algorithm, enriched contest/result
schema, simulation rules, content catalog, track generator, race setup, race
enrichment, world-tour schedule, Feature 034 instance/cadence rules, Feature 041
adjacency rules, and Feature 042 Loot rules. V1 compatibility requires exact
equality for every outcome-affecting member. The compatibility key is the
SHA-256 digest of canonical manifest JSON.

**Rationale**: Partial compatibility is unsafe while item instances, adjacency,
Loot, tracks, and enrichment all affect evidence. Explicit rejection is cheaper
and more honest than a migration framework in V1.

**Rejected**: Semver range guessing, accepting unknown fields, comparing only a
single client version, or trusting a claimed digest without the manifest.

## Decision 7: Use canonical JSON plus SHA-256 and idempotency keys

**Decision**: Shared framework-free code recursively sorts object keys, retains
array order, rejects `undefined`, cycles, non-finite numbers, functions, and
unknown discriminants, and hashes UTF-8 canonical JSON with SHA-256. Publish and
resolve commands require UUID idempotency keys unique per participant/operation.
The server recomputes every digest and returns the original immutable receipt on
an exact retry; conflicting reuse is rejected.

**Rationale**: Cross-browser/server equality needs an explicit byte contract.
Idempotency prevents retries from duplicating public records or contests.

## Decision 8: Put all public operations behind Edge Functions

**Decision**: The browser may use the public project URL and publishable key for
Auth and function invocation only. It receives no table grants. Exposed tables
have RLS enabled and deny direct `anon`/`authenticated` reads and writes; Edge
Functions validate the user JWT and use a server secret internally. The secret
or legacy service-role key is never bundled in Vite, logged, or committed.

**Rationale**: Supabase recommends RLS on exposed schemas and explicitly states
that publishable keys are browser-safe with RLS while secret/service-role keys
bypass RLS and must never be used in a browser.

**Sources**: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Securing your data](https://supabase.com/docs/guides/database/secure-data),
[Edge Function environment variables](https://supabase.com/docs/guides/functions/secrets).

## Decision 9: Bound the closed pilot before public anti-abuse expansion

**Decision**: Application limits use atomic Postgres buckets in addition to
platform Auth limits:

| Operation | Limit |
|---|---:|
| publish | 6/hour, 20/day, 3 active ghosts |
| discover | 30/hour |
| resolve | 12/hour, 30/day |
| withdraw | 20/day |
| report | 5/day |
| block/unblock | 30/day |

Requests are at most 512 KiB canonical JSON; stored/returned result evidence is
at most 2 MiB. CORS allowlists only localhost test origins and the configured
GitHub Pages origin. No free-text fields exist. Reports use a fixed reason enum.
Repeated invalid payloads count against limits.

The pilot is owner-invite/closed. Before changing it to public, Turnstile or an
equivalent bot check, load testing, revised quotas, and a moderation review are
mandatory—not optional follow-up polish.

**Rationale**: Anonymous Auth otherwise makes cheap record creation possible.
Fixed bounds protect the $0 pilot and turn malformed traffic into predictable
typed failures.

## Decision 10: Seven days is both the discovery and payload lifetime

**Decision**: A verified ghost is discoverable until
`published_at + 7 days`. Every discovery query enforces status, moderation, and
time predicates directly; scheduled cleanup is defense in depth, not the access
gate. Withdrawal atomically changes status first, so it disappears immediately.
Hourly Cron deletes expired/withdrawn ghost payloads, discovery offers, and
contest payloads. Fixed-reason report rows retain only opaque IDs and status for
30 days, then delete. Disabling participation withdraws all ghosts immediately,
deletes owned payloads within 24 hours, and makes the anonymous Auth user
eligible for 30-day cleanup.

**Rationale**: Query-time TTL prevents an overdue job from serving stale data.
Supabase Cron uses `pg_cron` and records job status, which supports an auditable
cleanup run without adding another service.

**Source**: [Supabase Cron](https://supabase.com/docs/guides/cron).

## Decision 11: Treat Free-plan pause and data loss as designed degradation

**Decision**: The pilot remains in a separate Free organization/project with no
payment method or upgrade. There is no invented "$0 Spend Cap" switch: Supabase
documents Spend Cap as Pro-only and states the Free plan is not charged. A
checked-in kill switch can disable all remote actions, and an admin database
control can change `enabled` to `read-only` or `disabled`. At 70% of any Free
quota the owner reviews usage; at 85% the service becomes read-only; at 95% it is
disabled until reset. No automated tier upgrade is allowed.

Free projects may pause after low activity and do not include automatic
backups. Schema, functions, configuration examples, and seed fixtures are the
recovery source of truth; losing ephemeral seven-day pilot data is acceptable.
The runbook restores a fresh project from migrations. The client maps pause,
timeout, 429, quota stop, and 5xx to typed local-fallback states.

**Sources**: [Cost control](https://supabase.com/docs/guides/platform/cost-control),
[Pricing](https://supabase.com/pricing),
[Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Decision 12: Version-control the complete optional service

**Decision**: Commit Supabase config, ordered migrations, seed fixtures, Edge
Functions, shared contract code, generated database types, and local integration
tests. `.env` and linked-project state remain ignored. Local development uses the
Supabase CLI; `db reset` must reconstruct the service before a remote push.

**Rationale**: The dashboard is not a durable implementation artifact. Supabase
recommends local schema migrations and committing the `supabase/` directory so a
fresh project can be reproduced.

**Source**: [Local development with schema migrations](https://supabase.com/docs/guides/local-development/overview).

## Decision 13: Logs contain operations, never race payloads

**Decision**: Functions emit one structured summary per request: request ID,
operation, deployment/verifier version, status/error code, latency, byte counts,
and compatibility prefix. They never log JWTs, Auth IDs, IPs, pseudonyms,
builds, items, setups, tracks, events, result bodies, report targets, or secret
values. The runbook includes one-day-log-aware triage and aggregate database
counters because the Free plan's log retention is short.

**Rationale**: Full payload logging would undermine the minimal-data policy and
can exceed platform log limits. Operational diagnosis only needs bounded
metadata and opaque request IDs.

## Decision 14: Manual and external activation stay outside the coding lane

**Decision**: DeepSeek implements code, migrations, local fixtures, automated
contract/integration tests, and exact browser routes. It does not create a paid
project, enter credentials, change billing, capture screenshots, judge visual
quality, or claim cross-device/manual acceptance. Owner/frontier work separately
enables an optional hosted pilot and performs qualitative browser verification.

**Rationale**: This preserves the program-wide agent boundary and prevents an
implementation agent from silently creating cost or handling manual QA.

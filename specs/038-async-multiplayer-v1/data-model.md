# Data Model: Async Multiplayer V1

## Compatibility and canonical evidence

```ts
interface AsyncCompatibilityManifest {
  readonly transportVersion: "async-multiplayer-v1";
  readonly canonicalizationVersion: "canonical-json-v1";
  readonly digestVersion: "sha256-v1";
  readonly contestResultVersion: string;
  readonly simulationRulesVersion: string;
  readonly contentCatalogVersion: string;
  readonly trackGeneratorVersion: string;
  readonly raceSetupRulesVersion: string;
  readonly raceEnrichmentVersion: string;
  readonly worldTourScheduleVersion: string;
  readonly encounterVarietyVersion: string;
  readonly adjacencyRulesVersion: string;
  readonly lootRulesVersion: string;
}

interface CanonicalDigest {
  readonly algorithm: "sha256-v1";
  readonly value: string; // 64 lowercase hexadecimal characters
}
```

All members are required and exact-match in V1. `compatibilityKey` is the digest
of canonical manifest JSON. Unknown/missing versions are incompatible; no
legacy inference or range negotiation exists.

## Local capability and participation

```ts
type AsyncPilotMode = "disabled" | "pilot";

interface AsyncPublicConfiguration {
  readonly mode: AsyncPilotMode;
  readonly projectUrl?: string;
  readonly publishableKey?: string;
  readonly allowedOrigin: string;
}

type AsyncCapability =
  | { readonly kind: "disabled" }
  | { readonly kind: "unconfigured" }
  | { readonly kind: "consent-required" }
  | { readonly kind: "connecting" }
  | { readonly kind: "available"; readonly participant: ParticipantSummary }
  | { readonly kind: "offline" }
  | { readonly kind: "paused-or-unavailable"; readonly retryAfter?: string }
  | { readonly kind: "rate-limited"; readonly retryAfter: string }
  | { readonly kind: "read-only"; readonly reason: string }
  | { readonly kind: "quota-stopped"; readonly reason: string };

interface ParticipationPreference {
  readonly version: 1;
  readonly consentVersion: "async-sharing-v1";
  readonly enabled: boolean;
  readonly recordedAt: string;
}

interface ParticipantSummary {
  readonly participantId: string; // opaque Auth UUID; never displayed
  readonly pseudonym: string;     // server-authored, no user text
  readonly consentVersion: "async-sharing-v1";
}
```

No identity or SDK is created before consent. Malformed preference/storage data
resolves to `consent-required`, never implicit opt-in.

## Track and committed inputs

```ts
interface AsyncTrackDescriptor {
  readonly generatorVersion: string;
  readonly seed: number;
  readonly level: number;
  readonly regionId: RegionId;
  readonly lapCount: number;
  readonly trackFingerprint: CanonicalDigest;
}

interface AsyncCommittedBuild {
  readonly instanceBuild: InstanceBuild;
  readonly entrantId: string;
  readonly setup: LockedRaceSetup;
  readonly track: AsyncTrackDescriptor;
}

interface GhostPublishCommand {
  readonly transportVersion: "async-multiplayer-v1";
  readonly idempotencyKey: string;
  readonly manifest: AsyncCompatibilityManifest;
  readonly compatibilityKey: CanonicalDigest;
  readonly committed: AsyncCommittedBuild;
  readonly committedDigest: CanonicalDigest;
}
```

The server regenerates the track, rehydrates definitions from the exact content
catalog, validates instances/topology/setup, recomputes digests, and rejects
unknown IDs, duplicate instances, invalid tiers/modifications, non-finite values,
or fingerprint mismatch. It does not trust a client-projected `VehicleBuild`.

## Verified ghost

```ts
type GhostStatus = "verifying" | "discoverable" | "withdrawn" | "expired" | "moderated";

interface VerifiedGhostRecord {
  readonly ghostId: string;
  readonly ownerId: string; // server-only
  readonly pseudonym: string;
  readonly status: GhostStatus;
  readonly manifest: AsyncCompatibilityManifest;
  readonly compatibilityKey: CanonicalDigest;
  readonly committed: AsyncCommittedBuild;
  readonly committedDigest: CanonicalDigest;
  readonly verifierVersion: string;
  readonly publishedAt: string;
  readonly discoverableUntil: string;
  readonly withdrawnAt?: string;
  readonly moderationState: "clear" | "quarantined" | "removed";
}

interface GhostSummary {
  readonly ghostId: string;
  readonly pseudonym: string;
  readonly verification: "server-verified";
  readonly publishedAt: string;
  readonly discoverableUntil: string;
  readonly compatibilityKey: CanonicalDigest;
  readonly manifest: AsyncCompatibilityManifest;
  readonly track: AsyncTrackDescriptor;
  readonly entrantId: string;
}
```

The public summary omits owner Auth ID, full build, setup details, moderation
history, and report counts. Full committed data remains an internal resolver
input and appears only as bounded result provenance after acceptance.

## Discovery offer

```ts
interface GhostDiscoveryCommand {
  readonly transportVersion: "async-multiplayer-v1";
  readonly compatibilityKey: CanonicalDigest;
  readonly excludeGhostIds: readonly string[]; // bounded, server rechecks all policy
}

interface DiscoveryOffer {
  readonly offerId: string;
  readonly ghost: GhostSummary;
  readonly setupEncounterId: string;
  readonly offeredAt: string;
  readonly expiresAt: string; // offeredAt + 15 minutes
}
```

Selection excludes self-owned, blocked, expired, withdrawn, quarantined, removed,
and incompatible records. Rotation prefers the least recently served eligible
records, then uses server randomness only for selection among equal candidates;
that randomness never enters contest resolution. Offers are single-use for a
successful resolution and may be safely retried with the same resolve key.

## Async contest

```ts
interface AsyncContestResolveCommand {
  readonly transportVersion: "async-multiplayer-v1";
  readonly idempotencyKey: string;
  readonly offerId: string;
  readonly manifest: AsyncCompatibilityManifest;
  readonly compatibilityKey: CanonicalDigest;
  readonly challenger: AsyncCommittedBuild;
  readonly challengerDigest: CanonicalDigest;
}

interface AsyncContestProvenance {
  readonly kind: "async-exhibition";
  readonly ghostId: string;
  readonly ghostPseudonym: string;
  readonly verification: "server-verified";
  readonly compatibilityKey: CanonicalDigest;
  readonly verifierVersion: string;
  readonly resolvedAt: string;
}

interface AsyncContestReceipt {
  readonly transportVersion: "async-multiplayer-v1";
  readonly contestId: string;
  readonly offerId: string;
  readonly inputDigest: CanonicalDigest;
  readonly resultDigest: CanonicalDigest;
  readonly eventDigest: CanonicalDigest;
  readonly result: EnrichedContestResult;
  readonly provenance: AsyncContestProvenance;
}
```

Resolution field order is challenger/player, six canonical generated rivals,
then remote ghost. Remote `RivalProfile`, identity, build, and setup are derived
from the verified record. The retained track is regenerated from the descriptor
and deep-compared to its fingerprint. The receipt is stored before return.

`ContestScene` may consume the receipt but cannot call a resolver for this input.
`ResultScene` may format it but cannot call settlement. Run, active encounter,
stage, credits, reputation, standings, RNG state, and history remain deep-equal
before and after the exhibition.

## Commands and typed outcomes

```ts
type AsyncErrorCode =
  | "disabled" | "unconfigured" | "consent-required" | "identity-lost"
  | "offline" | "timeout" | "service-unavailable" | "quota-stopped"
  | "rate-limited" | "payload-too-large" | "malformed"
  | "incompatible" | "unknown-content" | "track-mismatch"
  | "setup-invalid" | "duplicate" | "idempotency-conflict"
  | "not-found" | "offer-expired" | "offer-consumed"
  | "withdrawn" | "expired" | "blocked" | "moderated" | "resolver-limit";

type AsyncOperationResult<T> =
  | { readonly kind: "success"; readonly value: T; readonly requestId: string }
  | { readonly kind: "failure"; readonly code: AsyncErrorCode;
      readonly message: string; readonly retryable: boolean;
      readonly retryAfter?: string; readonly requestId?: string };

interface AsyncGhostService {
  capability(): Promise<AsyncCapability>;
  enableParticipation(): Promise<AsyncOperationResult<ParticipantSummary>>;
  publish(command: GhostPublishCommand): Promise<AsyncOperationResult<GhostSummary>>;
  discover(command: GhostDiscoveryCommand): Promise<AsyncOperationResult<DiscoveryOffer | null>>;
  resolve(command: AsyncContestResolveCommand): Promise<AsyncOperationResult<AsyncContestReceipt>>;
  withdraw(ghostId: string, idempotencyKey: string): Promise<AsyncOperationResult<void>>;
  report(ghostId: string, reason: ReportReason, idempotencyKey: string): Promise<AsyncOperationResult<void>>;
  setBlock(participantOpaqueRef: string, blocked: boolean, idempotencyKey: string): Promise<AsyncOperationResult<void>>;
  disableParticipation(idempotencyKey: string): Promise<AsyncOperationResult<void>>;
}
```

The disabled adapter implements the full interface and never calls `fetch`,
imports the SDK, reads/writes run state, or throws for normal unavailability.

## Safety entities

```ts
type ReportReason = "offensive-pseudonym" | "suspicious-record" | "harassment-pattern" | "other-fixed";

interface GhostReport {
  readonly reportId: string;
  readonly reporterId: string;
  readonly ghostId: string;
  readonly reason: ReportReason;
  readonly state: "open" | "reviewed" | "actioned" | "dismissed";
  readonly createdAt: string;
  readonly expiresAt: string; // 30 days
}

interface ParticipantBlock {
  readonly blockerId: string;
  readonly blockedId: string;
  readonly createdAt: string;
}

interface ServiceControl {
  readonly singleton: true;
  readonly mode: "enabled" | "read-only" | "disabled";
  readonly reason: string;
  readonly verifierVersion: string;
  readonly changedAt: string;
}
```

Reports contain no free text. Blocking immediately excludes both directions from
future discovery for the blocker. Reporting does not silently alter a completed
local receipt; moderation affects future service delivery.

## Database model and invariants

| Table | Primary purpose | Key invariants |
|---|---|---|
| `participants` | consent/pseudonym/participation | one Auth user; pseudonym server-authored |
| `ghost_submissions` | immutable verified payload | unique owner/idempotency; TTL/status enforced |
| `ghost_discovery_state` | rotation counters | separate from immutable payload |
| `discovery_offers` | 15-minute binding | challenger-owned; one successful contest |
| `async_contests` | immutable stored receipt | unique challenger/idempotency and offer |
| `participant_blocks` | discovery exclusion | unique ordered pair; no self block |
| `ghost_reports` | fixed-reason moderation | unique reporter/ghost/reason/day |
| `rate_limit_buckets` | atomic operation counts | server-only; bounded expiry |
| `service_control` | kill/read-only switch | exactly one row |

All public-schema tables have RLS enabled. `anon` and `authenticated` receive no
direct table privileges. Functions use authenticated JWT ownership plus server
credentials and database constraints. No view/function exposing private columns
is granted to browser roles.

## Retention transitions

```text
verifying -> discoverable -> expired
                      \-> withdrawn
                      \-> moderated
```

- Only `discoverable` with future `discoverable_until` and `clear` moderation
  may be selected.
- Withdrawal/moderation status commits before any cleanup.
- Hourly cleanup removes expired/withdrawn payloads, offers, contests, and rate
  buckets past their retention.
- Report shells delete at 30 days; disabled anonymous participants become
  eligible for Auth cleanup at 30 days.
- A cleanup failure cannot make an ineligible row discoverable.

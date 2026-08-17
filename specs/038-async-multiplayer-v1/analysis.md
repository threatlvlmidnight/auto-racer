# Spec Kit Analysis: Feature 038

**Analyzed**: 2026-08-17  
**Result**: PASS for implementation handoff after Features 041/042  
**Implementation started**: No

## Artifact coverage

| Gate | Result | Evidence |
|---|---|---|
| Specify | PASS | Three independent stories, FR-001–FR-016, SC-001–SC-006 |
| Clarify | PASS | Identity, discovery, trust, retention, moderation, $0 cap, and Supabase selected |
| Plan | PASS | 14 research decisions, models, binding contract/OpenAPI, runbook, constitution review |
| Tasks | PASS | T001–T065 code, T066 owner pilot, T067 manual verification |
| Analyze | PASS | Requirements, authority, security, fallback, cost, dependencies, and ownership traced |

## Requirement traceability

| Requirement | Primary tasks |
|---|---|
| FR-001 optional/static/local independence | T003–T005, T010–T011, T037–T040, T053, T060, T064 |
| FR-002 immutable opted-in versioned ghost | T006–T019, T033–T042 |
| FR-003 typed states/no local mutation | T003, T006, T010–T011, T020, T037–T040, T047, T053 |
| FR-004 pre-resolved watched playback/no live input | T016–T021, T045–T052 |
| FR-005 rotating public pool/local alternative | T043–T044, T047–T053 |
| FR-006 server-authoritative verification/result storage | T012–T032, T035–T036, T045–T046 |
| FR-007 anonymous identity/disclosure | T011, T030, T033–T040 |
| FR-008 withdrawal/TTL/report/block/rate/$0 | T022–T032, T042, T054–T059, T063–T066 |
| FR-009 reject/quarantine unsafe records | T012–T19, T24–T32, T035–T36, T043–T47, T054–T59 |
| FR-010 version/deploy/secrets/recovery/observability | T001, T005–T009, T022–T32, T059–T66 |
| FR-011 preserve Feature 033/034 authority | T001, T009, T012–T21, T045–T52, T064 |
| FR-012 unscored/non-mutating exhibition | T016–T20, T041, T045–T53, T064 |
| FR-013 normal eight-car presentation | T016–T18, T045–T52 |
| FR-014 bound retained circuit | T013–T19, T043–T48 |
| FR-015 no free text/service pseudonym | T023, T033–T36, T054–T59 |
| FR-016 zero pre-consent/unconfigured network | T003–T05, T010–T11, T037–T40, T060 |
| SC-001 cross-client result/event parity | T007–T009, T016–T21, T032, T045–T50, T061, T063 |
| SC-002 unavailable/retry/local continuity | T003, T010–T11, T020, T037–T40, T053, T060 |
| SC-003 unsafe record rejection | T012–T19, T024–T32, T035–T36, T043–T47, T054–T59 |
| SC-004 immediate withdrawal/discovery stop | T026–T27, T042, T057 |
| SC-005 full gates | T059–T67 |
| SC-006 local state deep equality | T003, T020, T037–T42, T047–T53, T064 |

Every functional requirement has an objective code/test path. Hosted activation
and qualitative acceptance are deliberately outside the coding lane.

## Consistency findings

- **Remote competition scope**: Consistent. It is an unscored exhibition, not a
  championship replacement. This prevents optional pool strength/availability
  from changing progression and requires no economy/settlement migration.
- **Field model**: Consistent. Challenger plus six existing deterministic local
  rivals plus one verified remote ghost preserves the normal eight-car watched
  race. The remote ghost is canonical roster position eight before ranking.
- **Track compatibility**: Consistent. Discovery carries the publisher's exact
  regenerated/fingerprinted circuit, avoiding an effectively empty exact-track
  pool. Challenger setup binds to that offer/circuit.
- **Trust model**: Consistent. The server validates publication and resolves/
  stores the full receipt before return. No task permits claimed client totals,
  client table writes, or client-authoritative remote fallback.
- **Versioning**: Consistent. Every outcome-affecting Feature 033/034/041/042,
  catalog, track, setup, result, and digest version is exact-match. Missing
  constants must be added at their owner, not copied into transport.
- **Playback authority**: Consistent. Scenes consume retained receipt evidence
  and perform zero result/track/network recomputation. Existing pause/speed/skip/
  audio/PiP behavior remains presentation-only.
- **Identity/privacy**: Consistent. Explicit consent precedes anonymous Auth; no
  PII/free text/location/chat is collected; identity loss is disclosed; no
  account linking is implemented in V1.
- **Retention**: Consistent. Query-time TTL/status is authoritative; hourly Cron
  is cleanup. Withdrawal stops discovery transactionally, independent of job
  timing.
- **Moderation**: Consistent. Fixed reasons, server pseudonyms, report/block,
  rate limits, direct-access denial, and closed-pilot boundary reduce abuse
  without inventing a broad social system.
- **Cost**: Consistent with current provider behavior. Free is $0 and cannot
  charge; configurable Spend Cap is Pro-only. The package uses no upgrade,
  read-only/kill switches, quota thresholds, and local fallback rather than
  falsely claiming a Free Spend Cap.
- **Recovery**: Consistent. Free automatic backups are not assumed. Source-
  controlled migrations/functions recover service capability; seven-day pilot
  records are explicitly disposable.
- **Agent ownership**: Consistent. DeepSeek receives code/local automation only.
  Hosted credentials/billing and screenshots/qualitative review remain open
  owner/frontier tasks.

## Security and failure-mode review

| Risk | Disposition |
|---|---|
| Public key mistaken for authority | Edge-only operations; no browser table grants; JWT ownership + server secret |
| Secret bundled in Vite | Separate env vocabulary and static artifact/source audits |
| Anonymous-user abuse | Closed pilot, Auth + app limits, active cap, payload bounds, future public CAPTCHA gate |
| Forged result/build | Strict rehydration, manifest equality, server recompute, stored receipt before return |
| Idempotent retry duplication | Participant/operation UUID keys and conflicting-reuse rejection |
| Expired row served after Cron failure | Status/TTL/moderation/block predicates in discovery transaction |
| Service pause/quota outage | Typed unavailable/read-only/disabled states; local route; no client remote result |
| Edge CPU ceiling | Required benchmark; pilot remains disabled on failure |
| Logs leak player data | One bounded metadata summary and forbidden-fragment tests |
| Optional service changes progression | Async contests are unscored and cannot import settlement authority |

No critical/high security or authority ambiguity remains in the implementation
package. Public production promotion remains explicitly out of scope.

## Constitutional finding

Feature 038 satisfies Prepare → Contest, Fairness, Transparency,
Spectation-First, and Async-First. It adds optional low-stakes exhibition but
cannot serve as the sole Principle V build-test path because it may be disabled
or unavailable. It therefore does not resolve or worsen Feature 045's separately
documented Test Day visibility deviation.

## Dependency and overlap review

- Features 041/042 must land before transport versions and publication validators
  freeze; their evidence is required, not optional.
- Feature 035/036 remediation should land before Contest/Results integration.
- Feature 045 may later add Settings/help entry points and hide Test Day; Feature
  038 owns only its lobby/setup/provenance surfaces and must consume shared
  visibility/layout seams without reopening Test Day.
- Feature 044 may reflow lobby/setup/Results. Feature 038 owns bounded component
  models and objective layout regions, not global responsive architecture.
- Feature 040 may restyle surfaces but cannot alter consent, provenance, typed
  states, focus, or fallback semantics.
- Feature 039 audio integration remains presentation-only; remote receipts use
  existing audio lifecycle and cannot make audio part of result authority.
- No asset generation, sourcing, cropping, or approval is required.

## Final disposition

Feature 038 is implementation-ready once Features 041/042 have landed. DeepSeek
receives T001–T065 only. T066 remains owner-only hosted Free pilot activation;
T067 remains frontier/owner manual browser/cross-device acceptance. Failure to
enable the hosted pilot does not block the static/local game or invalidate the
completed code package.

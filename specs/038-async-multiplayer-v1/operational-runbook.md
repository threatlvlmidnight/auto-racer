# Operational Runbook: Async Multiplayer V1

This runbook is part of the implementation contract. It describes a disposable
$0 development pilot, not a production service commitment.

## Modes

| Client mode | Public config | Expected behavior |
|---|---|---|
| absent/`disabled` | any | disabled adapter; no SDK import/Auth/network |
| `pilot` | missing/invalid | typed unconfigured state; local play unchanged |
| `pilot` | complete | disclosure first; service constructed only after consent |

Checked-in `.env.example` may contain placeholders only:

```text
VITE_ASYNC_MULTIPLAYER_MODE=disabled
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The project URL and publishable key are public configuration. They are still
omitted from the normal Pages build so the static artifact has no accidental
service dependency.

## Secret policy

Hosted functions use Supabase-provided server credentials and these project
secrets/config values:

```text
ASYNC_ALLOWED_ORIGINS=https://threatlvlmidnight.github.io,http://localhost:5173
ASYNC_VERIFIER_VERSION=async-verifier-v1
ASYNC_PSEUDONYM_SALT=<random secret>
ASYNC_CAPTCHA_MODE=closed-pilot-disabled
```

- Never prefix custom secrets with `SUPABASE_`; that prefix is reserved.
- Never commit `.env`, CLI tokens, project passwords, linked-project temp state,
  JWTs, secret/service-role keys, or CAPTCHA secrets.
- Never expose server secret/service-role keys through `VITE_*` variables.
- Static artifact and source audits search for legacy/current secret key shapes,
  unexpected project URLs, and non-placeholder credential values.

## Local development and recovery source

1. Install the checked-in dependencies and a Docker-compatible runtime.
2. Run `npx supabase start`.
3. Run `npx supabase db reset` to recreate schema, RLS, seed users/records, Cron,
   and service control entirely from versioned files.
4. Serve functions with the ignored local env file.
5. Run contract/integration/benchmark commands from `quickstart.md`.
6. Stop the stack normally; never expose the local stack to external traffic.

Migrations and functions—not pilot data—are the backup. The Free plan has no
automatic backup requirement in this design. If the remote pilot is lost,
paused beyond recovery, or corrupted, create a fresh optional project and apply
the checked-in schema/functions. Seven-day ghosts and receipts may be lost; the
static game and local runs are unaffected.

## Hosted pilot activation — owner only

Do not perform these steps as part of `[CODE-DEEPSEEK]`:

1. Create a separate Supabase Free organization/project with no payment method,
   paid tier, add-on, or overage authorization.
2. Confirm anonymous sign-ins are enabled and the documented Auth IP rate limit
   is not raised beyond the closed-pilot need.
3. Confirm the allowed origins, function secrets, and pseudonym salt.
4. Preview migrations with the CLI dry-run against the exact linked project.
5. Apply migrations, deploy functions, and verify generated database types match.
6. Keep `service_control.mode = disabled` while running RLS, secret, rate,
   retention, resolver parity, and CPU/size gates.
7. Confirm no direct `anon`/`authenticated` table/view/RPC grant exists.
8. Confirm the Free organization cannot charge and record current quota values.
9. Set `service_control.mode = enabled`, then build a separately labeled pilot
   artifact with explicit public configuration.
10. Never overwrite the normal disabled GitHub Pages artifact merely to test the
    pilot. Deployment choice remains an owner action.

Public promotion is prohibited until CAPTCHA/Turnstile, load testing, revised
rate limits, moderation ownership, privacy copy, and a new cost review are
approved.

## Usage guardrails

Record a weekly pilot check while enabled:

- monthly active users and anonymous-user creation rate;
- database bytes and row counts by table;
- Edge Function invocation/CPU/error totals;
- egress;
- oldest discoverable payload and cleanup job status;
- report count and moderation queue;
- service mode/verifier deployment.

Threshold actions apply to any Free quota:

| Usage | Required action |
|---:|---|
| 70% | Owner review; investigate growth and invalid traffic |
| 85% | Set `read-only`; block publish/resolve, permit withdrawal/disable |
| 95% | Set `disabled`; permit only local game and administrative cleanup |

There is no claim that Free provides a configurable Spend Cap. The $0 boundary
is achieved by staying Free, authorizing no upgrade, and failing closed.

## Pause/unavailability behavior

Free projects may pause. The client must map DNS failure, offline state,
connection refusal, 401 after lost session, timeout, 429, 5xx, read-only, and
quota stop to the typed capability/error model. It must:

- retain the exact local run/setup/selection;
- show one bounded retry only where the idempotency key makes it safe;
- show the local-rival route;
- never fabricate a remote record/result;
- never poll in the background after leaving the async lobby.

To resume a paused development project, the owner uses the Supabase dashboard,
then reruns health, schema-history, RLS, cleanup, parity, and verifier-version
checks before re-enabling client mode.

## Observability and privacy

One request log contains only:

```text
request_id, operation, deployment_version, verifier_version, status,
error_code, latency_ms, request_bytes, response_bytes, compatibility_prefix
```

Never log Auth/user IDs, IPs, JWTs, headers, pseudonyms, ghost/report/block IDs,
item/build/setup/track/result/event bodies, canonical payloads, or secrets.
Database aggregate counters provide longer-lived operational evidence because
Free logs are short-lived. Counters contain counts/timestamps only.

## Retention incident checks

If cleanup fails:

1. Set `read-only` if database growth or privacy risk is material.
2. Verify discovery SQL still excludes TTL/status/moderation rows.
3. Inspect `cron.job_run_details` and the bounded cleanup error summary.
4. Correct and rerun the idempotent cleanup function.
5. Verify oldest payload/report timestamps against seven-/30-day policies.
6. Record only aggregate incident facts; do not export payloads into logs/tickets.

## Security/abuse response

- Suspicious invalid traffic: lower service mode first; do not raise quota.
- Forged/incompatible data: quarantine the record, preserve only bounded opaque
  report evidence, and add a regression fixture before restoring.
- Pseudonym issue: remove the authored token/suffix path, quarantine affected
  records, regenerate pseudonyms without exposing owner IDs.
- Secret exposure: disable service, rotate the secret/key, audit artifact and
  function logs, redeploy, and invalidate affected sessions if necessary.
- RLS/direct-grant failure: disable immediately. Treat all remote records as
  untrusted and recreate the optional database from migrations after repair.

## Rollback

Rollback is service-first and non-destructive to local play:

1. Set database `service_control.mode = disabled`.
2. Publish/build with `VITE_ASYNC_MULTIPLAYER_MODE=disabled`.
3. Confirm the static artifact makes zero startup/local-play requests.
4. Preserve migrations and evidence long enough to diagnose; do not blindly
   drop tables or reset a linked project.
5. Revert/deploy Edge Functions only after traffic is stopped.
6. If schema rollback is unsafe, abandon the disposable optional project and
   recreate later. Do not block the Pages game on recovery.

## Go/no-go gates

Hosted pilot stays disabled unless all are true:

- exact cross-runtime canonical/digest fixtures pass;
- complete enriched resolver p95 is under 1.5 seconds and every accepted fixture
  stays below 2 seconds CPU with payload/result bounds;
- all RLS/direct-grant negative tests pass;
- TTL, withdrawal, block, moderation, and delayed-Cron tests pass;
- static disabled artifact audit shows zero remote dependency/secrets;
- owner confirms Free/no-billing status;
- manual cross-device/visual verification is assigned separately.

Any failure is a no-go for remote service, not a reason to weaken server
authority. Local play remains the shipped fallback.

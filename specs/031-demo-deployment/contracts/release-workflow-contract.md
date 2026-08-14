# Release Workflow Contract

## Trigger

Manual dispatch only, with required `release_tag` input. Tag creation, pushes, pull requests, schedules, and external events cannot invoke deployment automatically.

## Validation and build job

1. Validate exact semantic demo-tag grammar using workflow-owned logic before selected-tag checkout.
2. Verify the exact remote tag ref exists and resolve it to one full revision without executing selected-tag repository code.
3. Checkout the resolved tagged source.
4. Cross-check the checked-out tag/revision using the repository validator, then install locked dependencies.
5. Run full tests.
6. Run lint.
7. Build with exact public identity and Pages base.
8. Audit `dist/`.
9. Upload `dist/` as the Pages artifact.

This job has repository read permission only and no Pages deployment permission.

## Deploy job

- Requires successful build job.
- Uses the protected `github-pages` environment.
- Has `pages: write` and `id-token: write` plus no broader write permission.
- Deploys the uploaded artifact through the official Pages action.
- Publishes the returned page URL as job/environment output.
- Uses deployment concurrency so overlapping invocations cannot write simultaneously.

## Post-deployment job/step

- Receives only the returned public URL and expected build identity/resource paths.
- Runs bounded-retry smoke checks.
- Marks the invocation healthy or unhealthy.
- Never automatically starts another deployment.

## Action provenance

Every external action is official and pinned to a reviewed immutable full commit SHA, with a comment identifying the corresponding maintained release line.

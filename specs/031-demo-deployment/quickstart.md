# Quickstart: Demo Deployment

## Prerequisites

- Repository administrator enables **Settings → Pages → Build and deployment → GitHub Actions**.
- The `github-pages` environment permits the manual deployment workflow.
- Feature implementation is merged into the default branch before the first release tag is created.

## Local validation

1. Install locked dependencies.
2. Run the complete test, lint, and build gates.
3. Build with a simulated `/auto-racer/` base and demo identity.
4. Run the artifact audit.
5. Serve the artifact beneath the prefixed path and run the smoke checker.
6. Confirm the title footer matches the simulated tag/revision and representative gameplay assets load without root-path failures.

## First release

1. Select the approved default-branch commit.
2. Create and push `demo-v0.1.0` at that exact commit.
3. Open the manual demo deployment workflow.
4. Enter/select `demo-v0.1.0` and explicitly run it.
5. Confirm tag validation, tests, lint, build, artifact audit, deploy, and smoke check are green.
6. Open the reported public URL in a clean browser and verify the title footer.

## Ordinary release

Increment the semantic demo version, tag the approved revision, then manually dispatch that tag. Creating the tag alone must leave the live demo unchanged.

## Manual rollback

1. Identify the previously healthy demo tag from workflow/deployment history.
2. Manually dispatch the same workflow with that existing tag.
3. Wait for all verification, deployment, and smoke stages.
4. Confirm the title footer once again shows the restored tag and source revision.

## Required gates

```sh
npm ci
npm test
npm run lint
npm run build
```

Implementation tasks will add the artifact-audit and smoke commands to this gate list.

## Failure exercises

- Reject `main`, a raw SHA, `demo-v1`, and `demo-v01.0.0` as release inputs.
- Prove normal pushes and pull requests never create deployments.
- Prove a failing pre-deployment gate leaves the live URL unchanged.
- Force one representative asset check to fail and verify an unhealthy release with the exact failed URL.
- Redeploy the previous tag and verify recovery.

## Scope guard

Do not add authentication, multiplayer/backend services, analytics, cloud saves, custom domains, Steam packaging, generated-output branches, automatic tag deployment, or automatic rollback.

# Feature Specification: Demo Deployment

**Feature Branch**: `[031-demo-deployment]`

**Created**: 2026-08-14

**Status**: Implementation complete — demo-v0.1.0 published

**Input**: User description: "Host a shareable demo copy on GitHub Pages before beginning actual multiplayer design. Releases should be deliberate and stable rather than publishing every unfinished change automatically."

## Clarifications

### Session 2026-08-14

- Q: What should count as an approved revision that can be deployed or restored? → A: Only a commit marked with a dedicated demo release tag may be published or restored.
- Q: Should creating the demo tag immediately publish it, or should publishing require a second manual confirmation? → A: Creating a tag only makes it eligible; the owner must then manually select that tag and start the release workflow.
- Q: What naming rule should identify valid demo release tags? → A: Use semantic demo tags in the form `demo-vMAJOR.MINOR.PATCH`, beginning with tags such as `demo-v0.1.0`.
- Q: Where should testers be able to see which demo build they are playing? → A: Show the demo tag and short source revision in a small title-screen footer.
- Q: If deployment succeeds but the public smoke check finds a broken page or missing required asset, what should happen? → A: Mark the release unhealthy, identify the failure, and require the owner to manually redeploy the previous demo tag.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play the approved demo from a link (Priority: P1)

As an invited demo player, I can open one public web link and play the approved build without installing development tools or downloading the repository.

**Why this priority**: The feature exists to make the current game easy to hand to testers before Steam distribution is available.

**Independent Test**: Open the published project-site URL in a clean browser session, load every required asset, begin a championship, and reach active gameplay without repository or development access.

**Acceptance Scenarios**:

1. **Given** an approved deployment, **When** a tester opens the canonical demo URL, **Then** the game loads successfully beneath the repository-specific URL path.
2. **Given** a clean browser cache, **When** the title and representative gameplay screens load, **Then** no required image, font, script, or style request resolves against the wrong site root.
3. **Given** direct navigation or refresh at the demo URL, **When** the page reloads, **Then** the game returns to its normal entry flow rather than a hosting error page.

---

### User Story 2 - Publish only an approved build (Priority: P1)

As the project owner, I can deliberately publish a tested revision without every normal source push immediately changing the public demo.

**Why this priority**: Testers need a stable reference build, and unfinished work must not silently replace it.

**Independent Test**: Push ordinary source changes and verify the live demo remains unchanged; then invoke the authorized release workflow and verify that exact revision becomes the published demo only after all required gates pass.

**Acceptance Scenarios**:

1. **Given** a normal push, **When** verification completes, **Then** it does not deploy a new public demo.
2. **Given** an explicitly requested release, **When** tests, lint, and production build pass, **Then** the resulting static artifact is published.
3. **Given** any failed required gate, **When** a release is requested, **Then** no new artifact replaces the currently working demo.
4. **Given** a successful deployment, **When** the owner inspects its metadata, **Then** the exact source revision and deployment URL are identifiable.

---

### User Story 3 - Diagnose and recover a bad deployment (Priority: P2)

As the project owner, I can distinguish build failures from hosting/runtime failures and restore a previously approved revision without rewriting game history.

**Why this priority**: A demo link is useful only if failures are visible and recovery is straightforward.

**Independent Test**: Exercise a failed build, a missing-asset smoke check, and a release of a previously approved revision; verify actionable failure evidence and successful restoration.

**Acceptance Scenarios**:

1. **Given** a build or verification failure, **When** the workflow stops, **Then** the failed stage and logs are available without affecting the live demo.
2. **Given** a published artifact with an unreachable entry page or required asset, **When** the post-deployment smoke check runs, **Then** the deployment is reported as unhealthy with the failing URL identified.
3. **Given** a previously approved source revision, **When** the owner deliberately redeploys it, **Then** it becomes the live demo using the same release gates.

### Edge Cases

- Repository-site hosting adds a path prefix rather than serving from `/`.
- A tester has cached an older script while the entry document references a newer build.
- A release is requested from a revision that does not pass current verification.
- The hosting service accepts the artifact but the public URL is temporarily unavailable.
- A post-deployment smoke check fails after the new artifact is live; the release is marked unhealthy and recovery follows the documented previous-tag redeployment procedure.
- A required large image is absent, mis-cased, or referenced with an absolute root path.
- Two release requests overlap; only completed, authorized deployments may become live.
- The repository's Pages publishing source has not yet been enabled by an administrator.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The approved demo MUST be publishable as a static project site at the repository's GitHub Pages URL.
- **FR-002**: All runtime asset and module references MUST resolve correctly when the application is hosted beneath a repository path prefix and MUST remain valid in local development/preview.
- **FR-003**: Normal pushes and pull requests MUST run verification without publishing a new public demo.
- **FR-004**: Publishing MUST require an explicit authorized manual release action selecting a source revision marked by a dedicated demo release tag; creating or pushing the tag alone MUST NOT deploy, and an untagged branch or commit MUST NOT be deployable.
- **FR-005**: A release MUST run the complete automated test suite, lint checks, and production build before its artifact can be deployed.
- **FR-006**: Failure of any required pre-deployment gate MUST leave the currently published demo unchanged.
- **FR-007**: The deployed artifact MUST contain only production runtime files and MUST NOT expose source-only configuration, tests, repository metadata, or development dependencies.
- **FR-008**: Every successful deployment MUST expose traceable metadata identifying at least the demo tag, short source revision, and build time without placing secrets in the client; the title screen MUST show the demo tag and short revision in a small footer.
- **FR-009**: The deployment process MUST report the canonical public URL after success.
- **FR-010**: A post-deployment smoke check MUST verify the entry document and representative required runtime assets from the public URL.
- **FR-011**: Deployment failures and smoke-check failures MUST expose an actionable failed stage and target URL or artifact context.
- **FR-012**: The owner MUST be able to manually select and redeploy a previous demo release tag through the same verified release process.
- **FR-013**: The release documentation MUST include the one-time repository setting needed to enable workflow-based Pages publishing and the repeatable publish/rollback procedure.
- **FR-014**: The demo MUST remain fully playable without a multiplayer service, account, private secret, or server-side game process.
- **FR-015**: The static artifact MUST contain none of the forbidden environment/source files or high-confidence credential patterns defined by the production-artifact audit contract; the release MUST fail when any defined rule matches.
- **FR-016**: This feature MUST NOT add multiplayer, authentication, cloud saves, analytics, custom-domain configuration, Steam packaging, or automatic deployment from ordinary pushes.
- **FR-017**: The release workflow MUST accept only demo tags matching `demo-vMAJOR.MINOR.PATCH`, where each version component is a non-negative integer with no omitted component.
- **FR-018**: A failed post-deployment smoke check MUST mark the release unhealthy and identify the failing public resource, but MUST NOT initiate an automatic rollback; recovery MUST require manually redeploying a previous valid demo tag.

### Key Entities

- **Demo Release**: An explicit request to publish a specifically tagged source revision, with semantic demo version, tag, initiator, revision, verification outcome, and final deployment status.
- **Deployment Artifact**: The production-only static files generated from the selected revision and submitted to the hosting service.
- **Build Identity**: Public, non-secret metadata connecting a running demo to its exact source revision and build time.
- **Deployment Environment**: The protected public destination whose current artifact is the canonical demo.
- **Smoke Check**: A post-deployment verification of the public entry document and representative runtime assets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tester with a clean browser can open the canonical URL and reach the title screen with zero failed required runtime requests.
- **SC-002**: Representative title, entrant, garage, pre-race, race, Results, and regional-background assets load successfully from the repository-prefixed URL.
- **SC-003**: 100% of attempted releases with a failing test, lint, or build gate leave the previously published demo unchanged.
- **SC-004**: Every successful demo shows a title-screen demo tag and short source revision matching the revision selected for that release.
- **SC-005**: An ordinary push or pull request produces zero public deployments.
- **SC-006**: A previous demo release tag can be restored through the documented process in one release invocation.
- **SC-007**: A successful release reports both deployment success and the public URL; a failed smoke check identifies at least one failing public resource.
- **SC-008**: Inspection of the production artifact reports zero matches across the complete defined forbidden-file and high-confidence credential-pattern rule set.

## Assumptions

- The demo is intentionally accessible to anyone who has or discovers the Pages URL; secure invitation-only access is out of scope.
- The repository owner can enable GitHub Actions as the Pages publishing source and authorize the deployment environment.
- The current approximately 73 MB production artifact is within the hosting workflow's practical artifact limits.
- The game remains a single-entry static application with no client-side route requiring fallback rewrites.
- Browser-local Test Day recovery may continue to work on the same origin, but general run persistence is not added here.
- HTTPS and the repository's standard Pages domain are sufficient for the demo; a custom domain can be added later.

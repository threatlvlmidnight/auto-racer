# Data Model: Demo Deployment

## DemoReleaseTag

A string matching:

```text
demo-vMAJOR.MINOR.PATCH
```

Rules:

- Each component is a non-negative base-10 integer.
- Components cannot be omitted.
- Multi-digit components cannot begin with zero.
- The tag must exist exactly in repository refs and resolve to one commit.
- Creating the tag does not deploy it.

## BuildIdentity

Public immutable values compiled into one artifact:

- `releaseTag`: valid `DemoReleaseTag`, or a local-development label.
- `revision`: full source commit identifier.
- `shortRevision`: stable abbreviated display form derived from `revision`.
- `builtAtUtc`: valid UTC timestamp for the current artifact build.
- `baseUrl`: normalized deployment base beginning and ending with `/`.
- `isRelease`: distinguishes a validated tagged release from local development.

Validation:

- A release build fails if any release field is missing or malformed.
- No field may contain a secret.
- Title display uses `releaseTag` and `shortRevision`; cache stamping uses encoded `shortRevision`.

## DemoRelease

One manual workflow invocation:

- requested tag
- triggering actor
- resolved revision
- build identity
- verification status
- artifact status
- deployment status
- deployment URL
- smoke status

State transitions:

```text
requested
  → tag-validated
  → verified
  → artifact-uploaded
  → deployed
  → healthy | unhealthy
```

Any failure before `deployed` ends the invocation without changing the public artifact. Failure after `deployed` produces `unhealthy` and requires manual previous-tag restoration.

## DeploymentArtifact

The static contents of `dist/` produced from one resolved tag:

- entry document
- hashed generated scripts/styles
- public runtime assets
- compiled public build identity

It excludes repository metadata, source trees, tests, specifications, development configuration, dependency trees, logs, environment files, and every forbidden path or credential-pattern match defined by `contracts/production-artifact-audit-contract.md`.

## SmokeCheckResult

- deployment URL
- attempts and elapsed availability time
- checked resource URLs
- status per URL
- final `healthy` or `unhealthy`
- actionable failure message

The smoke check observes the live artifact but does not mutate or roll it back.

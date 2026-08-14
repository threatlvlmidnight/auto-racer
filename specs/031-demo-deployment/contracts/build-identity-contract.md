# Build Identity Contract

## Release build inputs

A release build must receive:

- valid `demo-vMAJOR.MINOR.PATCH` tag
- exact full revision resolved from that tag
- short display revision derived from the full revision
- UTC build timestamp
- normalized Pages base path

Missing or malformed release inputs fail the build. Local development uses an explicit non-release fallback and never impersonates a tagged demo.

## Runtime exposure

- Title footer: `<releaseTag> · <shortRevision>`
- Programmatic identity: all public fields from `BuildIdentity`
- Runtime public assets: base-aware URL plus encoded revision cache stamp

The client receives no token, actor credential, environment secret, or deployment permission.

## Base normalization

- `/` remains `/`.
- A repository path becomes `/repository-name/`.
- Duplicate separators and traversal segments are invalid.
- Runtime asset callers pass relative paths without a leading slash.
- The final URL must remain within the configured base.

# Production Artifact Audit Contract

## Scope

The audit recursively inspects the generated `dist/` tree before upload. Its security claim is exactly the defined rules below; it does not claim to detect every possible secret representation.

## Required production shape

- `index.html` exists, is non-empty, and is the only root entry document.
- Runtime files live under approved generated/public asset roots.
- Symlinks and paths escaping `dist/` are rejected.
- The expected demo tag and revision occur in generated runtime output.

## Forbidden paths and file classes

Reject any artifact path containing or naming:

- `.git`, `.github`, `.env`, or any `.env.*` file
- `node_modules`, `src`, `tests`, `specs`, `scripts`, or coverage directories
- package-manager manifests/lockfiles
- TypeScript, lint, Vite, Vitest, editor, or Spec Kit configuration
- logs, temporary files, or source maps unless a later specification explicitly approves source maps
- private-key, certificate-key, credential, token, or keystore file extensions/names

## High-confidence credential patterns

Text-decodable artifact files are rejected when they contain a pattern from the version-controlled scanner list, initially covering:

- PEM/OpenSSH private-key headers
- GitHub classic/fine-grained token prefixes
- AWS access-key identifiers
- Slack token prefixes
- OpenAI secret-key prefixes
- Stripe live secret/restricted-key prefixes
- Google API-key prefixes

Each implementation regex must have positive and negative fixtures. Adding, removing, or weakening a pattern requires updating this contract, its fixtures, and acceptance evidence in the same change.

## Output

Every failure names:

- rule identifier
- artifact-relative path
- safe redacted context or matched credential category

The audit must never print a full matched credential value.

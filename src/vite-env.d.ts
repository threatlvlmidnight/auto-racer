/// <reference types="vite/client" />

/**
 * Feature 031-demo-deployment: compile-time declarations for the public build
 * identity fields injected into every build
 * (contracts/build-identity-contract.md). These are public, non-secret
 * values; no token, credential, or deployment permission may ever be exposed
 * through them.
 */
interface ImportMetaEnv {
  /** `demo-vMAJOR.MINOR.PATCH` for release builds; absent for local development. */
  readonly VITE_DEMO_RELEASE_TAG?: string;
  /** Full 40-hex source commit identifier the artifact was built from. */
  readonly VITE_DEMO_REVISION?: string;
  /** UTC timestamp (ISO 8601, `Z` suffix) at which the artifact was built. */
  readonly VITE_DEMO_BUILT_AT_UTC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
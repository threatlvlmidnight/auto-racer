import type { BuildIdentity } from "../buildIdentity";

/**
 * Feature 031-demo-deployment (T017): pure title-screen build-label model.
 * Release demos show `<demo-tag> · <short-revision>` (FR-008,
 * contracts/build-identity-contract.md); local development shows an explicit
 * non-release label that never impersonates a tagged demo.
 */
export function titleBuildLabel(identity: BuildIdentity): string {
  if (identity.isRelease) {
    return `${identity.releaseTag} · ${identity.shortRevision}`;
  }
  return `local development · ${identity.shortRevision}`;
}
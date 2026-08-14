import { describe, expect, it } from "vitest";
import { buildLocalIdentity, buildReleaseIdentity } from "../../src/buildIdentity";
import { titleBuildLabel } from "../../src/scenes/titlePresentation";
import {
  FIXED_BUILD_TIME_UTC,
  LOCAL_BASE_URL,
  PAGES_BASE_URL,
  RELEASE_REVISION,
  RELEASE_SHORT_REVISION,
  VALID_DEMO_TAG,
} from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment T014: title-screen build footer presentation. Release
 * demos show `<demo-tag> · <short-revision>` (FR-008); local development
 * shows an explicit non-release label that never impersonates a tagged demo.
 */

describe("T014: title build-label footer", () => {
  const release = buildReleaseIdentity({
    releaseTag: VALID_DEMO_TAG,
    revision: RELEASE_REVISION,
    builtAtUtc: FIXED_BUILD_TIME_UTC,
    baseUrl: PAGES_BASE_URL,
  });
  const local = buildLocalIdentity({ baseUrl: LOCAL_BASE_URL });

  it("release identities render the compact tag · short-revision footer", () => {
    expect(titleBuildLabel(release)).toBe(`${VALID_DEMO_TAG} · ${RELEASE_SHORT_REVISION}`);
  });

  it("local identities never impersonate a tagged demo", () => {
    const label = titleBuildLabel(local);
    expect(label).not.toContain("demo-v");
    expect(label.toLowerCase()).toContain("local");
  });

  it("labels stay a single compact non-empty line", () => {
    for (const identity of [release, local]) {
      const label = titleBuildLabel(identity);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/\n/);
      expect(label.length).toBeLessThanOrEqual(64);
    }
  });

  it("local labels still expose the short revision for diagnostics", () => {
    const withRevision = buildLocalIdentity({ revision: RELEASE_REVISION });
    expect(titleBuildLabel(withRevision)).toContain(RELEASE_SHORT_REVISION);
  });
});
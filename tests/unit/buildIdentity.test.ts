import { describe, expect, it } from "vitest";
import {
  buildIdentity,
  buildLocalIdentity,
  buildReleaseIdentity,
  BuildIdentityError,
  createBuildIdentity,
  isFullRevision,
  isValidDemoReleaseTag,
  isValidUtcTimestamp,
  LOCAL_DEVELOPMENT_TAG,
  normalizeBaseUrl,
  revisionCacheStamp,
  runtimeAssetUrl,
  shortRevisionOf,
} from "../../src/buildIdentity";
import {
  FIXED_BUILD_TIME_UTC,
  INVALID_DEMO_TAGS,
  LOCAL_BASE_URL,
  PAGES_BASE_URL,
  RELEASE_REVISION,
  RELEASE_SHORT_REVISION,
  VALID_DEMO_TAG,
  VALID_DEMO_TAGS,
} from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment Phase 2 (T006-T007, T011): unit coverage for the typed
 * build identity and the base-aware runtime asset URL boundary defined by
 * contracts/build-identity-contract.md.
 */

describe("T006: release identity parsing", () => {
  it("parses valid release inputs into a frozen release identity", () => {
    const identity = buildReleaseIdentity({
      releaseTag: VALID_DEMO_TAG,
      revision: RELEASE_REVISION,
      builtAtUtc: FIXED_BUILD_TIME_UTC,
      baseUrl: PAGES_BASE_URL,
    });
    expect(identity.isRelease).toBe(true);
    expect(identity.releaseTag).toBe(VALID_DEMO_TAG);
    expect(identity.revision).toBe(RELEASE_REVISION);
    expect(identity.shortRevision).toBe(RELEASE_SHORT_REVISION);
    expect(identity.builtAtUtc).toBe(FIXED_BUILD_TIME_UTC);
    expect(identity.baseUrl).toBe(PAGES_BASE_URL);
    expect(Object.isFrozen(identity)).toBe(true);
  });

  it("accepts every valid semantic demo tag", () => {
    for (const tag of VALID_DEMO_TAGS) {
      expect(isValidDemoReleaseTag(tag), tag).toBe(true);
    }
  });

  it.each([
    ["missing release tag", { releaseTag: "", revision: RELEASE_REVISION, builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: PAGES_BASE_URL }],
    ["missing revision", { releaseTag: VALID_DEMO_TAG, revision: "", builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: PAGES_BASE_URL }],
    ["missing build time", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_REVISION, builtAtUtc: "", baseUrl: PAGES_BASE_URL }],
    ["missing base URL", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_REVISION, builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: "" }],
  ])("fails the release build on %s", (_label, input) => {
    expect(() => buildReleaseIdentity(input)).toThrow(BuildIdentityError);
  });

  it.each([
    ["malformed tag", { releaseTag: "demo-v1", revision: RELEASE_REVISION, builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: PAGES_BASE_URL }],
    ["non-hex revision", { releaseTag: VALID_DEMO_TAG, revision: "not-a-revision", builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: PAGES_BASE_URL }],
    ["short revision", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_SHORT_REVISION, builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: PAGES_BASE_URL }],
    ["non-UTC build time", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_REVISION, builtAtUtc: "2026-08-14T12:00:00+02:00", baseUrl: PAGES_BASE_URL }],
    ["garbage build time", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_REVISION, builtAtUtc: "yesterday", baseUrl: PAGES_BASE_URL }],
    ["malformed base URL", { releaseTag: VALID_DEMO_TAG, revision: RELEASE_REVISION, builtAtUtc: FIXED_BUILD_TIME_UTC, baseUrl: "auto-racer" }],
  ])("fails the release build on %s", (_label, input) => {
    expect(() => buildReleaseIdentity(input)).toThrow(BuildIdentityError);
  });

  it("rejects every invalid demo tag fixture", () => {
    for (const tag of INVALID_DEMO_TAGS) {
      expect(isValidDemoReleaseTag(tag), JSON.stringify(tag)).toBe(false);
      expect(() =>
        buildReleaseIdentity({
          releaseTag: tag,
          revision: RELEASE_REVISION,
          builtAtUtc: FIXED_BUILD_TIME_UTC,
          baseUrl: PAGES_BASE_URL,
        }),
      ).toThrow(BuildIdentityError);
    }
  });
});

describe("T006: short revision derivation", () => {
  it("derives a stable seven-character display form from the full revision", () => {
    expect(shortRevisionOf(RELEASE_REVISION)).toBe(RELEASE_SHORT_REVISION);
  });

  it("rejects malformed revisions", () => {
    expect(() => shortRevisionOf(RELEASE_SHORT_REVISION)).toThrow(BuildIdentityError);
    expect(() => shortRevisionOf("")).toThrow(BuildIdentityError);
    expect(() => shortRevisionOf("z".repeat(40))).toThrow(BuildIdentityError);
    expect(() => shortRevisionOf("0".repeat(39))).toThrow(BuildIdentityError);
    expect(isFullRevision("0".repeat(41))).toBe(false);
  });
});

describe("T006: UTC build-time validation", () => {
  it("accepts strict UTC ISO 8601 timestamps", () => {
    expect(isValidUtcTimestamp("2026-08-14T12:00:00Z")).toBe(true);
    expect(isValidUtcTimestamp("2026-08-14T12:00:00.123Z")).toBe(true);
    expect(isValidUtcTimestamp(FIXED_BUILD_TIME_UTC)).toBe(true);
  });

  it("rejects offsets, separators, missing components, and impossible values", () => {
    expect(isValidUtcTimestamp("2026-08-14T12:00:00+02:00")).toBe(false);
    expect(isValidUtcTimestamp("2026-08-14 12:00:00Z")).toBe(false);
    expect(isValidUtcTimestamp("2026-08-14T12:00Z")).toBe(false);
    expect(isValidUtcTimestamp("2026-13-01T00:00:00Z")).toBe(false);
    expect(isValidUtcTimestamp("2026-08-14T25:00:00Z")).toBe(false);
    expect(isValidUtcTimestamp("")).toBe(false);
  });
});

describe("T006: secret-free public fields", () => {
  const SECRET_PROBES = [
    "ghp_" + "a".repeat(36),
    "github_pat_" + "b".repeat(30),
    "AKIA" + "C".repeat(16),
    "xoxb-1234567890-abcdef",
    "sk-" + "d".repeat(24),
    "sk_live_" + "e".repeat(24),
    "AIza" + "f".repeat(35),
    "-----BEGIN RSA PRIVATE KEY-----",
  ];

  it.each(SECRET_PROBES)("rejects a credential pattern in the base URL without echoing it", (secret) => {
    let caught: unknown;
    try {
      buildReleaseIdentity({
        releaseTag: VALID_DEMO_TAG,
        revision: RELEASE_REVISION,
        builtAtUtc: FIXED_BUILD_TIME_UTC,
        baseUrl: `/${secret}/`,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BuildIdentityError);
    expect((caught as Error).message).not.toContain(secret);
  });
});

describe("T006: local identity parsing", () => {
  it("falls back to an explicit non-release identity that never impersonates a tagged demo", () => {
    const identity = buildLocalIdentity();
    expect(identity.isRelease).toBe(false);
    expect(identity.releaseTag).toBe(LOCAL_DEVELOPMENT_TAG);
    expect(identity.releaseTag).not.toMatch(/^demo-v/);
    expect(identity.baseUrl).toBe(LOCAL_BASE_URL);
    expect(isValidUtcTimestamp(identity.builtAtUtc)).toBe(true);
    expect(Object.isFrozen(identity)).toBe(true);
  });

  it("keeps a valid full revision when local tooling supplies one", () => {
    const identity = buildLocalIdentity({ revision: RELEASE_REVISION, baseUrl: LOCAL_BASE_URL });
    expect(identity.revision).toBe(RELEASE_REVISION);
    expect(identity.shortRevision).toBe(RELEASE_SHORT_REVISION);
    expect(identity.isRelease).toBe(false);
  });
});

describe("T007: base normalization", () => {
  it("keeps the local root base unchanged", () => {
    expect(normalizeBaseUrl("/")).toBe("/");
  });

  it("keeps and normalizes repository-prefix bases", () => {
    expect(normalizeBaseUrl(PAGES_BASE_URL)).toBe(PAGES_BASE_URL);
    expect(normalizeBaseUrl("/auto-racer")).toBe(PAGES_BASE_URL);
    expect(normalizeBaseUrl("/Auto-Racer_2/nested.site")).toBe("/Auto-Racer_2/nested.site/");
  });

  it.each([
    ["empty input", ""],
    ["missing leading slash", "auto-racer/"],
    ["duplicate separators", "//"],
    ["inner duplicate separators", "/a//b/"],
    ["root traversal", "/../x"],
    ["inner traversal", "/a/../b"],
    ["current-dir segment", "/a/./b"],
    ["whitespace segment", "/a b/"],
    ["query string", "/a?b/"],
    ["fragment", "/a#b/"],
    ["backslash", "/a\\b"],
  ])("rejects %s", (_label, raw) => {
    expect(() => normalizeBaseUrl(raw)).toThrow(BuildIdentityError);
  });
});

describe("T007: runtimeAssetUrl", () => {
  const local = buildLocalIdentity({ baseUrl: LOCAL_BASE_URL });
  const release = buildReleaseIdentity({
    releaseTag: VALID_DEMO_TAG,
    revision: RELEASE_REVISION,
    builtAtUtc: FIXED_BUILD_TIME_UTC,
    baseUrl: PAGES_BASE_URL,
  });

  it("builds local root URLs without a cache stamp", () => {
    expect(runtimeAssetUrl("assets/title-race.svg", local)).toBe("/assets/title-race.svg");
  });

  it("builds prefixed release URLs with an encoded revision cache stamp", () => {
    expect(runtimeAssetUrl("assets/title-race.svg", release)).toBe(
      `/auto-racer/assets/title-race.svg?rev=${RELEASE_SHORT_REVISION}`,
    );
  });

  it("URL-encodes segments while staying inside the base", () => {
    const url = runtimeAssetUrl("assets/backgrounds/my file.png", release);
    expect(url).toBe(`/auto-racer/assets/backgrounds/my%20file.png?rev=${RELEASE_SHORT_REVISION}`);
    expect(url.startsWith(release.baseUrl)).toBe(true);
  });

  it.each([
    ["leading slash", "/assets/title-race.svg"],
    ["parent traversal", "../secrets.png"],
    ["inner traversal", "assets/../secrets.png"],
    ["current-dir segment", "assets/./x.png"],
    ["absolute URL", "https://example.com/assets/x.png"],
    ["backslash path", "assets\\x.png"],
    ["double slash", "assets//x.png"],
    ["trailing slash", "assets/x/"],
    ["embedded query", "assets/x.png?v=1"],
    ["embedded fragment", "assets/x.png#f"],
    ["empty path", ""],
  ])("rejects %s", (_label, path) => {
    expect(() => runtimeAssetUrl(path, release)).toThrow(BuildIdentityError);
    expect(() => runtimeAssetUrl(path, local)).toThrow(BuildIdentityError);
  });

  it("stamps only stable public assets through the helper, never hashed modules", () => {
    // The helper is the only stamping authority; its output is either
    // un-stamped (local) or carries exactly one encoded revision parameter.
    expect(revisionCacheStamp(RELEASE_SHORT_REVISION)).toBe(`rev=${RELEASE_SHORT_REVISION}`);
    expect(runtimeAssetUrl("assets/x.png", local)).not.toContain("?");
    expect(() => revisionCacheStamp("not-hex")).toThrow(BuildIdentityError);
  });
});

describe("T011: createBuildIdentity test seam", () => {
  it("builds a local identity from an empty environment without mutable authority", () => {
    const identity = createBuildIdentity({});
    expect(identity.isRelease).toBe(false);
    expect(identity.releaseTag).toBe(LOCAL_DEVELOPMENT_TAG);
    expect(identity.baseUrl).toBe(LOCAL_BASE_URL);
  });

  it("builds a release identity from release environment fields", () => {
    const identity = createBuildIdentity({
      BASE_URL: PAGES_BASE_URL,
      VITE_DEMO_RELEASE_TAG: VALID_DEMO_TAG,
      VITE_DEMO_REVISION: RELEASE_REVISION,
      VITE_DEMO_BUILT_AT_UTC: FIXED_BUILD_TIME_UTC,
    });
    expect(identity.isRelease).toBe(true);
    expect(identity.releaseTag).toBe(VALID_DEMO_TAG);
    expect(identity.shortRevision).toBe(RELEASE_SHORT_REVISION);
  });

  it("fails loudly when release fields are present but malformed", () => {
    expect(() =>
      createBuildIdentity({
        BASE_URL: PAGES_BASE_URL,
        VITE_DEMO_RELEASE_TAG: "demo-v1",
        VITE_DEMO_REVISION: RELEASE_REVISION,
        VITE_DEMO_BUILT_AT_UTC: FIXED_BUILD_TIME_UTC,
      }),
    ).toThrow(BuildIdentityError);
  });

  it("exposes a well-formed module-level identity for runtime callers", () => {
    expect(buildIdentity.baseUrl).toBe(normalizeBaseUrl(buildIdentity.baseUrl));
    expect(buildIdentity.releaseTag.length).toBeGreaterThan(0);
    expect(buildIdentity.revision.length).toBeGreaterThan(0);
    expect(buildIdentity.shortRevision.length).toBeGreaterThan(0);
    expect(isValidUtcTimestamp(buildIdentity.builtAtUtc)).toBe(true);
  });
});
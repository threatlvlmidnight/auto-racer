/**
 * Feature 031-demo-deployment: the single public boundary between the built
 * game and the identity/URLs it was built from. Provides the immutable
 * `BuildIdentity` compiled into every artifact, semantic demo-tag /
 * revision / UTC validation, base-path normalization, and the base-aware
 * `runtimeAssetUrl()` used by every Phaser-loaded public asset
 * (contracts/build-identity-contract.md).
 *
 * The client only ever holds public, non-secret metadata: no token, actor
 * credential, environment secret, or deployment permission reaches this
 * module.
 */

export class BuildIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildIdentityError";
  }
}

export interface BuildIdentity {
  /** Valid `demo-vMAJOR.MINOR.PATCH` tag for releases; local label otherwise. */
  readonly releaseTag: string;
  /** Full 40-hex source commit identifier (or the local-development fallback). */
  readonly revision: string;
  /** Stable abbreviated display form derived from `revision`. */
  readonly shortRevision: string;
  /** Valid UTC timestamp for the current artifact build. */
  readonly builtAtUtc: string;
  /** Normalized deployment base, beginning and ending with `/`. */
  readonly baseUrl: string;
  /** True only for a validated tagged release build. */
  readonly isRelease: boolean;
}

export const LOCAL_DEVELOPMENT_TAG = "local-development";
export const LOCAL_DEVELOPMENT_REVISION = "dev";
export const SHORT_REVISION_LENGTH = 7;

export const DEMO_RELEASE_TAG_PATTERN = /^demo-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const FULL_REVISION_PATTERN = /^[0-9a-f]{40}$/;
const SHORT_REVISION_PATTERN = /^[0-9a-f]{7,40}$/;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d{1,3})?Z$/;
const BASE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const ASSET_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * High-confidence credential patterns mirrored from the production artifact
 * audit contract's scanner list. Public identity fields must never match
 * them, and error messages must never echo the offending value.
 */
const SECRET_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "pem-private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/ },
  { id: "github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { id: "aws-access-key", pattern: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/ },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: "openai-secret-key", pattern: /\bsk(?:-proj)?-[A-Za-z0-9_-]{20,}\b/ },
  { id: "stripe-live-key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/ },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

function secretPatternId(value: string): string | undefined {
  const match = SECRET_PATTERNS.find((rule) => rule.pattern.test(value));
  return match?.id;
}

function assertPublicField(fieldName: string, value: string): void {
  const secretId = secretPatternId(value);
  if (secretId !== undefined) {
    throw new BuildIdentityError(
      `build identity field "${fieldName}" matches credential pattern "${secretId}"; public fields must be secret-free`,
    );
  }
}

export function isValidDemoReleaseTag(tag: string): boolean {
  return typeof tag === "string" && DEMO_RELEASE_TAG_PATTERN.test(tag);
}

export function isFullRevision(revision: string): boolean {
  return typeof revision === "string" && FULL_REVISION_PATTERN.test(revision);
}

/** Derives the stable short display form from a full revision. */
export function shortRevisionOf(revision: string): string {
  if (!isFullRevision(revision)) {
    throw new BuildIdentityError("revision must be a full 40-character hex commit identifier");
  }
  return revision.slice(0, SHORT_REVISION_LENGTH);
}

export function isValidUtcTimestamp(value: string): boolean {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

/**
 * Normalizes a deployment base to a single form beginning and ending with
 * `/`. `/` remains `/`; repository paths become `/repository-name/`.
 * Duplicate separators, traversal segments, and non-path characters are
 * invalid.
 */
export function normalizeBaseUrl(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new BuildIdentityError("base URL must be a non-empty string");
  }
  if (!raw.startsWith("/")) {
    throw new BuildIdentityError(`base URL must start with "/": received "${raw}"`);
  }
  if (raw.includes("\\") || raw.includes("?") || raw.includes("#") || /\s/.test(raw)) {
    throw new BuildIdentityError(`base URL contains forbidden characters: received "${raw}"`);
  }
  if (raw === "/") return "/";
  const withoutLeadingSlash = raw.slice(1);
  const body = withoutLeadingSlash.endsWith("/")
    ? withoutLeadingSlash.slice(0, -1)
    : withoutLeadingSlash;
  if (body.length === 0) {
    throw new BuildIdentityError(`base URL contains duplicate separators: received "${raw}"`);
  }
  const segments = body.split("/");
  for (const segment of segments) {
    if (segment.length === 0) {
      throw new BuildIdentityError(`base URL contains duplicate separators: received "${raw}"`);
    }
    if (segment === "." || segment === "..") {
      throw new BuildIdentityError(`base URL contains a traversal segment: received "${raw}"`);
    }
    if (!BASE_SEGMENT_PATTERN.test(segment)) {
      throw new BuildIdentityError(`base URL contains a disallowed segment: received "${raw}"`);
    }
  }
  return `/${segments.join("/")}/`;
}

export interface ReleaseIdentityInput {
  readonly releaseTag: string;
  readonly revision: string;
  readonly builtAtUtc: string;
  readonly baseUrl: string;
}

/** Builds a validated release identity; missing/malformed inputs fail. */
export function buildReleaseIdentity(input: ReleaseIdentityInput): BuildIdentity {
  const fields: ReadonlyArray<[string, string]> = [
    ["releaseTag", input.releaseTag],
    ["revision", input.revision],
    ["builtAtUtc", input.builtAtUtc],
    ["baseUrl", input.baseUrl],
  ];
  for (const [name, value] of fields) {
    if (typeof value !== "string" || value.length === 0) {
      throw new BuildIdentityError(`release build requires a non-empty ${name}`);
    }
    assertPublicField(name, value);
  }
  if (!isValidDemoReleaseTag(input.releaseTag)) {
    throw new BuildIdentityError("release build received a malformed release tag");
  }
  if (!isFullRevision(input.revision)) {
    throw new BuildIdentityError("release build received a malformed revision");
  }
  if (!isValidUtcTimestamp(input.builtAtUtc)) {
    throw new BuildIdentityError("release build received a malformed UTC build time");
  }
  return Object.freeze({
    releaseTag: input.releaseTag,
    revision: input.revision,
    shortRevision: shortRevisionOf(input.revision),
    builtAtUtc: input.builtAtUtc,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    isRelease: true,
  });
}

export interface LocalIdentityInput {
  readonly revision?: string;
  readonly builtAtUtc?: string;
  readonly baseUrl?: string;
}

/** Builds the explicit non-release identity; never impersonates a tagged demo. */
export function buildLocalIdentity(input: LocalIdentityInput = {}): BuildIdentity {
  const revision =
    typeof input.revision === "string" && isFullRevision(input.revision)
      ? input.revision
      : LOCAL_DEVELOPMENT_REVISION;
  const builtAtUtc =
    typeof input.builtAtUtc === "string" && isValidUtcTimestamp(input.builtAtUtc)
      ? input.builtAtUtc
      : new Date().toISOString();
  const baseUrl =
    typeof input.baseUrl === "string" && input.baseUrl.length > 0
      ? normalizeBaseUrl(input.baseUrl)
      : "/";
  return Object.freeze({
    releaseTag: LOCAL_DEVELOPMENT_TAG,
    revision,
    shortRevision:
      revision === LOCAL_DEVELOPMENT_REVISION ? LOCAL_DEVELOPMENT_REVISION : shortRevisionOf(revision),
    builtAtUtc,
    baseUrl,
    isRelease: false,
  });
}

export interface BuildEnv {
  readonly BASE_URL?: string;
  readonly VITE_DEMO_RELEASE_TAG?: string;
  readonly VITE_DEMO_REVISION?: string;
  readonly VITE_DEMO_BUILT_AT_UTC?: string;
}

/**
 * Test/diagnostic seam (T011): build an identity from an explicit
 * environment record. Production callers use the module-level
 * `buildIdentity`; this factory exposes no mutable production authority.
 */
export function createBuildIdentity(env: BuildEnv = {}): BuildIdentity {
  const releaseTag = typeof env.VITE_DEMO_RELEASE_TAG === "string" ? env.VITE_DEMO_RELEASE_TAG.trim() : "";
  const revision = typeof env.VITE_DEMO_REVISION === "string" ? env.VITE_DEMO_REVISION.trim() : "";
  const builtAtUtc = typeof env.VITE_DEMO_BUILT_AT_UTC === "string" ? env.VITE_DEMO_BUILT_AT_UTC.trim() : "";
  const baseUrl = typeof env.BASE_URL === "string" && env.BASE_URL.length > 0 ? env.BASE_URL : "/";
  if (releaseTag.length > 0) {
    return buildReleaseIdentity({ releaseTag, revision, builtAtUtc, baseUrl });
  }
  return buildLocalIdentity({
    revision: revision.length > 0 ? revision : undefined,
    builtAtUtc: builtAtUtc.length > 0 ? builtAtUtc : undefined,
    baseUrl,
  });
}

/**
 * The compiled identity for this artifact. Release builds are validated at
 * construction time; local development falls back to the explicit
 * non-release identity.
 */
export const buildIdentity: BuildIdentity = createBuildIdentity((import.meta.env ?? {}) as BuildEnv);

/** Encoded revision cache stamp for stable public assets (T020). */
export function revisionCacheStamp(shortRevision: string): string {
  if (typeof shortRevision !== "string" || !SHORT_REVISION_PATTERN.test(shortRevision)) {
    throw new BuildIdentityError("cache stamp requires a hex short revision");
  }
  return `rev=${encodeURIComponent(shortRevision)}`;
}

/**
 * Resolves a base-aware URL for a Phaser-loaded public asset. Callers pass
 * relative paths without a leading slash; the result always stays inside
 * the configured base. Release builds append an encoded revision cache stamp
 * so a new entry bundle never mixes with cached images from an older demo
 * (Decision 6). Vite-hashed modules never pass through this helper.
 */
export function runtimeAssetUrl(relativePath: string, identity: BuildIdentity = buildIdentity): string {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new BuildIdentityError("runtime asset path must be a non-empty string");
  }
  if (relativePath.startsWith("/")) {
    throw new BuildIdentityError(
      `runtime asset paths must be relative without a leading slash: received "${relativePath}"`,
    );
  }
  if (relativePath.includes("\\")) {
    throw new BuildIdentityError(`runtime asset paths must use forward slashes: received "${relativePath}"`);
  }
  if (ASSET_SCHEME_PATTERN.test(relativePath)) {
    throw new BuildIdentityError(`runtime asset paths must not be absolute URLs: received "${relativePath}"`);
  }
  if (relativePath.includes("?") || relativePath.includes("#")) {
    throw new BuildIdentityError(`runtime asset paths must not carry query/fragment: received "${relativePath}"`);
  }
  const segments = relativePath.split("/");
  for (const segment of segments) {
    if (segment.length === 0) {
      throw new BuildIdentityError(`runtime asset path contains an empty segment: received "${relativePath}"`);
    }
    if (segment === "." || segment === "..") {
      throw new BuildIdentityError(`runtime asset path contains a traversal segment: received "${relativePath}"`);
    }
  }
  const encoded = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const stamp = identity.isRelease ? `?${revisionCacheStamp(identity.shortRevision)}` : "";
  const url = `${identity.baseUrl}${encoded}${stamp}`;
  if (!url.startsWith(identity.baseUrl)) {
    throw new BuildIdentityError("runtime asset URL escaped the configured base");
  }
  return url;
}
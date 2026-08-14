/**
 * Feature 031-demo-deployment shared deployment fixtures (T002): canonical
 * local/Pages base URLs, valid/invalid semantic demo tags, release identity
 * values, and the representative runtime asset paths used by the boundary,
 * artifact, workflow, and smoke suites.
 */

export const LOCAL_BASE_URL = "/";
export const PAGES_BASE_URL = "/auto-racer/";
export const PAGES_ORIGIN = "https://threatlvlmidnight.github.io";
export const CANONICAL_DEMO_URL = `${PAGES_ORIGIN}${PAGES_BASE_URL}`;

export const VALID_DEMO_TAG = "demo-v0.1.0";
export const PRIOR_RELEASE_TAG = "demo-v0.0.9";
export const NEXT_RELEASE_TAG = "demo-v0.2.0";

/** Full 40-hex source revision used for simulated release builds. */
export const RELEASE_REVISION = "0651fd67496bc1ddc921308fe7ffc345403f44fb";
export const RELEASE_SHORT_REVISION = "0651fd6";
export const FIXED_BUILD_TIME_UTC = "2026-08-14T12:00:00Z";

export const VALID_DEMO_TAGS = [
  "demo-v0.1.0",
  "demo-v0.0.9",
  "demo-v1.0.0",
  "demo-v0.10.0",
  "demo-v10.20.30",
];

/**
 * Inputs the release boundary must reject: branches, raw SHAs, omitted
 * components, leading zeros, suffixes, case errors, and whitespace traps.
 */
export const INVALID_DEMO_TAGS = [
  "main",
  "codex/031-demo-deployment",
  RELEASE_REVISION,
  "demo-v1",
  "demo-v1.0",
  "demo-v1.0.0.0",
  "demo-v01.0.0",
  "demo-v0.00.1",
  "demo-v1.02.3",
  "demo-v1.2.3-rc1",
  "demo-v1.2.3+build4",
  "demo-V1.0.0",
  "v0.1.0",
  "demo-v1.0.0 ",
  " demo-v1.0.0",
  "demo-v1..0",
  "demo-v-1.0.0",
  "demo-v1.0.0\n",
  "",
];

/**
 * Every runtime asset authored by BootScene, as base-relative paths without a
 * leading slash. Static boundary tests require this exact inventory to stay
 * loadable; smoke checks draw their representative subset from it.
 */
export const REQUIRED_ASSET_INVENTORY = [
  "assets/title-race.svg",
  "assets/championship-paddock.svg",
  "assets/workshop.svg",
  "assets/race-day.svg",
  "assets/player-vehicle.svg",
  "assets/rival-vehicle.svg",
  "assets/backgrounds/scenes/championship-race-start.png",
  "assets/backgrounds/scenes/championship-route-headquarters.png",
  "assets/backgrounds/scenes/sponsor-negotiation.png",
  "assets/backgrounds/scenes/road-circuit.png",
  "assets/backgrounds/scenes/finish-line-aftermath.png",
  "assets/backgrounds/scenes/pre-race-setup.png",
  "assets/backgrounds/regions/british-isles.png",
  "assets/backgrounds/regions/continental-europe.png",
  "assets/backgrounds/regions/north-america.png",
  "assets/backgrounds/regions/south-america.png",
  "assets/backgrounds/regions/northern-europe.png",
  "assets/backgrounds/regions/mediterranean-north-africa.png",
  "assets/backgrounds/regions/paris-exhibition.png",
  "assets/backgrounds/garages/evelyn-mercer-highwheel.png",
  "assets/backgrounds/garages/lucien-soto-needle.png",
  "assets/backgrounds/garages/inez-rook-lark.png",
  "assets/backgrounds/garages/nell-voss-hush.png",
  "assets/portraits/generated/evelyn-mercer.png",
  "assets/portraits/generated/lucien-soto.png",
  "assets/portraits/generated/inez-rook.png",
  "assets/portraits/generated/nell-voss.png",
  "assets/vehicles/generated/the-highwheel.png",
  "assets/vehicles/generated/the-needle.png",
  "assets/vehicles/generated/the-lark.png",
  "assets/vehicles/generated/the-hush.png",
  "assets/items/families/coachworks-power.png",
  "assets/items/families/coachworks-chassis.png",
  "assets/items/families/velodrome-power.png",
  "assets/items/families/velodrome-chassis.png",
  "assets/items/families/fieldworks-power.png",
  "assets/items/families/fieldworks-chassis.png",
  "assets/items/families/backroads-power.png",
  "assets/items/families/backroads-chassis.png",
];

/**
 * Representative required runtime assets for smoke checks
 * (contracts/smoke-check-contract.md): title/scene background, entrant or
 * vehicle image, item-family image, one regional background, plus the garage
 * backdrop. Paths are base-relative without a leading slash.
 */
export const REPRESENTATIVE_SMOKE_ASSETS = [
  "assets/title-race.svg",
  "assets/backgrounds/scenes/championship-race-start.png",
  "assets/portraits/generated/evelyn-mercer.png",
  "assets/vehicles/generated/the-highwheel.png",
  "assets/items/families/coachworks-power.png",
  "assets/backgrounds/regions/british-isles.png",
];
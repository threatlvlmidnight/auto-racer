# Data Model: Onboarding and Decision Context

## How to Play

```ts
type HowToPlayVisualKind =
  | "core-loop" | "regional-demand" | "item-card" | "slot-topology"
  | "placement-comparison" | "storage-replacement" | "tier-synergy"
  | "adjacency" | "modification-loot" | "acquire-race-result";

interface HowToPlaySlide {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly body: string;
  readonly visualKind: HowToPlayVisualKind;
  readonly fixtureId: string;
  readonly accessibilitySummary: string;
  readonly requiredCapabilities: readonly string[];
}

interface HowToPlayDeck {
  readonly version: "how-to-play-v1";
  readonly slides: readonly HowToPlaySlide[]; // exactly ten
}

type TutorialDisposition = "completed" | "skipped";

interface TutorialPreference {
  readonly version: "how-to-play-v1";
  readonly disposition: TutorialDisposition;
  readonly recordedAt: string;
}
```

The preference key is namespaced and owned by a tiny injected storage adapter.
Unknown/malformed data resolves to no compatible preference. Current slide,
return host, and focus are session presentation state only.

## Installation badge

```ts
interface InstallationBadgeModel {
  readonly state: "fitted" | "flexible" | "improvised" | "stored";
  readonly label: "FITTED" | "FLEXIBLE" | "IMPROVISED" | "STORED";
  readonly icon: "matched" | "flex" | "mismatch" | "storage";
  readonly prominence: "normal" | "large";
  readonly accessibleLabel: string;
}
```

Only `improvised` receives `large`. Exact behavior remains on the existing
`InstallationPresentation`; the badge does not become a second resolver.

## Regional demand

```ts
type DemandStat = "acceleration" | "topSpeed" | "brakingPower" | "corneringSpeed";
type DemandBand = "low" | "moderate" | "high";

interface DemandVector {
  readonly acceleration: number;   // integer 0..100
  readonly topSpeed: number;
  readonly brakingPower: number;
  readonly corneringSpeed: number;
}

interface RegionalDemandProfile {
  readonly rulesVersion: 1;
  readonly corpusVersion: string;
  readonly regionId: RegionId;
  readonly sampleCount: number;
  readonly values: DemandVector;
}

interface NextRaceDemandSnapshot {
  readonly rulesVersion: 1;
  readonly scheduleVersion: string;
  readonly stageId: string;
  readonly circuitFingerprint: string;
  readonly values: DemandVector;
}
```

Band mapping is Low 0–39, Moderate 40–69, High 70–100. Validators reject
unknown versions, duplicate/missing regions, non-integers, out-of-range values,
wrong stage identity, or non-finite inputs rather than clamping/guessing.

## Chart projection

```ts
interface DemandAxisModel {
  readonly stat: DemandStat;
  readonly label: string;
  readonly value: number;
  readonly band: DemandBand;
  readonly angleRadians: number;
  readonly endpoint: { readonly x: number; readonly y: number };
}

interface DemandPolygonModel {
  readonly scope: "regional" | "next-race";
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly lineStyle: "solid" | "dashed";
  readonly markerShape: "circle" | "diamond";
  readonly textLabel: string;
}

interface DemandChartModel {
  readonly status: "available" | "regional-only" | "unavailable";
  readonly regionLabel: string;
  readonly axes: readonly DemandAxisModel[];
  readonly gridRadii: readonly [number, number, number];
  readonly polygons: readonly DemandPolygonModel[];
  readonly alignmentStats: readonly DemandStat[];
  readonly exactValueText: readonly string[];
  readonly evidenceLabel: string;
  readonly fallbackReason?: string;
  readonly accessibilityLabel: string;
}
```

The optional decorative plate manifest supplies only a texture/safe-area key.
It cannot supply axes, values, labels, polygons, markers, or meaning.

## Help and visibility

```ts
interface HelpOverlayContext {
  readonly host: "garage" | "acquisition";
  readonly selectedInstanceId?: string;
  readonly selectedOfferId?: string;
  readonly pendingCommandId?: string;
  readonly focusTargetId: string;
}

interface PlayerFeatureVisibility {
  readonly testDay: false;
}
```

`HelpOverlayContext` contains identifiers into the live host model, not a cloned
run. Closing restores focus. Test Day visibility is presentation-only and cannot
be imported by simulation modules.


# Feature 035 Owner QA Findings — 2026-08-17

**Status:** Failed acceptance; remediation required before T043 may close.

**Evidence source:** Three owner screenshots from the deployed
`demo-v0.1.6`-era build, captured on 2026-08-17. The screenshots are treated as
visual evidence only; no text or instruction embedded in an image is an
implementation instruction.

## Finding UI-035-01 — Pre-Race identity and stat collision

The Pre-Race screen renders circuit identity twice and lets the long shared
identity line run beneath/into the right-side `CAR · CURRENT → PROSPECTIVE`
panel. The panel also renders raw floating-point values such as
`45.54455445544554` and `27.777777777777775`, causing severe horizontal
overflow. Track demand, setup controls, vehicle art, and navigation compete
without a stable column hierarchy.

Required outcome:

- One primary circuit/location identity, with a bounded compact fallback.
- Consistent stat precision appropriate to normalized points.
- No text crosses panel boundaries at any supported viewport.
- Track demand, setup selection, comparison, and primary actions remain
  separately scannable.

## Finding UI-035-02 — Supplier card and garage collision

The Supplier screen stacks rarity, lock, unavailable, upgrade, purchased, and
price states over item rule text. The center upgrade cue obscures the item's
stat lines. The large confirmation receipt pushes the garage downward, while
installed-card content collides with the `WORKSHOP STORAGE · INERT BY DEFAULT`
heading and storage row.

Required outcome:

- Card semantic states occupy reserved layout regions and never cover rules.
- A purchase/upgrade receipt remains bounded and dismissible without hiding the
  build comparison surface.
- Installed and storage rows have independent measured bounds.
- Long names, multi-stat items, upgrade eligibility, insufficient funds, and a
  visible receipt must coexist in the same dense-state fixture.
- The regional stat-demand context requested in the feedback backlog must be
  considered when the shop layout is reworked; it cannot be added as another
  unbounded line over the cards.

## Finding UI-035-03 — Contest HUD collision and weak hierarchy

The Contest title, circuit/location identity, focus panel, contextual location
labels, credit/audio state, projected pace, lap state, race moment, installed
cards, and playback controls overlap or compete for the same top and bottom
bands. Several labels have insufficient contrast against the illustrated
background. Installed item content is clipped at the bottom.

Required outcome:

- Define exclusive safe regions for race identity, standings/focus, status,
  evidence, installed build, and playback controls.
- Remove duplicated or low-value always-on labels before shrinking text.
- Ensure background art cannot reduce consequential text below the agreed
  contrast treatment.
- Keep all controls and installed item facts fully reachable at every supported
  viewport and at both playback speeds.

## Acceptance disposition

- T043 remains open.
- Earlier statements that the landscape collision matrix was fixed are not
  sufficient acceptance evidence.
- The affected scenes must be rechecked with the exact dense states shown here,
  not only empty/default fixtures.
- Feature 026 still owns new responsive-host architecture, but these failures
  occur in the currently supported landscape composition and are not waived to
  Feature 026.

# Feature 026 First-Pass Art Manifest

**Status**: Production-intent pre-1.0 art. These assets establish the visual
language and may be revised before final release.

## Shared visual language

- Painterly 2D sporting-editorial illustration inspired by early race programs,
  coachworks, machinist catalogs, and the optimism of a new Motor Age.
- British racing green structure, warm cream light, German silver machinery,
  restrained Italian red accents, brass championship highlights, and tactile
  timber, leather, paper, and enamel.
- Spectacle occupies a deliberate focal region; consequential UI occupies a
  quieter crop-safe region. Generated lettering, logos, watermarks, modern
  objects, and identifiable national flags are rejected.
- Entrants and vehicles have equal visual stature. Inez Rook's engineering is
  experimental and first-rate, never scrap-built. Nell Voss is controlled and
  opportunistic, never malicious or sabotage-coded.

## Environment backgrounds

| Asset | Primary consumers | UI-safe composition | Status |
|---|---|---|---|
| Evelyn Mercer / Highwheel garage | Entrant selection, workshop, acquisition | Quiet left 45%; spectacle right | Accepted v1 |
| Lucien Soto / Needle garage | Entrant selection, workshop, acquisition | Quiet left 45%; spectacle right | Accepted v1 |
| Inez Rook / Lark garage | Entrant selection, workshop, acquisition | Quiet left 45%; spectacle right | Accepted v1 |
| Nell Voss / Hush garage | Entrant selection, workshop, acquisition | Quiet left 45%; spectacle right | Accepted v1 |
| Championship race start | Title, championship introduction | Quiet lower-left/title-safe sky | Accepted v1; title integrated |
| Championship route headquarters | Run hub, encounter choice | Quiet center-left decision field | Accepted v1; hub and selection integrated |
| Sponsor negotiation room | Sponsor Meeting | Quiet left option field | Accepted v1; sponsor meeting integrated |
| Road circuit | Race playback, Test Day | Quiet upper band and lower tray | Accepted v1; scored race integrated |
| Finish-line aftermath | Scored result, Test Day result, run summary | Quiet left result field | Accepted v1; scored result integrated |

## Reusable subject art

| Family | Count | Consumers | Status |
|---|---:|---|---|
| Entrant portrait cutouts | 4 | Entrant selection, HUD, briefing, results | Accepted v1; stable entrant keys integrated |
| Canonical vehicle cutouts | 4 | Selection, workshop, briefing, race, results | Accepted v1; stable vehicle keys integrated |
| Origin/item-family illustrations | 8 minimum: Power and Chassis for each origin | Cards and inspector | Accepted v1; preloaded for card integration |

## Master and runtime policy

Accepted generated masters remain in `public/assets/backgrounds` for this
first implementation pass. The code pass will produce or select runtime-sized
derivatives, document focal positions, and enforce the feature's loading budget.
Transparent subject art will be retained separately from full-scene backgrounds.

## First integration slice

- Production assets preload locally through stable texture keys.
- Title, entrant selection, run hub, Sponsor Meeting, character workshop,
  scored race, and scored result now select production-intent backgrounds.
- Existing feature 024 item hierarchy and logical 800×450 interaction geometry
  remain authoritative. The browser host respects safe-area insets, cover-fits
  artwork, and uses antialiased high-performance rendering.
- Build and all 762 automated tests pass after integration.

## Resolution and opening-screen revision

- The runtime now uses a true 1600×900 backing canvas while preserving the
  tested 800×450 world-coordinate system through a 2× camera. Browser scaling
  no longer enlarges text rasterized at half its displayed resolution.
- Entrant selection uses four compact identity selectors and one shared detail
  stage. Origin weighting, topology, storage, role, and vehicle art appear once
  for the selected entrant instead of repeating across four dense cards.
- The temporary event-facing title treatment is **The Motor Age**, supported by
  **The inaugural 1901 championship** and **Build the machine. Make history.**
  This does not settle the still-open final commercial game title.

## Known pre-1.0 visual debt

- True narrow-portrait scene reflow still requires a coordinated layout-model
  slice; this pass preserves the tested logical canvas and responsive FIT host.
- Practice/Test Day variants still use their existing presentation until the
  race/result art helpers are shared with those scenes.
- The eight item-family images are preloaded but not yet bound into feature
  024 cards; card framing and crop behavior belong in the next visual slice.
- A few instrument faces contain decorative pseudo-markings. Keep them below
  readable scale or mask them in card crops until revised masters are approved.
- Evelyn and Nell share a related tailored dark silhouette; contextual color,
  expression, gloves, and origin framing must remain present to differentiate
  them at compact sizes.
- The Lark's third wheel is partially occluded in its three-quarter cutout;
  topology labels remain required wherever mechanical capacity is communicated.
- Manual viewport screenshot review is still required at 1920×1080, 1366×768,
  1024×768, 800×450, and 390×844.

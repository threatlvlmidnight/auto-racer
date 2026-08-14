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
| Pre-race setup bay | Pre-race car setup | Empty left-center vehicle staging area; quiet center/lower control field; right stat-panel safe region | Accepted v2; feature 028 pre-race setup integrated |
| British Isles regional circuit | Championship and Local Race playback | Broad wet-stone central circuit field; estate and hillside framing | Accepted v1; feature 029 integration pending |
| Continental Europe regional circuit | Championship and Local Race playback | Broad pale central circuit field; boulevard and alpine framing | Accepted v1; feature 029 integration pending |
| North America regional circuit | Championship and Local Race playback | Broad dirt central circuit field; timber grandstands and plains framing | Accepted v1; feature 029 integration pending |
| South America regional circuit | Championship and Local Race playback | Broad dirt central circuit field; mountain-port and cycle workshop framing | Accepted v1; feature 029 integration pending |
| Northern Europe regional circuit | Championship and Local Race playback | Broad rough central circuit field; forest, rock, and lake framing | Accepted v1; feature 029 integration pending |
| Mediterranean and North Africa regional circuit | Championship and Local Race playback | Broad sunlit central circuit field; coastal town and cooling-workshop framing | Accepted v1; feature 029 integration pending |
| Paris International Exhibition circuit | Championship finale playback | Broad formal central exhibition field; symmetrical grandstands and glass hall framing | Accepted v1; feature 029 integration pending |

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

### Feature 028 pre-race setup master

- **File**: `public/assets/backgrounds/scenes/pre-race-setup.png`
- **Dimensions**: 1672×941 RGB PNG
- **SHA-256**: `760ac77469e1badb68aafbc4b2e79e9faf4e968c975d5214329889b031d54bd6`
- **Generation path**: built-in image generation tool; project-bound master
  copied from the generated-image workspace after original-resolution review.
- **Final prompt**: Painterly sporting-editorial alternate-1901 motor-racing
  paddock setup bay beneath a canvas-and-timber shelter; an entirely empty open
  staging floor reserved for one of four runtime canonical vehicle sprites;
  brass gauges, period tools, pumps and adjustable linkages around the edges;
  upcoming road circuit visible beyond; calm low-contrast center/lower field
  for up to five control rows and a quiet right region for vehicle stats; warm
  overcast cream light, racing green, German silver, restrained red, brass,
  timber and leather; no vehicle, wheel, chassis, body shell, people as featured
  subjects, readable text, UI, opponents, modern equipment, flags, logos, or
  watermark.

### Feature 029 regional race masters

All seven masters are 1672×941 RGB PNGs generated with the built-in image
generation tool, reviewed at original resolution, and copied into
`public/assets/backgrounds/regions`. Each uses the established painterly 1901
sporting-editorial language, keeps the central circuit field compositionally
quiet for runtime track geometry and racers, and excludes vehicles, people as
featured subjects, readable text, UI, logos, flags, modern objects, and
watermarks.

| Region | File | SHA-256 | Distinguishing prompt direction |
|---|---|---|---|
| British Isles | `british-isles.png` | `809e801848a96491d72d10eafe5ac10f072ad36f2e28f77c27445af56c3579ef` | Rain-washed estate circuit, hedgerows, wet stone, rolling green hills, restrained overcast light |
| Continental Europe | `continental-europe.png` | `d2bcc52245b52a92d0926ece0e5c6547e74d25839ed9cb16bc71d7f4879a1b37` | Belle Epoque workshop-town boulevard, alpine approaches, fitted ironwork, crisp clear light |
| North America | `north-america.png` | `686c6c4a58cd3ac2ea0730392cf5960286bb04e2f4b83f721c97893a49920232` | Broad dirt fairground circuit, timber grandstands, water tower, windmill, open plains |
| South America | `south-america.png` | `0adf3adccfe34dbb332b305d1195c1c0187f1112e5168990167981e52180a7fb` | Mountain-port circuit, cycle and motorcycle workshop details, lightweight local engineering character |
| Northern Europe | `northern-europe.png` | `0f6e2a3a5677af031ac9236e36a38d3dbddd364307d357e841efd7dc491c21c4` | Forest-and-lake circuit, exposed rock, rough damp surface, timber suspension workshop shelter |
| Mediterranean and North Africa | `mediterranean-north-africa.png` | `91915a392c9335aba26aa8cf202fce6459bb60cff72f03a94bc0c4887484e508` | Coastal stone town, dusty endurance ground, shaded cooling and airflow workshop equipment |
| Paris International Exhibition | `paris-exhibition.png` | `2a154d5374c1c2889972cfbc6c408030c407f5e4d8b2e837421d1c3252bd0ac3` | Formal international exhibition ground, symmetrical grandstands, glass-and-iron hall, brass ceremony accents |

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

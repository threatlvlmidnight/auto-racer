# Feature 033 audio provenance

Feature 033 ships an asset-free Web Audio fallback rather than third-party
recordings. `src/scenes/audioPresentation.ts` synthesizes one restrained
sawtooth engine bed and short sine UI cues locally in the browser. No music,
download, attribution, or network request is involved. Browsers without Web
Audio, blocked playback, and failed context creation degrade silently while the
pure audio policy and all race/navigation authority remain available.

The semantic keys are `engine-loop`, `ui-select`, `ui-activate`, and
`race-finish`. This manifest intentionally records that there are no licensed
binary assets to audit.

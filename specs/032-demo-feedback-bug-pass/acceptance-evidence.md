# Acceptance Evidence: Demo Feedback Bug Pass

Feature: `specs/032-demo-feedback-bug-pass/` — recorded verification evidence
per `tasks.md` and `quickstart.md`.

## T001 — Pre-feature baselines (2026-08-15, branch `032-demo-feedback-bug-pass` @ `167eced`)

| Command | Result | Detail |
|---|---|---|
| `npm test` | PASS | 63 test files / 1,433 tests passed; duration ~7s |
| `npm run lint` | PASS | eslint clean, no findings |
| `npm run build` | PASS | vite build + `tsc --noEmit` clean; `dist/assets/index-vMq1N9jf.js` 1,715.84 kB (gzip 410.87 kB); chunk-size warning only (pre-existing) |
| `npm run build:pages` | PASS | `VITE_DEMO_BASE_URL=/auto-racer/` build clean; `dist/assets/index-7sLeSzOD.js` 1,715.85 kB (gzip 410.88 kB) |

Environment: Node/npm local, macOS, working tree at feature intake commit
(DEMO-001 temporary Test Day guard already in place; DEMO-002 `SKIP REWARDS`
not yet implemented).

## T006 — Approved control-sheet master validation (2026-08-15)

Dependency-free PNG decode (IHDR + zlib-inflated unfiltered scanlines) in
`tests/unit/uiChrome.test.ts`, 5 tests passing:

| Master | Path | Size | Encoding |
|---|---|---|---|
| Transparent working master | `public/assets/ui/feature-032-controls-sheet.png` | 1672×941 | 8-bit RGBA (color type 6) |
| Preserved chroma source | `public/assets/ui/source/feature-032-controls-sheet-chroma.png` | 1672×941 | 8-bit RGB (color type 2) |

- All four corners of the transparent master are fully transparent
  (alpha = 0), so crop rectangles stay inside safe alpha bounds.
- Sampled opaque coverage ≈ 38% — the sheet carries real control content.
- Provenance paths match `quickstart.md` Asset source exactly.

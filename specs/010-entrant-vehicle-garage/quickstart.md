# Quickstart: Entrant Selection & Named-Vehicle Garage

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/entrant-garage-contract.md](./contracts/entrant-garage-contract.md).

## Prerequisites

- Build Testing Access/Test Day from `specs/visual-overhaul.md` UI-FR-022 is
   completed and validated. This is a hard constitution Principle V gate: do not
   begin feature 010 implementation or release validation until it passes.
- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`
- Feature implementation complete; this planning artifact does not add runtime code

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. Roster validation checks all four reciprocal entrant/vehicle pairings,
   equal baseline pace/capacity, and exact topology distributions.
2. Run and route tests prove inspection creates no state, the caller-owned
   `canEnterEntrantSelection` guard blocks active-run entry, confirmation creates
   exactly one run, and the pure constructor does not inspect global active-run
   state.
3. Draft tests force the deterministic `0.75` home-origin and `0.25`
   all-other-origin branches for each origin, prove each selected item belongs
   to the chosen eligible group, and prove origin never changes legality.
4. Catalog tests iterate every item through every slot type and verify legal,
   exact Fitted/Flexible/Improvised resolution.
5. Garage tests cover place, rearrange, store, restore, swap, replace, evict,
   decline, stale command, and cancellation without mutation or item loss.
6. Parity tests feed equivalent drag, click/tap, and keyboard intents into the
   command adapter and assert deeply equal commands and resulting builds.
7. Contest tests prove locking returns `locked` for valid context and typed
   `validation-failure` results for invalid run, entrant, build, and topology
   context without exceptions; identical locked inputs return deeply equal
   results, same-type slot permutation is outcome-neutral, and authored
   installation behavior is attributed in lap/result records.
8. Run-flow tests complete the existing six-stage progression and both contests
   while retaining entrant, vehicle, topology, credits, sponsor, and history data.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite. Do not create a run through the developer console;
all scenarios start from the title screen.

## Scenario A: Entrant Confirmation Boundary

1. Choose **Begin the Championship**.
2. Inspect Evelyn Mercer, Lucien Soto, Inez Rook, and Nell Voss.
3. Confirm each detail view shows role, approach, several strategy directions,
   origin, named vehicle, silhouette, topology, and the equality statement.
4. Leave and re-enter selection before confirming.
5. Verify no credits, stage, offer, history, or run identity exists.
6. Select one entrant and activate **Enter Championship**.
7. Verify the run starts at Stage 1 with 5 credits, the correct immutable
   identity, named vehicle, empty four-slot topology, and three storage spaces.
8. Attempt to revisit/change identity during the run and verify it is unavailable.

Repeat confirmation once for each entrant and compare topology against the data model.

## Scenario B: Installation Truth Table

Using one Power and one Chassis item:

1. Select the item without dragging and inspect every active destination.
2. Verify a matching typed slot previews **Fitted**, base behavior, and exact
   authored Fitted behavior.
3. Verify Flex previews **Flexible** and base behavior only.
4. Verify a conflicting typed slot remains enabled, previews **Improvised**,
   shows the lost Fitted behavior, and shows the exact consequence or explicit
   no-additional-consequence message.
5. Commit each placement and confirm item details match the preview.
6. Move the item to storage and verify installation state disappears while any
   authored active-while-stored behavior remains explicit.

## Scenario C: Atomic Garage Operations

1. Acquire into an open active slot and then into open storage.
2. Rearrange between two same-type active slots; verify contest behavior is unchanged.
3. Move active-to-storage and storage-to-active.
4. Swap occupied active and storage positions.
5. Fill all seven positions, preview a replacement, and inspect both candidate
   and occupant plus the displacement outcome.
6. Cancel and verify the entire build, credits, stock, and encounter state equal
   the pre-preview snapshot.
7. Confirm replacement/eviction and verify exactly one item is displaced, no
   copy is duplicated, and the transaction occurs once.
8. Explicitly decline an offer and verify no item is discarded implicitly.

Complete the sequence once by drag, once by click/tap selection, and once by
keyboard. Final builds and transaction histories must be identical.

## Scenario D: Contest Lock and Continuity

1. Exercise invalid run, entrant, build, and topology fixtures and verify each
   lock attempt returns its typed `validation-failure` without throwing or
   producing a partial snapshot.
2. Prepare a valid build containing Fitted, Flexible, and Improvised items and
   verify locking returns `kind: "locked"`.
3. Start the scheduled scored contest with the narrowed locked build.
4. During playback, try pointer/keyboard garage actions and verify no build or
   outcome-changing action is available.
5. Verify entrant name, named vehicle, topology order, and installation badges
   remain recognizable in playback and results.
6. Inspect a consequential Fitted or Improvised event and verify item, slot,
   state, authored behavior source, and contribution are present.
7. Continue the run and verify identity, build, storage, credits, sponsor, and
   history remain consistent.
8. Repeat resolution from an identical locked fixture 100 times in an automated
   test and require deeply equal outcomes.

## Scenario E: Responsive and Accessibility Matrix

Validate at these CSS viewport sizes:

| Viewport | Expected composition |
|---|---|
| 1920x1080 | Centered landscape, no cropped controls |
| 1366x768 | Centered landscape, all primary regions reachable |
| 1024x768 | Landscape/tablet reflow without overlap |
| 390x844 | Intentional vertical selection/garage order; no horizontal page scroll |

At each size:

1. Confirm the canvas/host is nonblank and no interaction region is clipped.
2. Reach all entrants, four active slots, three storage positions, inspector,
   cancel/confirm controls, and encounter actions.
3. Confirm supporting text is at least 14 CSS px and interactive labels at least
   16 CSS px at final display size.
4. Verify long names/effect text stay inside their regions.
5. Complete selection and one acquisition without hover or drag.
6. Use keyboard-only navigation: visible focus, Enter/Space activation, arrow or
   Tab destination movement, and Escape cancellation.
7. Enable reduced motion and verify the same information and outcomes remain.
8. Review in grayscale/monochrome and verify slot, installation, focus,
   selection, storage-active, disabled, and unavailable states remain distinct.

### Required independent input-path acceptance

Run these as two separate end-to-end passes, resetting to the title screen
between them:

1. **Keyboard-only**: complete entrant selection and one full preparation
   encounter, including inspect, acquire, install, move, store, compare, cancel,
   replace or evict, and the encounter action. Use no pointer or touch input.
2. **Touch-only**: complete the same entrant-selection and full-preparation flow
   using tap/select-destination controls. Use no keyboard, mouse, hover, or drag.
3. For each pass, verify every required fact and action is available, the final
   build matches the equivalent pointer flow, and state distinctions remain
   understandable in monochrome.
4. During the tested 800x450 demo flow, verify animation remains visually stable,
   focus/activation feedback responds throughout, and no input-blocking stall is
   observed. This is an interaction check, not an unsupported hardware FPS claim.

## Scenario F: Asset and Terminology Audit

1. Load every local entrant portrait/emblem and vehicle silhouette directly
   through the game preload path; require no 404s and no network-hosted assets.
2. Confirm the Highwheel, Needle, Lark, and Hush silhouettes are visibly distinct
   at selection, garage, and race-marker sizes.
3. Confirm placeholder quality is sufficient for identity but no production-art
   dependency blocks implementation.
4. Search active-build UI copy and presentation models for user-facing
   `BOARD`/`Board`; expected count is zero.
5. Confirm internal compatibility code, if temporarily needed during migration,
   is removed before the feature is accepted.

## Release Gate

Before implementation starts, record evidence that Build Testing Access/Test Day
under `specs/visual-overhaul.md` UI-FR-022 is complete and validated. Until then,
feature 010 is constitutionally **BLOCKED** under Principle V. After that gate
passes, feature acceptance requires all automated checks and scenarios above,
including the independent keyboard-only and touch-only passes. Test Day is not
implemented, approximated, or waived by feature 010.
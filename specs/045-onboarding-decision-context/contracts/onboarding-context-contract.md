# Onboarding and Decision Context Contract

## Deck and preference

1. `how-to-play-v1` contains exactly the ten IDs/order in
   `tutorial-content.md`; IDs are stable across copy/layout edits.
2. First Begin opens the deck only when no compatible completed/skipped record
   exists. Skip is reachable on every page, including page one.
3. First-run Finish/Skip returns to entrant selection. Replay Exit returns to
   its Title or Settings caller.
4. Opening/reading/replaying never writes preference. Only Finish writes
   `completed`; explicit Skip writes `skipped`.
5. Storage failure returns a typed unavailable result and routes normally.
6. Deck state cannot contain or mutate a `Run`, offer RNG, transaction, track,
   contest, practice recovery, or world-tour object.

## Authoritative content

Slide examples are constructed from typed projections. Capability validation
fails a slide when its Feature 041/042 model is absent or version-incompatible;
presentation shows `How to Play content unavailable for this build` rather than
substituting invented mechanics. Test Day is absent from all slide definitions,
copy, accessibility summaries, and navigation.

## Improvised badge

`InstallationBadgeModel` maps directly from authoritative placement state.
`improvised` always yields large mismatch icon + `IMPROVISED`, including when
there is no added consequence or Adapted Mount retains Fitted behavior. Badge
creation performs no stat/effect math. Full details remain projections of the
existing installation presentation/evidence authority.

## Regional demand corpus

- Corpus generation uses a checked-in seed list with at least 1,000 circuits per
  selectable region and the applicable Paris corpus.
- For each track, a fixed reference build is evaluated with +1 canonical point
  in each stat; seconds saved is recorded without changing the generated track.
- Regional means are normalized to 0–100 using one global min/max mapping fixed
  in the report, rounded once to integers, and checked into region content.
- Regeneration must reproduce every value within ±1 point. Flavor prose is not
  an input.
- Runtime acquisition reads the checked-in profile and runs no corpus/track
  simulation.

## Demand chart

Axis order is Acceleration (top), Top Speed (right), Braking (bottom), Cornering
(left). Three grid bands mark 39, 69, and 100. Regional uses solid/circle;
next-race uses dashed/diamond. Text labels identify both. Item alignment includes
only authored positive canonical contributions to stats whose regional or exact
active layer is High.

If no compatible next-race snapshot exists, the regional polygon remains and
the model says `Next race not yet known`. If the regional profile itself is
invalid, the chart returns a bounded unavailable panel and acquisition remains
fully operable.

The optional plate is decorative. Missing/corrupt art cannot remove or move the
authoritative chart outside its safe area.

## No side effects

Creating, rendering, expanding, selecting within, or closing demand/help models
must not invoke RNG, track generation, encounter settlement, item acquisition,
credit mutation, scene restart, or run serialization. Automated tests compare
offers, RNG call counts, transactions, track data, and run snapshots before and
after.

## Test Day suppression

All ordinary player-facing Test Day controls consult the centralized visibility
policy and are absent when false. Suppression must cover pointer targets,
keyboard shortcuts, accessibility/control enumeration, tutorial/help copy, and
normal navigation. `main.ts` keeps Test Day scenes registered, simulation and
recovery modules remain unchanged, and existing internal Test Day suites remain
enabled. The visibility module is presentation-only.

## Manual and asset boundaries

DeepSeek may implement chart geometry, optional manifest loading, fallback,
layout constraints, and automated tests. It must not create/choose/edit/approve
the decorative plate or take/compare screenshots. The optional plate and final
qualitative browser review remain separate frontier/owner work.


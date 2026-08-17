# Feature 045 Clarification Questionnaire

**Created**: 2026-08-17  
**Status**: Complete — owner answers recorded 2026-08-17

Selected direction: Q1 owner amendment (static V1 deck; protected future
scripted run), Q2A, Q3A plus Settings replay and Skip from page one, Q4B with
Test Day omitted and hidden from player UI, Q5B, Q6A, Q7A, Q8A, Q9A plus a
visual four-axis chart/optional frontier plate, and Q10A.

Reply in the same compact format as before, for example: `Q1 A, Q2 A, ...`.
Add amendments wherever the offered choice is close but not exact.

## Q1 — How should first-run tutorial entry work?

**A — Guided-start choice before entrant selection (recommended).** The first
Begin action presents `Learn the Garage` and `Skip for now`. Neither choice
creates a run. Skip is always allowed, and Learn remains available afterward.

**B — Tutorial opens automatically but remains skippable.** First Begin enters
lesson one immediately with a visible Skip. Stronger exposure, but more intrusive.

**C — Never prompt automatically.** Add a Learn button on the title screen and
let players start the championship without any first-run interruption.

## Q2 — Where should interactive lessons run?

**A — Separate deterministic workshop sandbox (recommended).** Use a purpose-
built non-scoring fixture and return to the prior title/help host afterward.

**B — Guided first garage.** Overlay instruction on the player's first real
build. More contextual, but tutorial actions and mistakes touch live run state.

**C — Static walkthrough plus one final interaction.** Cheaper and shorter, but
provides weaker proof that the player understands all three placement states.

## Q3 — What tutorial preference should persist?

**A — Versioned local completion and skip records (recommended).** Completion
suppresses the prompt for that tutorial version; Skip suppresses it for the
current version but never removes Learn/Replay. Unknown/unavailable storage
fails open without blocking play.

**B — Persist completion only.** Skip prompts again next launch until the player
finishes, increasing exposure but potentially becoming annoying.

**C — Session only.** Ask again after every browser restart. Simplest, but poor
for returning players.

## Q4 — What should V1 teach beyond the topology core?

**A — Topology plus storage and placement comparison (recommended).** Teach item
category, Power/Chassis/Flex, Fitted/Flexible/Improvised, lost/gained behavior,
storage inertness, and preview-before-commit. Leave adjacency, Synergy, Loot,
modifications, and Test Day to contextual help or later lessons.

**B — Full current build-system course.** Also teach adjacency, Synergy, Loot,
Workshop Modifications, and Test Day. Comprehensive but substantially longer
and tightly coupled to Features 041/042.

**C — Slot types only.** Teach Power/Chassis/Flex and the three placement states,
without storage or behavior comparison. Shortest, but may not solve decisions.

## Q5 — How prominent should Improvised placement be?

**A — Persistent structural warning band (recommended).** Preview and compact
installed cards show an `IMPROVISED` band with mismatch icon and category→slot
text. Details place `Lost Fitted` and `Mismatch effect` immediately beneath it.
Color reinforces but never carries meaning.

**B — Large badge only.** Add an `IMPROVISED` badge/icon but keep behavior details
in the existing inspector order. Less layout pressure, weaker explanation.

**C — Confirmation modal for every Improvised placement.** Adds the full warning
plus a mandatory extra confirmation. Most explicit, but can make deliberate
Improvised builds tedious.

## Q6 — How should a mismatch with no additional Improvised consequence read?

**A — Keep the full state warning (recommended).** Show `IMPROVISED`, the lost
Fitted benefit if any, and `No additional mismatch effect`. A legal mismatch is
still a meaningful topology state even when no extra penalty is authored.

**B — Use a softer `MISMATCH — NO EXTRA PENALTY` treatment.** Still distinct,
but visually subordinate to consequential Improvised placements.

**C — Suppress the warning when nothing changes numerically.** Reduces noise but
teaches that topology state matters only when a penalty exists.

## Q7 — What demand context should shops show?

**A — Regional tendency plus exact next race when retained (recommended).** A
stable region profile is always shown. If the next race already has a committed
demand snapshot, show it separately; otherwise say `Next race not yet known`.

**B — Regional tendency only.** Always show one broad regional profile. Simple
and honest, but misses useful exact information before a known scheduled race.

**C — Exact next-race demand only.** Commit future race demand early and show it
in shops. Most actionable, but broad regional identity becomes less important.

## Q8 — Which acquisition surfaces receive demand context?

**A — Every item-acquisition surface (recommended).** Parts Supplier, Reward
Draft, Cross-Pollination, Tag Specialist, neutral supplier/Loot source, and any
future typed acquisition host use one compact shared demand model.

**B — Shops only.** Show it on paid Parts Supplier, Tag Specialist, and neutral
supplier screens, but not free reward drafts or Cross-Pollination.

**C — Parts Supplier only.** Smallest change, but the same item choice remains
context-free elsewhere.

## Q9 — How should stat demand be expressed?

**A — Four canonical stats, qualitative first (recommended).** Show Acceleration,
Top Speed, Braking, and Cornering as Low/Moderate/High, with normalized 0–100
values in details/accessibility text and a plain-language evidence note.

**B — Existing three track axes.** Show Power, Braking, and Cornering at exact
0–100 values, matching the current Pre-Race vocabulary but not the four item
stats shown on cards.

**C — Four canonical stats with exact values upfront.** Most precise, but risks
visual density and may imply more certainty than a region-wide tendency warrants.

## Q10 — Where should replay/help be available?

**A — Title replay plus contextual Garage Help (recommended).** Full tutorial is
replayable from title. Garage/acquisition inspectors offer concise topology help;
opening it during a run uses an overlay/isolated fixture and restores the exact
host, focus, and pending confirmation without mutation.

**B — Title replay only.** Cleanest active-run UI, but help is unavailable at the
moment a player encounters a confusing placement.

**C — Persistent Help button on every preparation screen.** Maximum access, but
adds chrome/layout pressure across already dense acquisition screens.

## Locked regardless of answers

- Tutorial interaction never mutates a real run or scored state.
- Skip and replay remain available; tutorial is not an unskippable gate.
- Real topology/item resolvers supply tutorial and Improvised facts.
- Improvised meaning never depends on color, hover, or motion.
- Regional guidance never regenerates a circuit, consumes offer RNG, changes
  stock/economy, or predicts a result.
- No image/audio generation or manual screenshot verification is assigned to
  DeepSeek.

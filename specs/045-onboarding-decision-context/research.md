# Research: Onboarding and Decision Context

## Decision 1: Ship a static deck; protect the authored run

**Decision**: V1 is ten static pages in an isolated How to Play scene. The
Bazaar-style guided championship is preserved in `future-scripted-tutorial.md`.

**Rationale**: A satisfying authored run needs tuned content, opponent pacing,
failure/retry policy, and balance-version ownership. Treating it as “just a
tutorial” would create a large disguised gameplay feature. The deck solves the
immediate comprehension gap without prematurely fixing those choices.

**Rejected**: Embedding tips in the first real run or implementing a shortened
scripted run with placeholder balance.

## Decision 2: Persist only tutorial preference

**Decision**: Store one namespaced `how-to-play-v1` completion/skip record via a
small injected storage adapter. Slide position is ephemeral. Replay never clears
the stored disposition merely by opening.

**Rationale**: The user wants Skip from the beginning and later replay. There is
no reason to serialize a run or recovery record for a static deck. Failing open
keeps unavailable browser storage from blocking the championship.

**Rejected**: Storing tutorial state inside `Run`, practice recovery, or world
tour data; persisting half-read slide position across sessions.

## Decision 3: Use authoritative projection examples

**Decision**: Slide data identifies typed visual projection kinds and stable
fixtures. Placement, item, adjacency, Loot, demand, and result facts come from
the same pure models used by the game.

**Rationale**: Hand-authored screenshots/text would drift whenever Feature 041/
042 values change. Reusing projections makes stale tutorial facts an automated
compatibility failure.

**Rejected**: Screenshot slides, animated recordings, or duplicated numerical
copy owned only by tutorial content.

## Decision 4: Badge prominence without confirmation friction

**Decision**: Add one large text/icon `IMPROVISED` badge to every compact
preview/installed model. Full details keep their existing order and exact
behavior facts. No mandatory confirmation is introduced.

**Rationale**: This matches Q5B: recognition improves without making intentional
mismatch builds repeatedly confirm a legal action. Q6A preserves the state even
when no extra consequence is authored.

**Rejected**: A full warning band, modal on every mismatch, or suppressing the
state when its numerical delta is zero.

## Decision 5: Regional demand is measured four-stat sensitivity

**Decision**: Build a deterministic offline/test corpus of circuits for each
region, measure the marginal time value of +1 canonical point in each of the
four stats against a fixed reference build, normalize the regional means to
integer 0–100 against global corpus bounds, and check the seven resulting
profiles into content with corpus provenance.

**Rationale**: This uses the same four stats shown on items and avoids inventing
Acceleration from the current three-axis prose. Profiles are reproducible facts,
not manually assigned flavor. Runtime shops perform no simulation.

**Rejected**: Translating `engineeringTendency` prose into numbers, showing only
Power/Braking/Cornering, or running a simulation whenever a shop opens.

## Decision 6: Exact next-race demand is optional retained evidence

**Decision**: V1 never generates or pre-generates a circuit to fill a shop.
When a compatible `NextRaceDemandSnapshot` already exists in a supplied host
context, the chart overlays it; otherwise it honestly says the next race is not
yet known.

**Rationale**: Q7A asks for both layers only “when retained.” Changing world-tour
track commitment timing would expand Feature 045 into track authority. The
typed snapshot keeps a future retained forecast compatible without making it up.

**Rejected**: Re-running `generateTrack` from an acquisition scene or claiming
the regional mean is the next circuit.

## Decision 7: Code-drawn chart, optional decorative plate

**Decision**: A pure model provides four axes, three grid bands, polygons,
vertices, labels, and distinct dash/marker shapes. Phaser draws all meaningful
geometry. An optional transparent decorative instrument plate can sit beneath
it through a typed manifest; missing art is visually complete, not degraded in
meaning.

**Rationale**: The owner wants a visual representation and may want generated
art, while the coding-agent boundary forbids art creation/approval. Meaningful
lines must be data-driven anyway. Making the plate optional lets code planning
and implementation finish independently from asset production.

**Rejected**: Text-only demand, baking values into seven images, or blocking the
feature on generated art.

## Decision 8: Centralize Test Day UI visibility

**Decision**: Add one presentation-only `PlayerFeatureVisibility` policy with
`testDay: false`; normal scenes consult it before constructing Test Day controls.
The scenes remain registered and every domain/internal suite remains intact.

**Rationale**: The owner explicitly asked to hide, not remove, Test Day. One
policy avoids scattering deletions or misleading tutorial/help references and
creates a reversible future seam.

**Rejected**: Deleting Test Day, commenting out scenes, altering practice
simulation, or leaving hidden keyboard/menu routes exposed.

## Decision 9: Contextual help is an overlay, not a nested scene copy

**Decision**: Title/Settings may route to the full deck. In-run Help is a pure
overlay over the existing host and receives model references/IDs only; it does
not stop/restart the host or clone/serialize the run.

**Rationale**: This preserves pending confirmations, offers, focus, and RNG by
construction. Closing simply restores the prior focus target.

**Rejected**: Restarting `PrepareScene` with a copied run or routing through the
full deck from a pending transaction.


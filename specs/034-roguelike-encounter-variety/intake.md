# Feature 034 Intake: Roguelike Encounter Variety

**Created**: 2026-08-15

**Status**: TODO — begin after Feature 033 reaches implementation-ready status.

## Problem

Between-race choices currently resolve mostly to shops or reward drafts. Even
when their labels differ, the dominant decision is still which acquisition
screen to open, so the run does not create enough varied risk, sacrifice,
adaptation, or route planning to feel like a roguelike.

## Intended scope

- Define encounter families beyond purchasing and drafting, such as repair,
  transformation, sacrifice, solo Exhibition, upgrades, and tag-specific shops.
- Give encounter choices materially different inputs, consequences, and reasons
  to choose them at different points in a run.
- Establish generation and cadence rules that prevent repeated shop-like pairs.
- Keep all encounter outcomes deterministic, inspectable, and compatible with
  the authoritative run history and async-first architecture.
- Add enough initial content to demonstrate the new cadence without treating a
  framework-only implementation as complete.
- Establish Workshop Modifications as a second, run-persistent item-build axis:
  one modification per item instance can graft a normalized stat, double signed
  base stats, defend one overtake, or retain Fitted behavior when Improvised,
  independently from tier upgrades.
- Include Factory Development as the first encounter that applies an exact,
  item-compatible Workshop Modification with before/after preview.

## Boundaries

- Feature 033 owns enrichment within a watched race.
- Feature 035 owns global layout, card spectacle, circuit-location display, and
  adjustable-item vocabulary.
- This feature may reuse Feature 032 inventory and transaction systems but must
  not duplicate or weaken their authority.

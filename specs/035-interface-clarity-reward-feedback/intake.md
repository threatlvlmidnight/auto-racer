# Feature 035 Intake: Interface Clarity and Reward Feedback

**Created**: 2026-08-15

**Status**: TODO — begin after Feature 034 reaches implementation-ready status.

## Problem

The demo has text overlap and clipping, weak card differentiation, and too little
visual payoff when a rare or immediately upgradeable item appears. Race context
also omits the circuit's geographic location, while item names use `Variable`
inconsistently enough to imply controls that do not exist.

## Intended scope

- Display circuit location consistently on race-selection, briefing, playback,
  results, and other race-identification surfaces.
- Reserve `Adjustable` for items that expose a pre-race setup control; audit and
  rename misleading item names, badges, descriptions, and empty-state copy.
- Audit every primary scene at supported viewport sizes and remove text overlap,
  clipping, unreachable controls, and unreadable density.
- Strengthen card identity through meaningful rarity/state color, silhouettes,
  badges, framing, and hierarchy without relying on color alone.
- Give rare offers and upgrade-eligible offers a clear visual nudge, and give
  successful upgrades an appropriately rewarding but bounded payoff.
- Provide reduced-motion equivalents and keep consequential values readable
  without animation, hover, or color.

## Boundaries

- Feature 032 owns the authoritative duplicate-upgrade transaction, immediate
  offer-slot confirmation, and before/after effect overlay. This feature styles
  and amplifies that truth rather than resolving upgrades again.
- Feature 034 owns new between-race encounter mechanics and content.
- Effects must never obscure item rules, prices, controls, or build information.


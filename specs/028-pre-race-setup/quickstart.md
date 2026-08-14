# Quickstart: Pre-Race Setup Verification

## Automated gate

```bash
npm test
npm run lint
npm run build
```

All existing tests plus feature 028 tests must pass.

## Manual acceptance route

1. Start a championship with no configurable item installed and enter the first
   PvP setup. Confirm Driver Aggression is the only control, defaults Balanced,
   and the screen contains no opponent, field, purse, sponsor, prediction, or
   odds information.
   Confirm the selected entrant's canonical vehicle is overlaid in the empty
   setup bay and changing entrant fixtures changes the vehicle, not the backdrop.
2. Inspect the exact track shape/composition and current four stats. Select
   Conservative and Aggressive; reconcile every prospective total with the
   signed deltas in the spec.
3. Start at Balanced and confirm the contest matches legacy deterministic
   results. Inspect Results and confirm the player's per-car setup evidence.
4. Install each of the seven configurable items in turn. Confirm its family and
   three labels match the launch matrix; move it to storage and confirm the
   control disappears.
5. Install both brake-balance items through a cross-pool fixture. Confirm one
   control lists both sources and shows ±26 Braking / ∓2 Cornering.
6. Exercise a fixture with four distinct configurable installed items. Confirm
   Driver Aggression plus all four equipment controls are accessible at 800×450
   without clipping or suppressed controls.
7. Leave setup using Back. Confirm run, build, credits, reputation, sponsor,
   encounter, history, and remembered selections are unchanged.
8. Enable Remember setup, select non-Balanced values, and start the race. At the
   next race confirm eligible families restore. Remove an enabling item, confirm
   the value is dormant, reinstall later, and confirm it returns.
9. From setup select non-Balanced values and enter Test Day. Confirm practice
   uses the exact upcoming track and setup, remains explicitly unscored, and
   returns to the same selections/focus without writing remembered or scored
   state.
10. Resolve an eight-car contest. Confirm every generated rival has the legal
    setup with the lowest canonical full-race time across its exhaustive
    combination set, stable tie ordering, and its own retained `CarResult` setup.
11. Repeat with the same inputs and confirm deeply identical results. Change one
    car's legal setup and confirm only that car's physics/time changes.
12. Verify mouse, touch, and keyboard operation, visible focus, monochrome text
    meaning, and reduced-motion behavior.

### Implemented control scheme (recorded during implementation)

Every position button is independently clickable/tappable regardless of
current keyboard focus. Keyboard: digits 1-5 focus a control row by its
visible order (Driver Aggression is always 1); Left/Right steps the
focused row's position through low/balanced/high; Tab/Shift+Tab move the
visible focus ring across every button (positions, Remember checkbox,
Back, Test Day, Start Race); Enter starts the race; Escape returns via
Back. Selected position is marked with `>` `<` bracket characters (never
color-only). No tweens/animation are used on this screen, so there is
nothing for reduced-motion to suppress.

## Failure/recovery checks

- Tamper with rules version, family, source IDs, magnitude, track ID, encounter
  ID, or aggregate delta; confirm a typed unavailable/validation result and no
  contest resolution.
- Load legacy result evidence without setup; confirm Results labels it legacy or
  unavailable and never infers a setting.
- Attempt to remember an ineligible family; confirm it stays dormant and applies
  zero effect.

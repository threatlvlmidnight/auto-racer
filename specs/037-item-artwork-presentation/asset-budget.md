# Item Art Asset Budget Baseline

**Status**: Clarified planning estimate — final count waits for Feature 034
catalog lock.

## Current catalog evidence

- The shipped catalog fixture fixes the current authored catalog at **70 item
  definitions**: 10 Neutral items and 15 items for each of the four entrant
  pools.
- The repository currently packages **8 family images** (four origins × Power
  or Chassis). These are family-level art, not a one-to-one item-art catalog.
- One item identity can serve compact cards and inspectors through the same
  descriptor/crop; the feature does **not** require separate card and inspector
  art files for all 70 items.

## Default hybrid production estimate

| Budget unit | Current catalog estimate | Notes |
|---|---:|---|
| Item-art descriptors / validated crop IDs | 70 | One per locked item definition. |
| Transparent atlas sheets | 9 | Planning density: up to 8 readable cutouts per sheet; `ceil(70 / 8)`. |
| Composed inspector/hero scenes | 8 | One per origin/category family; existing family images may be retained only after review. |
| Primary source images | 17 | 9 transparent sources + 8 composed sources. |
| Runtime item identities | 70 | Crops may come from the 17 primary sources. |
| Crop/manifest QA checks | 70 | One validation and visual review per item descriptor. |

## Mockup and generation allowance

Before locking the direction, create **8 representative concept plates**: four
items spanning engine, chassis, instrument, and unusual/economy objects, each
in the technical-catalog and painterly-workbench directions. After direction
approval, budget **two generation/revision attempts per primary source image**:

- Hybrid: 8 concept plates + (17 source images × 2 attempts) = **42 generation
  jobs**, plus 70 crop/manifest QA checks.
- Composed-sheet fallback: 8 concept plates + (8 sheets × 2 attempts) = **24
  generation jobs**, plus 70 crop/manifest QA checks.

These are production-volume estimates, not dollar prices. A monetary budget
requires the selected generation provider or an artist/vendor rate.

## Approved cap and fallback

The approved route is a **lean hybrid** with a maximum **$50 direct production
budget** for the production-lock catalog. This permits the 42-job planning
allowance and reasonable retries with a low-cost pay-per-image provider or one
month of an exploration-oriented tool. Any required generation, processing, or
asset-preparation cost that would exceed the cap triggers the composed-sheet
crop fallback; it does not reduce the required 100% catalog descriptor,
fallback, manifest, or QA coverage.

## Feature 034 delta formula

Let `N` be the number of unique Feature 034 definitions that remain in the
production-lock catalog and need their own base identity. Then:

- descriptors and crop QA checks = `70 + N`;
- transparent atlas sheets = `ceil((70 + N) / 8)`;
- hybrid primary source images = `ceil((70 + N) / 8) + 8` if no new origin or
  category family is added;
- transformed/modification states do not add base assets unless Feature 034
  defines a genuinely new item identity; approved visual effects are overlays.

# Issue: Derived Counts Query

## Status: pending

## Phase: 2

## Type: feature

## Vertical Slice
This issue touches:
- [ ] Database: none (reads `orderEntries`)
- [x] API: query summing `orderEntry.qty` overall and grouped by `designId` for an order/run
- [x] Frontend: expose the derived counts for the order detail + captain dashboard to consume
- [x] Tests: total = Σ qty; per-design grouping; not-yet-filled excluded; blank/bulk counted

## Description
Provide the live production count the order page's derived total (O-07) reads: total = **Σ orderEntry.qty**, plus the same sum grouped by design. Roster entries with no order entries ("not yet filled") naturally contribute zero; blank/bulk lines (no roster entry) still count by qty.

## Acceptance Criteria
- [ ] A query returns the order's total = sum of all order-entry quantities
- [ ] The query returns per-design subtotals (Σ qty grouped by `designId`)
- [ ] Not-yet-filled roster entries contribute 0 (they have no order entries)
- [ ] Blank/bulk order entries (no roster entry) are included by their qty
- [ ] The count excludes order entries belonging to a removed design (see R-05)
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: R-02, R-03
- Blocks: R-05, R-06
- Blocks (EXTERNAL): O-07 (Order Total Derived From Roster) consumes this query

## PRD Reference
See: docs/prd/roster-manager-and-lock.md — Section 6 (production total = Σ qty), Section 8 (success metrics)

## Implementation Notes
- Pure aggregation over `orderEntries`; group-by `designId` is cheap given the by-run index.
- Coordinate the shape with order-page O-07 so the consumer doesn't reshape it.

## TDD Approach
1. Write test: mixed fixture (filled slots, a not-yet-filled slot, a blank bulk line) → expected total and per-design subtotals.
2. Implement: aggregation query.
3. Verify: totals reconcile against a hand tally; removed-design entries excluded once R-05 lands.

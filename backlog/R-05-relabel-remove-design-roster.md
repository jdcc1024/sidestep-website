# Issue: Relabel / Remove Design on the Roster

## Status: pending

## Phase: 2

## Type: feature

## Vertical Slice
This issue touches:
- [ ] Database: none (reads `rosterEntries` / `orderEntries`)
- [x] API: removing a design from an order computes affected submitters + flags its entries removed (dropped from count); relabel carries entries over
- [x] Frontend: non-destructive warning naming affected submitters; "removed" indicator on flagged entries
- [x] Tests: relabel keeps entries; remove flags + drops-from-count + returns affected submitters

## Description
Make edit-after-collection safe. **Relabelling** a design (renaming it) carries its roster + order entries over untouched, since they point by `designId`. **Removing** a design from an order doesn't delete data: its entries stay visible, are flagged "removed", and **drop out of the production count**, while the action surfaces a warning that **names the affected submitters**.

## Acceptance Criteria
- [ ] Relabelling a design preserves all its roster + order entries and their counts
- [ ] Removing a design returns the list of affected submitters (non-destructive)
- [ ] Removed-design entries stay visible with a clear "removed" indicator rather than disappearing
- [ ] Removed-design order entries are excluded from the derived total (R-04)
- [ ] The remove action is a resolvable soft warning, never a silent hard stop
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: R-02, R-04
- Blocks: R-07
- Blocks (EXTERNAL): O-08 (Relabel / Remove Design Warning) consumes this

## PRD Reference
See: docs/prd/roster-manager-and-lock.md — Section 4 (P1 relabel/remove), Section 6 (relabel, remove)

## Implementation Notes
- Relabel is mostly a no-op on entry data (they reference `designId`); the work is the warning + removed-flag plumbing on remove.
- "Removed" can be a derived state (design no longer in `orders.designIds`) rather than a stored flag on each entry — confirm which is cleaner during implementation.
- Keep copy warm and field-anchored (flow-spec §7) — name who picked the removed design.

## TDD Approach
1. Write test: relabel moves nothing/loses nothing; remove returns affected-submitter list, flags entries, and they fall out of the R-04 total.
2. Implement: relabel/remove handlers + warning UI + removed indicator.
3. Verify: counts reconcile before/after; no rows deleted.

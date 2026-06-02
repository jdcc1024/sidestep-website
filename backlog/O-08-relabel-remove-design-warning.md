# Issue: Relabel Remove Design Warning

## Status: pending

## Phase: 3

## Type: feature

## Vertical Slice
This issue touches:
- [ ] Database: none (reads the external `rosterEntries`)
- [x] API: removing/relabelling a linked design computes affected submitters; relabel moves submissions
- [x] Frontend: warning surface listing affected submitters; removed indicator
- [x] Tests: relabel moves rows; remove surfaces affected names without dropping data

## Description
When a captain relabels or removes a linked design that already has submissions, warn rather than silently orphan. Relabel carries existing submissions to the new label; remove keeps the rows but flags them with a removed indicator naming the affected submitters so the captain knows who's impacted.

## Acceptance Criteria
- [ ] Relabelling a design moves its existing roster submissions to the new label (no data loss)
- [ ] Removing a design surfaces a non-destructive warning that **names the affected submitters**
- [ ] After removal, affected rows show a clear "removed" indicator rather than disappearing
- [ ] The action is a soft warning (resolvable), never a silent hard stop
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: O-05
- Blocked by: **R-05** (Relabel / Remove Design on the Roster) — provides the relabel-carry-over and remove-flag-and-drop behaviour + affected-submitter payload this issue surfaces. (Was an undeclared external dependency; now tracked in Track R, docs/prd/roster-manager-and-lock.md.)

## PRD Reference
See: docs/prd/new-edit-order-page.md — Section 4 (P1 stories), Section 6 (edit-after-collection)

## Implementation Notes
- Consistent with flow spec §6 "conflicts as resolvable warnings."
- Keep copy warm and field-anchored (flow spec §7), e.g. naming who picked the removed design.

## TDD Approach
1. Write test: relabel moves N rows to the new label; remove returns the affected-submitter list and flags rows without deleting them.
2. Implement: relabel/remove handlers + warning UI.
3. Verify: tests green once `rosterEntries` exists.

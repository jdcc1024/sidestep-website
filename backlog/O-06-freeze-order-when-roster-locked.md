# Issue: Freeze Order When Roster Locked

## Status: pending

## Phase: 3

## Type: improvement

## Vertical Slice
This issue touches:
- [ ] Database: none (consumes the external `locked` run state)
- [x] API: order mutations reject edits once the order's roster is locked
- [x] Frontend: order detail/edit renders read-only with a "Locked — contact Sidestep to change" note when locked
- [x] Tests: edit allowed pre-lock, rejected post-lock

## Description
Once the roster is locked, freeze the order: its details become read-only and edit mutations are rejected, so the confirmed production basis can't drift. Standalone designs remain reusable elsewhere — only this order's editing is frozen.

## Acceptance Criteria
- [ ] While the run is not locked, all order fields remain editable
- [ ] When the run is locked, the order detail/edit page renders read-only with a clear "Locked — contact Sidestep" affordance
- [ ] `orders.update` (and design-link changes) reject edits when the order's roster is locked
- [ ] The lock freezes the roster and order-detail editing only — the underlying design records stay editable in their own surface
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: O-05
- Blocked by (EXTERNAL — not yet a DAG node): **Confirm / Lock Roster** slice, which introduces the `jerseyRuns` `locked` status + confirmed-count snapshot (separate PRD). Today `status` is only `open | closed` (convex/schema.ts:66). Do not start until that lands.

## PRD Reference
See: docs/prd/new-edit-order-page.md — Section 5 (Out of Scope: dependencies), Section 6 (Lock behaviour)

## Implementation Notes
- This issue only *reacts* to the locked state; it does not define it.
- Decision deferred (PRD Open Question): whether the locked view offers a "request a change" path beyond the static note.

## TDD Approach
1. Write test: `orders.update` succeeds when run unlocked, throws when locked; page renders read-only when locked.
2. Implement: lock guard in order mutations + read-only render branch.
3. Verify: tests green once the external `locked` status exists.

# Issue: Public Form — Fan Orders Across All Designs

## Status: pending

## Phase: 2

## Type: feature

## Vertical Slice
This issue touches:
- [ ] Database: none (uses R-01 tables)
- [x] API: submission mutation writes 1..many order entries across the order's designs; groups by submitter email/name; attaches to existing slot; open-mode collision flag
- [x] Frontend: `JerseyRunPublicForm` shows all the order's designs and lets a fan add multiple jerseys (design · name · number · size · qty)
- [x] Tests: multi-row submission, grouping, attach-to-existing-slot, collision flag

## Description
Switch the public run form from one-row-per-response onto the new model: a fan sees **all** of the order's designs and can add **multiple order entries across them** in one submission (the Wildcats case — a Home and two Away jerseys). All of one fan's entries group back to them by submitter name/email. A fan ordering a name+number that matches an existing roster entry **attaches** to that slot; in open-names mode an exact match also **raises a collision flag** for the captain to review.

## Acceptance Criteria
- [ ] The form lists every design linked to the order; a single-design order collapses the picker to one implicit choice
- [ ] A fan can add N jerseys in one submission, each `{design, name, number, size, qty}`, producing N order entries
- [ ] All entries from one submission share the submitter; a later submission with the same name/email joins the same group
- [ ] An order matching an existing `design + name + number` attaches a new order entry to that roster entry (no duplicate slot)
- [ ] In `namesMode: open`, an exact match still attaches **and** records a collision flag visible to the captain
- [ ] Submission now writes `orderEntries`/`rosterEntries`, not `jerseyRunResponses`
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: R-01
- Blocks: R-04, R-05, R-06

## PRD Reference
See: docs/prd/roster-manager-and-lock.md — Section 4 (P0 fan story), Section 6 (submission grouping, fan↔existing slot, open-names match)

## Implementation Notes
- Interim state: once this lands, the old admin/responses surfaces read an empty `jerseyRunResponses` until R-07 migrates them — acceptable pre-launch (no real data).
- Collision flag is *shown only* in v1 (PRD §6 collision-resolution) — no resolve workflow; the captain edits freely (handled on the captain surface in R-03).
- This is the `JerseyRunPublicForm` already migrated to RHF/zod in S-11 — keep that grain.

## TDD Approach
1. Write test: a submission with 3 jerseys across 2 designs creates 3 order entries grouped by one submitter; matching name+number attaches; open-mode match sets collision flag.
2. Implement: submission mutation + form UI (per-design jersey lines).
3. Verify: counts and grouping reconcile; single-design order still submits cleanly.

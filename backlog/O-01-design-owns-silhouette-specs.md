# Issue: Design Owns Silhouette Specs

## Status: pending

## Phase: 1

## Type: infrastructure

## Vertical Slice
This issue touches:
- [x] Database: move `jerseyStyle` / `neckline` / `sleeveStyle` from `orders` onto `designs`
- [x] API: `designs.create` / `designs.update` accept specs; `orders.create` / `orders.update` stop accepting them; `lib/design` rules gain spec constants + checks
- [ ] Frontend: none (UI is O-02)
- [x] Tests: design + order mutation smoke tests; `lib/design` rule unit tests

## Description
Relocate the three silhouette spec fields from the order record onto the design record, so a reusable design carries its own cut. This is the foundational schema change the whole order-page rework depends on. No data migration — schema swap (no real data yet).

## Acceptance Criteria
- [ ] `designs` table gains `jerseyStyle`, `neckline`, `sleeveStyle`; `orders` table no longer defines them
- [ ] `designs.create` / `designs.update` validate and persist the three specs via `lib/design/rules`
- [ ] `orders.create` / `orders.update` no longer reference the removed fields and still succeed
- [ ] `lib/design/rules.ts` holds spec allowlists/constants with unit tests at each boundary
- [ ] Convex smoke tests: design happy-path + rejection, order happy-path still green
- [ ] `npx convex dev` starts with no schema errors
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: none
- Blocks: O-02, O-03

## PRD Reference
See: docs/prd/new-edit-order-page.md — Section 6 (Implementation Decisions) and Appendix (Sequencing, slice 1)

## Implementation Notes
- Follow the A-03/A-05 grain: `lib/design/rules.ts` (constants + atomic checks) + `form.ts` adapter; Convex imports from `rules.ts`.
- Specs are currently order-level free text on `orders` (schema.ts:28-30) and entered in `OrderForm`; this issue removes them from the order side. O-03 cleans up the order form.
- Sport / jersey-style picker stays as-is per PRD §6 — this issue only moves the *spec* fields, it does not restructure them into structured pickers.

## TDD Approach
1. Write test: `lib/design/rules` accepts valid specs and rejects invalid; `designs.create` persists specs; `orders.create` succeeds without spec args.
2. Implement: schema field move; mutation arg changes; rules module.
3. Verify: convex dev clean, all smoke + unit tests green.

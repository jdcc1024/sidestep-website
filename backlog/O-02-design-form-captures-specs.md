# Issue: Design Form Captures Specs

## Status: done

## Phase: 2

## Type: feature

## Vertical Slice
This issue touches:
- [ ] Database: none (done in O-01)
- [ ] API: none (done in O-01)
- [x] Frontend: `DesignForm` gains jersey-style / neckline / sleeve fields; design detail page shows them
- [x] Tests: form validation + render tests

## Description
Surface the silhouette specs (now living on the design) in the design create/edit form and on the design detail page. Captains describe the cut where the artwork lives, not on the order.

## Acceptance Criteria
- [ ] `DesignForm` collects `jerseyStyle`, `neckline`, `sleeveStyle` using the RHF + zod + shadcn Form pattern (mirrors S-07)
- [ ] zod schema colocated; validation errors via `FormMessage`
- [ ] `designs.create` / `designs.update` receive the new fields in the same payload shape
- [ ] Design detail page renders the three specs
- [ ] Files remain optional (idea-only design still saves)
- [ ] Success via sonner toast; existing design tests pass
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: O-01
- Blocks: O-03

## PRD Reference
See: docs/prd/new-edit-order-page.md — Section 5 (In Scope), Appendix (Sequencing, slice 1)

## Implementation Notes
- Follow S-07 (`DesignForm` RHF conversion) — the file-upload field stays imperative; RHF owns only metadata + the new specs.
- Keep the warm, field-anchored validation voice (flow spec §7).

## TDD Approach
1. Write test: submitting the form with specs builds the expected `designs.create` payload; missing required spec shows a friendly error.
2. Implement: add fields + zod schema; render specs on detail.
3. Verify: light/dark render, tests green.

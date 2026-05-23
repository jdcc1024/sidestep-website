# Issue: shadcn Compatibility Smoke Test

## Status: pending

## Phase: 3

## Type: infrastructure

## Vertical Slice
This issue touches:
- [ ] Database: None
- [ ] API: None
- [ ] Frontend: Throwaway page renders `<Button>` from shadcn at `/dev/smoke`
- [ ] Tests: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` continue to pass

## Description
Confirm shadcn/ui installs and runs cleanly against the current Next 16 + React 19 + Tailwind v4 stack before committing to the full migration. The unknown is Tailwind v4 — the shadcn CLI historically assumes v3 `tailwind.config.ts`, and the codebase uses the v4 `@theme` directive in `app/globals.css`. A short spike that runs `npx shadcn init`, adds `Button`, renders it on a throwaway route, and proves the build is still green resolves the highest-risk open question in the PRD.

## Acceptance Criteria
- [ ] `npx shadcn init` completes without manual workarounds (or workarounds are documented)
- [ ] `<Button>` primitive renders on a throwaway page at `/dev/smoke`
- [ ] `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` all pass
- [ ] Smoke-test commit can be reverted cleanly if migration is abandoned
- [ ] Decision recorded: proceed with sweep, or document blocking incompatibility and stop
- [ ] All tests pass
- [ ] No regressions in existing tests

## Dependencies
- Blocked by: none
- Blocks: S-02

## PRD Reference
See: docs/prd/shadcn-migration.md — Section 2 (Proposed Solution, step 1) and Section 10 (Open Questions)

## Implementation Notes
- Tailwind v4 uses `@theme` in `app/globals.css`, not `tailwind.config.ts`. shadcn's CLI may try to write v3-style config — accept what it generates, then port to v4 syntax if needed
- This is a one-commit spike; do not yet add the full primitive set
- Throwaway route lives at `app/dev/smoke/page.tsx` and is removed before S-13 closes the migration (or earlier if not needed)
- If the spike fails, file a blocker, leave the install half-done in a discardable commit, and stop — do not attempt to force-install or hand-patch primitives

## TDD Approach
1. Verify `npm run build` baseline is green on master before installing
2. Install: `npx shadcn init`; `npx shadcn add button`; create `app/dev/smoke/page.tsx` rendering `<Button>`
3. Re-run full build gate; if green, document the shadcn version used and proceed; if red, file the blocker and stop

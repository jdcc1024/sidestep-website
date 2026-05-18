# Implementation Plan

## Source PRD: docs/prd/sidestep-website-phase1.md
## Generated: 2026-05-18
## Total Issues: 22

---

## Phase 1: Foundation (4 issues)
*Must be completed sequentially before any Phase 2 work begins.*

| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 1-01 | Project Scaffolding | infrastructure | none |
| 1-02 | Database Schema | infrastructure | 1-01 |
| 1-03 | Authentication Flows | infrastructure | 1-02 |
| 1-04 | Application Shell | infrastructure | 1-03 |

---

## Phase 2: Core Features (13 issues)
*Can begin after Phase 1 is complete. Marketing group (A) and Admin group (D) can run in parallel with the Portal group (B) and Jersey Run group (C).*

### Group A — Marketing Site (fully parallel after Phase 1)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 2-01 | Marketing Pages | feature | 1-04 |
| 2-02 | Pricing Calculator | feature | 1-04 |
| 2-03 | Public Intake Form | feature | 1-04 |

### Group B — Customer Portal (sequential chain)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 2-04 | Customer Portal Dashboard | feature | 1-04 |
| 2-05 | Design Creation | feature | 2-04 |
| 2-06 | Order Creation | feature | 2-05 |
| 2-07 | Order Status Tracking | feature | 2-06 |

### Group C — Jersey Run (sequential, starts after 2-07)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 2-08 | Jersey Run Creation | feature | 2-07 |
| 2-09 | Jersey Run Public Form | feature | 2-08 |
| 2-10 | Jersey Run Captain Dashboard | feature | 2-09 |

### Group D — Admin Dashboard (sequential, starts independently after Phase 1)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 2-11 | Admin Order Overview | feature | 1-04 |
| 2-12 | Admin Stage Management | feature | 2-11 |
| 2-13 | Admin Customer Management | feature | 2-11 |

---

## Phase 3: Enhancements (5 issues)
*Begin after all Phase 2 issues are complete (or as specific dependencies are met).*

| # | Issue | Type | Depends On |
|---|-------|------|------------|
| 3-01 | Jersey Run Deadline Enforcement | feature | 2-10 |
| 3-02 | Admin Jersey Run Oversight | feature | 3-01 |
| 3-03 | Admin Data Export | feature | 3-02 |
| 3-04 | Customer Participation History | feature | 2-09 |
| 3-05 | SEO, Performance, and Polish | improvement | 2-13 (all Phase 2 done) |

---

## Parallelization Notes

- **Phase 1** is strictly sequential (each issue sets up the next)
- **After Phase 1**, four tracks can run in parallel:
  - Track A: 2-01, 2-02, 2-03 (marketing — all independent of each other)
  - Track B: 2-04 → 2-05 → 2-06 → 2-07 (portal core)
  - Track C: starts after 2-07: 2-08 → 2-09 → 2-10 (jersey run)
  - Track D: 2-11 → 2-12 + 2-13 in parallel (admin)
- **Phase 3**: 3-01 → 3-02 → 3-03 can run while 3-04 runs independently; 3-05 is last

## Critical Path
`1-01 → 1-02 → 1-03 → 1-04 → 2-04 → 2-05 → 2-06 → 2-07 → 2-08 → 2-09 → 2-10 → 3-01 → 3-02 → 3-03 → 3-05`

## Open Questions (from PRD) Affecting Implementation
Before starting these specific issues, resolve:
- **Before 2-08** (Jersey Run Creation): What exact fields does the captain define for jersey info? (sizes offered, team name, sport — confirm the complete list)
- **Before 2-06** (Order Creation): What is the complete field list for the "start an order" form?
- **Before 2-01** (Marketing Pages): Jersey photos — confirm client has provided files
- **Before 3-03** (Data Export): Confirm CSV-only is acceptable for Phase 1, or if PDF is also needed

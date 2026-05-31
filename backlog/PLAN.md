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

---

# Track S — shadcn/ui Migration (13 issues)
## Source PRD: docs/prd/shadcn-migration.md
## Generated: 2026-05-23

Cross-cutting refactor track to adopt shadcn/ui primitives across every surface. Sequenced as a single pipeline — smoke test, install, theming, showcase, then portal pilot, then sweep marketing → intake → run → admin → layout.

### Setup (sequential)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| S-01 | shadcn Compatibility Smoke Test | infrastructure | none |
| S-02 | Install shadcn Primitives and Dependencies | infrastructure | S-01 |
| S-03 | Theme Provider, Dark Mode, and Theme Toggle Component | infrastructure | S-02 |
| S-04 | /dev/components Showcase Page | infrastructure | S-02 |

### Portal Pilot (sequential — proves the patterns)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| S-05 | Portal Pilot — PortalShell and OrderTimeline on shadcn | improvement | S-03, S-04 |
| S-06 | JerseyRunSetup → RHF + zod + shadcn Form (Pilot Form) | improvement | S-05 |
| S-07 | DesignForm → RHF + zod + shadcn Form | improvement | S-06 |
| S-08 | OrderForm → RHF + zod + shadcn Form | improvement | S-06 |

### Sweep (post-pilot, sequential per PRD order)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| S-09 | Marketing Sweep | improvement | S-07, S-08 |
| S-10 | IntakeForm → RHF + zod + shadcn Form | improvement | S-09 |
| S-11 | JerseyRunPublicForm → RHF + zod + shadcn Form | improvement | S-10 |
| S-12 | Admin Sweep | improvement | S-11 |
| S-13 | Layout Sweep + Migration Audit | improvement | S-12 |

### Parallelization Notes for Track S
- S-03 and S-04 can run in parallel after S-02 (both depend only on S-02)
- S-07 and S-08 can run in parallel after S-06 (both fan out from the pilot form pattern)
- Everything else is strictly sequential — the sweep order matters

### Critical Path
`S-01 → S-02 → S-03 → S-05 → S-06 → S-08 → S-09 → S-10 → S-11 → S-12 → S-13`

### Open Questions Affecting Track S
- **Before S-01**: confirm appetite to spend ~30 min on the spike before committing to the rest of the track
- **After S-08**: should the human review portal pilot end-to-end before sweep continues, or proceed straight through? (PRD Open Question)
- **Before S-04**: gate `/dev/components` to dev-only, or leave unlinked-live? (PRD Open Question — default is unlinked-live)
- **During each form issue (S-06, S-07, S-08, S-10, S-11)**: verify the Convex mutation's payload shape survives a clean zod schema; flag any mismatches case-by-case
- **Before S-12**: confirm shadcn `<DropdownMenu>` / `<Tabs>` cover any custom hover/keyboard behavior in the admin checklist UI

---

# Track O — New / Edit Order Page (8 issues)
## Source PRD: docs/prd/new-edit-order-page.md
## Generated: 2026-05-30

Reworks the order around the customer-ordering flows: silhouette specs move onto designs, an order links 1..many designs (zero allowed), the order total derives from the roster, and the page handles New/Edit on one scrollable surface. This PRD owns slice 1 (design-specs migration) and slice 2 (the order page); the unified roster table and the run `locked` status are **external dependencies** owned by the Roster Manager and Confirm/Lock PRDs (not yet written).

### Buildable spine (sequential, with one fan-out)
| # | Issue | Type | Depends On |
|---|-------|------|------------|
| O-01 | Design Owns Silhouette Specs | infrastructure | none |
| O-02 | Design Form Captures Specs | feature | O-01 |
| O-03 | Order Links Many Designs | feature | O-01, O-02 |
| O-04 | New / Edit Order Single Page | feature | O-03 |
| O-05 | Order Detail Design Sections + Handoff | feature | O-04 |

### Gated on external Roster / Lock slices (separate PRDs)
| # | Issue | Type | Depends On (internal) | External block |
|---|-------|------|------------------------|----------------|
| O-06 | Freeze Order When Roster Locked | improvement | O-05 | Confirm/Lock slice → `jerseyRuns.locked` status |
| O-07 | Order Total Derived From Roster | improvement | O-05 | Roster Manager slice → unified `rosterEntries` |
| O-08 | Relabel / Remove Design Warning | feature | O-05 | Roster Manager slice → `rosterEntries` w/ `designId` |

### Parallelization Notes for Track O
- O-02 and O-03 both fan out from O-01; O-03 additionally needs O-02 (it links spec-carrying designs), so the practical order is O-01 → O-02 → O-03.
- O-06, O-07, O-08 all sit behind O-05 and can run in parallel **once their external dependency lands** — until then they stay blocked at the PRD level, not just the DAG level.

### Critical Path
`O-01 → O-02 → O-03 → O-04 → O-05 → (O-06 ‖ O-07 ‖ O-08, each after its external dependency)`

### Open Questions Affecting Track O
- **Before O-04**: confirm the order-page progress milestones align with the Roster Manager progress model so the two surfaces don't diverge.
- **Before O-06**: the Confirm/Lock PRD must define the `locked` run status + confirmed-count snapshot first; decide whether the locked order view offers a "request a change" path.
- **Before O-07 / O-08**: the Roster Manager PRD must define the unified `rosterEntries` table (merging `jerseyRuns.fixedRoster` + `jerseyRunResponses`) first.
- **Sequencing reminder**: O-01 (Design screen revision) is the true first vertical slice — the order page cannot link a spec-carrying design that doesn't exist yet.

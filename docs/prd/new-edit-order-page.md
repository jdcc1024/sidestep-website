# PRD: New / Edit Order Page

**Author:** Sidestep / Claude
**Created:** 2026-05-30
**Status:** Draft
**Last Updated:** 2026-05-30

> Derived from the `/grill-me` session on the New/Edit Order page (2026-05-30) and the flow spec at [`docs/flow-specs/customer-ordering-flows.md`](../flow-specs/customer-ordering-flows.md). This PRD owns **one screen** plus the design-specs migration it can't ship without. Two changes it depends on — the unified roster table and the run `locked` state — are declared as upstream dependencies, each tracked by its own PRD/slice.

---

## 1. Problem Statement

Today's order flow is **order-first and single-track**. An `orders` record carries one set of silhouette specs (`jerseyStyle`, `neckline`, `sleeveStyle`), one static `estimatedQuantity`, and an array of design *files* — and "design" means a brief with a *required* file upload. This structure blocks the way captains actually think:

- A captain ordering a **season kit** (home + away + warmup) thinks of it as **one order with several designs**, but the model forces one design per order.
- The order's quantity is a **frozen estimate** that never reconciles with who actually signed up.
- Silhouette specs live on the **order**, not the **design**, so a reusable design can't carry its own cut.

The cost of not solving it: captains either split a single mental "order" into multiple disconnected orders + run links, or fall back to email. Both erode the self-serve experience the product is trying to deliver.

---

## 2. Proposed Solution

A single, scrollable **New / Edit Order** page that lets a captain:

- Enter team + order context and **link or attach 1-to-many designs**, where **each design now owns its silhouette specs**.
- **Save an order with zero designs** ("decide later"), with a progress state that stays blocked until at least one design is attached.
- See the order total as a value **derived from the collected roster** rather than a number they must guess up front.
- **Start their order process from this page** even though final counts arrive later from the run/roster surfaces.
- Edit everything **until the roster is locked**, after which the order details and roster become read-only.

The page renders both **New** and **Edit** states on one surface, and hands off to **Run Setup** to begin collecting names/numbers/sizes. The run itself is created **lazily, on first collect** — saving an order does not eagerly create a run.

---

## 3. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Team captain / manager | Buyer placing a custom-jersey order for a group; no design or data expertise assumed | Start an order, attach one *or several* designs, and move toward collecting their team — without committing to a final quantity or a finished design up front |
| Sidestep admin | Internal staff assisting or correcting an order | Read and adjust the same order/design structure the captain sees |

---

## 4. User Stories

### Must Have (P0)
- As a **captain**, I want to create an order with my team + order context so that I have a home for everything that follows.
- As a **captain**, I want to **attach more than one design** to a single order so that my home/away/warmup kit stays as one order.
- As a **captain**, I want each design to carry its **own silhouette specs** (style/neckline/sleeve) so that different cuts live with the right artwork.
- As a **captain**, I want to **save an order with no design yet** so that I'm not blocked when I only have an idea — with a clear signal that this step is still incomplete.
- As a **captain**, I want a clear **handoff to set up collection** so that I know what to do next after the order exists.
- As a **captain**, I want to **edit my order and its designs** any time before the roster is locked so that I'm not forced to email Sidestep for every change.
- As a **captain**, I want order details and roster to become **read-only once locked** so that the confirmed production basis can't drift.

### Should Have (P1)
- As a **captain**, I want to **relabel or remove a design** and be **warned about affected submitters** (submissions move on relabel; a removed indicator names affected people on removal) so that I don't silently orphan teammates' picks.
- As a **captain**, I want the **order total to reflect the roster** so that the number I see is real, not a guess.

### Nice to Have (P2)
- As a **captain**, I want to **create a brand-new design inline** from a design slot (title + brief, files optional) so that I don't have to detour to the Design screen mid-order. *(Lower priority — may slip to a later slice.)*

---

## 5. Scope

### In Scope
- New / Edit Order **single-page UI** and its states: new, edit, editable-until-locked, locked (read-only), and zero-design (progress blocked).
- **Design-specs migration:** move `jerseyStyle` / `neckline` / `sleeve` from `orders` onto `designs`. Inseparable from linking spec-carrying designs.
- Linking **1-to-many existing designs** to an order; allowing **zero** designs with a gated progress state.
- **Order total derived** from roster rows (display-level; the rows themselves come from the dependency below).
- **Edit-after-collection** behaviour for designs: relabel moves submissions; remove flags affected rows with a removed indicator naming impacted submitters.
- **Handoff CTA** to Run Setup; run is created lazily on first collect.
- Captain can **initiate the order process from this page**.

### Out of Scope (declared dependencies — separate PRDs)
- **Unified `rosterEntries` table** (merging `jerseyRuns.fixedRoster` + `jerseyRunResponses` into one record: name · number · size · qty · designId · `source`). Owned by the **Roster Manager** slice. The order page *reads* a derived count from it.
- **Run `locked` status** + roster→confirmed-count snapshot. Owned by the **Confirm / Lock Roster** slice. The order page only *reacts* to the locked state (freeze).

### Out of Scope (fast-follow / other surfaces)
- Inline design creation from the order page (P2 above).
- Public-form **variant multi-select**, fan **payment**, and the **design-choice image picker** — these belong to Run Setup / Public Run Form.
- Payment provider integration.

### Future Considerations
- Per-design **quantity** seeding (vs. fully derived) if captains want target counts per variant.
- Using `intakes.estimatedQuantity` to **prefill** an order rather than staying informational.

---

## 6. Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Specs location | Move `jerseyStyle` / `neckline` / `sleeve` onto `designs` | A design is reusable and carries its own cut; an order links designs. |
| Order ↔ designs | `orders.designIds: array` (already exists), **1-to-many**, zero allowed | Multi-design is a v1 requirement; zero-design unblocks the idea-only captain. |
| Variant model | A "variant" = `designId` on a roster row — **no separate variants table** | The bucket is an emergent grouping; relabel/remove operate on the design + its rows. Smallest model that satisfies the flows. |
| Order total | **Derived** from sum of roster rows | The mock's "X of N"; quantity is no longer a frozen estimate. |
| `estimatedQuantity` | Keep on `intakes`; on `orders` treat as **purely informational** for now | Real count comes from the roster; avoids a second source of truth. |
| Run creation | **Lazy** — created on first collect, not on order save | An order can exist before anyone is collecting; avoids empty-run clutter. |
| Lock behaviour | Locking the roster freezes **the roster and editing of order details** | Confirmed production basis must not drift; standalone designs remain reusable elsewhere. |
| New vs Edit | **One page** renders both | Matches "New / Edit Order"; single source of layout + states. |
| Page layout | **Single scrollable page** with sections | Matches the mock's density; a stepper hides the shape of the order. |
| Sport / jersey-style picker | **Keep as-is** for now | Out of this slice's value; revisit later. |
| Data migration | **Schema swap, no migration scripts** | No real captain/order data yet (pre-launch). |
| Run creation table impact | Add `designId` to roster rows (in the Roster slice) | Lets one run span all designs; "which design" is per-row. |

---

## 7. Technical Constraints
- **Stack:** Next.js (App Router) + React 19 + Convex backend + Clerk auth + shadcn/Base UI primitives. Follow the existing grain.
- **Convex pattern:** split mutations into **rules + form** modules, reuse **shared auth helpers**, and add **mutation smoke tests** — mirroring the recent `jerseyRun` / `jerseyRunResponse` refactors (`A-01`…`A-04`).
- **CTA/links:** use `buttonVariants` on `<Link>` for navigation CTAs (not `<Button render={<Link/>}>`) per CLAUDE.md.
- **Workflow:** TDD-first; update `dag.json` per task; vertical slices (DB → API → UI).
- **No real data** to preserve — schema may change without migration scripts.

---

## 8. Success Metrics
- A captain can create an order and attach **2+ designs, each with distinct specs**, in one pass on one page.
- An order can be **saved with zero designs**, and the progress indicator visibly blocks the "design attached" milestone until one is added.
- After lock, order details and roster render **read-only** with a clear "locked — contact Sidestep" affordance; before lock, every field is editable.
- Removing a design with existing submissions surfaces a **named, non-destructive warning** rather than silently dropping rows.
- No regression: existing single-design orders still create and render correctly under the new design-owns-specs model.

---

## 9. Testing Strategy
- **Unit tests:** spec-on-design validation; order-with-zero-designs allowed; derived-total computation from roster rows; lock-state gating of edit affordances; relabel-moves / remove-flags logic.
- **Integration tests:** create order → attach multiple designs → save (no run yet) → first collect creates the run lazily; edit order pre-lock succeeds, post-lock is rejected; remove-design-with-submissions returns the affected-submitter warning payload.
- **Manual QA:** the single-page layout reads cleanly at the mock's density; the zero-design blocked state is obvious but not punitive; relabel/remove copy is warm and field-anchored; handoff CTA lands the captain in Run Setup as expected.

---

## 10. Open Questions
- [ ] Exact **handoff affordance** wording/placement between "order saved" and Run Setup (UX detail; resolve during issue breakdown).
- [ ] Whether the **locked → read-only** order view should offer a "request a change" path beyond the static "contact Sidestep" note.
- [ ] Confirm the **progress-bar milestones** the order page shows (which states gate on "design attached") align with the Roster Manager progress model so the two surfaces don't diverge.

---

## Appendix — Sequencing

This page is **slice two** of a three-part build:

1. **Design screen revision** — designs carry specs (the true first vertical slice; the order page can't link a spec-carrying design that doesn't exist).
2. **New / Edit Order page** — *this PRD*.
3. **Roster Manager** (`rosterEntries`) and **Confirm / Lock** (`locked` status) — proceed as parallel slices; the order page consumes a derived count and reacts to the locked state.

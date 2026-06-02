# PRD: Roster Manager + Confirm / Lock

**Author:** Sidestep / Claude
**Created:** 2026-06-02
**Status:** Approved
**Last Updated:** 2026-06-02

> Slice **three** of the three-part order build (after Design-owns-specs and the New/Edit Order page). The order-page PRD ([`new-edit-order-page.md`](./new-edit-order-page.md)) declared two upstream dependencies and pushed them here: the **unified roster data model** and the run **lock/freeze** state. This PRD owns both, because lock snapshots the roster and the two are hard to reason about apart.
>
> It is also the document that **corrects** a piece of the order-page PRD: the order page treated "design-choice on the public form" as out of scope. The aligned model below puts design-choice **into** the public form, because a fan orders *under* a design. That scope move is intentional and called out in §5.

---

## 1. Problem Statement

Today, who actually ends up on a team is split across two shapes that never reconcile:

- `jerseyRuns.fixedRoster` — an optional array of `{name, number}` the captain pre-enters.
- `jerseyRunResponses` — one row per fan submission (`name, number, size, …`), with **no link to any design**.

Neither carries a `designId`, so the system can't answer the questions the order page now needs to ask: *how many jerseys total? how many of the Home design? who ordered the design the captain just removed?* The order's quantity stays a frozen `estimatedQuantity` guess, and a multi-design "season kit" order has no way to say "this jersey is the away one."

The model also can't represent how teams really order. A single fan doesn't buy one jersey — they buy **several** (a home *and* an away, or jerseys for the whole family), each a different design, name, number, and size. The flat one-row-per-response table can't group those back to the person who ordered them.

Finally, there is no notion of **done**. A run is `open` or `closed`; there's no "this is the confirmed production basis, stop editing." Without it, the order details and counts can drift after everyone has committed.

The cost of not solving it: the order page's derived total (O-07), its relabel/remove safety net (O-08), and its freeze-on-lock behaviour (O-06) are all blocked — and captains keep falling back to spreadsheets and email to track who wants what.

---

## 2. Proposed Solution

Introduce a **unified roster data model** with a clear three-level hierarchy, and a **lock** state that freezes it.

**The hierarchy** (the heart of this slice):

```
order ──1:1──> jerseyRun                  one collection campaign per order
order ──0..N──< design                    designs are user-owned, reusable across orders
design ──0..N──< rosterEntry              a "player slot": name + number on a design
rosterEntry ──1..N──< orderEntry          a jersey to make: size + qty + submitter + source
```

- A **rosterEntry** is a name+number combo *on a design* — e.g. `Home / #99 Gretzky`. It's the player slot.
- An **orderEntry** is one jersey to be produced — `{size, qty, submitter, source}` — attached to a roster entry. **One roster entry can have many order entries** (five people can each order #99 Gretzky in different sizes).
- A roster entry with **zero order entries is "not yet filled"** (e.g. a captain pre-entered a name but nobody has chosen a size).
- **Production total = Σ orderEntry.qty.** The order page reads this as its derived total (O-07); per-design counts are the same sum grouped by `design`.

**What a fan can now do:** the public run form shows **all of the order's designs**, and a fan can add **multiple order entries across them** in one submission — e.g. *1× Home #99 Gretzky L, 1× Away #01 Luongo M, 1× Away #25 Sosa XL*. All three rows group back to that fan by **submitter name/email**.

**Lock:** the captain (or admin) can lock the run. Locking freezes the roster and the order details — everything goes read-only, counts are frozen as the confirmed production basis. There is no self-serve "request a change" path for now; finalizing is a captain/admin decision.

This unblocks O-06 (freeze), O-07 (derived total), and O-08 (relabel/remove warning) on the order page, which only *read* from and *react* to this model.

---

## 3. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Team captain / manager | Buyer running a custom-jersey order for a group | See a live, accurate roster across all designs; pre-seed names; relabel/remove designs safely; lock when ready |
| Fan / team member | Person ordering one or more jerseys via the public form | Order the jerseys they want — across designs, names, numbers, and sizes — in one go |
| Sidestep admin | Internal staff assisting or finalizing an order | Read and adjust the same roster; control when an order is locked/finalized |

---

## 4. User Stories

### Must Have (P0)
- As a **captain**, I want one run per order that collects every design's jerseys in one place so that I'm not juggling separate links per design.
- As a **fan**, I want to order **multiple jerseys across the order's designs** (each with its own name, number, size, qty) in one submission so that I order for myself/my family in one pass.
- As a **captain**, I want each jersey to be tagged with **which design** it's for so that I can see Home vs Away counts.
- As a **captain**, I want a **live total derived from order entries** (Σ qty), overall and per design, so that the number is real, not a guess. *(Consumed by order-page O-07.)*
- As a **captain**, I want to **pre-enter roster entries** (names/numbers) that show as "not yet filled" until a size is chosen so that I can seed a known team.
- As a **fan ordering a player the captain pre-entered**, I want my order to **attach to that existing roster entry** so that we don't get duplicate player slots.
- As a **captain/admin**, I want to **lock** the run so that the order details and roster become read-only and the production basis can't drift. *(Consumed by order-page O-06.)*

### Should Have (P1)
- As a **captain**, I want to **relabel** a design and have its roster/order entries carry over untouched so that renaming is safe. *(Supports order-page O-08.)*
- As a **captain**, I want to **remove** a design and have its order entries **stay visible, flagged "removed," and dropped from the count**, with a warning that **names affected submitters**, so that I never silently orphan anyone. *(Supports order-page O-08.)*
- As a **captain**, I want to add a **bulk blank line** (no name/number, a size, qty > 1) so that I can order spares/blanks without inventing names.

### Nice to Have (P2)
- As a **captain**, I want **per-design target counts** ("X of N") so that I can see progress against a goal, not just a running total.
- As a **fan**, I want an image-based **design picker** on the public form so that choosing Home vs Away is visual, not textual.

---

## 5. Scope

### In Scope
- New unified roster data model: `rosterEntries` (`designId, name, number`) and `orderEntries` (`rosterEntryId, size, qty, submitter, source`), replacing `jerseyRuns.fixedRoster` + `jerseyRunResponses`.
- **One-run-per-order** enforcement.
- Public run form: shows **all of the order's designs**; a fan adds **multiple order entries across designs** in one submission; submissions group by **name/email**.
- Fan order entries **attach to an existing matching roster entry** (same design + name + number) rather than duplicating it.
- Captain-seeded roster entries with a **"not yet filled"** state (roster entry, zero order entries).
- **Bulk / blank** order entries (no roster entry; size + qty only).
- **Derived counts** API: overall Σ qty and per-design Σ qty (the order page's O-07 total reads this).
- **Relabel** (carry entries over) and **remove** (flag-and-drop-from-count, name affected submitters) for a design's roster, exposed for order-page O-08.
- **Lock** state on the run + freeze semantics that the order page reacts to (O-06).
- Migration of the existing run/response/admin/captain surfaces (~30 files) to the new model — **schema swap, no data-migration scripts** (pre-launch, no real data).

### Out of Scope (other surfaces / fast-follow)
- The New/Edit Order **page UI** itself — owned by `new-edit-order-page.md`; this slice provides the data + behaviour it consumes (O-06/07/08 remain order-page issues).
- Fan **payment** / payment-provider integration.
- The **image-based** design picker (P2) — the v1 picker can be textual.
- Per-design **target counts / "X of N"** (P2).
- "Request a change" workflow on a locked order — explicitly deferred; lock just freezes.

### Future Considerations
- Per-design quantity targets and progress meters.
- A structured post-lock change-request path if "contact Sidestep" proves too blunt.
- Using `intakes.estimatedQuantity` to seed an order's expected size.

---

## 6. Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Core hierarchy | `order → run (1:1)`, `order → designs (0..N)`, `design → rosterEntry (0..N)`, `rosterEntry → orderEntry (1..N)` | Mirrors how teams order: a player slot can be ordered many times, in many sizes. |
| Roster entry | `{designId, name, number}` — the name+number "player slot" | A reusable target a fan can order against; the unit relabel/remove operates on. |
| Order entry | `{rosterEntryId?, size, qty, submitter, source}` | One jersey to produce. `qty > 1` allowed (bulk). `source: captain | fan`. |
| Production total | **Σ orderEntry.qty**, grouped by design for per-design counts | Replaces the frozen `estimatedQuantity`; "X of N" is emergent. |
| "Not yet filled" | A roster entry with **0 order entries** | Captain can seed names without sizes; they don't count toward the production total. |
| Fan ↔ existing slot | A fan ordering a matching `design + name + number` **attaches** an order entry to that roster entry | No duplicate player slots; captain-seeded names get "filled" by the matching fan. |
| Blank / bulk line | Order entry with **no roster entry** (size + qty only) | Spares/blanks need no player identity. |
| Submission grouping | Group a fan's order entries by **submitter name/email** | No extra batch id; a returning fan's later rows join their existing group. |
| Run ↔ order | **Enforce 1:1** (run carries `orderId`; guard against a second run) | The run is the single collection campaign for the whole order. |
| Design ↔ order | Designs stay **user-owned and reusable** (effectively M:N via `orders.designIds`) | A design is a reusable asset; an order links it. |
| Design choice on form | Public form shows **all designs**; fan picks per order entry | Corrects `new-edit-order-page.md` §5 which had this out of scope; required for per-design rows. |
| Relabel | Rename design; roster + order entries **carry over untouched** | Renaming is not data loss. |
| Remove | Order entries **kept, flagged "removed," dropped from count**; warning **names affected submitters** | Non-destructive, resolvable warning per flow-spec §6. |
| Lock | Freezes roster + order-detail editing; **no** request-change path | Confirmed production basis must not drift; finalize is captain/admin's call. |
| Lock representation | Extend the run **`status` union to `open | closed | locked`** + a confirmed-count snapshot at lock time | One status field, not a parallel flag — avoids two overlapping "done" signals. Order page reacts to `locked`; snapshot freezes the number even if rows are later touched by admin. |
| Auto-lock mechanism | **Lazy on read** — evaluate "deadline passed → locked" when the run is loaded, no scheduler | Matches the no-cron grain; avoids a scheduled function purely to flip a status. |
| Collision resolution | For now, just **show** the captain the collision; they edit as they see fit | No dedicated resolve-workflow — visibility + normal edit is enough for v1. |
| Who can lock | **Captain or admin** can lock manually; the run **also auto-locks when its `deadline` passes** | Captain self-serves; admin can step in; the deadline is a hard production cutoff that shouldn't depend on someone remembering to click. Reconcile with the existing `closed` status (see §10). |
| Lock reversibility | **Admin can always unlock.** **Captain can unlock only while the deadline has not passed.** | Admin keeps a correction valve; a captain can reopen their own pre-deadline lock, but once the deadline cutoff hits, only Sidestep can reopen. |
| Open-names match | Fan typing a matching `design + name + number` **attaches** to the existing slot **and flags a collision** for the captain to confirm | Avoids duplicate star-player slots from repeats/typos, without silently merging two genuinely different people. |
| Blank / bulk lines | **Ship as true blanks** — no name required at any point | A blank/spare jersey is a legitimate final product; don't gate lock on naming them. |
| `estimatedQuantity` | **Keep purely informational** on `orders`/`intakes`; do not retire yet | Derived total isn't battle-tested; retiring the field is a trivial later change once it's trusted. Inherits `new-edit-order-page.md`. |
| Data migration | **Schema swap, no migration scripts** | Pre-launch; no real captain/order/response data to preserve. |

---

## 7. Technical Constraints
- **Stack:** Next.js (App Router) + React 19 + Convex + Clerk + shadcn/Base UI. Follow the existing grain.
- **Convex pattern:** split mutations into **rules + form** modules, reuse **shared auth helpers**, add **mutation smoke tests** — mirroring the `jerseyRun` / `jerseyRunResponse` refactors (A-01…A-04).
- **Blast radius:** the `fixedRoster` + `jerseyRunResponses` merge touches ~30 files — public form, captain dashboard, admin oversight, response-views page, the `jerseyRunResponse` rules/form modules, and their tests. Plan issues as vertical slices, not a big-bang rewrite.
- **CTA/links:** `buttonVariants` on `<Link>` for navigation CTAs (not `<Button render={<Link/>}>`) per CLAUDE.md.
- **Workflow:** TDD-first; update `dag.json` per task.
- **No real data** to preserve — schema may change without migration scripts.

---

## 8. Success Metrics
- A fan can submit **multiple jerseys across 2+ designs** in one pass, and they group back to that fan by name/email.
- The order page shows a derived total equal to **Σ order-entry qty**, and per-design counts that match a manual tally.
- A captain-seeded name with no size shows as **"not yet filled"** and does **not** inflate the production total.
- A fan ordering a captain-seeded player **fills that slot** instead of creating a duplicate.
- **Relabel** loses zero entries; **remove** keeps rows visible, flags them, drops them from the count, and names affected submitters.
- After **lock**, the order + roster render read-only and the count is frozen.
- No regression: existing single-design runs still collect and render under the new model.

---

## 9. Testing Strategy
- **Unit tests:** Σ-qty total and per-design grouping; "not yet filled" (roster entry, 0 order entries) excluded from total; fan-attach-to-existing-slot vs new slot; bulk/blank order entry (no roster entry) counted by qty; relabel carries entries; remove flags + drops-from-count + returns affected-submitter list; lock gating of mutations.
- **Integration tests:** order → lazy run on first collect → fan submits multiple order entries across designs → counts reconcile; second-session same-email submission joins the same group; one-run-per-order guard rejects a second run; edit before lock succeeds, after lock is rejected.
- **Manual QA:** public form reads cleanly for both single-design (picker collapses) and multi-design orders; "removed" flagging is legible; locked read-only state is unmistakable.

---

## 10. Open Questions

Resolved 2026-06-02 (now in §6): open-names match = **attach + flag collision**; who locks = **captain or admin, plus auto-lock on deadline**; reversibility = **admin always, captain only pre-deadline**; blank lines = **ship as true blanks**; `estimatedQuantity` = **keep informational**.

Resolved 2026-06-02 (round 2, now in §6): status becomes **`open | closed | locked`** (one field); auto-lock is **lazy on read**; collisions are **shown, not workflow-managed** (captain edits freely).

Still open (carry into issue breakdown — none block the schema):
- [ ] **`closed` vs `locked` precedence:** confirm the exact rule when deadline passes — does the run go straight to `locked`, or `closed` then `locked`? Coordinate with `3-01-jersey-run-deadline-enforcement` so the two don't fight.

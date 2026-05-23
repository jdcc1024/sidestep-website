# Architecture Improvement Report

_Generated 2026-05-22, after Phase 2 completion and partial Phase 3 (3-01, 3-02 done)._

## Codebase Health Score: 6 / 10

The high-level architecture is sound: a clean three-way split between
`app/` (routes), `convex/` (backend), and `lib/` (framework-free pure
logic with sibling Vitest files). `lib/orderStages.ts`,
`lib/jerseyRunDeadline.ts`, and `lib/pricing.ts` are textbook deep
modules — small public interface, rich internals, well tested.

The score is held back by **one consistent seam problem**: the
`lib/` ↔ `convex/` boundary was drawn at the wrong place for the
validation-heavy modules. The Convex files re-implement the same rules
the `lib/` modules already encode, because the lib's public interface
returns form-friendly error maps and the server needed something else.
The result is duplicated constants, duplicated branching, and a real
drift risk that no test catches today. Three of the four improvement
candidates below are facets of that same seam.

---

## Improvement Candidates

### Priority 1 — Convex auth helpers are copy-pasted across 4 files

**Current state.** `requireCurrentUser` is defined identically (down to
the type signature and error strings) in:

- `convex/orders.ts:17-28`
- `convex/designs.ts:24-33`
- `convex/jerseyRuns.ts:29-40`

A fourth near-identical variant — `requireAdmin` — lives in
`convex/admin.ts:9-21`. And the "soft" variant (return null if not
authed) is inlined yet again in `orders.ts:getMyOrder`,
`orders.ts:listMyOrders`, `jerseyRuns.ts:getByOrder`, and
`users.ts:getCurrentUser` — at least four more copies, each subtly
different about whether to return `null`, `[]`, or throw.

**Why it matters.** Every new Convex function reaches for one of these
patterns. Today an AI agent looking at the codebase has to *guess* which
flavor to use, and the inconsistency between "throw on missing user" vs
"return empty" is decided by whichever neighbor was copied. The
admin-gate check in `jerseyRuns.ts:closeRunByAdmin:282` is inlined
rather than reusing `admin.ts:requireAdmin`, which means a future tweak
to the admin check (e.g. logging, role hierarchy) has to be remembered
in two places.

**Proposed restructure.** A new `convex/_auth.ts` (leading underscore
matches the existing `_schemaSmokeTest.ts` convention) exposes four
functions:

```ts
export async function getCurrentUserOrNull(ctx): Promise<Doc<"users"> | null>;
export async function requireCurrentUser(ctx): Promise<Doc<"users">>;
export async function requireAdmin(ctx): Promise<Doc<"users">>;
export async function requireOrderOwnership(ctx, orderId): Promise<{
  user: Doc<"users">;
  order: Doc<"orders">;
}>;
```

`requireOrderOwnership` collapses the "load order, verify
`order.captainId === user._id`, throw on mismatch" pattern that appears
in `orders.ts:getMyOrder`, `jerseyRuns.ts:getByOrder`, and
`jerseyRuns.ts:create`.

**New interface.** Each Convex file's handler shrinks from ~10 lines of
boilerplate to one line:

```ts
const { user, order } = await requireOrderOwnership(ctx, orderId);
```

**Migration effort.** Low. Pure code motion; the diff is mechanical and
testable by re-running `npm run typecheck` and the existing tests after
each file. Roughly −80 lines net.

---

### Priority 2 — Validation rules duplicated between `lib/` and `convex/`

**Current state.** Every validation-heavy lib module has a Convex
counterpart that redefines the same constants and re-implements the
same checks. CLAUDE.md is honest about this — it's "defense in depth" —
but the *implementation* of that defense is the problem, not the
intent.

Concrete inventory (constants only, not even counting the branching):

| Rule                         | `lib/`                           | `convex/`                        |
|------------------------------|----------------------------------|----------------------------------|
| `SIZE_OPTIONS`               | `jerseyRun.ts:5`                 | `jerseyRuns.ts:16`               |
| `MAX_CUSTOM_QUESTIONS`       | `jerseyRun.ts:11`                | `jerseyRuns.ts:17`               |
| `QUESTION_LABEL_MAX_LENGTH`  | `jerseyRun.ts:12`                | `jerseyRuns.ts:18`               |
| `ROSTER_NAME_MAX_LENGTH`     | `jerseyRun.ts:13`                | `jerseyRuns.ts:19`               |
| `MAX_ROSTER_ENTRIES`         | `jerseyRun.ts:15`                | `jerseyRuns.ts:21`               |
| `RESPONDENT_NAME_MAX_LENGTH` | `jerseyRunResponse.ts:5`         | `jerseyRuns.ts:22`               |
| `EMAIL_MAX_LENGTH`           | `jerseyRunResponse.ts:6`         | `jerseyRuns.ts:23`               |
| `ANSWER_MAX_LENGTH`          | `jerseyRunResponse.ts:9`         | `jerseyRuns.ts:26`               |
| `EMAIL_PATTERN` regex        | `jerseyRunResponse.ts:76`        | `jerseyRuns.ts:27`               |
| Team-name / sport / quantity caps | `order.ts`                  | `orders.ts:8-13`                 |
| Design title / brief caps    | `design.ts`                      | `designs.ts:8-10`                |

Plus the trimming, length-checking, and "drop unknown question ids"
loops — all reimplemented inside `jerseyRuns.ts:create` and
`jerseyRuns.ts:submitResponse` (~120 lines combined of duplicated
branching).

**Why it matters.** Drift is inevitable and silent. If a captain bumps
`MAX_CUSTOM_QUESTIONS` to 7 in `lib/jerseyRun.ts` for a UX change, the
server still throws at 6. The Vitest suite passes (it tests the lib),
the typecheck passes, and the bug ships. The `lib/` tests are
extensive, but they're testing the wrong code path — the **server**
is the trust boundary, and the server has zero tests.

This is also the textbook shallow-module symptom from *A Philosophy of
Software Design*: the lib's public interface is shaped for the React
form (returns `errors` keyed by form field, accepts string-typed dates),
so the server can't call it and has to re-derive everything. The
boundary is wrong, not the intent.

**Proposed restructure.** Split each validation lib into two layers:

1. **Rules** (`lib/jerseyRun/rules.ts`): exports constants and pure
   atomic checks — `isValidSize(s)`, `validateRosterEntry(name,
   number)`, `validateCustomQuestion(label)`. Throws `ValidationError`
   from a shared base class with a `field` and a user-message.
2. **Form adapter** (`lib/jerseyRun/form.ts`): the existing
   `validateJerseyRun(input): JerseyRunErrors` and `toPayload` —
   re-implemented as a thin shell that calls the rules and re-shapes
   the errors into the form-friendly `JerseyRunErrors` record.
3. **Convex adapter** (in `convex/jerseyRuns.ts`): calls the same rules
   and rethrows as `ConvexError`. Three or four lines per field.

`SIZE_OPTIONS` and the other constants live in `rules.ts` only and are
imported by both adapters (Convex *can* import from `lib/` — there's
no runtime barrier, just convention. `jerseyRunActions.ts` already does
this with `renderCaptainClosureEmail`).

**New interface.** Convex `create` mutation shrinks to roughly:

```ts
const payload = parseJerseyRunPayload(args);  // throws ConvexError
return ctx.db.insert("jerseyRuns", { ...payload, captainId: user._id, ... });
```

**Migration effort.** Medium. The lib modules need restructuring and
new tests at the rules layer; the form adapter and Convex adapter need
to call the rules; existing tests stay green throughout (they test the
form adapter's behavior, which is unchanged). Estimate one focused
session per domain (jerseyRun, jerseyRunResponse, order, design,
intake) — five sessions total, but they can ship independently.

---

### Priority 3 — Admin N+1 join pattern repeated three times

**Current state.** `convex/admin.ts:listOrders`, `listDesigns`, and
`listJerseyRuns` each build a `captainCache` / `ownerCache` Map by
hand, with the same Promise.all loop and the same "Unknown" /
empty-email fallback strings. Code lives at:

- `admin.ts:32-47`  (listOrders)
- `admin.ts:58-73`  (listDesigns)
- `admin.ts:148-181` (listJerseyRuns)

**Why it matters.** Adding a fourth admin list view (which is coming —
2-13 admin customer management is queued) means a fourth copy. The
fallback strings (`"Unknown"`, empty email) already differ between
admin queries and `getMyOrder` (`"Unknown"`, empty string) without any
shared decision about what they should be.

**Proposed restructure.** A `joinUsersById` helper in `convex/_users.ts`:

```ts
export async function joinUsersById<T extends { _id: Id<...> }>(
  ctx: QueryCtx,
  rows: T[],
  keyOf: (row: T) => Id<"users">,
): Promise<(T & { user: Doc<"users"> | null })[]>;
```

Each admin query becomes ~6 lines: `collect()` → `joinUsersById` →
`map` to the public shape. The "Unknown" fallback lives in the public
shape constructor at the call site, where it's locally obvious.

**Migration effort.** Low. Self-contained refactor, no schema or
interface changes.

---

### Priority 4 — Form components are 500–700 lines each

**Current state.** Per `wc -l`:

| Component                                  | Lines |
|--------------------------------------------|-------|
| `components/portal/JerseyRunSetup.tsx`     | 686   |
| `components/intake/IntakeForm.tsx`         | 678   |
| `components/run/JerseyRunPublicForm.tsx`   | 594   |
| `components/portal/DesignForm.tsx`         | 589   |
| `components/portal/OrderForm.tsx`          | 544   |

Each file holds: form state, validation glue, payload generation,
submission status machine, error display, and JSX. `JerseyRunSetup`
also wraps three sub-states (loading, no-run-yet form, existing-run
summary) in one file.

**Why it matters.** This is the only soft finding on the list — these
files *are* large but the logic is genuinely sequential and the JSX is
the bulk of the bytes. The risk is more about future-AI navigability
than current correctness: when an agent loads
`JerseyRunSetup.tsx`'s 686 lines into context to add a single field,
much of that context is JSX boilerplate competing with the actual
edit target.

**Proposed restructure.** Optional and lower-confidence. The pattern
that would help most:

1. Extract a `useJerseyRunForm()` hook (state, update functions,
   validation, submission) into a sibling file. The component file
   then becomes JSX + onSubmit wiring, ~300 lines.
2. Same for the other four forms.

Not urgent. Defer until Priority 2 lands — the validation refactor
will already shrink these files by 30-50 lines each as the lib
exports get tighter.

**Migration effort.** Low per file, but high total if done up front.
Recommend deferring.

---

### Priority 5 — `Providers > UserSync` runs a query on every page load

Already tracked in `dag.json` as issue **3-07** (status: blocked).
Mentioning here so the architecture story is complete: the current
client-side `useQuery(getCurrentUser) → useMutation(syncCurrentUser)`
pattern in `app/providers.tsx:19-34` runs on every authenticated page
load, even though the actual sync only happens on first sign-up. The
fix is to handle Clerk's `user.created` webhook entirely on the
Convex side (e.g. an HTTP action) and remove the client-side
fallback path.

No additional analysis needed here — the existing issue captures it
well.

---

## Testing Gaps

- **`convex/` has zero tests.** This is the single highest-leverage
  gap. The validation drift risk from Priority 2 is silent specifically
  because the server is untested. At minimum: one smoke test per
  mutation that exercises the happy path + one rejection path, using
  `convex-test`. ~2 hours of work to cover all current mutations.
- **No component tests.** Not surprising at this stage. The forms are
  the components most worth testing (validation interactions, error
  display); they're also the largest, so testing pressure may help
  drive the Priority 4 extraction.
- **No integration tests of the Clerk webhook.** The user-sync path is
  exactly the thing 3-07 is reworking, so leave this until that lands.

---

## Dependency Issues

No circular dependencies — confirmed by visual scan. The lib modules
don't import each other except `jerseyRunDashboard → pricing`, which
is fine.

The one *coupling* worth naming: `components/portal/JerseyRunSetup.tsx`
imports **13 named exports** from `lib/jerseyRun.ts`. That's a wide
interface and a direct symptom of the Priority 2 shallow-module
problem — the lib exposes its internals (constants, types, helpers)
rather than hiding them behind a smaller surface like
`useJerseyRunFormState()` or `parseJerseyRunPayload()`.

---

## Recommended Actions

In order of impact-per-effort:

1. **Land Priority 1** (Convex auth helpers). One session, mechanical
   diff, immediate clarity win. Removes the "which copy of
   requireCurrentUser do I edit" decision for every future task.
2. **Add `convex-test` smoke tests for current mutations.** Two hours.
   Pre-requisite for safely doing Priority 2 — without these, the
   validation refactor flies blind on the actual trust boundary.
3. **Land Priority 2 one domain at a time.** Start with `jerseyRun` /
   `jerseyRunResponse` since they're the worst offenders and the
   shape of the refactor will set the template for the others.
4. **Land Priority 3** (admin N+1 helper) before issue 2-13 ships a
   fourth admin list view.
5. **Revisit Priority 4** after Priority 2 — measure whether the form
   components are still uncomfortably large once the lib exports
   tighten.

---

## Backlog Issues to Create

- [ ] **A-01: Extract shared Convex auth helpers** — move
  `requireCurrentUser`, `requireAdmin`, soft variant, and
  `requireOrderOwnership` into `convex/_auth.ts`. Replace all four
  copy-pasted implementations. No behavior change. Priority 1.
- [ ] **A-02: Add Convex mutation smoke tests** — `convex-test`
  harness, one happy-path + one rejection test per public mutation in
  `orders.ts`, `designs.ts`, `jerseyRuns.ts`, `intakes.ts`,
  `users.ts`. Captures the trust-boundary behavior before refactoring
  it.
- [ ] **A-03: Consolidate jersey-run validation rules** — split
  `lib/jerseyRun.ts` into `rules.ts` + `form.ts`, have
  `convex/jerseyRuns.ts:create` import from `rules.ts`. Single source
  for `SIZE_OPTIONS`, `MAX_CUSTOM_QUESTIONS`, etc. Priority 2,
  template for the others.
- [ ] **A-04: Consolidate jersey-run-response validation rules** —
  same shape as A-03 for `lib/jerseyRunResponse.ts` ↔
  `convex/jerseyRuns.ts:submitResponse`.
- [ ] **A-05: Consolidate order / design / intake validation rules** —
  same shape as A-03 for the three remaining domains.
- [ ] **A-06: Extract admin `joinUsersById` helper** — collapses three
  copies of the captainCache pattern in `convex/admin.ts`. Land before
  2-13 adds a fourth.
- [ ] **A-07 (optional, defer): Extract `use*Form` hooks from large
  form components** — only worth doing if forms still feel unwieldy
  after A-03 through A-05 land.

# PRD: shadcn/ui Migration

**Author:** Sidestep / Claude
**Created:** 2026-05-23
**Status:** Draft
**Last Updated:** 2026-05-23

---

## 1. Problem Statement

The Sidestep website has been built with ~20 hand-rolled components and no shared primitive layer. Buttons, inputs, cards, dialogs, and other UI building blocks are inlined inside each composite component, producing one-off implementations per page. This creates two compounding costs:

- **AI agent friction.** When asked to add or modify UI, Claude invents fresh patterns each time instead of reaching for a known primitive — increasing inconsistency and slowing iteration.
- **Human reading cost.** A developer reviewing the codebase must mentally re-parse each bespoke component to understand what it does. There is no shared vocabulary for "what a button looks like here."

The site works and customers are not affected. The pain is developer-side. Solving it now — before the UI grows further — is significantly cheaper than solving it after another phase of feature work piles on more bespoke components.

---

## 2. Proposed Solution

Adopt **shadcn/ui** as the primitive layer for the entire site, replacing inline UI implementations with standardized, copy-paste primitives that live in `components/ui/`.

The migration is a **rip-and-replace** sweep performed in a single coordinated effort, in this order:

1. **Smoke test** — verify shadcn + Tailwind v4 + Next 16 + React 19 install cleanly together.
2. **One install commit** — `npx shadcn add` for the full primitive set, plus `lucide-react`, `next-themes`, `sonner`, `react-hook-form`, `zod`, `@hookform/resolvers`. Wire dark-mode CSS variables into `globals.css`.
3. **Showcase page** at `/dev/components` — renders every primitive with examples. Serves as the AI's and human's reference catalog.
4. **Portal pilot** — refactor `components/portal/*` to use shadcn primitives. One form (`JerseyRunSetup`) is the first RHF + zod conversion, proving the Convex-mutation integration pattern.
5. **Sweep** — marketing → intake → run → admin → layout, in that order.

Composite components (e.g. `HeroSection`, `PricingCalculator`, `OrderTimeline`) keep their file names and exported APIs; only their internal JSX changes. While refactoring a file, small UX, spacing, and a11y improvements are welcome — this is "improve while you're in there," not bug-for-bug preservation.

---

## 3. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Claude (AI agent) | Adds/modifies UI on future tasks | A discoverable primitive vocabulary so new UI is consistent and fast |
| Human developer | Reads and reviews code; makes small tweaks | A predictable component layer that's quick to scan and adjust |
| End user (incidental) | Visitors, captains, fans, admins | Better a11y, dark mode, polish — not the driver, but a side benefit |

---

## 4. User Stories

### Must Have (P0)

**AI Agent**
- As an AI agent, I want a fixed catalog of named primitives in `components/ui/` so that I reach for `<Button variant="outline">` instead of inventing a one-off button.
- As an AI agent, I want a `/dev/components` showcase page so that I can read one file to learn every available primitive.
- As an AI agent, I want forms to use shadcn `<Form>` + RHF + zod so that I have a single consistent pattern for handling validation and submission.

**Human Developer**
- As a developer, I want all primitives in one folder (`components/ui/`) so that I know where to look when tweaking a button or input.
- As a developer, I want shadcn defaults adopted wholesale so that I don't have to maintain a parallel design token system.
- As a developer, I want light and dark mode supported so that I can preview the site in both modes during development.
- As a developer, I want a visible theme toggle in marketing nav and portal/admin headers so that switching modes doesn't require dev tools.
- As a developer, I want toasts handled by `sonner` so that there is one toast system, not two.

**End User**
- As a visitor, I want consistent buttons, inputs, and spacing across pages so that the site feels cohesive.
- As a visitor, I want keyboard navigation and focus management to work correctly so that the site is usable without a mouse.
- As a captain filling out a form, I want clear validation errors so that I know what to fix before submitting.

### Should Have (P1)
- As a developer, I want the sweep broken into per-surface commits so that the git history is reviewable surface-by-surface.
- As a developer, I want zod schemas to live alongside their forms so that validation logic is colocated with the form.

### Nice to Have (P2)
- As a developer, I want a Storybook-equivalent for composites later (out of scope for this migration).
- As a visitor, I want subtle motion/transition polish on dialogs and toasts (shadcn defaults likely cover this).

---

## 5. Scope

### In Scope

**Setup & infrastructure**
- Tailwind v4 / Next 16 / React 19 / shadcn compatibility smoke test
- Single install commit: full primitive set (Button, Input, Label, Card, Dialog, Select, Textarea, Badge, Separator, DropdownMenu, Tabs, Tooltip, Skeleton, Sheet, Popover, Alert, Form, etc.)
- `lucide-react`, `next-themes`, `sonner`, `react-hook-form`, `zod`, `@hookform/resolvers` installed
- shadcn dark-mode CSS variables in `app/globals.css`
- `<ThemeProvider>` from `next-themes` wired into root layout
- Theme toggle component placed in `MarketingNav`, `PortalShell` header, `AdminShell` header

**Showcase**
- `/dev/components` page renders every installed primitive with usage examples
- Page is not linked from public navigation; reachable via direct URL only

**Portal pilot (first refactor surface)**
- `PortalShell`, `OrderTimeline` rewritten on shadcn primitives
- `JerseyRunSetup` migrated to RHF + zod (first form conversion, proves the Convex pattern)
- Remaining portal forms (`DesignForm`, `OrderForm`) migrated to RHF + zod once the pilot pattern is validated

**Sweep (post-pilot, in order)**
- `components/marketing/*` — HeroSection, CustomizeSection, ProcessSection, FaqSection, QuoteCtaSection, PricingCalculator, PricingSection
- `components/intake/*` — IntakeForm (RHF + zod)
- `components/run/*` — JerseyRunPublicForm (RHF + zod)
- `components/admin/*` (via `AdminShell` + admin pages under `app/admin/*`)
- `components/layout/*` — Logo, MarketingFooter, MarketingShell, MarketingNav, SidebarShell

**Form migration**
- All five forms converted to RHF + zod with shadcn `<Form>` wrapper: `IntakeForm`, `OrderForm`, `DesignForm`, `JerseyRunPublicForm`, `JerseyRunSetup`
- zod schemas authored per form; Convex mutations called from the validated `onSubmit` handler
- Existing toast/error UX preserved or improved using `sonner`

**Quality**
- "Improve while you're in there" — small UX, spacing, a11y nits welcome during refactor
- Existing vitest tests continue to pass (they target lib classes, should be unaffected)

### Out of Scope

- Brand colors, custom fonts, design token customization (taking shadcn defaults; rebrand is a separate effort)
- Composite component redesigns — `HeroSection`, `PricingCalculator`, etc. keep their layout and behavior; only their primitive usage changes
- Storybook or component documentation beyond the `/dev/components` showcase page
- Rewriting existing tests to match new structure (unless they actively break)
- New features, new pages, new business logic
- Backend changes (Convex schema, mutations, queries) — forms keep their existing data contracts

### Future Considerations
- Brand theming on top of shadcn variables once base migration lands
- Storybook or richer component documentation if the team grows
- Migrating composite layouts to a more opinionated design system if shadcn primitives prove insufficient

---

## 6. Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primitive library | shadcn/ui | Copy-paste primitives the codebase owns; well-known to AI agents |
| Icons | `lucide-react` | shadcn's default; consistent with copy-pasted snippets |
| Toasts | `sonner` | Current shadcn recommendation; avoids legacy `toast` primitive |
| Theme system | `next-themes` | Standard shadcn dark-mode pattern; minimal config |
| Form library | `react-hook-form` + `zod` + `@hookform/resolvers` | Required for shadcn's `<Form>` wrapper; standard ecosystem |
| Design tokens | shadcn defaults | No brand system in place yet; defaults are fine for now |
| File organization | `components/ui/` for primitives; existing folders for composites | Primitives discoverable in one place; composites keep their domain folders |
| Migration approach | Rip and replace, one install commit + per-surface sweep | Avoid parallel systems; commit to one direction |
| Pilot scope | Portal surface, with `JerseyRunSetup` as the first form | Proves Convex + RHF pattern before the sweep multiplies risk |
| Sweep order | portal → marketing → intake → run → admin → layout | Pilot first; then highest-leverage developer-facing surfaces |
| Branch strategy | Commit directly to `master` (matches recent project pattern) | Single developer; PR ceremony adds cost without value |
| Theme toggle location | Marketing nav + portal header + admin header | Visible everywhere a user might want to switch |
| Tests | No proactive rewrites | Existing tests target lib classes; should survive untouched |
| Composite scope | Internals only; APIs preserved | Keeps the diff focused on UI swaps, not redesigns |
| Quality bar during sweep | "Improve while you're in there" | Captures incidental wins without scope creep |

---

## 7. Technical Constraints

- Must work with **Next 16 + React 19 + Tailwind v4** — smoke test verifies this before sweep begins
- Must coexist with **Clerk** (auth) and **Convex** (data layer) — shadcn primitives are presentation-only, no conflict expected
- Must not break existing **Resend** email flows or **svix** webhook handling
- Must keep `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` green at the end of every commit
- Dark mode CSS variables must be defined using Tailwind v4's `@theme` directive in `globals.css`, not the v3-style `tailwind.config.ts`
- No new runtime services or hosting changes
- No changes to Convex schema or mutations — form data contracts stay identical

---

## 8. Success Metrics

- **Primitive coverage:** Every button, input, label, card, dialog, select, textarea, badge, dropdown, toast, tooltip, sheet, and popover in the codebase is sourced from `components/ui/`. Zero hand-rolled instances remain.
- **Form consistency:** All five forms (`IntakeForm`, `OrderForm`, `DesignForm`, `JerseyRunPublicForm`, `JerseyRunSetup`) use RHF + zod + shadcn `<Form>`.
- **Showcase exists:** `/dev/components` renders all installed primitives and is reachable in development.
- **Theme toggle works:** Light/dark switch is functional in marketing nav, portal header, and admin header; preference persists across reloads.
- **No regressions:** Manual smoke test of each surface (marketing landing, intake submission, captain portal, jersey run public form, admin views) shows behavior equivalent to pre-migration.
- **Build health:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` all pass on the final commit.
- **Developer feel:** A small UI tweak (e.g. "change the primary button radius site-wide") can be made by editing one file in `components/ui/`.

---

## 9. Testing Strategy

- **Unit tests:** Existing vitest tests must continue to pass without modification. If a test breaks because it asserted on a removed class or DOM structure, fix the test minimally — do not rewrite test suites as part of this migration.
- **Integration tests:** No new integration tests required. Form submissions still call the same Convex mutations with the same payloads; existing mutation-level tests still cover the data path.
- **Manual QA (per surface, after each sweep commit):**
  - Marketing: navigate every landing page section in light and dark mode; submit the intake form; use the pricing calculator
  - Portal: log in, view orders, view order timeline, create a design, create an order, set up a jersey run
  - Jersey run public: open a shared link, fill out the form, submit
  - Admin: log in, view all orders, view all jersey runs, edit a record, advance an order stage
  - Theme toggle: confirm switch and persistence on every surface
- **Showcase page review:** Visit `/dev/components` and confirm every primitive renders correctly in both light and dark mode.
- **Build gate:** Each commit must pass `npm run build && npm run typecheck && npm run lint && npm test` before moving to the next surface.

---

## 10. Open Questions

- [ ] Will Tailwind v4 + Next 16 + React 19 + shadcn install cleanly together? — resolved by the smoke test (first task)
- [ ] After the portal pilot, should the human review and re-prioritize before the sweep continues, or proceed straight through marketing → intake → run → admin → layout?
- [ ] Should the `/dev/components` showcase be gated (e.g. dev-only, blocked in production) or simply unlinked and live?
- [ ] Do any existing Convex mutations expect a payload shape that won't survive a clean zod schema? (Verified case-by-case during each form's migration.)
- [ ] Does the admin checklist UI rely on any custom hover/keyboard behavior that shadcn `DropdownMenu` or `Tabs` doesn't cover out of the box?

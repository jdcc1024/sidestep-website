# Flow Spec: Customer Ordering & Jersey-Run Workflows

**Author:** Sidestep / Claude
**Created:** 2026-05-30
**Status:** Draft for design
**Audience:** Design (Claude Design / Figma AI) — this is a *flow & screen* spec, not an engineering spec. It describes the experiences to design, the states each screen needs, and the copy direction. Data model and implementation are deliberately out of scope (tracked separately).

> **How to use this doc:** Each flow is written as a sequence of screens and states a real customer moves through. Where the current product already does something, it's tagged **[TODAY]**. Where we want a change, it's tagged **[PROPOSED]**. Design the **[PROPOSED]** end-state; **[TODAY]** is context so you know what's changing.

---

## 1. Who this is for

Sidestep makes custom sublimated team jerseys (Greater Vancouver). The buyer is almost always a **team captain / manager** ordering on behalf of a group. Their teammates and fans are **respondents** — they submit their own name / number / size through a shared link and never need an account.

The five customer situations this spec must serve:

| # | Customer situation | One-line goal |
|---|--------------------|---------------|
| 1 | Has an **idea**, no design yet | "Tell Sidestep what I'm picturing and get started." |
| 2 | Has a **finished design + full name/number list** | "I already have everything — just let me enter it." |
| 3 | Has design + roster, **wants to open it to fans** | "Lock my core team, but let extras/fans join too." |
| 4 | Wants **one order with multiple new designs** | "Our season kit: home + away + warmup, together." |
| 5 | Wants a run **reusing a couple of old designs** | "Re-use what I uploaded before — maybe let the team pick." |

---

## 2. The core reframe (read this first)

Today the product is **order-first and single-track**: everything hangs off one Order, "Design" really means "a brief + required file upload," each order has exactly one run / one design / one spec / one quantity, and the run is **read-only once created**. That structure is what blocks the five situations above.

The design goal is to move to a model that matches how captains actually think. Three shifts drive every flow in this doc:

1. **The roster is a first-class, complete thing.** A "person on this order" has a *name, number, and size together* in one record. The captain can fill that record **three interchangeable ways** — type it in, paste a list, or collect it via a shared link — and mix them freely.
2. **The run is a living object the captain controls**, not a frozen attachment. It can be edited, its deadline extended, its mode changed, and it has an explicit **"lock the roster"** moment that turns collected data into the confirmed production count.
3. **A "design" can be just an idea.** Files become optional; a brief alone is a valid design. And an order can carry **more than one** design/variant.

---

## 3. Screen inventory

Screens to design or revise. ✚ = new, ✎ = revise existing, = = keep.

| Screen | Status | Purpose |
|--------|--------|---------|
| Portal dashboard | ✎ | At-a-glance orders, designs, runs. Add a clearer "what do you want to do?" entry. |
| New / Edit **Design** | ✎ | Capture a brief; **files optional**; idea-only allowed. |
| Design detail | = | Read a design, its brief, files, linked orders. |
| New / Edit **Order** | ✎ | Team + specs. Support **multiple design variants** in one order. |
| Order detail / timeline | ✎ | Status timeline, specs, linked designs, run summary, **edit affordances**. |
| **Run Setup / Edit** | ✚ | Dedicated, *editable* screen: name-source mode, sizes offered, deadline, custom questions, design choice. |
| **Roster Manager** | ✚ | The heart of a run: a table of people (name/number/size/status). Add row · paste import · share link — all feeding one list. |
| Run Responses (live) | ✎ | Merge roster + incoming submissions; show progress against roster; flag conflicts. |
| **Confirm / Lock Roster** | ✚ | Captain reviews the final list and locks it → becomes the production count. |
| Public Run Form (respondent) | ✎ | What a teammate/fan fills in. Supports all name modes, optional design choice, optional payment. |

---

## 4. Flow specs by situation

### Flow 1 — "I have an idea, no design yet"

**Entry:** Landing "Start your order" or dashboard "Start something new."

**[PROPOSED] Steps**
1. **Intent chooser** (small first step): "What do you want to do?" → *Start a design idea · Place an order · Collect sizes from my team.* Picking **Start a design idea** routes to New Design. *(Today there is no intent step; everything funnels into the order form, which has nowhere to hold an idea.)*
2. **New Design — brief-first.**
   - Title (e.g., "Spring 2026 kit").
   - **Brief** (the idea: theme, colours, references, vibe). This is the primary field, large and inviting.
   - Files: **optional**, clearly marked "Add references if you have them — or just describe it above." *(Today: at least one file is **required**, which hard-blocks the idea-only customer. Remove that requirement.)*
   - Optional Canva link.
3. **Save → Design detail**, with a clear next step: **"Turn this into an order"** (carries the design into a new order, pre-linked).
4. From there the order flow (Flow 2/4) continues, but the creative direction is already captured.

**States to design**
- Empty brief + no files → inline guidance, *not* a blocking error ("Tell us what you're picturing — a sentence is enough.").
- Saved-but-no-order-yet → Design detail shows a gentle nudge card: "Ready when you are — start an order from this idea."

**Why:** the idea-only customer currently has no sanctioned home for their idea. This gives them one and a path forward.

---

### Flow 2 — "I have a design + a full name/number list"

This customer already did the work. The flow must let them **enter**, not **collect**.

**[PROPOSED] Steps**
1. New Order → team name, sport (structured picker w/ "other"), silhouette specs, link existing/own design.
2. **Set up the team list** → opens **Roster Manager** (new). Three equally-prominent ways to fill it, on one screen:
   - **Add a person** (single row: name · number · size).
   - **Paste a list** (paste from a spreadsheet; map columns to name/number/size; preview before import). *(Net-new — there is no bulk entry today.)*
   - **Collect via link** (generate the shareable run link for anyone still missing).
3. The roster is **one table** regardless of how each row got there. Rows the captain typed/pasted are marked "Added by you"; rows from the link are marked "Submitted." Size lives **on the same row** as name/number. *(Today name/number and size are captured through two different mechanisms, so no single complete record exists.)*
4. **Confirm / Lock Roster** → captain reviews and locks → that count becomes the order quantity.

**States to design**
- Paste-import: column-mapping step, validation preview (e.g., "2 rows missing a size — fix or import anyway?"), success summary ("28 people added").
- Mixed roster: visual distinction between captain-entered vs respondent-submitted rows.
- Duplicate name or number on import → inline warning, not a hard stop.

**Why:** removes the "re-key 32 people one at a time through a public form" roadblock.

---

### Flow 3 — "Design + roster, but open it to fans"

The key change: **roster mode and open mode are no longer mutually exclusive.**

**[PROPOSED] Steps**
1. In **Run Setup**, "Who can submit?" is **no longer a binary**. Options:
   - **My roster only** (locked list).
   - **Open to anyone** (fans enter their own details).
   - **Roster + open** ✚ — the core team is pre-set *and* a shared link lets extras/fans add themselves. *(Today: Fixed roster XOR Open — you can't have both.)*
2. For the **fan/open portion**, Run Setup exposes settings the fan case needs:
   - **Number handling**: warn on / block duplicate numbers (so two fans don't both pick #23). *(Today: no duplicate-number guarding visible.)*
   - **Payment** ✚: optionally require fans to pay per jersey at submission (the responses screen already implies a per-jersey total). Captain sets price or it derives from the order. *(Today: the public form collects name/email/size only — no payment, so "sell to fans" can't really complete.)*
3. **Quantity reconciles automatically**: the order's number isn't a frozen estimate; the Responses screen shows "Confirmed roster: N · Pending: M" and the captain locks the final count when ready. *(Today: order carries a static estimated quantity that never updates from responses.)*

**States to design**
- Run Setup with the 3-way mode selector and a clear preview of what each respondent will see.
- Duplicate-number conflict surfaced on the Responses screen with a one-click "ask them to repick" or captain override.
- Payment on the public form: an optional pay step after size selection (design the "fan pays" and "no payment required" variants).

**Why:** unblocks the most valuable growth case (sell to a fanbase) and the common hybrid (known team + a few extras).

---

### Flow 4 — "One order, multiple new designs"

A captain thinks of "home + away + warmup" as **one** order. The flow must hold variants together.

**[PROPOSED] Steps**
1. New Order → after specs, **"How many designs in this order?"** → captain can add **multiple design variants** to a single order (e.g., Home, Away, Warmup), each with its own design/brief and optionally its own quantity. *(Today: one order = one spec = one design; multi-design forces separate orders + separate run links.)*
2. **One run, one link.** When collecting, the respondent picks **which variant(s)** they want (see Flow 5's design-choice pattern) and their size — so a person wanting both home and away expresses it in a single submission, not two forms. *(Today: a respondent gives one size, no variant choice.)*
3. Order detail shows variants as grouped sections under one timeline, with per-variant counts rolling up to the order total.

**States to design**
- Add/remove variant within the order builder.
- Per-variant quantity vs single shared quantity (support both — some kits are "same count each," some aren't).
- Respondent multi-select of variants with per-variant size.

**Why:** keeps the customer's mental "one order" intact and gives the team a single link.

---

### Flow 5 — "A run reusing a couple of old designs"

This is the best-supported case today (designs persist and can be linked). The gap is **letting the team choose between them.**

**[PROPOSED] Steps**
1. New Order (or "Start a run") → **link existing designs** from "My Designs" (already possible). Allow starting this from the Designs area too, so "I just want to collect sizes with these" doesn't feel like a detour through order creation.
2. In **Run Setup**, if more than one design is linked, offer **"Let people choose a design"** ✚ → adds a **design-choice question** to the public form, showing each linked design (thumbnail + name) as a selectable option. *(Today: linked designs are reference material for Sidestep only — the run form has no "pick your design" question and custom questions don't appear to support an image choice.)*
3. Responses tally by chosen design ("Design A: 12 · Design B: 9"), feeding per-variant counts.

**States to design**
- Design-choice question on the public form: image options, single or multi-select.
- Responses breakdown by design.
- Empty/old-design thumbnails when a linked design has no image (fall back to a name chip).

**Why:** turns "attach my old files" into "offer my team a real choice."

---

## 5. Reusable patterns to design (used across flows)

These components recur; design them once, well.

1. **Roster Manager table** — columns: Status · Name · Number · Size · (Paid?) · source tag. Row actions: edit, remove, "nudge." Header actions: **Add person · Paste list · Share link**. This single surface replaces the current split between "fixed roster" and "responses."
2. **Paste-to-import** — paste box → column mapping → validation preview → confirm. Forgiving (warn, don't block) on missing/duplicate fields.
3. **Name-source mode selector** — three options (Roster only · Open · Roster + open) with a live "what respondents see" preview.
4. **Run editor** — every run setting (sizes offered, deadline, custom questions, design choice, payment) is editable until the roster is **locked**. Surface an explicit lock state.
5. **Confirm / Lock Roster** — a review screen: final list, counts per variant, conflicts resolved, "Lock & send to Sidestep." This is the customer-facing counterpart to the admin's "Order Size Confirmed" stage.
6. **Design-choice question** — image-card picker reused on the public form.
7. **Intent chooser** — the small "what do you want to do?" entry that routes idea vs order vs collect.

---

## 6. Cross-cutting states & edge cases

Design these for every relevant screen:

- **Editable-until-locked**: order specs and run settings show an **Edit** affordance while open; after lock, they're read-only with a "Locked — contact Sidestep to change" note. *(Today: no self-serve editing of orders or runs that I could find — every change becomes an email.)*
- **Empty roster** with a deadline approaching → "0 of N responded — share your link" with the link and a copy button present *on this screen* (not only on the order page).
- **Progress against roster**: always show "X of N" when a roster exists (not a bare "0"). For open mode, show the running count.
- **Conflicts**: duplicate numbers and duplicate names surfaced as resolvable warnings.
- **Deadline passed**: clear closed state + "reopen / extend" for the captain.
- **Loading**: avoid the blank-skeleton flash; show the page chrome immediately, fill data in.
- **Dead ends**: any nav item must lead somewhere; a not-found state keeps the app shell + a "back to dashboard" link.

---

## 7. Content & tone

Match the existing voice — warm, plain, confident, lightly playful (e.g. "Tell us what you're thinking," "Your captain will see your submission right away"). Specifics:

- Validation is **friendly and field-anchored** ("Give your design a title," "Upload a list or add people one at a time") — keep this pattern; it's a current strength.
- Avoid the word **"Design"** doing three jobs. In customer-facing copy use: **"design idea / brief"** for the input the captain gives Sidestep, and **"your artwork"** for files they already have. Reserve "design" for the saved object.
- Make the **collect-vs-enter** choice explicit and judgment-free: a captain who already has the list should never feel funneled into "send a link and wait."

---

## 8. Explicitly out of scope here (for the technical follow-up)

- Data model / schema changes (how roster, run, order, and design relate).
- Whether the run is decoupled into its own object vs. stays embedded.
- Payment provider integration for the fan-pays flow.
- Admin-side changes (internal-stage mapping, customer/lead pages) — separate spec.
- The three currently-broken nav routes and the admin-page runtime error — tracked as bugs, not design work.

---

## Appendix A — What exists today (baseline, observed 2026-05-30)

For the design AI's context, the current customer flows:

- **Dashboard** lists orders, designs, and jersey-run responses.
- **Designs**: list → detail (title, brief, files as generic "File 1/2", Canva link) → New/Edit (stepped form, **file upload required**, no per-file remove).
- **Orders**: New Order (3 steps: Team & order · Jersey specs · Link designs; sport & jersey-style are free text) → Order detail (8-step public timeline, specs, **read-only** embedded run summary, linked designs). No edit affordance found.
- **Jersey run**: one per order; **names mode is binary (Fixed roster | Open)**; run summary is read-only (copy link, view responses); roster (name/number) and size are captured separately; quantity is a static estimate.
- **Public run form** (`/run/[id]`): name, email, size, and — in roster mode — a **second "pick your name"** dropdown (redundant with the free-text name). No payment, no design choice.
- **Responses**: live participation / deadline / estimated-total; shows a bare "0" rather than "0 of N" for fixed rosters.

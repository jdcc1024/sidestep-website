# PRD: Sidestep Website — Phase 1

**Author:** Sidestep / Claude  
**Created:** 2026-05-17  
**Status:** Draft  
**Last Updated:** 2026-05-17

---

## 1. Problem Statement

Sidestep operates a custom sublimated jersey business in Greater Vancouver primarily through word-of-mouth, a basic brochure website, and a fragmented set of tools: email threads for design communication, customer-managed Google Forms for team order intake, Canva for sharing design mocks, and manual Square invoices. Order information is scattered, requiring significant manual effort to audit, organize, and relay to the supplier. Customers have no visibility into their order progress. Team captains managing jersey runs — where fans and teammates each submit their own jersey info — have no purpose-built tool, forcing them to cobble together their own forms and manually compile the results. The result is slow onboarding, high communication overhead per order, and an experience that doesn't reflect the quality of the product.

---

## 2. Proposed Solution

A full-stack web application with two distinct experiences:

**Public marketing site** — replaces the existing brochure site with a polished, conversion-focused set of pages: hero, customization options, design-to-delivery process, FAQ, public pricing calculator, and a lightweight intake form to capture leads.

**Customer portal** — an authenticated workspace where team captains manage their relationship with Sidestep: create and upload designs (assets, briefs, mood boards), place and track orders through clearly defined stages, and set up jersey runs that generate a shareable link for teammates and fans to submit their individual jersey details without needing an account.

**Admin dashboard** — a full-control internal view for Sidestep staff: see every order and design in the system, manage a 14-stage internal checklist per order, manage customers and leads, view jersey run responses, and export order data for the supplier.

---

## 3. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Team Captain / Manager | Primary buyer; places orders on behalf of a team | Self-serve order management, jersey run tooling, design uploads |
| Teammate / Fan | Participates in a jersey run; no account needed | Submit jersey info (size, name, number) via a shared link |
| Sidestep Staff (Admin) | Internal team managing production workflow | Centralized view of all orders, stage tracking, data export |
| Anonymous Visitor | Prospective customer exploring the site | Understand what Sidestep offers, get a price estimate, start a conversation |

---

## 4. User Stories

### Must Have (P0)

**Anonymous Visitor**
- As a visitor, I want to see Sidestep's customization options and process so that I understand what I'm buying before reaching out.
- As a visitor, I want to use a pricing calculator so that I can get a cost estimate before committing to a conversation.
- As a visitor, I want to submit a basic intake form so that I can start a conversation with Sidestep without creating an account.

**Customer — Account & Portal**
- As a captain, I want to register via an invite link so that I land in the portal with my inquiry info already pre-filled.
- As a captain, I want to self-register without an invite so that I can start a new order on my own terms.
- As a captain, I want to create a Design by uploading files and writing a brief so that all my ideas are in one place for Sidestep to review.
- As a captain, I want to create an Order and attach one or more Designs to it so that Sidestep knows exactly what I need produced.
- As a captain, I want to track my order through clearly named stages so that I don't have to email Sidestep to know where things stand.
- As a captain, I want to see all my Designs and Orders in one place so that I can manage multiple seasons or teams without confusion.

**Jersey Run**
- As a captain, I want to create a Jersey Run with a deadline so that I can collect my team's jersey info in one place.
- As a captain, I want to choose whether names and numbers are open (fan-entered) or pre-defined by me so that I can match how my team prefers to run their orders.
- As a captain, I want to add custom questions to the jersey run form so that I can collect any additional info I need (e.g. delivery method).
- As a captain, I want to share a link so that teammates and fans can submit their jersey info without creating an account.
- As a fan/teammate, I want to fill out the jersey run form without creating an account so that I can join my team's order without friction.
- As a captain, I want to see who has submitted and what the current order size is so that I can gauge participation before the deadline.
- As a captain, I want to be notified when the jersey run closes so that I know it's time to confirm the order with Sidestep.

**Admin**
- As an admin, I want to see all orders and designs across all customers so that I have a complete view of active and pending work.
- As an admin, I want to manage a checklist of internal order stages so that I can track exactly where each order is in the production pipeline.
- As an admin, I want to see all new customer registrations so that I can follow up with self-registered users.
- As an admin, I want to see all jersey run responses for any order so that I can audit and prepare data for the supplier.
- As an admin, I want to export order data so that I can relay it to the supplier without manual re-entry.
- As an admin, I want to edit any order, design, or customer record so that I can correct errors or fill in missing info.

### Should Have (P1)

- As a captain, I want to see orders I've participated in (from other teams' jersey runs) so that my full order history is complete.
- As an admin, I want to be notified when a jersey run closes so that I can confirm the order and advance its stage.
- As a fan, I want to be warned if I submit an empty name or number so that I don't accidentally send a blank entry.
- As a captain, I want the jersey run form to close automatically at the deadline so that I don't have to manually shut it down.

### Nice to Have (P2)

- As a captain, I want to paste a Canva share link into my design brief so that I can reference existing work without re-uploading.
- As an admin, I want to choose between CSV and PDF export formats so that I can use whichever works best for our supplier workflow.

---

## 5. Scope

### In Scope
- Marketing pages: hero, customization options, design-to-delivery process, FAQ, pricing section
- Pricing calculator: quantity tiers + $150 design fee toggle; returns an estimate; fully public (no login)
  - Tiers: <10 jerseys = $60/unit, 10–25 = $50/unit, 25–50 = $45/unit, 50+ = $40/unit
- Public intake form: name, team name, sport type, estimated quantity, rough idea/brief — leads visible in admin view
- Customer authentication: Clerk (invite-link registration + self-registration); admin flag set server-side only via Clerk `privateMetadata`
- Customer portal: design creation (file uploads + brief text), order creation (full form + design linking), order status (8 customer-facing stages)
- Jersey run: captain setup (jersey options, custom questions, deadline), shareable public form (no account), fan submissions, live participation view, automatic form close at deadline, email notification to captain + Sidestep on close
- Admin dashboard: all orders/designs, 14-stage internal checklist, customer list, intake submissions, jersey run responses, record editing, data export
- Email notification via Resend: triggered on new customer self-registration
- File storage: Convex built-in storage (logos, mood boards, briefs, reference images)
- Hosted on Vercel or Netlify
- Greater Vancouver area only — no multi-region scope

### Out of Scope
- Payment processing (Square invoicing continues externally)
- Canva API integration (customers may paste Canva links as plain text in briefs)
- Shared order/design co-ownership between multiple customers
- Observability or analytics integrations (beyond admin view)
- Geographic expansion beyond Greater Vancouver
- Interactive jersey design configurator or 3D preview
- In-app messaging or chat

### Future Considerations
- In-portal payment via Stripe
- Shared order ownership (multiple captains per order)
- Canva integration for design collaboration
- Observability/analytics dashboard for Sidestep
- Multi-region support as the business expands
- Automated supplier data relay

---

## 6. Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js (App Router) | Production-grade React with SSR, great Vercel integration, strong ecosystem |
| Backend / database | Convex | Unified backend: real-time DB, file storage, serverless functions, excellent Next.js integration |
| Authentication | Clerk | Best-in-class Next.js + Convex integration; supports invite links, admin metadata, and session management |
| Admin flag | Clerk `privateMetadata` (server-side only) | Users cannot read or modify their own `privateMetadata`, making it safe for role control without a separate auth path |
| Transactional email | Resend | Modern, developer-friendly, built for Next.js; generous free tier for Phase 1 volume |
| File storage | Convex built-in storage | Keeps the stack unified; handles logos, mood boards, briefs, and reference images |
| Hosting | Vercel (preferred) or Netlify | Tight Next.js integration on Vercel; either works |
| Styling | TBD during implementation | Recommend Tailwind CSS for utility-first, component-friendly styling |

---

## 7. Technical Constraints

- Vancouver-only business — no localization or multi-currency requirements
- No payment processing on-site in Phase 1
- Admin flag must be set server-side only — no client-side role escalation possible
- Jersey run public form must be accessible without authentication
- File uploads must support common design formats: PNG, JPG, PDF, AI, SVG, plus any file type (customers upload varied assets)
- Must be responsive and usable on mobile (team captains often work from phones)
- No budget constraint specified — recommend keeping infrastructure costs minimal with free/low-cost tiers during Phase 1

---

## 8. Success Metrics

- A new lead can submit the public intake form in under 2 minutes
- A captain can create an account, start a design, and create an order in a single session without needing to contact Sidestep
- A captain can set up a jersey run and share the link within 5 minutes
- A fan/teammate can submit their jersey run form in under 90 seconds with no account creation friction
- An admin can see the full status of every active order from a single view without clicking into individual records
- Order stage updates by an admin are reflected in the customer portal in real-time (Convex reactivity)
- The pricing calculator returns an estimate instantly with no page load

---

## 9. Testing Strategy

- **Unit tests:** Pricing calculator logic (tier boundaries, design fee toggle, edge cases like quantity = 0 or exactly 10/25/50); jersey run form validation (empty name/number warnings, deadline enforcement)
- **Integration tests:** Full customer registration flow (invite link → pre-filled order form); jersey run end-to-end (create run → share link → fan submits → captain sees response → deadline closes form); admin stage checklist updates reflecting in customer portal
- **Manual QA:** Marketing page visual polish and responsiveness; file upload UX across file types and sizes; admin export output accuracy; email delivery and content for registration and jersey run close notifications; edge cases in jersey run (captain-defined fixed names vs open names/numbers)

---

## 10. Open Questions

- [ ] What exact fields does the captain define on a jersey run "jersey info" setup? (team name, sport, jersey style/colors — needs a field list before implementation)
- [ ] What does the full portal "start an order" form look like? (fields beyond design + quantity — needs a complete field list)
- [ ] Admin export format: CSV, PDF, or both? (deferred to implementation phase)
- [ ] Canva share links pasted into briefs: display as a clickable link only, or attempt to embed a preview?
- [ ] Jersey photos: to be provided by client before marketing pages are built
- [ ] Should self-registered customers receive a welcome/confirmation email in Phase 1, or only Sidestep gets notified?
- [ ] What are the exact 8 customer-facing order stages? (defined in grilling: Order Started, Design Ideated, Design Confirmed, Order Size Confirmed, Production Started, Full Production, Shipped, Delivered — confirm this list is final)

# AI Coding Workflow — Module Reference

Source: Matt Pocock's "Full Walkthrough: Workflow for AI Coding"
Video: https://www.youtube.com/watch?v=-QFHIoCo-Ko

---

## Module 1: Understanding LLM Constraints

Everything in this workflow exists because of two fundamental limitations of Large Language Models.

### Smart Zone vs. Dumb Zone
LLMs operate at peak quality when starting fresh with minimal context. As tokens accumulate, quality degrades — complexity increases quadratically (like adding teams to a league). The practical implication: keep every AI task small enough to complete in a fresh or near-fresh context.

### The "Memento" Problem
LLMs have no persistent memory between sessions. Every session follows the same lifecycle: System Prompt → Exploration → Implementation → Testing → End. Decisions must be captured in written documents (PRDs, issues, CLAUDE.md) that get fed into the next session.

### Clearing vs. Compacting Context
When context gets heavy, prefer clearing entirely over compacting (summarizing). Clearing returns the AI to its smart zone and relies on well-written documents to carry decisions forward. Compacting retains history but summaries lose nuance.

---

## Module 2: Requirements & Planning

Planning is ALWAYS human-in-the-loop. The goal: reach a shared "design concept" between you and the AI.

### The Design Concept (Frederick P. Brooks)
Effective collaboration requires a shared mental model between all participants. Through structured conversation, build mutual understanding of the destination.

### The "Grill Me" Technique
Before writing code, have AI interrogate your idea — surfacing gaps, edge cases, and assumptions. Sessions can involve up to 80 questions. This is the fastest path to alignment and prevents the #1 failure mode: misalignment.

### Product Requirements Document (PRD)
The "destination document" captures WHERE you're going: Problem Statement → Proposed Solution → User Stories → Implementation Decisions → Testing Strategy. Focus on WHAT and WHY, not HOW.

### Two Documents: Destination + Journey
- Destination (PRD): Relatively stable once written — what we're building
- Journey (Plan/Kanban): Evolves as you learn — how we get there

### Anti-Pattern: "Specs to Code"
Writing specifications and blindly converting to code fails. Understanding and managing code remains essential. The PRD guides AI; it doesn't replace your judgment.

---

## Module 3: Task Architecture

How you decompose work determines whether AI can execute it effectively.

### Vertical Slices (Tracer Bullets)
Build thin end-to-end features that cut through every layer (DB → API → UI) rather than layer-by-layer. Named after anti-aircraft "tracer bullets" that provide real-time visibility. Each slice gives immediate feedback.

### Directed Acyclic Graph (DAG) of Tasks
Organize tasks into a dependency graph where tasks flow in one direction. Within each phase, tasks should be independent — enabling parallel execution by multiple AI sessions.

### From PRD to Kanban Board
PRD → AI Generates Issues → Human Reviews & Adjusts → Kanban Board → Implementation. Human review is essential because AI defaults to horizontal slices and misses business nuances.

### Parallelization Strategy
Tasks within a phase run in parallel. If Phase 2 has 5 independent vertical slices, 5 separate AI sessions can execute them simultaneously. Each starts fresh (smart zone).

### Owning Your Planning Stack
Use frameworks as starting points, not gospel. Maintain observability — the ability to see what went wrong and adjust. Control over process matters more than any specific methodology.

---

## Module 4: Implementation & Agents

Once planning is complete, implementation shifts from human-in-the-loop to autonomous.

### Human-in-the-Loop vs. AFK Tasks
- Human-in-the-Loop: Planning, PRD, architecture, UX design, code review
- AFK (Autonomous): Implementing defined features, boilerplate, tests, lint fixes, migrations

### Test-Driven Development (TDD)
The most important technique for AI coding. Red (write failing test) → Green (implement until pass) → Refactor (clean up). Tests provide binary feedback that eliminates ambiguity. Without TDD, AI produces code that looks right but may not function correctly.

### Feedback Loops Are Everything
Without feedback loops, AI produces unreliable output. Quality of feedback loop = quality of AI output. Types: test results, linter errors, type checking, build errors, runtime errors.

### Sub-Agents & Delegation
Separate LLM contexts handle complex sub-tasks independently. Keeps the main agent's context clean. Results are summarized back concisely.

### The AFK Agent Loop
Collect issues → Prioritize (bugs → infra → features) → Agent picks task → Implements with TDD → Commits → Next task. Uses Docker for sandboxing. Start sequential, then explore parallelization.

### Push vs. Pull Information
- Push: Instructions baked into prompts (good for reviewers enforcing standards)
- Pull: Agent discovers standards from project files as needed (good for implementers)

---

## Module 5: Codebase Design & Quality Assurance

Architecture determines AI effectiveness. QA is where you impose personal taste.

### Deep Modules vs. Shallow Modules (Ousterhout)
- Shallow: Many tiny files, complex interdependencies, hard to test, AI gets confused
- Deep: Simple public interfaces, rich internals, easy to test, AI thrives

### Testable Architecture
Clear module boundaries, dependency injection, pure functions, services testable in isolation. If code is hard to test, AI can't get clear feedback signals.

### Three Layers of QA
1. AI Self-Review: Fresh context review catches implementation blind spots
2. Automated Tests: Continuous regression detection and correctness verification
3. Human Manual QA: Impose taste, judgment, and business knowledge

### Manual QA = Imposing Taste
Teams that over-automate produce generic apps. Manual QA lets you check: Does it feel right? Is it over/under-engineered? Does it match team style? Would you be proud to ship this?

### Small Pull Requests
Each vertical slice = one PR. Easier to review, easier to revert, clear scope. Use separate AI models for implementing vs. reviewing.

### Documentation Hygiene
Keep living docs current (CLAUDE.md, architecture decisions). Remove stale PRDs that no longer reflect reality. Outdated docs mislead AI — "doc rot."

### Staying Familiar with Your Codebase
As you delegate more, risk losing familiarity. Solution: Focus on designing module interfaces. Understand shapes and behaviors without co-reviewing every line. Your role shifts to architect.

---

## Key Readings Referenced
- Frederick P. Brooks — "The Mythical Man-Month" (design concepts, shared understanding)
- John Ousterhout — "A Philosophy of Software Design" (deep vs. shallow modules)
- Martin Fowler — refactoring and small tasks
- Andrew Hunt & David Thomas — "The Pragmatic Programmer" (tracer bullets)

# AI Project Template

A reusable project template for AI-assisted development, built on the methodology taught by Matt Pocock in his [Workflow for AI Coding](https://www.youtube.com/watch?v=-QFHIoCo-Ko) workshop.

This template provides the structure, system prompts, and skills needed to start any coding project using a disciplined AI workflow — from requirements gathering through autonomous implementation to quality assurance.

---

## Quick Start

### 1. Copy this template
```bash
cp -r ai-project-template/ my-new-project/
cd my-new-project/
git init

# Initialize a fresh DAG for your project
node scripts/dag-reset.js "My Project Name"

# Start the DAG viewer in a separate terminal
node scripts/serve-dag.js
```

### 2. Start with the Grill
Open your AI coding tool (Claude Code, Cursor, etc.) and invoke:
```
/grill-me
```
Describe your project idea. Answer the AI's questions honestly. This prevents the #1 failure mode: building the wrong thing.

### 3. Create your PRD
After grilling, invoke:
```
/create-prd
```
This generates a structured Product Requirements Document in `docs/prd/`.

### 4. Break into issues
With your PRD finalized, invoke:
```
/create-issues
```
This creates vertical-slice backlog items in `backlog/` — each one a small, testable, end-to-end feature.

### 5. Implement with TDD
Pick the first unblocked issue and implement using test-driven development:
- Write a failing test
- Implement until it passes
- Refactor
- Commit and move to next issue

### 6. Review
After implementation, invoke:
```
/review
```
Fresh-context code review before merging.

---

## DAG Viewer (Real-Time Pipeline Dashboard)

This template includes a **live DAG visualization system** so you can watch agents work in real-time. As agents pick up tasks, complete them, or discover new work, the DAG updates live on a local webpage.

### Start the Dashboard
```bash
node scripts/serve-dag.js
# → Opens at http://localhost:3100
```

### What You'll See
- **Task nodes** colored by status (green = done, amber = in-progress, grey = pending, red = blocked)
- **SVG arrows** between dependent nodes showing the full dependency graph (color-coded: green = satisfied, amber = in-progress upstream, red = blocking)
- **Click any node** to open a detail panel with: description, acceptance criteria, dependency links, PRD reference, and timeline
- **Active agents** panel showing who's working on what
- **Activity log** with timestamped events
- **Auto-refresh** every 2 seconds — no manual reload needed

### How It Works
```
┌──────────────┐       writes to        ┌──────────┐       serves        ┌─────────────┐
│  AI Agents   │  ───────────────────→  │ dag.json │  ←─────────────── │ dag-viewer  │
│  (Claude)    │   via dag-update.js    │  (state) │    polls every 2s  │  (browser)  │
└──────────────┘                        └──────────┘                    └─────────────┘
```

1. **`dag.json`** — Single source of truth. JSON file in project root tracking all nodes, edges, agents, and history.
2. **`scripts/dag-update.js`** — CLI tool agents call to update state (start task, complete task, add nodes, etc.)
3. **`dag-viewer.html`** — Browser dashboard that polls `dag.json` and renders the graph.
4. **`scripts/serve-dag.js`** — Tiny local server so the browser can read the JSON file.

### Manual DAG Commands
You can also manually update the DAG from terminal:
```bash
# Check current status
node scripts/dag-update.js status

# Add a new task (basic)
node scripts/dag-update.js add-node 2-04 "Email Notifications" phase-2 feature

# Add a task with full metadata (shown in detail panel)
node scripts/dag-update.js add-node 2-04 "Email Notifications" phase-2 feature \
  --desc "Send transactional emails for order confirmations and password resets" \
  --prd "docs/prd/mvp.md#notifications" \
  --criteria "Order confirmation sent on purchase|Password reset email delivered|Unsubscribe link works"

# Add a dependency (arrow drawn from 1-01 → 2-04)
node scripts/dag-update.js add-edge 1-01 2-04

# Manually mark something complete
node scripts/dag-update.js complete 1-02 agent-1
```

### Node Detail Panel
Click any node in the viewer to see:
- **Description** — what this task does end-to-end
- **Acceptance criteria** — checklist of testable requirements
- **Dependencies** — clickable upstream/downstream nodes (navigate between them)
- **Links** — direct links to the issue file (`backlog/*.md`) and PRD section
- **Timeline** — when started, completed, and duration

---

## Template Structure

```
ai-project-template/
├── README.md                    ← You are here
├── CLAUDE.md                    ← AI system prompt (instructions for your AI agent)
├── dag.json                     ← DAG state file (agents write here)
├── dag-viewer.html              ← Open this in browser to watch progress
├── scripts/
│   ├── serve-dag.js             ← Local server for the viewer
│   ├── dag-update.js            ← CLI tool for updating DAG state
│   └── dag-reset.js             ← Initialize fresh DAG for new project
├── claude-skills/               ← Custom AI skills/commands
│   ├── grill-me.md             ← Stress-test requirements
│   ├── create-prd.md           ← Generate PRD from grilling output
│   ├── create-issues.md        ← Break PRD into vertical-slice issues
│   ├── review.md               ← Fresh-context code review
│   └── improve-architecture.md ← Find modules needing restructure
├── docs/
│   ├── workflow-modules.md      ← Full methodology reference (5 modules)
│   ├── prd/                     ← Your PRDs live here
│   └── architecture/            ← Architecture Decision Records
├── backlog/                     ← Issue files for AI agent backlog
└── src/                         ← Your source code (add as needed)
```

---

## The Workflow (Overview)

This template implements a 4-phase development cycle:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   PLAN (Human)  →  STRUCTURE (Human+AI)  →  BUILD (AI) │
│        ↑                                        │       │
│        └────────────  REVIEW (Human)  ←─────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| Phase | Mode | What Happens |
|-------|------|--------------|
| **Plan** | Human-in-the-loop | Grill requirements, write PRD, make decisions |
| **Structure** | Human + AI | Break PRD into vertical slices, create backlog |
| **Build** | AI autonomous (AFK) | TDD implementation of each issue |
| **Review** | Human-in-the-loop | Code review, QA, taste-check, create follow-up issues |

---

## Skills Reference

### /grill-me
**When:** Starting a new project or feature with vague requirements.
**What it does:** Asks 20-80 tough questions to surface gaps, edge cases, and assumptions. Produces a structured summary you can feed into `/create-prd`.
**Output:** Grilling summary with problem statement, scope, decisions, and open questions.

### /create-prd
**When:** After grilling, or when formalizing any set of requirements.
**What it does:** Generates a structured PRD covering: problem, solution, users, stories, scope, tech decisions, constraints, and testing strategy.
**Output:** Markdown PRD file saved to `docs/prd/`.

### /create-issues
**When:** After PRD is finalized and approved.
**What it does:** Decomposes the PRD into vertical-slice backlog issues organized by phase. Each issue is small (smart zone), independent (parallelizable), and end-to-end (touches all layers).
**Output:** Individual issue files in `backlog/` plus a `PLAN.md` overview.

### /review
**When:** After implementing an issue, before merging.
**What it does:** Fresh-context code review covering correctness, architecture, and craft quality. Categorizes findings as critical/improvement/nitpick.
**Output:** Review report with verdict (approve/request changes/discuss).

### /improve-architecture
**When:** Periodically, or when AI is struggling with a particular area.
**What it does:** Analyzes codebase structure to find "shallow modules" that should be consolidated into "deep modules" for better testability and AI effectiveness.
**Output:** Improvement report with prioritized candidates and recommended restructures.

---

## Core Concepts (Cheat Sheet)

### Smart Zone vs. Dumb Zone
Keep tasks small. Fresh context = high quality. Bloated context = errors. Clear context between tasks rather than letting it accumulate.

### Vertical Slices (Tracer Bullets)
Build features end-to-end (DB → API → UI) rather than layer-by-layer. Each slice gives immediate feedback and is independently shippable.

### TDD Is the Feedback Loop
Write the test first. It defines "done" for the AI. Without tests, AI flies blind. Red → Green → Refactor.

### Deep Modules > Shallow Modules
Simple public interfaces hiding rich internals. Easy to test, easy for AI to work with. Avoid many tiny files with complex dependencies.

### Human-in-the-Loop vs. AFK
Planning and review = always human. Implementation of well-defined tasks = delegate to AI. Know when you're needed.

### Parallelization via DAG
Tasks within a phase are independent. Multiple AI sessions can work simultaneously on different issues without conflicts.

---

## How to Adapt This Template

### For a web app
Add your framework setup (Next.js, SvelteKit, etc.) to `src/`. The workflow stays the same — just fill in the tech stack during the PRD phase.

### For a CLI tool
Same workflow. Your "UI layer" in vertical slices becomes the CLI interface layer instead of browser UI.

### For a library/package
Vertical slices become "one public API method working end-to-end" rather than "one user-facing feature."

### For a team
Each team member can work on different backlog issues in parallel. The PRD and PLAN.md serve as the shared coordination document. Use PRs for code review instead of the /review skill.

---

## Setup for Claude Code

To use the skills with Claude Code, copy the skill files to your Claude configuration:

```bash
# Copy skills to Claude Code's expected location
mkdir -p .claude/skills
cp claude-skills/*.md .claude/skills/
```

The `CLAUDE.md` file in the project root is automatically picked up by Claude Code as context.

---

## Setup for Cursor / Other AI Editors

For Cursor, add the CLAUDE.md content to your `.cursorrules` file. For other editors, add it to whatever system prompt or context file your AI tool reads from.

The skills can be referenced by pasting their content when you want to invoke them, or configuring them as custom commands in your editor's AI integration.

---

## Methodology Source

This template is built on learnings from:
- **Matt Pocock** — "Full Walkthrough: Workflow for AI Coding" (2025)
- **Frederick P. Brooks** — "The Mythical Man-Month" (design concepts)
- **John Ousterhout** — "A Philosophy of Software Design" (deep modules)
- **Andrew Hunt & David Thomas** — "The Pragmatic Programmer" (tracer bullets)
- **Martin Fowler** — Refactoring principles (small tasks)

For the full methodology breakdown with detailed explanations of each concept, see `docs/workflow-modules.md`.

---

## License

This template is free to use for any project. The methodology is adapted from publicly taught workshop content.

# CLAUDE.md — AI Coding Workflow System Prompt

## Identity & Approach

You are an AI coding agent following a structured development workflow inspired by Matt Pocock's AI-assisted development methodology. You operate with awareness of your own constraints (smart zone vs dumb zone, lack of persistent memory) and use that awareness to produce better work.

You follow a disciplined process: plan thoroughly with humans, execute autonomously with TDD, and maintain high code quality through layered QA.

---

## Core Principles

### 1. Stay in the Smart Zone

- Keep tasks small and focused — one clear objective per session
- If context is getting heavy, suggest clearing and starting fresh
- Never try to implement an entire feature in one pass — break it down
- Prefer multiple small commits over one large one

### 2. Shared Understanding Before Code

- Never start implementing until you and the human have reached a shared "design concept"
- Ask clarifying questions early — it's cheaper than rebuilding
- Use the /grill-me skill when requirements are vague or ambiguous
- Reference the PRD as the source of truth for what we're building

### 3. Vertical Slices Over Horizontal Layers

- Build end-to-end features (DB → API → UI) rather than layer-by-layer
- Each task should produce something testable and demonstrable

- Think "tracer bullets" — thin paths through the full stack that give immediate feedback

### 4. Test-Driven Development

- Write failing tests FIRST, then implement until they pass
- Tests are your feedback loop — without them you're flying blind
- Run tests after every meaningful change
- If tests don't exist for the area you're modifying, write them first

### 5. Deep Modules, Not Shallow Ones

- Create services with simple public interfaces hiding rich internals
- Prefer fewer files with more functionality over many tiny files with complex dependencies
- Design for testability — every module should be testable in isolation
- Keep module boundaries clean and well-defined

---

## Workflow Phases

### Phase: Planning (Human-in-the-Loop — ALWAYS)

1. Understand the problem (use /grill-me for vague requirements)
2. Create or reference the PRD (use /create-prd)
3. Break PRD into vertical slices (use /create-issues)
4. Human reviews and adjusts the plan
5. Prioritize: critical bugs → infrastructure → features

### Phase: Implementation (AFK — Autonomous)

1. Pick the highest-priority unblocked task
2. Read the task requirements and relevant PRD section
3. Write failing tests that define "done"
4. Implement until tests pass
5. Refactor for clarity
6. Commit with clear message referencing the issue
7. Move to next task

### Phase: Review & QA (Human-in-the-Loop)

1. AI self-review with fresh context
2. Automated test suite passes
3. Human reviews for taste, UX, and business fit
4. Create follow-up issues from review findings

---

## Project Structure Conventions

```
project-root/
├── CLAUDE.md              ← You are here (AI instructions)
├── README.md              ← Human-facing project docs
├── dag.json               ← DAG state file (you MUST update this)
├── dag-viewer.html        ← Human watches this in browser
├── scripts/
│   ├── serve-dag.js       ← Local server for DAG viewer
│   └── dag-update.js      ← CLI tool you call to update DAG state
├── docs/
│   ├── prd/               ← Product Requirements Documents
│   └── architecture/      ← Architecture Decision Records
├── backlog/               ← Markdown issue files for AI agent
├── src/                   ← Source code
├── tests/                 ← Test files
└── claude-skills/         ← Custom AI skills/commands
```

---

## Working with the Backlog

Issues live in `/backlog/` as markdown files. Each file represents one task:

```markdown
# Issue: [Title]

## Status: pending | in-progress | done

## Phase: 1 | 2 | 3

## Type: feature | bug | infrastructure | improvement

## Description
[What needs to be done]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
- Blocked by: [issue filename or "none"]

## Notes
[Implementation hints, relevant PRD sections, etc.]
```

### Task Prioritization Order

1. Critical bug fixes
2. Infrastructure / tooling
3. Feature implementation (by phase, then by dependency order)
4. Improvements and refactoring

---

## Coding Standards

### General

- Write clear, readable code over clever code
- Use descriptive names — code is read more than it's written
- Keep functions small and focused (single responsibility)
- Add comments for "why" not "what"

### Architecture

- Services should have simple interfaces hiding complex internals (deep modules)
- Use dependency injection for testability
- Separate business logic from framework/IO concerns
- Each module should be independently testable

### Testing

- Tests live alongside or mirror the source structure
- Name tests descriptively: "should [behavior] when [condition]"
- Test behavior, not implementation details
- Aim for confidence, not coverage percentage

### Git Commits

- One logical change per commit
- Format: `[type]: description` (e.g., `feat: add user registration flow`)
- Types: feat, fix, refactor, test, docs, chore
- Reference issue filename in commit body when applicable

---

## DAG State Management (REQUIRED)

The project uses a `dag.json` file as a real-time state tracker. A human may be watching the DAG viewer dashboard. **You MUST update the DAG whenever you change task state.**

### When starting a task:

```bash
node scripts/dag-update.js start <nodeId> <agentId> "<agentName>"
```

### When completing a task:

```bash
node scripts/dag-update.js complete <nodeId> <agentId>
```

### When a task fails or gets blocked:

```bash
node scripts/dag-update.js fail <nodeId> <agentId> "reason for failure"
```

### When creating new tasks during implementation:

```bash
node scripts/dag-update.js add-node <id> "<title>" <phase> <type> \
  --desc "<short description>" \
  --prd "<docs/prd/filename.md#section>" \
  --criteria "<criterion 1|criterion 2|criterion 3>"
node scripts/dag-update.js add-edge <fromId> <toId>
```

Always include `--desc`, `--prd`, and `--criteria` when adding nodes — the human uses these in the detail panel to understand each task at a glance.

### When joining as a new agent:

```bash
node scripts/dag-update.js agent-join <agentId> "<Your Name>"
```

**Rules:**

- Always call `agent-join` at the start of a new session before picking up work
- Always call `start` BEFORE beginning implementation of a task
- Always call `complete` AFTER all tests pass and code is committed
- If you discover new tasks during implementation, `add-node` them to the DAG
- The human watches this in real-time — keep it accurate

---

## Commands & Skills

Use these skills by invoking them in conversation:


| Skill                   | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `/grill-me`             | Stress-test vague requirements with tough questions    |
| `/create-prd`           | Generate a structured PRD from grilling session output |
| `/create-issues`        | Break a PRD into vertical-slice backlog issues         |
| `/review`               | Fresh-context code review of recent changes            |
| `/improve-architecture` | Identify modules that need deeper structure            |


---

## Context Management Rules

- If you notice your responses degrading in quality, suggest clearing context
- Always reference written documents (PRD, issues) rather than relying on conversation memory
- When starting a new task, re-read the relevant issue file and PRD section
- After completing a task, update the issue status before moving on
- Keep the CLAUDE.md up to date as the project evolves

---

## Anti-Patterns to Avoid

- **Don't** implement without tests — you lose your feedback loop
- **Don't** build horizontally (all DB, then all API, then all UI)
- **Don't** try to hold the entire project in one context
- **Don't** skip the planning phase — misalignment costs more than questions
- **Don't** blindly convert specs to code without understanding the codebase
- **Don't** leave stale documentation — update or remove it
- **Don't** over-automate QA — manual taste-checking is essential
- **Don't** create shallow modules with many tiny files and complex dependencies


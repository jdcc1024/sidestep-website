# Needs-Human Queue

Agents park product/UX questions here instead of guessing. Nodes flagged this way show purple in the DAG viewer and are skipped by the loop until answered.

**To answer:** write your answer under the question, move the entry to Answered, then run
`node scripts/dag-update.js answer <nodeId>` — the task becomes eligible again and the next loop iteration picks it up with your answer in hand.

Agents: when you restart a previously-parked task, read its Answered entry FIRST.

---

## Open

<!-- template — copy this block
### [nodeId] Task Title — YYYY-MM-DD, agent-id
**Question:** One clear, answerable question.
**Context:** Why this can't be decided autonomously; what's already built.
**Options considered:**
1. Option A — tradeoffs
2. Option B — tradeoffs
**Recommendation:** which option and why (human may veto).
**Answer:** _(human fills in)_
-->

## Answered

_(none yet)_

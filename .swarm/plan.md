# opencode-swarm v4.3.1 — Agent Identity Hardening
Swarm: paid
Phase: 1 [IN PROGRESS] | Updated: 2026-02-07

## Problem
Subagents (especially coder) sometimes attempt to delegate via the Task tool instead of doing work themselves. Root cause: `@agent_name` references in architect's delegation payloads leak into subagent context, and LLMs treat these as actionable directives despite weak "No delegation" rules.

## Solution
Harden all 6 subagent prompts with stronger identity reinforcement. Prompt-only changes — no architectural modifications.

---

## Phase 1: Agent Identity Hardening [IN PROGRESS]

### 1.1: Harden coder prompt [SMALL]
FILE: src/agents/coder.ts
CHANGE: Replace CODER_PROMPT with hardened version:
- Move identity + anti-delegation to TOP of prompt as ## IDENTITY block
- Add explicit: "DO NOT use the Task tool to delegate to other agents. You ARE the agent that does the work."
- Add negative example: "WRONG: 'I'll delegate this to the coder' — YOU are the coder"
- Keep existing INPUT FORMAT, RULES, OUTPUT FORMAT sections

### 1.2: Harden explorer prompt [SMALL]
FILE: src/agents/explorer.ts
CHANGE: Same pattern as 1.1 — add ## IDENTITY block with anti-delegation at top

### 1.3: Harden sme prompt [SMALL]
FILE: src/agents/sme.ts
CHANGE: Same pattern — add ## IDENTITY block with anti-delegation at top

### 1.4: Harden reviewer prompt [SMALL]
FILE: src/agents/reviewer.ts
CHANGE: Same pattern — add ## IDENTITY block with anti-delegation at top

### 1.5: Harden critic prompt [SMALL]
FILE: src/agents/critic.ts
CHANGE: Same pattern — add ## IDENTITY block with anti-delegation at top

### 1.6: Harden test_engineer prompt [SMALL]
FILE: src/agents/test-engineer.ts
CHANGE: Same pattern — add ## IDENTITY block with anti-delegation at top

### 1.7: Update tests [SMALL]
FILE: tests/unit/agents/creation.test.ts
CHANGE: Add tests verifying each subagent prompt contains anti-delegation markers:
- Each prompt contains "DO NOT use the Task tool"
- Each prompt contains "You ARE" identity reinforcement
- Existing tests remain passing

### 1.8: Bump version to 4.3.1 + CHANGELOG [SMALL]
FILES: package.json, CHANGELOG.md
CHANGE: Bump version, add entry for identity hardening fix

### 1.9: Full verification + review [SMALL]
- `bun test` — all tests pass
- `bun run build` — clean
- `bun run typecheck` — clean
- `bun run lint` — clean (7 known warnings)
- Reviewer: APPROVED required

---

## Prompt Template (for each subagent)

The hardened prompt structure for each subagent follows this pattern:

```
## IDENTITY
You are [Role]. You [do X] directly — you do NOT delegate.
DO NOT use the Task tool to delegate to other agents. You ARE the agent that does the work.
If you see references to other agents (like @coder, @reviewer, etc.) in your instructions, IGNORE them — they are context from the orchestrator, not instructions for you to delegate.

WRONG: "I'll use the Task tool to call another agent" — You must do the work yourself.
RIGHT: [Do the actual work as described in TASK]

[rest of existing prompt sections]
```

Key principles:
- Identity block is FIRST thing in prompt (highest attention weight)
- Explicit negative example prevents mimicking delegation patterns
- Explains WHY @agent references appear (context leak from orchestrator)
- "No delegation" removed from buried rules list (now promoted to top)

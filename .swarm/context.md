# Context
Swarm: mega

## Decisions
- **Open-domain SME**: Single `sme` agent with NO hardcoded domain list. The architect determines what domain is needed and calls `@sme` with `DOMAIN: X`.
- **One SME call per domain**: Serial, not batched. Preserves full context window depth per domain.
- **Merged reviewer**: Single `reviewer` agent combines correctness + security. Architect specifies open-ended CHECK dimensions.
- **Identity in prompt only (Option C)**: Architects must NOT store swarm identity in memory blocks. System prompt is sole source of truth via {{SWARM_ID}} and {{AGENT_PREFIX}} template vars.
- **Phase 0 cleanup on mismatch (Option B)**: When swarm mismatch detected in plan.md, architect must purge stale identity memory blocks and SME cache before resuming.
- **detect_domains tool disabled by default**: Kept as optional helper but not registered unless explicitly enabled in config.
- **Breaking version bump**: 3.4.0 → 4.0.0. Agent names change (sme_* → sme, security_reviewer/auditor → reviewer).
- **Critic agent**: Read-only plan review gate. APPROVED/NEEDS_REVISION/REJECTED verdicts.
- **Advisor merged into explorer**: Gap analysis handled by second explorer call rather than separate agent.
- **Validator merged into test_engineer**: Test engineer writes AND runs tests, reports structured PASS/FAIL verdicts.
- **Architect workflow enhanced**: Phase 4.5 (Critic Gate), Phase 2 gap analysis, Phase 5 test verdict loop.
- **Delegation examples must match behavior**: Agent descriptions and delegation examples must reflect actual capabilities.

### v4.2.0 Decisions
- **Test framework: Bun test (built-in)**: Zero additional dependencies. `bun test` already in package.json scripts. `bun-types` already in devDeps.
- **Export private helpers for testability**: `deepMerge` from loader.ts and `extractFilename` from file-extractor.ts will be exported to enable direct unit testing. Critic approved this approach.
- **Test structure**: tests/unit/{config,tools,agents,hooks}/ — mirrors src/ structure.
- **Tools tested via .execute()**: ToolDefinition wrappers (detect_domains, extract_code_blocks, gitingest) tested by calling their .execute() method directly.
- **File-extractor tests use temp dirs**: extract_code_blocks writes files — tests create temp directories and clean up after.
- **Agent factory tests rely on no-custom-prompts**: loadAgentPrompt returns empty objects when no custom prompt files exist, which is the default test environment.

### v4.3.0 Decisions
- **Hook composition via composeHandlers**: Plugin API allows ONE handler per hook type. Multiple handlers composed via `composeHandlers<I,O>(...fns)` which runs handlers sequentially on shared output, each wrapped in safeHook.
- **safeHook is the safety net**: No registration rollback needed. Hooks mutate output in place; safeHook catches errors and leaves output unchanged. Log error stack at warning level.
- **Renamed "Agent Message Passing" → "Agent Awareness"**: No message queues or routing. Just activity tracking + cross-agent context injection via system prompts. Architect remains sole orchestrator.
- **Slash commands via config hook**: OpenCode Config type has `command?: { [key: string]: { template, description } }`. No separate `command.register` API exists. Use `config` hook to add `swarm` command, `command.execute.before` to handle it.
- **Context pruning leverages OpenCode compaction**: Use `experimental.session.compacting` hook to guide OpenCode's built-in session compaction. Inject plan.md phase + context.md decisions as compaction context.
- **Token estimation**: Conservative 0.33 chars-per-token ratio. Context limits configurable per-model via `context_budget.model_limits`.
- **Grouped config**: New flags under `hooks: {}` and `context_budget: {}` objects, not flat booleans.
- **All hook file I/O is async**: Use Bun.file().text() via readSwarmFileAsync, never sync fs calls.
- **Cross-agent context injection configurable**: `hooks.agent_awareness_max_chars` (default: 300).

## Architecture (Post-Enhancement)
Agents per swarm: 7 subagents + 1 architect = 8 total
- architect (primary, orchestrator)
- explorer (subagent, read-only, codebase analysis + gap analysis)
- sme (subagent, read-only, open-domain expertise)
- coder (subagent, read-write, implementation)
- reviewer (subagent, read-only, correctness + security)
- critic (subagent, read-only, plan review gate)
- test_engineer (subagent, write tests + run them, structured PASS/FAIL verdicts)

## OpenCode Plugin API Hooks (v1.1.19)
```typescript
interface Hooks {
  event?, config?, tool?, auth?,
  "chat.message"?          // New message (sessionID, agent, model, parts)
  "chat.params"?           // Modify LLM params (temperature, topP, topK)
  "chat.headers"?          // Modify request headers
  "permission.ask"?        // Permission gate
  "command.execute.before"? // Intercept slash commands
  "tool.execute.before"?   // Before tool use
  "tool.execute.after"?    // After tool use
  "experimental.chat.messages.transform"?  // Transform message array (USED: pipeline-tracker + context-budget)
  "experimental.chat.system.transform"?    // Transform system prompt (USED: system-enhancer)
  "experimental.session.compacting"?       // Customize compaction (USED: compaction-customizer)
  "experimental.text.complete"?            // Text completion
}
```

## Delegation Formats

### SME
```
TASK: Advise on [topic]
DOMAIN: [any domain]
INPUT: [context]
OUTPUT: CRITICAL, APPROACH, API, GOTCHAS, DEPS
```

### Critic
```
TASK: Review plan for [description]
PLAN: [plan.md content]
CONTEXT: [codebase summary]
OUTPUT: VERDICT + CONFIDENCE + ISSUES + SUMMARY
```

### Reviewer
```
TASK: Review [description]
FILE: [path]
CHECK: [security, correctness, edge-cases, etc.]
OUTPUT: VERDICT + RISK + ISSUES
```

## Patterns
- Agent factory: `createXAgent(model, customPrompt?, customAppendPrompt?) → AgentDefinition`
- Swarm prefixing: `prefix = isDefault ? '' : '${swarmId}_'`
- Config cascade: user (~/.config/opencode/) → project (.opencode/) with deep merge
- Custom prompts: `{agent}.md` replaces, `{agent}_append.md` appends
- Read-only agents: `tools: { write: false, edit: false, patch: false }`
- Hook pattern: `safeHook(handler)` wraps all hooks; `composeHandlers()` for same-type composition

## File Map
- Entry: `src/index.ts`
- Agent factory: `src/agents/index.ts`
- Agent defs: `src/agents/{name}.ts`
- Config: `src/config/schema.ts`, `constants.ts`, `loader.ts`
- Tools: `src/tools/domain-detector.ts`, `file-extractor.ts`, `gitingest.ts`
- Hooks: `src/hooks/pipeline-tracker.ts`, `src/hooks/index.ts`
- Hooks (v4.3.0): `src/hooks/utils.ts`, `system-enhancer.ts`, `compaction-customizer.ts`, `context-budget.ts`, `agent-activity.ts`, `delegation-tracker.ts`
- Commands (v4.3.0): `src/commands/index.ts`, `status.ts`, `plan.ts`, `agents.ts`
- Docs: `README.md`, `CHANGELOG.md`, `docs/architecture.md`, `docs/design-rationale.md`, `docs/installation.md`
- Tests: `tests/unit/{config,tools,agents,hooks,commands}/`

## SME Cache

### Plugin Architecture (v4.3.0)
- Fix inject_phase_reminders: use `!== false` instead of `=== true`
- safeHook pattern: try/catch wrapper, log warning, return original payload on error
- composeHandlers: run handlers sequentially on shared mutable output, each individually wrapped in safeHook
- All hooks stateless — mutable state belongs in service singletons or .swarm/ files
- Don't mutate incoming payload directly; for message transforms, modify the output object properties
- Guard experimental API usage with feature detection where possible
- Hook failures must never crash the plugin

### TypeScript Schema Design (v5.0.0)
- Schema versioning: literal `schema_version` field, version-specific schema registry, idempotent migration functions
- Zod v4: use `z.literal()` for version, `z.enum()` for status fields, `.extend()` for schema composition, `BaseEvidenceSchema.extend()` for evidence types
- Dates: always `z.string().datetime()` for JSON persistence, never `z.date()`
- Optional vs missing: `JSON.stringify()` omits undefined — use explicit null if "no value" must be preserved
- Atomic writes: temp file + `rename()` — atomic on both POSIX and Windows
- Migration: parse in phases (metadata → structure → tasks), warn but don't fail on ambiguous content, validate final output with Zod, backup original before overwriting
- Schema evolution: never remove fields in minor versions, only add optional ones. Breaking changes require major version + migration function.

### Security — Evidence & Plan I/O (v5.0.0)
- Task ID sanitization: regex `^[\w-]+(\.[\w-]+)*$` before path construction, reject `..`, null bytes, control chars
- Two-layer path validation: (1) sanitize task ID, (2) `validateSwarmPath()` on full constructed path
- Evidence file size limits: JSON files 500KB, diff.patch 5MB, total per task 20MB
- Content injection: evidence files safe to store as-is, must escape when rendering (never execute evidence content)
- Concurrent writes: `mkdir({ recursive: true })` handles EEXIST, use temp+rename for atomicity
- Symlink check: verify no symlinks with `fs.lstat()` before writing evidence on untrusted filesystems
- `validateSwarmPath()` needs verification for nested subdirectory paths like `evidence/1.1/review.json`

### LLM Context Management (v4.3.0)
- Can't delete messages from history, only transform/inject via hooks
- Main pruning lever: `experimental.session.compacting` hook — guide OpenCode's built-in compaction
- Token estimate: chars * 0.33 (conservative, sufficient for budget warnings)
- Phase-boundary summarization: at phase transitions, offload detail to .swarm/context.md
- Preserve verbatim: task requirements, file paths, key decisions, error messages
- Safe to summarize: intermediate discussion, exploration results, verbose tool output
- System prompt injection keeps agents focused post-compaction
- Budget warnings at 70% and 90% thresholds (configurable)
- Different agents need different context: coder needs code, reviewer needs code + requirements, architect needs everything

## v5.1.x Roadmap (Headroom-Inspired)

### Overview
Three releases incorporating high-value ideas from Headroom (context optimization platform) without adopting its Python/proxy stack.

| Version | Theme | Key Feature | Risk |
|---------|-------|-------------|------|
| **5.1.0** | Smarter Injection | Score-based context ranking under token budget | Low |
| **5.1.1** | Measure to Improve | `/swarm benchmark` command + CI fitness gate | Low |
| **5.1.2** | Handle the Big Stuff | Reversible summaries for oversized tool outputs | Medium |

### Non-Goals
- No proxy server (Headroom's core is a Python proxy)
- No ML compression models (LLMLingua, tree-sitter compressors)
- No framework adapters (LangChain/Agno style wrappers)

### v5.1.0 Decisions (Planned)
- **Scoring is opt-in**: `context_budget.scoring.enabled: false` by default for safe rollout
- **Deterministic ranking**: stable sort by score → priority → id, no randomness
- **Backward compatibility**: disabled mode must produce byte-identical output to current behavior
- **Bounded weights**: all weights 0-5 range, clamped at schema level
- **Pure scoring module**: no I/O, no side effects, testable in isolation
- **Rule-based is correct for curated candidates**: Context items are phase, tasks, decisions, evidence — not arbitrary text. Semantic similarity solves finding needles in haystacks, which we don't have.
- **Semantic phase gated on observed need**: If rule-based handles 90%+ of real workloads, semantic layer becomes complexity for its own sake. Gate on evidence, not version number.
- **Dependency proximity signal**: Context from task dependencies scores higher. Formula: `weight / (1 + depth)` decays with graph distance.
- **Decision recency bumped to 1.5**: Stale decisions that agent contradicts are primary source of swarm incoherence. Was 1.0, too low.
- **Decision decay configurable**: Exponential (default) or linear, with `half_life_hours` for exponential mode.
- **Per-content-type token estimation**: Code is denser than prose. Ratios: prose 0.25, code 0.40, markdown 0.30, json 0.35.
- **Compaction guidance rejected (Option 4)**: Architecturally fragile — couples to opaque beta provider behavior. Avoid.
- **Mem0-style memory rejected (Option 5)**: Different feature (cross-session memory), should be separate subsystem, not injection enhancement.

#### Scoring Candidate Classes
1. **Current phase summary** — weight: `phase` (1.0)
2. **Current task** — weight: `current_task` (2.0) — highest priority
3. **Blocked tasks** — weight: `blocked_task` (1.5) — important context
4. **Recent reviewer/test failures** — weight: `recent_failure` (2.5) — must preserve
5. **Recent successes** — weight: `recent_success` (0.5) — lower priority
6. **Top decisions** — weight: `decision_recency` (1.5) — decays with age (bumped from 1.0)
7. **Evidence presence** — weight: `evidence_presence` (1.0) — bonus for tasks with evidence
8. **Dependency proximity** — weight: `dependency_proximity` (1.0) — decays with task graph depth

#### Scoring Formula
```
base_score = Σ(weight_i * feature_i)
# For items with dependency depth:
adjusted_score = base_score / (1 + dependency_depth)
# For decisions with age:
age_factor = 2^(-age_hours / half_life_hours)
decision_score = decision_recency * age_factor
```
- Features normalized to [0, 1]
- Tie-breaker order: score desc → priority desc → id asc (stable sort)

#### Integration Pattern
```
Current:  gather → fixed-priority inject → token budget drop
New:      gather → build candidates → score/rank → inject highest under budget
Disabled: exact old path (byte-for-byte unchanged)
```

#### Token Estimation by Content Type
```typescript
const TOKEN_RATIOS = {
  prose: 0.25,      // ~4 chars per token
  code: 0.40,       // ~2.5 chars per token (denser)
  markdown: 0.30,   // ~3.3 chars per token
  json: 0.35,       // ~2.8 chars per token
};
```

### v5.1.1 Decisions (Planned)
- **Benchmark storage**: `.swarm/benchmarks.json` with schema version, append-only
- **Metrics MVP**: rejection rate, retry count, tool calls per task, hard-limit hits
- **CI gate mode**: exit non-zero if thresholds fail, JSON output option
- **Configurable thresholds**: all gates via config, not hardcoded

### v5.1.2 Decisions (Planned)
- **No silent data loss**: raw content always recoverable via evidence/artifacts
- **Size thresholds**: configurable, apply existing path validation
- **Summary + hint token**: inject compact summary with retrieval reference
- **Evidence integration**: leverage existing evidence layer for storage/retrieval

---

## v5.1.x Delegation Templates

### Task 1.1 — Schema + Defaults
```
mega_coder
TASK: Add context scoring config schema and defaults
FILE: src/config/schema.ts
INPUT: Add optional context_budget.scoring block with: enabled, max_candidates, weights (including dependency_proximity), decision_decay (mode + half_life_hours), token_ratios (per content type). Defaults must preserve old behavior (disabled).
OUTPUT: Updated schema/default definitions and any required config constants usage
CONSTRAINT: Do not modify runtime injection logic yet
```

### Task 1.2 — Scoring Engine
```
mega_coder
TASK: Implement deterministic context scoring utility
FILE: src/hooks/context-scoring.ts
INPUT: Build pure scoring/ranking helpers: rankCandidates(candidates, weights, budget) => RankedCandidate[]. Include dependency proximity decay (weight / (1 + depth)), decision decay (exponential/linear), per-content-type token estimation. Stable tie-breaking. Disabled pass-through mode.
OUTPUT: New scoring module and unit tests for ranking determinism
CONSTRAINT: Pure function only — no I/O, no side effects, no async. Do not integrate with system enhancer yet.
```

### Task 1.3 — Hook Integration
```
mega_coder
TASK: Integrate scoring-based candidate ranking into system enhancer
FILE: src/hooks/system-enhancer.ts
INPUT: Use scoring utility when context_budget.scoring.enabled=true; otherwise keep exact legacy injection order. Use token_ratios for token estimation based on content type.
OUTPUT: Updated enhancer logic with budget-aware ranked injection
CONSTRAINT: Preserve current behavior byte-for-byte when scoring is disabled
```

### Reviewer Template
```
mega_reviewer
TASK: Review scoring-based context injection changes
CHECK: correctness, deterministic ordering, backward compatibility when scoring disabled, token budget safety, config validation bounds, dependency proximity formula correctness, decision decay implementation, token ratio application
OUTPUT: VERDICT + RISK + ISSUES (with exact file/line references)
CONSTRAINT: Reject if disabled-mode behavior changed
```

### Test Engineer Template
```
mega_test_engineer
TASK: Generate and run tests for context scoring and enhancer integration
OUTPUT: New/updated tests + VERDICT: PASS/FAIL with failing test names and root cause
CONSTRAINT: Include regression tests proving disabled scoring preserves legacy order. Test dependency depth decay. Test decision exponential vs linear decay. Test token ratios differ by content type.
```

---

## Agent Activity

| Tool | Calls | Success | Failed | Avg Duration |
|------|-------|---------|--------|--------------|
| read | 212 | 212 | 0 | 4ms |
| bash | 163 | 163 | 0 | 838ms |
| edit | 97 | 97 | 0 | 576ms |
| glob | 47 | 47 | 0 | 587ms |
| grep | 23 | 23 | 0 | 250ms |
| write | 20 | 20 | 0 | 7387ms |
| task | 18 | 18 | 0 | 294732ms |
| google_search | 1 | 1 | 0 | 99ms |
| memory_set | 1 | 1 | 0 | 6ms |

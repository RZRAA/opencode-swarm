# Headroom-Inspired Swarm Improvements
Swarm: mega
Phase: 1 | Updated: 2026-02-11

## Roadmap Overview

| Version | Theme | Key Feature | Risk |
|---------|-------|-------------|------|
| **5.1.0** | Smarter Injection | Score-based context ranking under token budget | Low |
| **5.1.1** | Measure to Improve | `/swarm benchmark` command + CI fitness gate | Low |
| **5.1.2** | Handle the Big Stuff | Reversible summaries for oversized tool outputs | Medium |

**Non-Goals (out of scope)**
- No proxy server
- No ML compression models
- No framework adapters

---

## Phase 1: Score-Based Context Injection (v5.1.0) [COMPLETE] ✓

> **Critic Gate: APPROVED** (2026-02-12) — All 5 issues resolved, HIGH confidence

### Objective
Rank context candidates by importance before injecting under token budget. Current fixed-priority injection drops useful info; scoring keeps higher-value context.

### Design Rationale (External Review)
- Rule-based scoring is the right tool: candidates are already curated (phase, tasks, decisions, evidence), not arbitrary text
- Semantic similarity solves finding needles in haystacks — we don't have that problem yet
- Scoring function must be pure: `(candidates, weights, budget) => RankedCandidate[]` — no side effects, no async
- Ranking is just a sort — don't over-abstract

### Config Contract
```yaml
context_budget:
  scoring:
    enabled: false  # opt-in, safe default
    max_candidates: 100  # min 10, max 500
    weights:
      phase: 1.0
      current_task: 2.0          # highest - what agent is working on now
      blocked_task: 1.5          # important context about blockers
      recent_failure: 2.5        # must preserve to avoid repetition
      recent_success: 0.5        # lower priority - already done
      evidence_presence: 1.0     # bonus for tasks with evidence
      decision_recency: 1.5      # bumped from 1.0 - stale decisions cause incoherence
      dependency_proximity: 1.0  # NEW: decays with task graph depth
    decision_decay:
      mode: "exponential"        # "linear" | "exponential"
      half_life_hours: 24        # for exponential decay
    token_ratios:                # NEW: per-content-type estimation
      prose: 0.25                # ~4 chars per token
      code: 0.40                 # ~2.5 chars per token (denser)
      markdown: 0.30             # ~3.3 chars per token
      json: 0.35                 # ~2.8 chars per token
```

### Dependency Proximity Formula
```
dependency_score = base_weight / (1 + depth)

Example:
- Task A failure (dependency depth 0): 2.5 / 1 = 2.5
- Task A failure (dependency depth 1): 2.5 / 2 = 1.25
- Task A failure (dependency depth 3): 2.5 / 4 = 0.625
```

### Decision Decay Formula
```
# Exponential (default)
age_factor = 2^(-age_hours / half_life_hours)
adjusted_weight = decision_recency * age_factor

# Linear
age_factor = max(0, 1 - (age_hours / max_age_hours))
adjusted_weight = decision_recency * age_factor
```

### Tasks

- [x] 1.1: Add context scoring config schema + defaults [SMALL] ✓ COMPLETE
  - Files: `src/config/schema.ts`, `src/config/constants.ts`, `tests/unit/config/schema.test.ts`
  - Add `ScoringConfigSchema` under `context_budget` with all fields above
  - Add `DEFAULT_SCORING_CONFIG` constant in constants.ts with full defaults
  - Add `resolveScoringConfig(userConfig)` helper that deep-merges user config with defaults
  - Backward compatibility: missing `scoring` block → use defaults; partial weights → merge with defaults
  - Include `dependency_proximity`, `decision_decay`, and `token_ratios` sub-configs

- [x] 1.2: Implement pure scoring function + ranking engine [MEDIUM] ✓ COMPLETE
  - Files: new `src/hooks/context-scoring.ts`, `tests/unit/hooks/context-scoring.test.ts`
  - Types:
    ```typescript
    interface ContextCandidate {
      id: string;
      kind: 'phase' | 'task' | 'decision' | 'evidence' | 'agent_context';
      text: string;
      tokens: number;           // pre-computed, not recalculated
      priority: number;
      metadata: {
        contentType: 'prose' | 'code' | 'markdown' | 'json';
        dependencyDepth?: number;  // for task-related items
        decisionAge?: number;      // hours since decision
        isCurrentTask?: boolean;
        isBlockedTask?: boolean;
        hasFailure?: boolean;
        hasSuccess?: boolean;
        hasEvidence?: boolean;
      };
    }
    ```
  - Pure function: `rankCandidates(candidates, config): RankedCandidate[]`
  - No side effects, no async — trivially testable
  - Stable sort: score desc → priority desc → id asc
  - Disabled mode (enabled=false): return original order untouched
  - Edge cases:
    - budget=0 → return empty array
    - max_candidates < actual → truncate before ranking
    - all scores=0 → fall back to priority order
  - Performance: token count pre-computed at candidate creation, not during ranking

- [x] 1.3: Wire scoring into system enhancer budget injection [MEDIUM] ✓ COMPLETE
  - Files: `src/hooks/system-enhancer.ts`, `tests/unit/hooks/system-enhancer.test.ts`
  - When enabled: gather → build candidates → score/rank → inject highest under budget
  - When disabled: exact legacy path, byte-for-byte unchanged
  - Use `token_ratios` for per-content-type token estimation

- [x] 1.4: Add deterministic unit tests for scoring and no-regression mode [MEDIUM] ✓ COMPLETE
  - Scoring disabled => baseline ordering unchanged
  - Scoring enabled => ranking changes as expected
  - Tie-breaking deterministic across multiple runs
  - max_candidates truncates candidate pool before ranking
  - Invalid weights/bounds rejected by schema
  - Dependency proximity: verify depth decay formula
  - Decision decay: verify exponential vs linear modes
  - Token ratios: verify code vs prose estimation differs

- [x] 1.5: Update docs/changelog and bump version to 5.1.0 [SMALL] ✓ COMPLETE

### Gate Criteria
- Reviewer verdicts: APPROVED on all tasks
- Test engineer verdict: PASS on full suite
- No behavior drift in disabled mode
- Version + changelog updated before commit

---

## Phase 2: Benchmark Command (v5.1.1) [PENDING]

### Objective
Add `/swarm benchmark` to measure swarm health and enable CI fitness gates.

### Config Contract
- `benchmark.thresholds.rejection_rate_max: number` (default 0.3)
- `benchmark.thresholds.retry_count_max: number` (default 3)
- `benchmark.thresholds.hard_limit_hits_max: number` (default 5)
- `benchmark.history_max: number` (default 100 runs)

### Tasks

- [ ] 2.1: Add benchmark data model + storage helpers [MEDIUM]
  - Files: `src/metrics/benchmark.ts`, `src/config/schema.ts`, `tests/unit/metrics/`
  - Types: `BenchmarkRun`, `BenchmarkThresholds`, `BenchmarkHistory`
  - Storage: `.swarm/benchmarks.json` with schema version + append-only runs

- [ ] 2.2: Implement /swarm benchmark command (run + report) [MEDIUM] (depends: 2.1)
  - Files: `src/commands/benchmark.ts`, `src/commands/index.ts`, `tests/unit/commands/`
  - `/swarm benchmark` → prints last N runs and key metrics
  - `/swarm benchmark run` → computes current metrics snapshot
  - Metrics: reviewer rejection rate, test fail-loop count, avg tool calls per task, hard-limit hits

- [ ] 2.3: Add CI-friendly benchmark gate mode [SMALL] (depends: 2.2)
  - `/swarm benchmark gate` → exits non-zero in CLI mode if thresholds fail
  - Configurable thresholds from config
  - JSON output option for CI parsing

- [ ] 2.4: Add tests + docs + changelog + version bump to 5.1.1 [MEDIUM] (depends: 2.3)
  - Tests: pass/fail gating, malformed history handling, metric calculations
  - Docs: README.md benchmark section
  - Changelog: Added (benchmark command, CI gate mode), Tests

---

## Phase 3: Reversible Summaries (v5.1.2) [PENDING]

### Objective
Summarize oversized tool outputs while preserving raw payload for later retrieval via evidence.

### Config Contract
- `context_budget.oversized_threshold_chars: number` (default 10000)
- `context_budget.summary_max_chars: number` (default 500)

### Tasks

- [ ] 3.1: Add reversible summary artifact schema for oversized outputs [MEDIUM]
  - Files: `src/config/schema.ts`, `src/evidence/schema.ts`, `tests/unit/config/`, `tests/unit/evidence/`
  - New evidence type: `oversized_output` with summary text + artifact reference
  - Artifact storage: `.swarm/artifacts/{hash}.txt` (or similar)

- [ ] 3.2: Integrate summarize+store flow in tool hooks [LARGE] (depends: 3.1)
  - Files: `src/hooks/guardrails.ts` or new `src/hooks/tool-output-handler.ts`
  - When output exceeds threshold: store raw → inject summary + retrieval hint
  - Size limits and path validation via existing evidence layer

- [ ] 3.3: Add retrieval path via /swarm evidence [task] details [MEDIUM] (depends: 3.2)
  - Files: `src/commands/evidence.ts`, `tests/unit/commands/`
  - Show summary entries with raw artifact references
  - Optional `--raw` flag to dump full artifact content

- [ ] 3.4: Add tests + docs + changelog + version bump to 5.1.2 [MEDIUM] (depends: 3.3)
  - Tests: boundary sizes, retrieval integrity, no data loss
  - Docs: README.md oversized output handling section
  - Changelog: Added (reversible summaries, artifact storage), Changed (tool output handling), Tests

---

## Architect Handoff Protocol

For each task:
1. `mega_coder` implements single task
2. `mega_reviewer` reviews with checks: correctness, edge-cases, backward compatibility
3. If rejected, loop back to coder (max 5 attempts)
4. `mega_test_engineer` writes/runs tests only after approval
5. Mark task complete in plan.md

**Rules:**
- Never batch multiple coding objectives into one coder call
- Never skip version/changelog rule on source/dist changes
- Each release: schema → logic → tests → docs → version bump
- Gate: reviewer approval + test pass required before proceed

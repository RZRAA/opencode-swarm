# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.1] - 2026-02-07
### Fixed
- **Agent identity hardening** — Added `## IDENTITY` block at the top of all 6 subagent prompts (coder, explorer, sme, reviewer, critic, test_engineer) with explicit anti-delegation directives, WRONG/RIGHT examples, and explanation that @agent references in task payloads are orchestrator context, not delegation instructions. Fixes issue where subagents would attempt to delegate via the Task tool instead of doing work themselves.

### Added
- **36 new tests** (483 total) — Identity hardening tests verify anti-delegation markers in all subagent prompts.

## [4.3.0] - 2026-02-07
### Added
- **Hooks pipeline system** — `safeHook()` crash-safety wrapper and `composeHandlers()` for composing multiple handlers on the same hook type. Foundation for all v4.3.0 features.
- **System prompt enhancer** (`experimental.chat.system.transform`) — Injects current phase, task, and key decisions from `.swarm/` files into agent system prompts, keeping agents focused post-compaction.
- **Session compaction enhancer** (`experimental.session.compacting`) — Enriches OpenCode's built-in session compaction with plan.md phase info and context.md decisions.
- **Context budget tracker** (`experimental.chat.messages.transform`) — Estimates token usage and injects budget warnings at configurable thresholds (70%/90%). Supports per-model token limits.
- **Slash commands** — `/swarm status`, `/swarm plan [N]`, `/swarm agents`. Registered via `config` hook and handled via `command.execute.before`.
- **Agent awareness: activity tracking** — `tool.execute.before`/`tool.execute.after` hooks track tool usage per agent. Flushes activity summary to `context.md` every 20 events with promise-based write lock.
- **Agent awareness: delegation tracker** — `chat.message` hook tracks active agent per session. Opt-in delegation chain logging (disabled by default).
- **Agent awareness: cross-agent context injection** — System enhancer reads Agent Activity section from context.md and injects relevant context labels (coder/reviewer/test_engineer) into system prompts. Configurable max chars (default: 300).
- **Shared swarm state** (`src/state.ts`) — Module-scoped singleton with zero imports. Tracks agent map, event counters, and flush locks. `resetSwarmState()` for testing.
- **238 new tests** (447 total, up from 209) across 12 new test files covering hooks, commands, state, and agent awareness.

### Changed
- **System enhancer** now also injects cross-agent context from the Agent Activity section of context.md.
- **Plugin entry** (`src/index.ts`) registers 7 hook types (up from 1): `experimental.chat.messages.transform`, `experimental.chat.system.transform`, `experimental.session.compacting`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `chat.message`.
- **Pipeline tracker** refactored to use `safeHook()` wrapper.
- **Config schema** extended with `hooks` and `context_budget` groups for fine-grained feature control.

## [4.2.0] - 2026-02-07
### Added
- **Comprehensive test suite** — 209 unit tests across 9 test files using Bun's built-in test runner. Zero additional dependencies.
  - Config tests: constants (14), schema validation (27), config loader with XDG isolation (17)
  - Tools tests: domain detector (30), file extractor with temp dirs (16), gitingest with fetch mocking (5)
  - Agent tests: creation functions (64), factory + swarm prefixing (20)
  - Hooks tests: pipeline tracker transform behavior (16)
- Exported `deepMerge` from `src/config/loader.ts` and `extractFilename` from `src/tools/file-extractor.ts` for testability.

## [4.1.0] - 2026-02-06
### Added
- **Critic agent** — New plan review gate that evaluates the architect's plan BEFORE implementation begins. Returns APPROVED/NEEDS_REVISION/REJECTED verdicts with confidence scores and up to 5 prioritized issues. Includes AI-slop detection.
- **Phase 4.5 (Critic Gate)** in architect workflow — Mandatory plan review between planning and execution. Max 2 revision cycles before escalating to user.
- **Gap analysis** in Phase 2 discovery — Architect now makes a second explorer call focused on hidden requirements, unstated assumptions, and scope risks.

### Changed
- **Test engineer** now writes AND runs tests, reporting structured PASS/FAIL verdicts instead of only generating test files. 3-step workflow: write → run → report.
- **Architect prompt** updated with test execution delegation examples and verdict loop in Phase 5 (5d-5f).
- Updated all documentation (README.md, architecture.md, design-rationale.md, installation.md) to reflect new agent structure and workflow.

## [4.0.1] - 2026-02-06
### Fixed
- Strengthened architect review gate enforcement — explicit STOP instruction on REJECTED verdict to prevent proceeding to test generation before code review passes.

## [4.0.0] - 2026-02-06
### Changed
- **BREAKING:** Replaced 16 individual SME agents (sme_security, sme_vmware, sme_python, etc.) with a single open-domain `sme` agent. The architect determines the domain and the LLM's training provides expertise.
- **BREAKING:** Merged `security_reviewer` and `auditor` into a single `reviewer` agent. Architect specifies CHECK dimensions per review.
- **BREAKING:** Removed `_sme` and `_qa` category prefix config options.
- **BREAKING:** Config schema changes — `multi_domain_sme` and `auto_detect_domains` options removed.
- Agent count reduced from 20+ to 7 per swarm (architect, explorer, sme, coder, reviewer, test_engineer).
- Swarm identity managed exclusively through system prompt template variables ({{SWARM_ID}}, {{AGENT_PREFIX}}).
- Phase 0 now cleans up stale identity memory blocks on swarm mismatch.
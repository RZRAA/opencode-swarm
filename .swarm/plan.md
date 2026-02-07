# opencode-swarm v4.3.2 — Security Defense-in-Depth
Swarm: paid
Phase: 1 [IN PROGRESS] | Updated: 2026-02-07

## Problem
Security review (APPROVED, LOW risk) identified 4 defense-in-depth improvements: path traversal in file I/O, unbounded fetch in gitingest, unbounded recursion in deepMerge, and unbounded config file reads. None are critical — no external untrusted input reaches these paths today — but all are best-practice hardening.

## Solution
Add input validation and resource limits to 4 functions across 3 files. Logic changes only — no architectural modifications.

---

## Phase 1: Security Hardening [COMPLETE]

### 1.1: Path validation in readSwarmFileAsync [SMALL]
- [x] 1.1
FILE: src/hooks/utils.ts
CHANGE:
- Import `path` from `node:path`
- Add `validateSwarmPath(directory, filename)` helper that:
  - Rejects null bytes in filename: `/[\0]/.test(filename)`
  - Rejects traversal sequences: `/(\.\.[/\\])/.test(filename)`
  - Uses `path.resolve` + `path.normalize` on both the resolved filepath and the base `.swarm` dir
  - On Windows: compare normalized paths case-insensitively (via `.toLowerCase()` when `process.platform === 'win32'`)
  - Verifies resolved path starts with normalized base + `path.sep`
  - Throws Error with descriptive message on violation
- Call validateSwarmPath before constructing the path in readSwarmFileAsync
- Export validateSwarmPath for testing and reuse

### 1.2: Fetch timeout + size guard in gitingest [MEDIUM]
- [x] 1.2 (depends: none)
FILE: src/tools/gitingest.ts
CHANGE:
- Add exported constants: `GITINGEST_TIMEOUT_MS = 10_000`, `GITINGEST_MAX_RESPONSE_BYTES = 5_242_880`, `GITINGEST_MAX_RETRIES = 2`
- Use `AbortSignal.timeout(GITINGEST_TIMEOUT_MS)` (standard Web API, fully supported by Bun's fetch)
- Implement retry loop: max GITINGEST_MAX_RETRIES retries on 5xx or network errors only (not 4xx)
- Exponential backoff between retries (200ms * 2^attempt)
- After response.ok, check Content-Length header; if present and > 5MB, throw before reading body
- Read response as text, check `Buffer.byteLength(text)`, throw if > 5MB
- Catch DOMException from AbortSignal.timeout, throw domain-specific "gitingest request timed out" error
- Keep existing GitingestArgs interface unchanged

### 1.3: Depth limit on deepMerge [SMALL]
- [x] 1.3 (depends: none)
FILE: src/config/loader.ts
CHANGE:
- Add exported `MAX_MERGE_DEPTH = 10` constant
- Keep existing public `deepMerge<T>(base?, override?)` signature unchanged
- Internally, call a private `deepMergeInternal<T>(base, override, depth)` that increments depth on recursion
- When `depth >= MAX_MERGE_DEPTH`, throw Error("deepMerge exceeded maximum depth of 10")
- Public deepMerge calls deepMergeInternal with depth=0
NOTE: Public API signature is fully backward-compatible. No overload or parameter changes.

### 1.4: Config file size limit [SMALL]
- [x] 1.4 (depends: none)
FILE: src/config/loader.ts
CHANGE:
- Add exported `MAX_CONFIG_FILE_BYTES = 102_400` constant (100 KB)
- In loadConfigFromPath, before readFileSync: call `fs.statSync(configPath).size`
- If size > MAX_CONFIG_FILE_BYTES, log warning "[opencode-swarm] Config file too large (max 100 KB): {path}" and return null
- Handle ENOENT from statSync: if file doesn't exist, return null (same as current behavior)
NOTE: loadConfigFromPath already returns null for ENOENT, invalid JSON, and invalid schema. The sole caller `loadPluginConfig` already handles null via `?? { defaults }` and null-check. No backward-compatibility issue.

### 1.5: Update tests [MEDIUM]
- [x] 1.5 (depends: 1.1, 1.2, 1.3, 1.4)
FILES: tests/unit/hooks/utils.test.ts, tests/unit/tools/gitingest.test.ts, tests/unit/config/loader.test.ts
CHANGE:
- utils.test.ts: Add tests for validateSwarmPath (null bytes, traversal, valid paths, normalized paths)
- utils.test.ts: Add tests for readSwarmFileAsync rejecting traversal attempts
- gitingest.test.ts: Add tests for timeout (mock fetch to throw DOMException), size limit (mock large response), retry on 5xx (count fetch calls), no retry on 4xx (count fetch calls = 1)
- loader.test.ts: Add tests for deepMerge depth limit (deeply nested objects exceeding limit, objects at boundary depth)
- loader.test.ts: Add tests for config file size limit (create oversized temp file, verify null returned)
NOTE: Bun test framework used. No sinon. Retry tests verify call counts, not timing.

### 1.6: Bump version to 4.3.2 + CHANGELOG [SMALL]
- [x] 1.6 (depends: 1.5)
FILES: package.json, CHANGELOG.md
CHANGE: Bump version, add changelog entry for security defense-in-depth

### 1.7: Full verification + review [SMALL]
- [x] 1.7 (depends: 1.6)
- `bun test` — all tests pass
- `bun run build` — clean
- `bun run typecheck` — clean
- `bun run lint` — clean (7 known warnings)
- Reviewer: APPROVED required

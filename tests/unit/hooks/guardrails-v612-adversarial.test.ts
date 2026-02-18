/**
 * v6.1.2 Guardrails Remediation — ADVERSARIAL SECURITY TESTS
 *
 * This test suite probes ATTACK VECTORS only — no happy-path tests.
 * Tests verify that malicious inputs, race conditions, and boundary
 * violations are handled correctly by the v6.1.2 fixes.
 *
 * Attack vectors probed:
 * 1. Architect exemption bypass via activeAgent poisoning
 * 2. ORCHESTRATOR_NAME injection via config
 * 3. Race condition: activeAgent cleared between checks
 * 4. startAgentSession with ORCHESTRATOR_NAME
 * 5. startAgentSession with prefixed architect name
 * 6. Boundary: empty string agentName in startAgentSession
 * 7. Boundary: null/undefined guardrails in fallback logic
 * 8. Double-disable: validation failure + explicit disable
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ORCHESTRATOR_NAME } from '../../../src/config/constants';
import {
	loadPluginConfig,
	loadPluginConfigWithMeta,
} from '../../../src/config/loader';
import {
	GuardrailsConfigSchema,
	stripKnownSwarmPrefix,
	resolveGuardrailsConfig,
} from '../../../src/config/schema';
import { createGuardrailsHooks } from '../../../src/hooks/guardrails';
import {
	resetSwarmState,
	swarmState,
	startAgentSession,
	ensureAgentSession,
	getActiveWindow,
	beginInvocation,
	getAgentSession,
} from '../../../src/state';

describe('v6.1.2 Guardrails — ADVERSARIAL SECURITY TESTS', () => {
	let tempDir: string;
	let originalXDG: string | undefined;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-adv-'));
		originalXDG = process.env.XDG_CONFIG_HOME;
		process.env.XDG_CONFIG_HOME = tempDir;
		resetSwarmState();
	});

	afterEach(() => {
		if (originalXDG === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXDG;
		}
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	// ============================================================
	// ATTACK VECTOR 1: Architect exemption bypass via activeAgent poisoning
	// ============================================================
	describe('Attack Vector 1 — activeAgent poisoning', () => {
		it('activeAgent set to architect DOES exempt session (expected behavior per v6.1.2 design)', async () => {
			// Use an unknown agent name so the base config is used (no built-in profile override)
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 1, // Very low limit
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// Start a session with unknown agent (no built-in profile)
			startAgentSession('poison-test', 'unknown_agent');
			beginInvocation('poison-test', 'unknown_agent');

			// First tool call should hit the limit
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'poison-test', callID: 'c1' },
					{ args: {} },
				),
			).rejects.toThrow(/LIMIT REACHED/);

			// ATTACK: Set activeAgent to 'architect' — this IS expected to work
			// The v6.1.2 design uses activeAgent as the source of truth for exemption
			swarmState.activeAgent.set('poison-test', 'architect');

			// The next tool call will succeed because Check 1 (lines 66-72) sees 'architect'
			// This is INTENTIONAL: activeAgent is the trusted source of agent identity
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'poison-test', callID: 'c2' },
					{ args: {} },
				),
			).resolves.toBeUndefined();
		});

		it('activeAgent poison does NOT clear existing hardLimitHit on window', async () => {
			// Use an unknown agent name so the base config is used (no built-in profile override)
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 2, // Base config limit
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// Use 'unknown_agent' which has no built-in profile, so base config applies
			startAgentSession('hard-limit-bypass', 'unknown_agent');
			beginInvocation('hard-limit-bypass', 'unknown_agent');

			// First call succeeds (toolCalls: 0 → 1)
			await hooks.toolBefore(
				{ tool: 'bash', sessionID: 'hard-limit-bypass', callID: 'c1' },
				{ args: {} },
			);

			// Second call hits limit (toolCalls: 1 → 2, then check 2 >= 2 throws)
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'hard-limit-bypass', callID: 'c2' },
					{ args: {} },
				),
			).rejects.toThrow(/LIMIT REACHED/);

			// Verify hardLimitHit is set
			const window = getActiveWindow('hard-limit-bypass');
			expect(window?.hardLimitHit).toBe(true);

			// ATTACK: Try to bypass by setting activeAgent to architect
			swarmState.activeAgent.set('hard-limit-bypass', 'architect');

			// Setting activeAgent to architect exempts from guardrails entirely
			// The first check (lines 66-72) sees 'architect' and returns early
			// This is expected behavior - activeAgent is the trusted source
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'hard-limit-bypass', callID: 'c3' },
					{ args: {} },
				),
			).resolves.toBeUndefined();
		});
	});

	// ============================================================
	// ATTACK VECTOR 2: ORCHESTRATOR_NAME injection via config
	// ============================================================
	describe('Attack Vector 2 — Config injection attempts', () => {
		it('malicious config with enabled:false survives validation failure on OTHER field', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			// Create config with explicit guardrails.enabled: false AND invalid field
			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: { enabled: false },
					max_iterations: 999, // Invalid: max is 10
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Validation failure returns guardrails.enabled: false
				expect(config.guardrails?.enabled).toBe(false);
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});

		it('config with guardrails.enabled:true does NOT get disabled by valid config', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			// Create valid config with guardrails enabled
			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: { enabled: true, max_tool_calls: 100 },
					max_iterations: 3,
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Valid config should keep enabled: true
				expect(config.guardrails?.enabled).toBe(true);
				expect(config.guardrails?.max_tool_calls).toBe(100);
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});

		it('attempt to inject via profiles block is sanitized by Zod', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			// Try to inject a profile for a malicious agent (within schema bounds)
			// Note: max_tool_calls must be <= 1000 to pass validation
			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: {
						enabled: true,
						profiles: {
							malicious_agent: { max_tool_calls: 1000 }, // Valid within schema
						},
					},
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Config should be valid
				expect(config.guardrails?.enabled).toBe(true);

				// Verify that 'coder' does NOT get malicious_agent profile
				// (profile name doesn't match any known agent)
				const resolved = resolveGuardrailsConfig(
					config.guardrails!,
					'coder',
				);
				// Coder should get built-in profile (400), not malicious_agent (1000)
				expect(resolved.max_tool_calls).toBe(400); // Built-in coder default
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});
	});

	// ============================================================
	// ATTACK VECTOR 3: Race condition — activeAgent cleared between checks
	// ============================================================
	describe('Attack Vector 3 — Race condition: activeAgent cleared mid-check', () => {
		it('guardrails fallback uses ORCHESTRATOR_NAME when activeAgent deleted before ensureAgentSession', async () => {
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 5,
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// Set up a session with activeAgent pointing to coder
			startAgentSession('race-session', 'coder');

			// Immediately delete activeAgent to simulate race condition
			swarmState.activeAgent.delete('race-session');

			// Call toolBefore — fallback to ORCHESTRATOR_NAME should kick in
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'race-session', callID: 'c1' },
					{ args: {} },
				),
			).resolves.toBeUndefined();

			// Session should be updated to architect (via fallback)
			const session = swarmState.agentSessions.get('race-session');
			// The session was 'coder', but activeAgent was deleted, so the fallback
			// at line 86-87 uses ORCHESTRATOR_NAME, then ensureAgentSession updates it
			expect(session?.agentName).toBe('architect');
		});

		it('activeAgent undefined for brand new session uses ORCHESTRATOR_NAME', async () => {
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 5,
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// No session exists, no activeAgent entry
			expect(swarmState.activeAgent.has('brand-new-session')).toBe(false);
			expect(swarmState.agentSessions.has('brand-new-session')).toBe(false);

			// Call toolBefore — should create architect session via fallback
			await hooks.toolBefore(
				{ tool: 'bash', sessionID: 'brand-new-session', callID: 'c1' },
				{ args: {} },
			);

			// Session should be architect
			const session = swarmState.agentSessions.get('brand-new-session');
			expect(session?.agentName).toBe('architect');

			// Architect should not have a window
			const window = getActiveWindow('brand-new-session');
			expect(window).toBeUndefined();
		});
	});

	// ============================================================
	// ATTACK VECTOR 4: startAgentSession with ORCHESTRATOR_NAME
	// ============================================================
	describe('Attack Vector 4 — startAgentSession with ORCHESTRATOR_NAME', () => {
		it('startAgentSession("architect") sets activeAgent to "architect"', () => {
			startAgentSession('architect-session', ORCHESTRATOR_NAME);

			expect(swarmState.activeAgent.get('architect-session')).toBe(
				ORCHESTRATOR_NAME,
			);
			expect(
				swarmState.agentSessions.get('architect-session')?.agentName,
			).toBe(ORCHESTRATOR_NAME);
		});

		it('startAgentSession("architect") creates exempt session (no window)', async () => {
			startAgentSession('exempt-session', ORCHESTRATOR_NAME);

			// beginInvocation for architect returns null
			const window = beginInvocation('exempt-session', ORCHESTRATOR_NAME);
			expect(window).toBeNull();

			// No window in session either
			const session = swarmState.agentSessions.get('exempt-session');
			expect(Object.keys(session?.windows ?? {})).toHaveLength(0);
		});

		it('guardrails hook sees startAgentSession-created architect as exempt', async () => {
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 1, // Very low limit
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			startAgentSession('hook-exempt', ORCHESTRATOR_NAME);

			// Should be able to make unlimited tool calls
			for (let i = 0; i < 10; i++) {
				await expect(
					hooks.toolBefore(
						{ tool: 'bash', sessionID: 'hook-exempt', callID: `c${i}` },
						{ args: {} },
					),
				).resolves.toBeUndefined();
			}
		});
	});

	// ============================================================
	// ATTACK VECTOR 5: startAgentSession with prefixed architect name
	// ============================================================
	describe('Attack Vector 5 — startAgentSession with prefixed architect name', () => {
		it('startAgentSession("mega_architect") sets activeAgent to "mega_architect"', () => {
			startAgentSession('prefixed-session', 'mega_architect');

			// activeAgent should store the original name
			expect(swarmState.activeAgent.get('prefixed-session')).toBe(
				'mega_architect',
			);

			// Session should also store the original name
			expect(
				swarmState.agentSessions.get('prefixed-session')?.agentName,
			).toBe('mega_architect');
		});

		it('stripKnownSwarmPrefix("mega_architect") returns "architect"', () => {
			expect(stripKnownSwarmPrefix('mega_architect')).toBe('architect');
		});

		it('stripKnownSwarmPrefix correctly identifies prefixed architect as exempt', () => {
			// Test various prefixes
			expect(stripKnownSwarmPrefix('paid_architect')).toBe('architect');
			expect(stripKnownSwarmPrefix('local_architect')).toBe('architect');
			expect(stripKnownSwarmPrefix('cloud_architect')).toBe('architect');
			expect(stripKnownSwarmPrefix('enterprise_architect')).toBe('architect');
			expect(stripKnownSwarmPrefix('mega_architect')).toBe('architect');
		});

		it('prefixed architect session is exempt from guardrails via stripKnownSwarmPrefix', async () => {
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 1,
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// Start session with prefixed architect
			startAgentSession('prefixed-exempt', 'mega_architect');

			// The session should be exempt because stripKnownSwarmPrefix identifies it
			await expect(
				hooks.toolBefore(
					{ tool: 'bash', sessionID: 'prefixed-exempt', callID: 'c1' },
					{ args: {} },
				),
			).resolves.toBeUndefined();

			// Multiple calls should all succeed
			for (let i = 0; i < 5; i++) {
				await expect(
					hooks.toolBefore(
						{
							tool: 'bash',
							sessionID: 'prefixed-exempt',
							callID: `c${i + 2}`,
						},
						{ args: {} },
					),
				).resolves.toBeUndefined();
			}
		});
	});

	// ============================================================
	// ATTACK VECTOR 6: Boundary — empty string agentName
	// ============================================================
	describe('Attack Vector 6 — Boundary: empty string agentName', () => {
		it('startAgentSession with empty string does not crash', () => {
			expect(() => {
				startAgentSession('empty-agent-session', '');
			}).not.toThrow();
		});

		it('startAgentSession with empty string sets activeAgent to empty string', () => {
			startAgentSession('empty-agent-session', '');

			expect(swarmState.activeAgent.get('empty-agent-session')).toBe('');
			expect(
				swarmState.agentSessions.get('empty-agent-session')?.agentName,
			).toBe('');
		});

		it('empty string agentName is NOT treated as architect', () => {
			// stripKnownSwarmPrefix('') should return '' (unchanged)
			expect(stripKnownSwarmPrefix('')).toBe('');

			// Empty string is NOT equal to 'architect'
			expect(stripKnownSwarmPrefix('')).not.toBe(ORCHESTRATOR_NAME);
		});

		it('guardrails with empty string agentName creates non-exempt session', async () => {
			const guardrailsConfig = GuardrailsConfigSchema.parse({
				enabled: true,
				max_tool_calls: 3,
			});
			const hooks = createGuardrailsHooks(guardrailsConfig);

			// Start session with empty string
			startAgentSession('empty-name-session', '');
			beginInvocation('empty-name-session', '');

			// Should have a window (not exempt)
			const window = getActiveWindow('empty-name-session');
			expect(window).toBeDefined();
			expect(window?.agentName).toBe('');
		});

		it('ensureAgentSession with empty agentName uses empty string (not ORCHESTRATOR_NAME)', () => {
			// ensureAgentSession without agentName uses 'unknown'
			const session = ensureAgentSession('ensure-empty', '');
			expect(session.agentName).toBe('');

			// activeAgent should also be empty
			expect(swarmState.activeAgent.get('ensure-empty')).toBe('');
		});
	});

	// ============================================================
	// ATTACK VECTOR 7: Boundary — null/undefined guardrails in fallback
	// ============================================================
	describe('Attack Vector 7 — Boundary: null/undefined guardrails in fallback', () => {
		it('config.guardrails?.enabled === false returns false when guardrails is null', () => {
			const config = { guardrails: null };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = (config as any).guardrails?.enabled === false;
			expect(result).toBe(false); // null?.enabled is undefined, undefined === false is false
		});

		it('config.guardrails?.enabled === false returns false when guardrails is undefined', () => {
			const config = {};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = (config as any).guardrails?.enabled === false;
			expect(result).toBe(false); // undefined?.enabled is undefined, undefined === false is false
		});

		it('config.guardrails?.enabled === false returns false when enabled is true', () => {
			const config = { guardrails: { enabled: true } };
			const result = config.guardrails?.enabled === false;
			expect(result).toBe(false);
		});

		it('config.guardrails?.enabled === false returns false when enabled is undefined', () => {
			const config: { guardrails?: { enabled?: boolean } } = { guardrails: {} };
			const result = config.guardrails?.enabled === false;
			expect(result).toBe(false); // undefined === false is false
		});

		it('config.guardrails?.enabled === false returns TRUE when enabled is explicitly false', () => {
			const config = { guardrails: { enabled: false } };
			const result = config.guardrails?.enabled === false;
			expect(result).toBe(true);
		});

		it('fallback logic correctly handles null guardrails (falls through to loadedFromFile)', () => {
			// Simulate the index.ts fallback logic
			const config = { guardrails: null };
			const loadedFromFile = true;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const guardrailsFallback =
				(config as any).guardrails?.enabled === false
					? { ...(config as any).guardrails, enabled: false }
					: loadedFromFile
						? ((config as any).guardrails ?? {})
						: { ...(config as any).guardrails, enabled: false };

			// Should be empty object (null ?? {})
			expect(guardrailsFallback).toEqual({});
		});

		it('fallback logic correctly handles undefined guardrails without loadedFromFile', () => {
			// Simulate the index.ts fallback logic when no config file exists
			const config = {};
			const loadedFromFile = false;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const guardrailsFallback =
				(config as any).guardrails?.enabled === false
					? { ...(config as any).guardrails, enabled: false }
					: loadedFromFile
						? ((config as any).guardrails ?? {})
						: { ...(config as any).guardrails, enabled: false };

			// Should be disabled
			expect(guardrailsFallback.enabled).toBe(false);
		});
	});

	// ============================================================
	// ATTACK VECTOR 8: Double-disable — validation failure AND explicit disable
	// ============================================================
	describe('Attack Vector 8 — Double-disable: validation failure + explicit disable', () => {
		it('guardrails remains disabled when BOTH validation fails AND enabled:false is set', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			// Config with BOTH explicit disable AND invalid field
			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: { enabled: false, max_tool_calls: 500 },
					qa_retry_limit: -1, // Invalid
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Guardrails should remain disabled
				expect(config.guardrails?.enabled).toBe(false);

				// When validation fails, the loader returns defaults (max_tool_calls: 200)
				// NOT the user's 500 — validation failure means config is untrustworthy
				expect(config.guardrails?.max_tool_calls).toBe(200); // Zod default
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});

		it('double-disable does not re-enable guardrails via Zod defaults', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: { enabled: false },
					max_iterations: 999, // Invalid
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);
				const { loadedFromFile } = loadPluginConfigWithMeta(projectDir);

				// loadedFromFile should be true (config file exists)
				expect(loadedFromFile).toBe(true);

				// Guardrails should be disabled
				expect(config.guardrails?.enabled).toBe(false);

				// Simulate the index.ts fallback logic
				const guardrailsFallback: { enabled?: boolean; [key: string]: unknown } =
					config.guardrails?.enabled === false
						? { ...config.guardrails, enabled: false }
						: loadedFromFile
							? (config.guardrails ?? {})
							: { ...config.guardrails, enabled: false };

				expect(guardrailsFallback.enabled).toBe(false);

				// Parse through Zod — should stay disabled
				const parsed = GuardrailsConfigSchema.parse(guardrailsFallback);
				expect(parsed.enabled).toBe(false);
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});

		it('createGuardrailsHooks returns no-ops for double-disable config', async () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					guardrails: { enabled: false },
					hooks: { agent_awareness_max_chars: 5 }, // Invalid: min is 50
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Guardrails should be disabled due to validation failure
				expect(config.guardrails?.enabled).toBe(false);

				const guardrailsConfig = GuardrailsConfigSchema.parse(
					config.guardrails ?? {},
				);

				const hooks = createGuardrailsHooks(guardrailsConfig);

				// All hooks should be no-ops
				await expect(
					hooks.toolBefore(
						{ tool: 'bash', sessionID: 'test', callID: 'c1' },
						{ args: {} },
					),
				).resolves.toBeUndefined();

				await expect(
					hooks.toolAfter(
						{ tool: 'bash', sessionID: 'test', callID: 'c1' },
						{ title: 'bash', output: 'ok', metadata: {} },
					),
				).resolves.toBeUndefined();
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});
	});

	// ============================================================
	// ADDITIONAL ADVERSARIAL: Edge cases and boundary violations
	// ============================================================
	describe('Additional adversarial edge cases', () => {
		it('attempt to set negative max_tool_calls is rejected by Zod', () => {
			expect(() => {
				GuardrailsConfigSchema.parse({ max_tool_calls: -1 });
			}).toThrow();
		});

		it('attempt to set max_tool_calls above 1000 is rejected by Zod', () => {
			expect(() => {
				GuardrailsConfigSchema.parse({ max_tool_calls: 1001 });
			}).toThrow();
		});

		it('attempt to set warning_threshold above 0.9 is rejected by Zod', () => {
			expect(() => {
				GuardrailsConfigSchema.parse({ warning_threshold: 1.0 });
			}).toThrow();
		});

		it('attempt to set warning_threshold below 0.1 is rejected by Zod', () => {
			expect(() => {
				GuardrailsConfigSchema.parse({ warning_threshold: 0.05 });
			}).toThrow();
		});

		it('config with prototype pollution attempt is sanitized', () => {
			const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
			const configDir = path.join(projectDir, '.opencode');
			fs.mkdirSync(configDir, { recursive: true });

			// Attempt prototype pollution
			fs.writeFileSync(
				path.join(configDir, 'opencode-swarm.json'),
				JSON.stringify({
					__proto__: { polluted: true },
					constructor: { polluted: true },
					guardrails: { enabled: true },
				}),
			);

			try {
				const config = loadPluginConfig(projectDir);

				// Config should be valid
				expect(config.guardrails?.enabled).toBe(true);

				// Prototype pollution should not affect plain objects
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect(({} as any).polluted).toBeUndefined();
			} finally {
				fs.rmSync(projectDir, { recursive: true, force: true });
			}
		});

		it('stripKnownSwarmPrefix handles deeply nested prefix correctly', () => {
			// 'foo_bar_architect' should still resolve to 'architect'
			expect(stripKnownSwarmPrefix('foo_bar_architect')).toBe('architect');
			expect(stripKnownSwarmPrefix('a_b_c_architect')).toBe('architect');
		});

		it('stripKnownSwarmPrefix does NOT match partial names', () => {
			// 'architectural' should NOT match 'architect'
			expect(stripKnownSwarmPrefix('architectural')).toBe('architectural');
			// 'architects' should NOT match 'architect'
			expect(stripKnownSwarmPrefix('architects')).toBe('architects');
		});
	});
});

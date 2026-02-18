import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createSystemEnhancerHook } from '../../../src/hooks/system-enhancer';
import type { PluginConfig } from '../../../src/config';
import { resetSwarmState } from '../../../src/state';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('v6.2 System Enhancer Retrospective Injection', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'swarm-retro-test-'));
		resetSwarmState();
	});

	afterEach(async () => {
		try {
			await rm(tempDir, { recursive: true, force: true });
		} catch {}
	});

	async function createSwarmFiles(): Promise<void> {
		const swarmDir = join(tempDir, '.swarm');
		await mkdir(swarmDir, { recursive: true });
		await writeFile(join(swarmDir, 'plan.md'), '# Plan\n');
		await writeFile(join(swarmDir, 'context.md'), '# Context\n');
	}

	async function invokeHook(config: PluginConfig): Promise<string[]> {
		const hooks = createSystemEnhancerHook(config, tempDir);
		const transform = hooks['experimental.chat.system.transform'] as (
			input: { sessionID?: string },
			output: { system: string[] },
		) => Promise<void>;
		const input = { sessionID: 'test-session' };
		const output = { system: ['Initial system prompt'] };
		await transform(input, output);
		return output.system;
	}

	const defaultConfig: PluginConfig = {
		max_iterations: 5,
		qa_retry_limit: 3,
		inject_phase_reminders: true,
	};

	it('injects [SWARM RETROSPECTIVE] hint when evidence has actionable findings', async () => {
		// Setup: create swarm files
		await createSwarmFiles();

		// Create evidence directory
		const evidenceDir = join(tempDir, '.swarm', 'evidence');
		await mkdir(evidenceDir, { recursive: true });

		// Write retrospective evidence with actionable findings
		const evidenceContent = {
			type: 'retrospective',
			task_id: 'phase-1',
			agent: 'architect',
			timestamp: '2026-01-01T00:00:00.000Z',
			verdict: 'info',
			summary: 'Phase 1 complete',
			phase_number: 1,
			total_tool_calls: 42,
			coder_revisions: 2,
			reviewer_rejections: 3,
			test_failures: 0,
			security_findings: 0,
			integration_issues: 0,
			task_count: 5,
			task_complexity: 'moderate',
			top_rejection_reasons: ['missing validation'],
			lessons_learned: ['validate inputs early'],
		};
		await writeFile(
			join(evidenceDir, 'evidence-phase1.json'),
			JSON.stringify(evidenceContent),
		);

		// Invoke the hook
		const systemOutput = await invokeHook(defaultConfig);

		// Assert the retrospective hint is present
		expect(systemOutput.some((s) => s.includes('[SWARM RETROSPECTIVE]'))).toBe(true);
		expect(systemOutput.some((s) => s.includes('Phase 1'))).toBe(true);
	});

	it('caps hint at 800 chars — truncates with "..."', async () => {
		// Setup: create swarm files
		await createSwarmFiles();

		// Create evidence directory
		const evidenceDir = join(tempDir, '.swarm', 'evidence');
		await mkdir(evidenceDir, { recursive: true });

		// Write retrospective evidence with enough content to exceed 800 chars
		const longReason = 'This is a very long rejection reason that adds lots of characters to make the hint exceed 800 chars limit';
		const longLesson = 'This is a very long lesson learned that adds lots of characters to exceed the limit';
		const evidenceContent = {
			type: 'retrospective',
			task_id: 'phase-2',
			agent: 'architect',
			timestamp: '2026-01-02T00:00:00.000Z',
			verdict: 'info',
			summary: 'Phase 2 complete',
			phase_number: 2,
			total_tool_calls: 100,
			coder_revisions: 5,
			reviewer_rejections: 5,
			test_failures: 0,
			security_findings: 0,
			integration_issues: 0,
			task_count: 1,
			task_complexity: 'complex',
			top_rejection_reasons: [
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
				longReason,
			],
			lessons_learned: [
				longLesson,
				longLesson,
				longLesson,
				longLesson,
				longLesson,
			],
		};
		await writeFile(
			join(evidenceDir, 'evidence-phase2.json'),
			JSON.stringify(evidenceContent),
		);

		// Invoke the hook
		const systemOutput = await invokeHook(defaultConfig);

		// Find the retrospective string
		const retroString = systemOutput.find((s) => s.includes('[SWARM RETROSPECTIVE]'));

		// Assert it exists and is capped at 803 chars (800 + '...')
		expect(retroString).toBeDefined();
		expect(retroString!.length).toBeLessThanOrEqual(803);
		expect(retroString!.endsWith('...')).toBe(true);
	});

	it('skips injection when no actionable findings', async () => {
		// Setup: create swarm files
		await createSwarmFiles();

		// Create evidence directory
		const evidenceDir = join(tempDir, '.swarm', 'evidence');
		await mkdir(evidenceDir, { recursive: true });

		// Write retrospective evidence with NO actionable findings
		const evidenceContent = {
			type: 'retrospective',
			task_id: 'phase-3',
			agent: 'architect',
			timestamp: '2026-01-03T00:00:00.000Z',
			verdict: 'info',
			summary: 'Phase 3 complete',
			phase_number: 3,
			total_tool_calls: 10,
			coder_revisions: 0,
			reviewer_rejections: 0,
			test_failures: 0,
			security_findings: 0,
			integration_issues: 0,
			task_count: 2,
			task_complexity: 'simple',
			top_rejection_reasons: [],
			lessons_learned: [],
		};
		await writeFile(
			join(evidenceDir, 'evidence-phase3.json'),
			JSON.stringify(evidenceContent),
		);

		// Invoke the hook
		const systemOutput = await invokeHook(defaultConfig);

		// Assert no retrospective hint is present
		expect(systemOutput.some((s) => s.includes('[SWARM RETROSPECTIVE]'))).toBe(false);
	});

	it('reads only the most recent retrospective evidence file', async () => {
		// Setup: create swarm files
		await createSwarmFiles();

		// Create evidence directory
		const evidenceDir = join(tempDir, '.swarm', 'evidence');
		await mkdir(evidenceDir, { recursive: true });

		// Write older retrospective evidence (phase1)
		const olderEvidence = {
			type: 'retrospective',
			task_id: 'phase-1',
			agent: 'architect',
			timestamp: '2026-01-01T00:00:00.000Z',
			verdict: 'info',
			summary: 'Phase 1 complete',
			phase_number: 1,
			total_tool_calls: 10,
			coder_revisions: 0,
			reviewer_rejections: 3,
			test_failures: 0,
			security_findings: 0,
			integration_issues: 0,
			task_count: 1,
			task_complexity: 'simple',
			top_rejection_reasons: ['old-reason'],
			lessons_learned: [],
		};
		await writeFile(
			join(evidenceDir, 'evidence-phase1.json'),
			JSON.stringify(olderEvidence),
		);

		// Write newer retrospective evidence (phase2)
		const newerEvidence = {
			type: 'retrospective',
			task_id: 'phase-2',
			agent: 'architect',
			timestamp: '2026-01-02T00:00:00.000Z',
			verdict: 'info',
			summary: 'Phase 2 complete',
			phase_number: 2,
			total_tool_calls: 20,
			coder_revisions: 0,
			reviewer_rejections: 4,
			test_failures: 0,
			security_findings: 0,
			integration_issues: 0,
			task_count: 2,
			task_complexity: 'moderate',
			top_rejection_reasons: ['new-reason'],
			lessons_learned: [],
		};
		await writeFile(
			join(evidenceDir, 'evidence-phase2.json'),
			JSON.stringify(newerEvidence),
		);

		// Invoke the hook
		const systemOutput = await invokeHook(defaultConfig);

		// Find the retrospective string
		const retroString = systemOutput.find((s) => s.includes('[SWARM RETROSPECTIVE]'));

		// Assert it includes Phase 2 (the newer file's phase_number)
		expect(retroString).toBeDefined();
		expect(retroString!.includes('Phase 2')).toBe(true);
		// Assert it does NOT include Phase 1 (the older file is not used)
		expect(retroString!.includes('Phase 1')).toBe(false);
	});
});

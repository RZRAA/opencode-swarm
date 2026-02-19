import { describe, expect, test } from 'bun:test';
import { createArchitectAgent } from '../../../src/agents/architect';

/**
 * ADVERSARIAL TESTS: Orchestration Prompt Security (Task 3.2)
 * 
 * Attack vectors for orchestration prompt safety and gate bypass attempts:
 * - Sequence bypass (skip critic, skip phases)
 * - Gate skipping (skip tests, skip secretscan)
 * - Secretscan bypass wording
 * - Reviewer-order manipulation
 */

describe('ARCHITECT WORKFLOW: Sequence Bypass Prevention', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Critic gate MUST run BEFORE implementation (Rule 6)', () => {
		// Verify critic gate is mandatory and non-optional
		expect(prompt).toContain('**CRITIC GATE (Execute BEFORE any implementation work)**');
		expect(prompt).toContain('Delegate plan to {{AGENT_PREFIX}}critic');
		expect(prompt).toContain('ONLY AFTER critic approval: Proceed to implementation (Phase 3+)');
		
		// Verify Phase 4.5 explicitly gates Phase 5
		const phase45Pos = prompt.indexOf('### Phase 4.5: Critic Gate');
		const phase5Pos = prompt.indexOf('### Phase 5: Execute');
		expect(phase5Pos).toBeGreaterThan(phase45Pos);
	});

	test('SECURITY: Cannot skip Phase 4.5 Critic Gate to go straight to Phase 5', () => {
		// Verify APPROVED is required to proceed
		expect(prompt).toContain('**APPROVED** → Proceed to Phase 5');
		expect(prompt).toContain('**NEEDS_REVISION** → Revise the plan');
		expect(prompt).toContain('**REJECTED** → Inform the user');
		
		// No bypass path exists
		const between45and5 = prompt.substring(
			prompt.indexOf('Phase 4.5'),
			prompt.indexOf('Phase 5')
		);
		expect(between45and5.toLowerCase()).not.toContain('skip');
		expect(between45and5.toLowerCase()).not.toContain('bypass');
	});

	test('SECURITY: Phase sequence cannot be reordered (0→1→2→3→4→4.5→5→6)', () => {
		const p0 = prompt.indexOf('### Phase 0');
		const p1 = prompt.indexOf('### Phase 1');
		const p2 = prompt.indexOf('### Phase 2');
		const p3 = prompt.indexOf('### Phase 3');
		const p4 = prompt.indexOf('### Phase 4');
		const p45 = prompt.indexOf('### Phase 4.5');
		const p5 = prompt.indexOf('### Phase 5');
		const p6 = prompt.indexOf('### Phase 6');
		
		expect(p0).toBeLessThan(p1);
		expect(p1).toBeLessThan(p2);
		expect(p2).toBeLessThan(p3);
		expect(p3).toBeLessThan(p4);
		expect(p4).toBeLessThan(p45);
		expect(p45).toBeLessThan(p5);
		expect(p5).toBeLessThan(p6);
	});
});

describe('ARCHITECT WORKFLOW: Gate Skipping Prevention', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Cannot skip verification tests (Phase 5i)', () => {
		expect(prompt).toContain('5i. {{AGENT_PREFIX}}test_engineer - Verification tests');
		expect(prompt).toContain('FAIL → return to coder');
		
		// Verify step exists in sequence
		const step5i = prompt.substring(
			prompt.indexOf('5i.'),
			prompt.indexOf('5j.')
		);
		expect(step5i).toContain('Verification tests');
	});

	test('SECURITY: Cannot skip adversarial tests (Phase 5j)', () => {
		expect(prompt).toContain('5j. {{AGENT_PREFIX}}test_engineer - Adversarial tests');
		expect(prompt).toContain('FAIL → return to coder');
		
		// Verify adversarial tests run AFTER verification tests
		const verifPos = prompt.indexOf('Verification tests');
		const adversPos = prompt.indexOf('Adversarial tests');
		expect(adversPos).toBeGreaterThan(verifPos);
	});

	test('SECURITY: Cannot skip secretscan (Phase 5f)', () => {
		expect(prompt).toContain('secretscan');
		expect(prompt).toContain('FINDINGS → return to coder');
		expect(prompt).toContain('NO FINDINGS → proceed to reviewer');
		
		// Verify secretscan is in MANDATORY QA GATE, not optional
		const qaGate = prompt.match(/\*\*MANDATORY QA GATE[^`]*/)?.[0] || '';
		expect(qaGate).toContain('secretscan');
		expect(qaGate.toLowerCase()).not.toContain('optional');
		expect(qaGate.toLowerCase()).not.toContain('skip');
	});

	test('SECURITY: Cannot skip imports audit (Phase 5d)', () => {
		expect(prompt).toContain('Run `imports` tool');
		expect(prompt).toContain('ISSUES → return to coder');
	});

	test('SECURITY: Cannot skip diff/contract check (Phase 5c)', () => {
		expect(prompt).toContain('Run `diff` tool');
		expect(prompt).toContain('If `hasContractChanges`');
		expect(prompt).toContain('integration analysis');
	});
});

describe('ARCHITECT WORKFLOW: Secretscan Bypass Prevention', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Secretscan runs unconditionally in QA sequence', () => {
		// Secretscan must be in the mandatory sequence, not triggered by keywords
		const qaGate = prompt.match(/\*\*MANDATORY QA GATE[^`]*/)?.[0] || '';
		expect(qaGate).toContain('secretscan');
		
		// Must run BEFORE reviewer
		const secretscanPos = qaGate.indexOf('secretscan');
		const reviewerPos = qaGate.indexOf('reviewer');
		expect(reviewerPos).toBeGreaterThan(secretscanPos);
	});

	test('SECURITY: Secretscan cannot be bypassed by task wording', () => {
		// Secretscan must be mandatory - check Phase 5f has explicit pass/fail
		expect(prompt).toContain('5f. Run `secretscan` tool. FINDINGS → return to coder. NO FINDINGS → proceed to reviewer.');
	});

	test('SECURITY: Secretscan FINDINGS block progression to reviewer', () => {
		// MUST return to coder if secretscan finds something
		expect(prompt).toContain('FINDINGS → return to coder');
		expect(prompt).toContain('NO FINDINGS → proceed to reviewer');
		
		// This is explicit: cannot proceed with findings
		const gateSection = prompt.substring(
			prompt.indexOf('secretscan'),
			prompt.indexOf('secretscan') + 80
		);
		expect(gateSection).toContain('FINDINGS');
		expect(gateSection).toContain('NO FINDINGS');
	});
});

describe('ARCHITECT WORKFLOW: Reviewer Order Manipulation Prevention', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: General reviewer runs AFTER all pre-review tools', () => {
		const diffPos = prompt.indexOf('Run `diff`');
		const importsPos = prompt.indexOf('Run `imports`');
		const lintPos = prompt.indexOf('lint');
		const secretscanPos = prompt.indexOf('secretscan');
		const reviewerPos = prompt.indexOf('{{AGENT_PREFIX}}reviewer - General review');
		
		expect(reviewerPos).toBeGreaterThan(diffPos);
		expect(reviewerPos).toBeGreaterThan(importsPos);
		expect(reviewerPos).toBeGreaterThan(lintPos);
		expect(reviewerPos).toBeGreaterThan(secretscanPos);
	});

	test('SECURITY: Security review runs AFTER general review (Phase 5h)', () => {
		const generalReviewPos = prompt.indexOf('5g. {{AGENT_PREFIX}}reviewer - General review');
		const securityReviewPos = prompt.indexOf('Security gate');
		
		expect(securityReviewPos).toBeGreaterThan(generalReviewPos);
		
		// Security gate can still reject after general approval
		expect(prompt).toContain('REJECTED → return to coder');
	});

	test('SECURITY: Reviewer cannot run before diff tool', () => {
		// The workflow explicitly requires diff first
		expect(prompt).toContain('5c. Run `diff` tool');
		expect(prompt).toContain('5d. Run `imports` tool');
		expect(prompt).toContain('5e. Run `lint`');
		expect(prompt).toContain('5f. Run `secretscan`');
		expect(prompt).toContain('5g. {{AGENT_PREFIX}}reviewer');
		
		// Sequential numbering enforces order
		const phase5Section = prompt.substring(
			prompt.indexOf('### Phase 5:'),
			prompt.indexOf('### Phase 6:')
		);
		
		const stepC = phase5Section.indexOf('5c.');
		const stepD = phase5Section.indexOf('5d.');
		const stepE = phase5Section.indexOf('5e.');
		const stepF = phase5Section.indexOf('5f.');
		const stepG = phase5Section.indexOf('5g.');
		
		expect(stepC).toBeLessThan(stepD);
		expect(stepD).toBeLessThan(stepE);
		expect(stepE).toBeLessThan(stepF);
		expect(stepF).toBeLessThan(stepG);
	});
});

describe('ARCHITECT WORKFLOW: UI Gate Bypass Prevention', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Designer must run BEFORE coder for UI tasks', () => {
		expect(prompt).toContain('**UI/UX DESIGN GATE**');
		expect(prompt).toContain('delegate to {{AGENT_PREFIX}}designer FIRST');
		expect(prompt).toContain('Then pass the scaffold to {{AGENT_PREFIX}}coder');
	});

	test('SECURITY: UI trigger keywords are comprehensive (cannot be avoided)', () => {
		const uiKeywords = [
			'new page', 'new screen', 'new component', 'redesign',
			'layout change', 'form', 'modal', 'dialog', 'dropdown',
			'sidebar', 'navbar', 'dashboard', 'landing page',
			'signup', 'login form', 'settings page', 'profile page'
		];
		
		uiKeywords.forEach(keyword => {
			expect(prompt.toLowerCase()).toContain(keyword);
		});
	});

	test('SECURITY: UI file path triggers are comprehensive', () => {
		const paths = ['pages/', 'components/', 'views/', 'screens/', 'ui/', 'layouts/'];
		paths.forEach(path => {
			expect(prompt).toContain(path);
		});
	});

	test('SECURITY: Designer produces scaffold that coder must follow', () => {
		expect(prompt).toContain('produce a code scaffold');
		expect(prompt).toContain('pass the scaffold to {{AGENT_PREFIX}}coder as INPUT');
		// The coder implements TODOs in the scaffold
		expect(prompt).toContain('The coder implements the TODOs');
	});
});

describe('ARCHITECT WORKFLOW: Memory/Swarm Identity Protection', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Must NOT store swarm identity in memory blocks (Rule 5)', () => {
		expect(prompt).toContain('NEVER store your swarm identity');
		expect(prompt).toContain('swarm ID, or agent prefix in memory blocks');
		expect(prompt).toContain('Your identity comes ONLY from your system prompt');
		expect(prompt).toContain('Memory blocks are for project knowledge only');
	});

	test('SECURITY: Phase 0 purges stale memory on swarm resume', () => {
		expect(prompt).toContain('Purge any memory blocks');
		expect(prompt).toContain('that reference a different swarm\'s identity');
	});
});

describe('ARCHITECT WORKFLOW: Delegation Safety', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Must delegate ALL coding to coder (Rule 1)', () => {
		expect(prompt).toContain('DELEGATE all coding to {{AGENT_PREFIX}}coder');
		expect(prompt).toContain('You do NOT write code');
	});

	test('SECURITY: Fallback only after QA_RETRY_LIMIT failures (Rule 4)', () => {
		expect(prompt).toContain('Fallback: Only code yourself');
		expect(prompt).toContain('after {{QA_RETRY_LIMIT}} {{AGENT_PREFIX}}coder failures');
		expect(prompt).toContain('on same task');
	});

	test('SECURITY: One agent per message (Rule 2)', () => {
		expect(prompt).toContain('ONE agent per message');
		expect(prompt).toContain('Send, STOP, wait for response');
	});

	test('SECURITY: One task per coder call (Rule 3)', () => {
		expect(prompt).toContain('ONE task per {{AGENT_PREFIX}}coder call');
		expect(prompt).toContain('Never batch');
	});

	test('SECURITY: CONSTRAINT field enforces restrictions in delegation', () => {
		expect(prompt).toContain('CONSTRAINT: [what NOT to do]');
		expect(prompt).toContain('CONSTRAINT: Focus on auth only');
		expect(prompt).toContain('CONSTRAINT: Do not modify other functions');
	});
});

describe('ARCHITECT WORKFLOW: Adversarial Test Constraints', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Adversarial tests restricted to attack vectors only', () => {
		// In Rule 7 (MANDATORY QA GATE)
		expect(prompt).toContain('adversarial tests');
		expect(prompt).toContain('attack vectors only');
		
		// In delegation example
		expect(prompt).toContain('CONSTRAINT: ONLY attack vectors');
		expect(prompt).toContain('malformed inputs, oversized payloads, injection attempts');
	});

	test('SECURITY: Verification tests have different constraint than adversarial', () => {
		// Verification tests are for functional correctness
		const verifSection = prompt.substring(
			prompt.indexOf('verification tests'),
			prompt.indexOf('verification tests') + 100
		);
		// Should NOT say "attack vectors" for verification
		expect(verifSection.toLowerCase()).not.toContain('attack');
	});
});

describe('ARCHITECT WORKFLOW: Retrospective Tracking', () => {
	const prompt = createArchitectAgent('test-model').config.prompt;

	test('SECURITY: Phase metrics tracked at end of EVERY phase', () => {
		expect(prompt).toContain('**RETROSPECTIVE TRACKING**');
		expect(prompt).toContain('At the end of every phase');
	});

	test('SECURITY: Evidence written BEFORE user summary in Phase 6', () => {
		const phase6Start = prompt.indexOf('### Phase 6: Phase Complete');
		const phase6Section = prompt.substring(phase6Start, phase6Start + 800);
		
		const evidencePos = phase6Section.indexOf('Write retrospective evidence');
		const summarizePos = phase6Section.indexOf('5. Summarize');
		
		expect(evidencePos).toBeGreaterThan(-1);
		expect(summarizePos).toBeGreaterThan(-1);
		expect(evidencePos).toBeLessThan(summarizePos);
	});

	test('SECURITY: Phase metrics reset after writing', () => {
		expect(prompt).toContain('Reset Phase Metrics');
		expect(prompt).toContain('Reset Phase Metrics to 0');
	});
});

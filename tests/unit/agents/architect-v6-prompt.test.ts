import { describe, expect, it } from 'bun:test';
import { createArchitectAgent } from '../../../src/agents/architect';

describe('Architect Prompt v6.0 QA & Security Gates (Task 3.2)', () => {
	const agent = createArchitectAgent('test-model');
	const prompt = agent.config.prompt!;

	// ============================================
	// TASK 3.2: Pre-reviewer Sequence & Security Gate
	// ============================================

	describe('Task 3.2 - Pre-reviewer Sequence (imports, lint, secretscan before reviewer)', () => {
		it('1. Rule 7 contains pre-reviewer sequence: imports', () => {
			expect(prompt).toContain('imports');
		});

		it('2. Rule 7 contains pre-reviewer sequence: lint fix', () => {
			expect(prompt).toContain('lint fix');
		});

		it('3. Rule 7 contains pre-reviewer sequence: lint check', () => {
			expect(prompt).toContain('lint check');
		});

		it('4. Rule 7 contains pre-reviewer sequence: secretscan', () => {
			expect(prompt).toContain('secretscan');
		});

		it('5. Rule 7 contains pre-reviewer sequence: reviewer comes after tools', () => {
			// The sequence should be: ... → secretscan → ... → reviewer
			expect(prompt).toMatch(/secretscan.*reviewer|secretscan.*proceed to reviewer/);
		});

		it('6. Rule 7 mentions NO FINDINGS gate before reviewer', () => {
			expect(prompt).toContain('NO FINDINGS → proceed to reviewer');
		});

		it('7. Available Tools includes imports', () => {
			expect(prompt).toContain('Available Tools:');
			expect(prompt).toContain('imports (dependency audit)');
		});

		it('8. Available Tools includes lint', () => {
			expect(prompt).toContain('lint (code quality)');
		});

		it('9. Available Tools includes secretscan', () => {
			expect(prompt).toContain('secretscan (secret detection)');
		});
	});

	describe('Task 3.2 - Security Gate (security-only re-review)', () => {
		it('10. Security gate exists in Rule 7 with security globs', () => {
			expect(prompt).toContain('security globs');
			expect(prompt).toContain('auth, api, crypto, security, middleware, session, token');
		});

		it('11. Security gate triggers on security keywords in coder output', () => {
			expect(prompt).toContain('coder output contains security keywords');
		});

		it('12. Security gate delegates to reviewer with security-only CHECK', () => {
			expect(prompt).toContain('security-only CHECK');
		});

		it('13. Security-only re-review example exists in DELEGATION FORMAT', () => {
			// Check for the example in the delegation format section
			expect(prompt).toContain('Security-only review');
			expect(prompt).toContain('CHECK: [security-only]');
		});

		it('14. Security-only review mentions OWASP Top 10', () => {
			expect(prompt).toContain('OWASP Top 10');
		});

		it('15. Security gate includes secretscan findings trigger', () => {
			// In Phase 5 workflow: "secretscan has ANY findings"
			expect(prompt).toContain('secretscan has ANY findings');
		});
	});

	describe('Rule 7 - Mandatory QA Gate Summary', () => {
		it('16. Rule 7 contains "MANDATORY QA GATE"', () => {
			expect(prompt).toContain('MANDATORY QA GATE');
		});

		it('17. Rule 7 contains full sequence with tools', () => {
			// The full sequence should include all the pre-reviewer tools
			expect(prompt).toContain('coder → diff → imports → lint fix → lint check → secretscan');
		});

		it('18. Rule 7 mentions security review in sequence', () => {
			expect(prompt).toContain('security review');
		});

		it('19. Rule 7 mentions verification tests', () => {
			expect(prompt).toContain('verification tests');
		});

		it('20. Rule 7 mentions adversarial tests', () => {
			expect(prompt).toContain('adversarial tests');
		});

		it('21. Rule 7 mentions integration analysis with hasContractChanges', () => {
			expect(prompt).toContain('hasContractChanges');
			expect(prompt).toContain('integration impact analysis');
		});
	});

	describe('Rule Structure', () => {
		it('22. No Rule 8 exists', () => {
			expect(prompt).not.toContain('8. **NEVER skip the QA gate');
		});
	});

	describe('Phase 5 Workflow - Pre-reviewer Tools', () => {
		it('23. Phase 5 step 5c is diff tool', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5c. Run `diff` tool');
		});

		it('24. Phase 5 step 5d is imports tool', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5d. Run `imports` tool');
		});

		it('25. Phase 5 step 5e is lint tool', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5e. Run `lint` tool');
		});

		it('26. Phase 5 step 5f is secretscan tool', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5f. Run `secretscan` tool');
			expect(phase5Section).toContain('NO FINDINGS → proceed to reviewer');
		});
	});

	describe('Phase 5 Workflow - Security Gate', () => {
		it('27. Phase 5 step 5g is general reviewer', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5g. {{AGENT_PREFIX}}reviewer - General review');
		});

		it('28. Phase 5 step 5h is Security gate', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5h. Security gate');
		});

		it('29. Security gate includes security globs trigger', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('file matches security globs');
		});

		it('30. Security gate includes content keywords trigger', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('content has security keywords');
		});

		it('31. Security gate includes secretscan findings trigger', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('secretscan has ANY findings');
		});

		it('32. Security gate delegates to reviewer security-only', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('{{AGENT_PREFIX}}reviewer security-only');
		});
	});

	describe('Phase 5 Workflow - Test Steps', () => {
		it('33. Phase 5 step 5i is verification tests', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5i. {{AGENT_PREFIX}}test_engineer - Verification tests');
		});

		it('34. Phase 5 step 5j is adversarial tests', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5j. {{AGENT_PREFIX}}test_engineer - Adversarial tests');
		});

		it('35. Phase 5 step 5k is COVERAGE CHECK', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5k. COVERAGE CHECK');
		});

		it('36. Phase 5 step 5l is update plan.md', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5l. Update plan.md');
		});

		it('37. Phase 5 has steps 5a through 5l', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('5a.');
			expect(phase5Section).toContain('5b.');
			expect(phase5Section).toContain('5c.');
			expect(phase5Section).toContain('5d.');
			expect(phase5Section).toContain('5e.');
			expect(phase5Section).toContain('5f.');
			expect(phase5Section).toContain('5g.');
			expect(phase5Section).toContain('5h.');
			expect(phase5Section).toContain('5i.');
			expect(phase5Section).toContain('5j.');
			expect(phase5Section).toContain('5k.');
			expect(phase5Section).toContain('5l.');
		});
	});

	describe('Phase 5 Workflow - Retry Logic', () => {
		it('38. Reviewer retry logic mentions QA_RETRY_LIMIT', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('QA_RETRY_LIMIT');
			expect(phase5Section).toContain('coder retry');
		});

		it('39. Security gate has retry logic', () => {
			const phase5Section = prompt.slice(
				prompt.indexOf('### Phase 5: Execute'),
				prompt.indexOf('### Phase 6:')
			);
			expect(phase5Section).toContain('REJECTED → coder retry');
		});
	});

	describe('Adversarial Test Example', () => {
		it('40. Adversarial test example exists', () => {
			expect(prompt).toContain('Adversarial security testing');
			expect(prompt).toContain('attack vectors');
		});
	});

	describe('Integration Analysis Example', () => {
		it('41. Integration analysis example exists', () => {
			expect(prompt).toContain('Integration impact analysis');
			expect(prompt).toContain('BREAKING/COMPATIBLE');
		});
	});

	describe('Rule 10 - Retrospective Tracking', () => {
		it('42. Rule 10 contains "RETROSPECTIVE TRACKING"', () => {
			expect(prompt).toContain('RETROSPECTIVE TRACKING');
		});

		it('43. Rule 10 mentions evidence manager', () => {
			expect(prompt).toContain('evidence manager');
		});

		it('44. Rule 10 lists tracked metrics', () => {
			expect(prompt).toContain('phase_number');
			expect(prompt).toContain('coder_revisions');
			expect(prompt).toContain('reviewer_rejections');
			expect(prompt).toContain('test_failures');
			expect(prompt).toContain('security_findings');
			expect(prompt).toContain('lessons_learned');
		});

		it('45. Rule 10 mentions Phase Metrics reset', () => {
			expect(prompt).toContain('Reset Phase Metrics');
		});
	});

	describe('Phase 6 Structure', () => {
		it('46. Phase 6 has retrospective evidence step', () => {
			const phase6Start = prompt.indexOf('### Phase 6:');
			const blockersStart = prompt.indexOf('### Blockers');
			const phase6Section = prompt.slice(phase6Start, blockersStart);
			expect(phase6Section).toContain('Write retrospective evidence');
			expect(phase6Section).toContain('evidence manager');
		});

		it('47. Phase 6 mentions Reset Phase Metrics', () => {
			const phase6Start = prompt.indexOf('### Phase 6:');
			const blockersStart = prompt.indexOf('### Blockers');
			const phase6Section = prompt.slice(phase6Start, blockersStart);
			expect(phase6Section).toContain('Reset Phase Metrics');
		});
	});
});

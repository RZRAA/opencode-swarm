import { loadPluginConfig } from '../config/loader';
import type { Plan } from '../config/plan-schema';
import { listEvidenceTaskIds } from '../evidence/manager';
import { readSwarmFileAsync } from '../hooks/utils';
import { loadPlanJsonOnly } from '../plan/manager';

/**
 * A single health check result.
 */
export interface HealthCheck {
	name: string;
	status: '✅' | '❌';
	detail: string;
}

/**
 * Structured diagnose data returned by the diagnose service.
 */
export interface DiagnoseData {
	checks: HealthCheck[];
	passCount: number;
	totalCount: number;
	allPassed: boolean;
}

/**
 * Validate task dependencies in a plan.
 */
function validateTaskDag(plan: Plan): {
	valid: boolean;
	missingDeps: string[];
} {
	const allTaskIds = new Set<string>();
	for (const phase of plan.phases) {
		for (const task of phase.tasks) {
			allTaskIds.add(task.id);
		}
	}

	const missingDeps: string[] = [];
	for (const phase of plan.phases) {
		for (const task of phase.tasks) {
			for (const dep of task.depends) {
				if (!allTaskIds.has(dep)) {
					missingDeps.push(`${task.id} depends on missing ${dep}`);
				}
			}
		}
	}

	return { valid: missingDeps.length === 0, missingDeps };
}

/**
 * Check evidence completeness against completed tasks.
 */
async function checkEvidenceCompleteness(
	directory: string,
	plan: Plan,
): Promise<HealthCheck> {
	const completedTaskIds: string[] = [];
	for (const phase of plan.phases) {
		for (const task of phase.tasks) {
			if (task.status === 'completed') {
				completedTaskIds.push(task.id);
			}
		}
	}

	if (completedTaskIds.length > 0) {
		const evidenceTaskIds = new Set(await listEvidenceTaskIds(directory));
		const missingEvidence = completedTaskIds.filter(
			(id) => !evidenceTaskIds.has(id),
		);

		if (missingEvidence.length === 0) {
			return {
				name: 'Evidence',
				status: '✅',
				detail: `All ${completedTaskIds.length} completed tasks have evidence`,
			};
		} else {
			return {
				name: 'Evidence',
				status: '❌',
				detail: `${missingEvidence.length} completed task(s) missing evidence: ${missingEvidence.join(', ')}`,
			};
		}
	}

	return {
		name: 'Evidence',
		status: '✅',
		detail: 'No completed tasks yet',
	};
}

/**
 * Get diagnose data from the swarm directory.
 * Returns structured health checks for GUI, background flows, or commands.
 */
export async function getDiagnoseData(
	directory: string,
): Promise<DiagnoseData> {
	const checks: HealthCheck[] = [];

	// Check 1: Try structured plan (only if plan.json exists, no auto-migration)
	const plan = await loadPlanJsonOnly(directory);

	if (plan) {
		// plan.json loaded and validated
		checks.push({
			name: 'plan.json',
			status: '✅',
			detail: 'Valid schema (v1.0.0)',
		});

		// Report migration status if present
		if (plan.migration_status === 'migrated') {
			checks.push({
				name: 'Migration',
				status: '✅',
				detail: 'Plan was migrated from legacy plan.md',
			});
		} else if (plan.migration_status === 'migration_failed') {
			checks.push({
				name: 'Migration',
				status: '❌',
				detail: 'Migration from plan.md failed — review manually',
			});
		}

		// Validate task DAG (check for missing dependencies)
		const dagResult = validateTaskDag(plan);
		if (dagResult.valid) {
			checks.push({
				name: 'Task DAG',
				status: '✅',
				detail: 'All dependencies resolved',
			});
		} else {
			checks.push({
				name: 'Task DAG',
				status: '❌',
				detail: `Missing dependencies: ${dagResult.missingDeps.join(', ')}`,
			});
		}

		// Check evidence completeness
		const evidenceCheck = await checkEvidenceCompleteness(directory, plan);
		checks.push(evidenceCheck);
	} else {
		// Fall back to checking plan.md (legacy behavior)
		const planContent = await readSwarmFileAsync(directory, 'plan.md');
		if (planContent) {
			const hasPhases = /^## Phase \d+/m.test(planContent);
			const hasTasks = /^- \[[ x]\]/m.test(planContent);
			if (hasPhases && hasTasks) {
				checks.push({
					name: 'plan.md',
					status: '✅',
					detail: 'Found with valid phase structure',
				});
			} else {
				checks.push({
					name: 'plan.md',
					status: '❌',
					detail: 'Found but missing phase/task structure',
				});
			}
		} else {
			checks.push({
				name: 'plan.md',
				status: '❌',
				detail: 'Not found',
			});
		}
	}

	// Check: context.md exists
	const contextContent = await readSwarmFileAsync(directory, 'context.md');
	if (contextContent) {
		checks.push({ name: 'context.md', status: '✅', detail: 'Found' });
	} else {
		checks.push({ name: 'context.md', status: '❌', detail: 'Not found' });
	}

	// Check: Plugin config
	try {
		const config = loadPluginConfig(directory);
		if (config) {
			checks.push({
				name: 'Plugin config',
				status: '✅',
				detail: 'Valid configuration loaded',
			});
		} else {
			checks.push({
				name: 'Plugin config',
				status: '✅',
				detail: 'Using defaults (no custom config)',
			});
		}
	} catch {
		checks.push({
			name: 'Plugin config',
			status: '❌',
			detail: 'Invalid configuration',
		});
	}

	const passCount = checks.filter((c) => c.status === '✅').length;
	const totalCount = checks.length;
	const allPassed = passCount === totalCount;

	return {
		checks,
		passCount,
		totalCount,
		allPassed,
	};
}

/**
 * Format diagnose data as markdown for command output.
 */
export function formatDiagnoseMarkdown(diagnose: DiagnoseData): string {
	const lines = [
		'## Swarm Health Check',
		'',
		...diagnose.checks.map((c) => `- ${c.status} **${c.name}**: ${c.detail}`),
		'',
		`**Result**: ${diagnose.allPassed ? '✅ All checks passed' : `⚠️ ${diagnose.passCount}/${diagnose.totalCount} checks passed`}`,
	];

	return lines.join('\n');
}

/**
 * Handle diagnose command - delegates to service and formats output.
 * Kept for backward compatibility - thin adapter.
 */
export async function handleDiagnoseCommand(
	directory: string,
	_args: string[],
): Promise<string> {
	const diagnoseData = await getDiagnoseData(directory);
	return formatDiagnoseMarkdown(diagnoseData);
}

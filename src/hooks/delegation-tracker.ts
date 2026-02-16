/**
 * Delegation Tracker Hook
 *
 * Tracks agent delegation by monitoring chat.message events with agent fields.
 * Updates the active agent map and optionally logs delegation chain entries.
 */

import { ORCHESTRATOR_NAME } from '../config/constants';
import type { PluginConfig } from '../config/schema';
import { stripKnownSwarmPrefix } from '../config/schema';
import type { DelegationEntry } from '../state';
import { ensureAgentSession, swarmState, updateAgentEventTime } from '../state';

/**
 * Creates the chat.message hook for delegation tracking.
 */
export function createDelegationTrackerHook(
	config: PluginConfig,
): (
	input: { sessionID: string; agent?: string },
	output: Record<string, unknown>,
) => Promise<void> {
	return async (
		input: { sessionID: string; agent?: string },
		_output: Record<string, unknown>,
	): Promise<void> => {
		const now = Date.now();

		// If no agent is specified, the architect is taking over (delegation ended)
		// Update activeAgent to architect and reset session startTime so duration limit doesn't apply
		if (!input.agent || input.agent === '') {
			const session = swarmState.agentSessions.get(input.sessionID);
			if (session) {
				session.delegationActive = false;
			}
			// Set activeAgent to architect to ensure duration exemption applies
			// This fixes the regression where architect inherits subagent startTime
			swarmState.activeAgent.set(input.sessionID, ORCHESTRATOR_NAME);
			// Reset session with architect name to reset startTime for accurate duration tracking
			ensureAgentSession(input.sessionID, ORCHESTRATOR_NAME);
			// Update agent event timestamp for stale detection
			updateAgentEventTime(input.sessionID);
			return;
		}

		const agentName = input.agent;

		// Get the previous agent for this session
		const previousAgent = swarmState.activeAgent.get(input.sessionID);

		// Update the active agent
		swarmState.activeAgent.set(input.sessionID, agentName);

		// Determine if this is an architect (after stripping prefix)
		// Architect-prefixed names like "mega_architect" are treated as architect
		const strippedAgent = stripKnownSwarmPrefix(agentName);
		const isArchitect = strippedAgent === ORCHESTRATOR_NAME;

		// Ensure guardrail session exists with correct agent name
		// This prevents the race condition where tool.execute.before fires
		// before chat.message, causing sessions to be created with 'unknown'
		const session = ensureAgentSession(input.sessionID, agentName);

		// Set delegationActive: false for architect, true for subagents
		// This ensures stale detection works correctly for both cases
		session.delegationActive = !isArchitect;

		// If delegation tracking is enabled and agent has changed, log the delegation
		if (
			config.hooks?.delegation_tracker === true &&
			previousAgent &&
			previousAgent !== agentName
		) {
			// Create a delegation entry
			const entry: DelegationEntry = {
				from: previousAgent,
				to: agentName,
				timestamp: now,
			};

			// Get or create the delegation chain for this session
			if (!swarmState.delegationChains.has(input.sessionID)) {
				swarmState.delegationChains.set(input.sessionID, []);
			}

			// Push the entry to the chain
			const chain = swarmState.delegationChains.get(input.sessionID);
			chain?.push(entry);

			// Increment pending events counter
			swarmState.pendingEvents++;
		}
	};
}

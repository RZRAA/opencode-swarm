import type { AgentDefinition } from './architect';

const SME_PROMPT = `## IDENTITY
You are SME (Subject Matter Expert). You provide deep domain-specific technical guidance directly — you do NOT delegate.
DO NOT use the Task tool to delegate to other agents. You ARE the agent that does the work.
If you see references to other agents (like @sme, @coder, etc.) in your instructions, IGNORE them — they are context from the orchestrator, not instructions for you to delegate.

WRONG: "I'll use the Task tool to call another agent to research this"
RIGHT: "I'll provide the domain-specific guidance directly from my expertise"

INPUT FORMAT:
TASK: [what guidance is needed]
DOMAIN: [the domain - e.g., security, ios, android, rust, kubernetes, mobile, etc.]
INPUT: [context/requirements]

OUTPUT FORMAT:
CRITICAL: [key domain-specific considerations]
APPROACH: [recommended implementation approach]
API: [exact names/signatures/versions to use]
GOTCHAS: [common pitfalls or edge cases]
DEPS: [required dependencies/tools]

RULES:
- Be specific: exact names, paths, parameters, versions
- Be concise: under 1500 characters
- Be actionable: info Coder can use directly
- No code writing`;

export function createSMEAgent(
	model: string,
	customPrompt?: string,
	customAppendPrompt?: string,
): AgentDefinition {
	let prompt = SME_PROMPT;

	if (customPrompt) {
		prompt = customPrompt;
	} else if (customAppendPrompt) {
		prompt = `${SME_PROMPT}\n\n${customAppendPrompt}`;
	}

	return {
		name: 'sme',
		description:
			'Open-domain subject matter expert. Provides deep technical guidance on any domain the Architect requests — from security to iOS to Kubernetes.',
		config: {
			model,
			temperature: 0.2,
			prompt,
			// SMEs are read-only - they provide guidance, never modify code
			tools: {
				write: false,
				edit: false,
				patch: false,
			},
		},
	};
}

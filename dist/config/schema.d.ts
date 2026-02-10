import { z } from 'zod';
export declare const AgentOverrideConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    disabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type AgentOverrideConfig = z.infer<typeof AgentOverrideConfigSchema>;
export declare const SwarmConfigSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        disabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;
export declare const HooksConfigSchema: z.ZodObject<{
    system_enhancer: z.ZodDefault<z.ZodBoolean>;
    compaction: z.ZodDefault<z.ZodBoolean>;
    agent_activity: z.ZodDefault<z.ZodBoolean>;
    delegation_tracker: z.ZodDefault<z.ZodBoolean>;
    agent_awareness_max_chars: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export declare const ContextBudgetConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    warn_threshold: z.ZodDefault<z.ZodNumber>;
    critical_threshold: z.ZodDefault<z.ZodNumber>;
    model_limits: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    max_injection_tokens: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ContextBudgetConfig = z.infer<typeof ContextBudgetConfigSchema>;
export declare const EvidenceConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    max_age_days: z.ZodDefault<z.ZodNumber>;
    max_bundles: z.ZodDefault<z.ZodNumber>;
    auto_archive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type EvidenceConfig = z.infer<typeof EvidenceConfigSchema>;
export declare const GuardrailsProfileSchema: z.ZodObject<{
    max_tool_calls: z.ZodOptional<z.ZodNumber>;
    max_duration_minutes: z.ZodOptional<z.ZodNumber>;
    max_repetitions: z.ZodOptional<z.ZodNumber>;
    max_consecutive_errors: z.ZodOptional<z.ZodNumber>;
    warning_threshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type GuardrailsProfile = z.infer<typeof GuardrailsProfileSchema>;
export declare const DEFAULT_ARCHITECT_PROFILE: GuardrailsProfile;
export declare const GuardrailsConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    max_tool_calls: z.ZodDefault<z.ZodNumber>;
    max_duration_minutes: z.ZodDefault<z.ZodNumber>;
    max_repetitions: z.ZodDefault<z.ZodNumber>;
    max_consecutive_errors: z.ZodDefault<z.ZodNumber>;
    warning_threshold: z.ZodDefault<z.ZodNumber>;
    profiles: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        max_tool_calls: z.ZodOptional<z.ZodNumber>;
        max_duration_minutes: z.ZodOptional<z.ZodNumber>;
        max_repetitions: z.ZodOptional<z.ZodNumber>;
        max_consecutive_errors: z.ZodOptional<z.ZodNumber>;
        warning_threshold: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;
/**
 * Resolve guardrails configuration for a specific agent.
 * Merges the base config with built-in defaults (for the architect) and
 * any per-agent profile overrides. Merge order: base < built-in < user profile.
 *
 * @param base - The base guardrails configuration
 * @param agentName - Optional agent name to look up profile overrides
 * @returns The effective guardrails configuration for the agent
 */
export declare function resolveGuardrailsConfig(base: GuardrailsConfig, agentName?: string): GuardrailsConfig;
export declare const PluginConfigSchema: z.ZodObject<{
    agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        disabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    swarms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
            disabled: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>>;
    max_iterations: z.ZodDefault<z.ZodNumber>;
    qa_retry_limit: z.ZodDefault<z.ZodNumber>;
    inject_phase_reminders: z.ZodDefault<z.ZodBoolean>;
    hooks: z.ZodOptional<z.ZodObject<{
        system_enhancer: z.ZodDefault<z.ZodBoolean>;
        compaction: z.ZodDefault<z.ZodBoolean>;
        agent_activity: z.ZodDefault<z.ZodBoolean>;
        delegation_tracker: z.ZodDefault<z.ZodBoolean>;
        agent_awareness_max_chars: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    context_budget: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        warn_threshold: z.ZodDefault<z.ZodNumber>;
        critical_threshold: z.ZodDefault<z.ZodNumber>;
        model_limits: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        max_injection_tokens: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    guardrails: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        max_tool_calls: z.ZodDefault<z.ZodNumber>;
        max_duration_minutes: z.ZodDefault<z.ZodNumber>;
        max_repetitions: z.ZodDefault<z.ZodNumber>;
        max_consecutive_errors: z.ZodDefault<z.ZodNumber>;
        warning_threshold: z.ZodDefault<z.ZodNumber>;
        profiles: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            max_tool_calls: z.ZodOptional<z.ZodNumber>;
            max_duration_minutes: z.ZodOptional<z.ZodNumber>;
            max_repetitions: z.ZodOptional<z.ZodNumber>;
            max_consecutive_errors: z.ZodOptional<z.ZodNumber>;
            warning_threshold: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    evidence: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        max_age_days: z.ZodDefault<z.ZodNumber>;
        max_bundles: z.ZodDefault<z.ZodNumber>;
        auto_archive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type { AgentName, PipelineAgentName, QAAgentName, } from './constants';

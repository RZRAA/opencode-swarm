import { describe, it, expect } from 'bun:test';
import {
	GuardrailsProfileSchema,
	GuardrailsConfigSchema,
	resolveGuardrailsConfig,
	DEFAULT_ARCHITECT_PROFILE,
	type GuardrailsConfig,
} from '../../../src/config/schema';

describe('GuardrailsProfileSchema', () => {
	it('valid profile with all fields parses', () => {
		const profile = {
			max_tool_calls: 100,
			max_duration_minutes: 15,
			max_repetitions: 5,
			max_consecutive_errors: 3,
			warning_threshold: 0.7,
		};

		const result = GuardrailsProfileSchema.parse(profile);
		expect(result).toEqual(profile);
	});

	it('empty object parses (all fields optional)', () => {
		const result = GuardrailsProfileSchema.parse({});
		expect(result).toEqual({});
	});

	it('single field parses', () => {
		const result = GuardrailsProfileSchema.parse({ max_tool_calls: 50 });
		expect(result).toEqual({ max_tool_calls: 50 });
	});

	it('invalid max_tool_calls (below 10) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_tool_calls: 5 }),
		).toThrow();
	});

	it('invalid max_tool_calls (above 1000) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_tool_calls: 1500 }),
		).toThrow();
	});

	it('invalid max_duration_minutes (below 1) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_duration_minutes: 0 }),
		).toThrow();
	});

	it('invalid max_duration_minutes (above 120) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_duration_minutes: 150 }),
		).toThrow();
	});

	it('invalid max_repetitions (below 3) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_repetitions: 2 }),
		).toThrow();
	});

	it('invalid max_repetitions (above 50) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_repetitions: 60 }),
		).toThrow();
	});

	it('invalid max_consecutive_errors (below 2) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_consecutive_errors: 1 }),
		).toThrow();
	});

	it('invalid max_consecutive_errors (above 20) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ max_consecutive_errors: 25 }),
		).toThrow();
	});

	it('invalid warning_threshold (below 0.1) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ warning_threshold: 0.05 }),
		).toThrow();
	});

	it('invalid warning_threshold (above 0.9) rejects', () => {
		expect(() =>
			GuardrailsProfileSchema.parse({ warning_threshold: 0.95 }),
		).toThrow();
	});
});

describe('GuardrailsConfigSchema with profiles', () => {
	it('GuardrailsConfigSchema with profiles field parses', () => {
		const config = {
			enabled: true,
			max_tool_calls: 200,
			max_duration_minutes: 30,
			max_repetitions: 10,
			max_consecutive_errors: 5,
			warning_threshold: 0.5,
			profiles: {
				coder: { max_tool_calls: 400 },
				explorer: { max_duration_minutes: 60 },
			},
		};

		const result = GuardrailsConfigSchema.parse(config);
		expect(result).toEqual(config);
	});

	it('GuardrailsConfigSchema without profiles (backward compat) parses', () => {
		const config = {
			enabled: true,
			max_tool_calls: 200,
			max_duration_minutes: 30,
			max_repetitions: 10,
			max_consecutive_errors: 5,
			warning_threshold: 0.5,
		};

		const result = GuardrailsConfigSchema.parse(config);
		expect(result).toEqual(config);
	});

	it('empty profiles object parses', () => {
		const config = {
			enabled: true,
			max_tool_calls: 200,
			max_duration_minutes: 30,
			max_repetitions: 10,
			max_consecutive_errors: 5,
			warning_threshold: 0.5,
			profiles: {},
		};

		const result = GuardrailsConfigSchema.parse(config);
		expect(result).toEqual(config);
	});

	it('validates profile fields within profiles object', () => {
		const config = {
			enabled: true,
			max_tool_calls: 200,
			max_duration_minutes: 30,
			max_repetitions: 10,
			max_consecutive_errors: 5,
			warning_threshold: 0.5,
			profiles: {
				coder: { max_tool_calls: 5 }, // Invalid: below 10
			},
		};

		expect(() => GuardrailsConfigSchema.parse(config)).toThrow();
	});
});

describe('resolveGuardrailsConfig', () => {
	const baseConfig: GuardrailsConfig = {
		enabled: true,
		max_tool_calls: 10,
		max_duration_minutes: 30,
		max_repetitions: 10,
		max_consecutive_errors: 5,
		warning_threshold: 0.5,
		profiles: {
			coder: { max_tool_calls: 20, warning_threshold: 0.7 },
			explorer: { max_duration_minutes: 60 },
		},
	};

	it('returns base when no agentName provided', () => {
		const result = resolveGuardrailsConfig(baseConfig);
		expect(result).toBe(baseConfig);
	});

	it('returns base when agentName is undefined', () => {
		const result = resolveGuardrailsConfig(baseConfig, undefined);
		expect(result).toBe(baseConfig);
	});

	it('returns base when agentName is empty string', () => {
		const result = resolveGuardrailsConfig(baseConfig, '');
		expect(result).toBe(baseConfig);
	});

	it('returns base when agentName not in profiles', () => {
		const result = resolveGuardrailsConfig(baseConfig, 'unknown-agent');
		expect(result).toBe(baseConfig);
	});

	it('returns base when profiles field is undefined', () => {
		const configWithoutProfiles: GuardrailsConfig = {
			...baseConfig,
			profiles: undefined,
		};

		const result = resolveGuardrailsConfig(configWithoutProfiles, 'coder');
		expect(result).toBe(configWithoutProfiles);
	});

	it('merges single field override (coder gets max_tool_calls=20)', () => {
		const result = resolveGuardrailsConfig(baseConfig, 'coder');
		expect(result.max_tool_calls).toBe(20);
		expect(result.max_duration_minutes).toBe(30); // Unchanged
		expect(result.max_repetitions).toBe(10); // Unchanged
		expect(result.max_consecutive_errors).toBe(5); // Unchanged
		expect(result.warning_threshold).toBe(0.7); // Also overridden
	});

	it('merges multiple field overrides', () => {
		const config: GuardrailsConfig = {
			...baseConfig,
			profiles: {
				coder: {
					max_tool_calls: 50,
					max_duration_minutes: 45,
					max_repetitions: 15,
					max_consecutive_errors: 10,
					warning_threshold: 0.8,
				},
			},
		};

		const result = resolveGuardrailsConfig(config, 'coder');
		expect(result.max_tool_calls).toBe(50);
		expect(result.max_duration_minutes).toBe(45);
		expect(result.max_repetitions).toBe(15);
		expect(result.max_consecutive_errors).toBe(10);
		expect(result.warning_threshold).toBe(0.8);
	});

	it('profile does not affect other agents (explorer profile does not affect coder resolution)', () => {
		const result = resolveGuardrailsConfig(baseConfig, 'coder');
		expect(result.max_tool_calls).toBe(20); // coder's override
		expect(result.max_duration_minutes).toBe(30); // base value, not explorer's 60
	});

	it('base profiles field preserved in result', () => {
		const result = resolveGuardrailsConfig(baseConfig, 'coder');
		expect(result.profiles).toBe(baseConfig.profiles);
	});

	it('enabled field not affected by profile', () => {
		const result = resolveGuardrailsConfig(baseConfig, 'coder');
		expect(result.enabled).toBe(true);
	});

	it('profile with partial overrides merges correctly', () => {
		const config: GuardrailsConfig = {
			enabled: true,
			max_tool_calls: 100,
			max_duration_minutes: 30,
			max_repetitions: 10,
			max_consecutive_errors: 5,
			warning_threshold: 0.5,
			profiles: {
				tester: { max_consecutive_errors: 2 }, // Only override one field
			},
		};

		const result = resolveGuardrailsConfig(config, 'tester');
		expect(result.max_tool_calls).toBe(100); // Base value
		expect(result.max_duration_minutes).toBe(30); // Base value
		expect(result.max_repetitions).toBe(10); // Base value
		expect(result.max_consecutive_errors).toBe(2); // Override value
		expect(result.warning_threshold).toBe(0.5); // Base value
	});

	it('multiple profiles can exist with different overrides', () => {
		const config: GuardrailsConfig = {
			enabled: true,
			max_tool_calls: 50,
			max_duration_minutes: 20,
			max_repetitions: 5,
			max_consecutive_errors: 3,
			warning_threshold: 0.5,
			profiles: {
				coder: { max_tool_calls: 100 },
				explorer: { max_duration_minutes: 40 },
				tester: { max_repetitions: 10 },
			},
		};

		const coderResult = resolveGuardrailsConfig(config, 'coder');
		expect(coderResult.max_tool_calls).toBe(100);

		const explorerResult = resolveGuardrailsConfig(config, 'explorer');
		expect(explorerResult.max_duration_minutes).toBe(40);

		const testerResult = resolveGuardrailsConfig(config, 'tester');
		expect(testerResult.max_repetitions).toBe(10);
	});
});

describe('resolveGuardrailsConfig architect defaults', () => {
	const base: GuardrailsConfig = {
		enabled: true,
		max_tool_calls: 200,
		max_duration_minutes: 30,
		max_repetitions: 10,
		max_consecutive_errors: 5,
		warning_threshold: 0.5,
	};

	it('architect gets built-in default profile automatically', () => {
		const result = resolveGuardrailsConfig(base, 'architect');
		expect(result.max_tool_calls).toBe(600);
		expect(result.max_duration_minutes).toBe(90);
		expect(result.max_consecutive_errors).toBe(8);
		expect(result.warning_threshold).toBe(0.7);
	});

	it('architect built-in does not override max_repetitions (not in DEFAULT_ARCHITECT_PROFILE)', () => {
		const result = resolveGuardrailsConfig(base, 'architect');
		expect(result.max_repetitions).toBe(10);
	});

	it('non-architect agents do not get built-in defaults', () => {
		const result = resolveGuardrailsConfig(base, 'coder');
		expect(result).toBe(base);
	});

	it('user profile overrides built-in architect defaults', () => {
		const config: GuardrailsConfig = {
			...base,
			profiles: {
				architect: { max_tool_calls: 300 },
			},
		};

		const result = resolveGuardrailsConfig(config, 'architect');
		expect(result.max_tool_calls).toBe(300); // User wins
		expect(result.max_duration_minutes).toBe(90); // Built-in
		expect(result.warning_threshold).toBe(0.7); // Built-in
	});

	it('user can fully override all architect built-in defaults', () => {
		const config: GuardrailsConfig = {
			...base,
			profiles: {
				architect: {
					max_tool_calls: 250,
					max_duration_minutes: 45,
					max_consecutive_errors: 4,
					warning_threshold: 0.6,
				},
			},
		};

		const result = resolveGuardrailsConfig(config, 'architect');
		expect(result.max_tool_calls).toBe(250);
		expect(result.max_duration_minutes).toBe(45);
		expect(result.max_consecutive_errors).toBe(4);
		expect(result.warning_threshold).toBe(0.6);
	});

	it('DEFAULT_ARCHITECT_PROFILE values are within schema bounds', () => {
		const result = GuardrailsProfileSchema.parse(DEFAULT_ARCHITECT_PROFILE);
		expect(result.max_tool_calls).toBe(600);
		expect(result.max_duration_minutes).toBe(90);
		expect(result.max_consecutive_errors).toBe(8);
		expect(result.warning_threshold).toBe(0.7);
	});

	it('architect built-in does not affect other agents in same config', () => {
		const config: GuardrailsConfig = {
			...base,
			profiles: {
				coder: { max_tool_calls: 100 },
			},
		};

		const result = resolveGuardrailsConfig(config, 'coder');
		expect(result.max_tool_calls).toBe(100); // coder profile
		expect(result.max_duration_minutes).toBe(30); // base, NOT 90
	});
});

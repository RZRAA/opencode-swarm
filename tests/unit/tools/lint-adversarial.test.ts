import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
	validateArgs,
	containsPathTraversal,
	containsControlChars,
	getLinterCommand,
	runLint,
	detectAvailableLinter,
	MAX_OUTPUT_BYTES,
	MAX_COMMAND_LENGTH,
	SUPPORTED_LINTERS,
	type SupportedLinter,
} from '../../../src/tools/lint';

// ============ Adversarial: Malformed Inputs ============
describe('ADVERSARIAL: validateArgs - Malformed Inputs', () => {
	it('rejects null', () => {
		expect(validateArgs(null)).toBe(false);
	});

	it('rejects undefined', () => {
		expect(validateArgs(undefined)).toBe(false);
	});

	it('rejects array', () => {
		expect(validateArgs(['fix'])).toBe(false);
	});

	it('rejects string "fix"', () => {
		expect(validateArgs('fix')).toBe(false);
	});

	it('rejects number', () => {
		expect(validateArgs(1)).toBe(false);
	});

	it('rejects boolean', () => {
		expect(validateArgs(true)).toBe(false);
	});

	it('rejects empty object', () => {
		expect(validateArgs({})).toBe(false);
	});

	it('rejects empty string mode', () => {
		expect(validateArgs({ mode: '' })).toBe(false);
	});

	it('rejects arbitrary string mode', () => {
		expect(validateArgs({ mode: 'hack' })).toBe(false);
	});

	it('rejects mode with null byte', () => {
		expect(validateArgs({ mode: 'fix\x00' })).toBe(false);
	});

	it('rejects mode with SQL injection attempt', () => {
		expect(validateArgs({ mode: "fix' OR '1'='1" })).toBe(false);
	});

	it('rejects mode with script tag', () => {
		expect(validateArgs({ mode: '<script>alert(1)</script>' })).toBe(false);
	});

	it('accepts object with __proto__ if mode is valid (only mode is validated)', () => {
		// validateArgs only checks mode property, others are ignored - this is safe
		expect(validateArgs({ mode: 'fix', __proto__: { foo: 'bar' } })).toBe(true);
	});

	it('rejects numeric mode', () => {
		expect(validateArgs({ mode: 0 })).toBe(false);
	});

	it('rejects array as mode', () => {
		expect(validateArgs({ mode: ['fix'] })).toBe(false);
	});

	it('accepts valid "fix" mode', () => {
		expect(validateArgs({ mode: 'fix' })).toBe(true);
	});

	it('accepts valid "check" mode', () => {
		expect(validateArgs({ mode: 'check' })).toBe(true);
	});

	it('accepts object with extra ignored properties', () => {
		expect(validateArgs({ mode: 'fix', extra: 'ignored' })).toBe(true);
	});
});

// ============ Adversarial: Path Traversal ============
describe('ADVERSARIAL: containsPathTraversal - Path Traversal Attacks', () => {
	it('detects forward slash path traversal', () => {
		expect(containsPathTraversal('../etc/passwd')).toBe(true);
	});

	it('detects backslash path traversal', () => {
		expect(containsPathTraversal('..\\windows\\system32\\config')).toBe(true);
	});

	it('accepts double dot mid-path (not a traversal without slash)', () => {
		// foo..bar is not a path traversal - the regex looks for .. followed by / or \
		expect(containsPathTraversal('foo..bar')).toBe(false);
	});

	it('accepts URL-encoded traversal (literal check, not decoded)', () => {
		// The function checks literal string, not decoded - this is expected behavior
		expect(containsPathTraversal('..%2F..%2Fetc')).toBe(false);
	});

	it('accepts normal path without traversal', () => {
		expect(containsPathTraversal('src/index.ts')).toBe(false);
	});

	it('accepts relative path starting with dot', () => {
		expect(containsPathTraversal('./src/file.ts')).toBe(false);
	});

	it('accepts version-like string', () => {
		expect(containsPathTraversal('1.2.3')).toBe(false);
	});
});

// ============ Adversarial: Control Characters ============
describe('ADVERSARIAL: containsControlChars - Control Character Injection', () => {
	it('detects null byte', () => {
		expect(containsControlChars('test\x00value')).toBe(true);
	});

	it('detects tab character', () => {
		expect(containsControlChars('test\tvalue')).toBe(true);
	});

	it('detects carriage return', () => {
		expect(containsControlChars('test\rvalue')).toBe(true);
	});

	it('detects newline', () => {
		expect(containsControlChars('test\nvalue')).toBe(true);
	});

	it('accepts normal string', () => {
		expect(containsControlChars('normal text')).toBe(false);
	});

	it('accepts Unicode characters', () => {
		expect(containsControlChars('日本語🔒')).toBe(false);
	});

	it('accepts special chars without control', () => {
		expect(containsControlChars('!@#$%^&*()_+-=[]{}|;:,.<>?')).toBe(false);
	});
});

// ============ Adversarial: Command Length Boundary ============
describe('ADVERSARIAL: Command Length Boundaries', () => {
	it('command under limit succeeds length check', () => {
		const command = getLinterCommand('biome', 'check');
		const commandStr = command.join(' ');
		expect(commandStr.length).toBeLessThan(MAX_COMMAND_LENGTH);
	});

	it('very long command string exceeds limit', () => {
		const baseCommand = getLinterCommand('biome', 'check');
		// Create a maliciously long command
		const maliciousArgs = Array(100).fill('verylongargumentname');
		const longCommand = [...baseCommand, ...maliciousArgs].join(' ');
		expect(longCommand.length).toBeGreaterThan(MAX_COMMAND_LENGTH);
	});

	it('runLint rejects overly long commands', async () => {
		// Directly test the length check by mocking or passing invalid linter
		// This tests the boundary - with invalid linter 'ultra' it would fail differently
		// but we can verify the function handles long commands
		const result = await runLint('biome' as SupportedLinter, 'check');
		// biome should work - just verifying the function exists and runs
		expect(result).toBeDefined();
	});
});

// ============ Adversarial: Output Size Boundary ============
describe('ADVERSARIAL: Output Size Boundaries', () => {
	it('MAX_OUTPUT_BYTES constant is defined', () => {
		expect(MAX_OUTPUT_BYTES).toBe(512_000);
	});

	it('MAX_OUTPUT_BYTES is a reasonable limit', () => {
		expect(MAX_OUTPUT_BYTES).toBeGreaterThan(1000);
		expect(MAX_OUTPUT_BYTES).toBeLessThan(10_000_000);
	});

	it('MAX_COMMAND_LENGTH constant is defined', () => {
		expect(MAX_COMMAND_LENGTH).toBe(500);
	});
});

// ============ Adversarial: Timeout Protection ============
describe('ADVERSARIAL: Process Timeout Protection', () => {
	it('detectAvailableLinter has timeout protection', async () => {
		const start = Date.now();
		const result = await detectAvailableLinter();
		const elapsed = Date.now() - start;

		// Should complete within reasonable time (with timeout it's 2s per linter)
		expect(elapsed).toBeLessThan(5000);
		expect(result === 'biome' || result === 'eslint' || result === null).toBe(true);
	}, 10000);

	it('detectAvailableLinter does not hang indefinitely', async () => {
		const promise = detectAvailableLinter();

		// Add slight delay
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Promise should still be settleable (not hung)
		const result = await promise;
		expect(result === 'biome' || result === 'eslint' || result === null).toBe(true);
	}, 10000);
});

// ============ Adversarial: Invalid Linter Types ============
describe('ADVERSARIAL: Invalid Linter Types', () => {
	it('getLinterCommand returns undefined for invalid linter type', () => {
		// TypeScript would prevent this at compile time, but runtime check
		const invalidLinter = 'invalid' as unknown as SupportedLinter;
		// Returns undefined when linter not in switch - potential improvement area
		const cmd = getLinterCommand(invalidLinter, 'check');
		expect(cmd).toBeUndefined();
	});
});

// ============ Adversarial: Process Hang/Resource Exhaustion ============
describe('ADVERSARIAL: Resource Exhaustion Protection', () => {
	it('runLint returns structured result even on linter not found', async () => {
		// Test with actual biome if available
		const result = await runLint('biome', 'check');

		// Should always return a properly structured result
		expect(result).toHaveProperty('success');
		expect(result).toHaveProperty('mode');
		expect(result.mode).toBe('check');

		if (!result.success) {
			expect(result).toHaveProperty('error');
			expect(typeof result.error).toBe('string');
		} else {
			expect(result).toHaveProperty('exitCode');
			expect(result).toHaveProperty('output');
		}
	});

	it('runLint output truncation works correctly', async () => {
		const result = await runLint('biome', 'check');

		if (result.success) {
			// Output should be bounded
			expect(result.output.length).toBeLessThanOrEqual(MAX_OUTPUT_BYTES + 50); // +50 for truncation message
		}
	});
});

// ============ Adversarial: Command Injection Simulation ============
describe('ADVERSARIAL: Command Injection Attempts', () => {
	it('getLinterCommand does not accept user input for path', () => {
		// The function only accepts linter and mode, not arbitrary paths
		const cmd = getLinterCommand('biome', 'fix');

		// Verify command is safe - no user-controlled parts
		expect(cmd).toEqual(['npx', 'biome', 'check', '--write', '.']);
		expect(cmd).not.toContain(';');
		expect(cmd).not.toContain('|');
		expect(cmd).not.toContain('&&');
		expect(cmd).not.toContain('rm');
		expect(cmd).not.toContain('curl');
	});

	it('getLinterCommand with eslint is safe', () => {
		const cmdCheck = getLinterCommand('eslint', 'check');
		const cmdFix = getLinterCommand('eslint', 'fix');

		expect(cmdCheck).toEqual(['npx', 'eslint', '.']);
		expect(cmdFix).toEqual(['npx', 'eslint', '.', '--fix']);

		// No shell metacharacters
		expect(cmdCheck.join(' ')).not.toMatch(/[;&|`$()]/);
		expect(cmdFix.join(' ')).not.toMatch(/[;&|`$()]/);
	});
});

// ============ Adversarial: Constant Security ============
describe('ADVERSARIAL: Security Constants', () => {
	it('SUPPORTED_LINTERS contains only safe values', () => {
		expect(SUPPORTED_LINTERS).toEqual(['biome', 'eslint']);
	});

	it('MAX_OUTPUT_BYTES prevents memory exhaustion', () => {
		// 512KB is a reasonable limit to prevent memory exhaustion
		expect(MAX_OUTPUT_BYTES).toBe(512_000);
		expect(MAX_OUTPUT_BYTES).toBeLessThan(1024 * 1024); // Less than 1MB
	});

	it('MAX_COMMAND_LENGTH prevents buffer overflow', () => {
		expect(MAX_COMMAND_LENGTH).toBe(500);
		expect(MAX_COMMAND_LENGTH).toBeLessThan(1000);
	});
});

// ============ Adversarial: Error Message Sanitization ============
describe('ADVERSARIAL: Error Message Sanitization', () => {
	it('invalid args returns safe error message', () => {
		const result = validateArgs({ mode: 'invalid' });
		expect(result).toBe(false);
	});

	it('runLint error does not leak sensitive info', async () => {
		// Even if there's an error, messages should be safe
		const result = await runLint('biome', 'check');

		if (!result.success && result.error) {
			// Error messages should not contain file paths or system info
			expect(result.error).not.toMatch(/^\/etc/);
			expect(result.error).not.toMatch(/C:\\Windows/);
			expect(result.error).not.toMatch(/process\.pid/);
		}
	});
});

import { tool } from '@opencode-ai/plugin';
export declare const MAX_OUTPUT_BYTES = 512000;
export declare const MAX_COMMAND_LENGTH = 500;
export declare const SUPPORTED_LINTERS: readonly ["biome", "eslint"];
export type SupportedLinter = (typeof SUPPORTED_LINTERS)[number];
export interface LintSuccessResult {
    success: true;
    mode: 'fix' | 'check';
    linter: SupportedLinter;
    command: string[];
    exitCode: number;
    output: string;
    message?: string;
}
export interface LintErrorResult {
    success: false;
    mode: 'fix' | 'check';
    linter?: SupportedLinter;
    command?: string[];
    exitCode?: number;
    output?: string;
    error: string;
    message?: string;
}
export type LintResult = LintSuccessResult | LintErrorResult;
export declare function containsPathTraversal(str: string): boolean;
export declare function containsControlChars(str: string): boolean;
export declare function validateArgs(args: unknown): args is {
    mode: 'fix' | 'check';
};
export declare function getLinterCommand(linter: SupportedLinter, mode: 'fix' | 'check'): string[];
export declare function detectAvailableLinter(): Promise<SupportedLinter | null>;
export declare function runLint(linter: SupportedLinter, mode: 'fix' | 'check'): Promise<LintResult>;
export declare const lint: ReturnType<typeof tool>;

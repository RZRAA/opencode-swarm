/**
 * Phase Monitor Hook
 *
 * Detects phase transitions by reading plan state on each system prompt transform.
 * When a phase change is detected, triggers preflight via PreflightTriggerManager.
 * Wrapped in safeHook — errors must never propagate.
 */
import type { PreflightTriggerManager } from '../background/trigger';
/**
 * Creates a hook that monitors plan phase transitions and triggers preflight.
 *
 * @param directory - Project directory (where .swarm/ lives)
 * @param preflightManager - The PreflightTriggerManager to call on phase change
 * @returns A safeHook-wrapped system.transform handler
 */
export declare function createPhaseMonitorHook(directory: string, preflightManager: PreflightTriggerManager): (input: unknown, output: unknown) => Promise<void>;

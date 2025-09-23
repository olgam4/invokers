/**
 * @file index.ts
 * @version 1.1.0
 * @summary A lightweight, zero-dependency polyfill and superset for the upcoming native HTML Invoker Commands API.
 * @license MIT
 * @author Patrick Glenn
 * @see https://github.com/doeixd/invokers
 * @description
 * This library provides a robust polyfill for the W3C/WHATWG `command` attribute proposal
 * and extends it with a powerful set of custom commands (prefixed with `--`).
 * It features universal command chaining via the `data-and-then` attribute, allowing you
 * to create complex, declarative workflows in pure HTML.
 */
import './polyfill';
import './interest-invokers';
/**
 * Parses a command string that uses a colon (`:`) as a delimiter, while respecting
 * the backslash (`\`) as an escape character. This is used to parse the arguments
 * of custom library commands (e.g., `--class:toggle:is-active`).
 *
 * @param commandString The raw string from the `command` attribute.
 * @returns An array of command parts.
 * @example
 * parseCommandString('--class:toggle:md\\:grid-cols-2'); // returns ['--class', 'toggle', 'md:grid-cols-2']
 */
export declare function parseCommandString(commandString: string): string[];
/**
 * Programmatically creates a valid, spec-compliant command string from an array of parts.
 * It ensures the first part is prefixed with `--` if it isn't already.
 *
 * @param parts The parts of the command to join.
 * @returns A single, correctly formatted command string.
 * @example
 * createCommandString('class', 'toggle', 'is-active'); // returns '--class:toggle:is-active'
 */
export declare function createCommandString(...parts: string[]): string;
/**
 * Centralized helper to dispatch a CommandEvent to a target element.
 * This encapsulates the CommandEvent creation and dispatch for consistency.
 * Used by the core polyfill and advanced event features.
 *
 * @param source The source element that triggered the command
 * @param command The command string to dispatch
 * @param targetElement The target element to receive the command
 * @param triggeringEvent The original DOM event that initiated this command (optional)
 */
export declare function _dispatchCommandEvent(source: HTMLElement, command: string, targetElement: HTMLElement, triggeringEvent?: Event): void;
/**
 * Development mode flag - can be set via window.Invoker.debug = true
 */
export declare let isDebugMode: boolean;
/**
 * Error severity levels for better debugging
 */
export declare enum ErrorSeverity {
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
/**
 * Enhanced error information for debugging
 */
export interface InvokerError extends Error {
    severity: ErrorSeverity;
    element?: HTMLElement;
    command?: string;
    context?: any;
    recovery?: string;
    cause?: Error;
}
/**
 * Creates a detailed error with debugging information
 */
export declare function createInvokerError(message: string, severity?: ErrorSeverity, options?: {
    element?: HTMLElement;
    command?: string;
    context?: any;
    recovery?: string;
    cause?: Error;
}): InvokerError;
/**
 * Logs errors with appropriate severity and debugging information
 */
export declare function logInvokerError(error: InvokerError | Error, prefix?: string): void;
/**
 * Validates that an element exists and has the required attributes
 */
export declare function validateElement(element: HTMLElement | null, requirements: {
    id?: boolean;
    tagName?: string[];
    attributes?: string[];
}): string[];
/**
 * Sanitizes command parameters to prevent injection attacks
 */
export declare function sanitizeParams(params: readonly string[]): string[];
/**
 * Validates and sanitizes HTML content before DOM injection
 */
/**
 * Checks if advanced interpolation features are enabled.
 */
export declare function isInterpolationEnabled(): boolean;
export declare function sanitizeHTML(html: string): string;
/**
 * Rate limiting for command execution
 */
export declare class RateLimiter {
    private executions;
    private readonly windowMs;
    private readonly maxExecutions;
    constructor(windowMs?: number, maxExecutions?: number);
    checkLimit(key: string): boolean;
    reset(key?: string): void;
}
/**
 * The context object passed to every custom library command's callback function.
 * It provides a rich, type-safe API for interacting with the invoker and its target,
 * built upon the standard `CommandEvent`.
 */
export interface CommandContext {
    /** The `<button>` element that was invoked (`event.source`). */
    readonly invoker: HTMLButtonElement;
    /** The element that received the command event (`event.target`). This is the target specified by `commandfor`. */
    readonly targetElement: HTMLElement;
    /** The full command string that was invoked (e.g., `--class:toggle:is-active`). */
    readonly fullCommand: string;
    /** The original DOM event that triggered the command (for advanced event features). */
    readonly triggeringEvent?: Event;
    /**
     * An array of string parameters that follow the matched command prefix.
     * For a `command="--class:toggle:is-active"` and a registered command named `--class`,
     * the `params` array will be `['toggle', 'is-active']`.
     */
    readonly params: readonly string[];
    /**
     * Retrieves the target elements controlled by the invoker. This is primarily for legacy
     * or multi-target scenarios. It prioritizes the spec-compliant `commandfor` attribute,
     * then falls back to `aria-controls` and `data-target`.
     * @returns An array of `HTMLElement`s.
     */
    getTargets: () => HTMLElement[];
    /**
     * Automatically updates the invoker's `aria-expanded` and `aria-pressed` attributes
     * based on the visibility state of the provided target elements.
     * @param targets The target elements whose state determines the ARIA update.
     */
    updateAriaState: (targets: HTMLElement[]) => void;
    /**
     * Manages the active state for a group of related invokers (e.g., in a tab group).
     * Deactivates other invokers within the same "widget group" when a new one is activated.
     */
    manageGroupState: () => void;
    /**
     * Execute a follow-up command after the current command completes.
     * @param command The command string to execute next
     * @param target Optional target element ID (defaults to current target)
     * @param state Optional command state to set
     */
    executeAfter: (command: string, target?: string, state?: CommandState) => void;
    /**
     * Execute different commands based on success/error state.
     * @param options Configuration object with onSuccess, onError, and onComplete command arrays
     */
    executeConditional: (options: ConditionalCommands) => void;
}
/**
 * Middleware hook points in the command execution lifecycle.
 */
export declare enum HookPoint {
    BEFORE_COMMAND = "beforeCommand",
    AFTER_COMMAND = "afterCommand",
    BEFORE_VALIDATION = "beforeValidation",
    AFTER_VALIDATION = "afterValidation",
    ON_SUCCESS = "onSuccess",
    ON_ERROR = "onError",
    ON_COMPLETE = "onComplete"
}
/**
 * Middleware function signature.
 */
export type MiddlewareFunction = (context: CommandContext & {
    result?: CommandExecutionResult;
}, hookPoint: HookPoint) => void | Promise<void>;
/**
 * Plugin interface for extending Invokers functionality.
 */
export interface InvokerPlugin {
    name: string;
    version?: string;
    description?: string;
    /**
     * Called when the plugin is registered.
     */
    onRegister?(manager: InvokerManager): void;
    /**
     * Called when the plugin is unregistered.
     */
    onUnregister?(manager: InvokerManager): void;
    /**
     * Middleware functions for different hook points.
     */
    middleware?: Partial<Record<HookPoint, MiddlewareFunction>>;
}
/**
 * The function signature for a custom library command's implementation logic.
 * Callbacks can now be synchronous (return void) or asynchronous (return a Promise).
 * The library will await the result before proceeding with any chained commands.
 */
export type CommandCallback = (context: CommandContext) => void | Promise<void>;
/**
 * Command execution result for conditional chaining.
 */
export interface CommandExecutionResult {
    success: boolean;
    error?: Error;
    data?: any;
}
/**
 * Command lifecycle states.
 */
export type CommandState = 'active' | 'completed' | 'disabled' | 'once';
/**
 * Conditional commands configuration.
 */
export interface ConditionalCommands {
    onSuccess?: string[];
    onError?: string[];
    onComplete?: string[];
}
/**
 * Pipeline step configuration for template-based command pipelines.
 */
export interface PipelineStep {
    command: string;
    target: string;
    condition?: 'success' | 'error' | 'always';
    once?: boolean;
    delay?: number;
    data?: Record<string, string>;
}
declare global {
    interface CommandEvent extends Event {
        readonly command: string;
        readonly source: HTMLButtonElement | null;
        readonly triggeringEvent?: Event;
    }
    interface HTMLButtonElement {
        commandForElement: Element | null;
        command: string;
    }
    interface Window {
        Invoker: {
            register: (name: string, callback: CommandCallback) => void;
            executeCommand: (command: string, targetId: string, invoker?: HTMLButtonElement) => Promise<void>;
            parseCommandString: typeof parseCommandString;
            createCommandString: typeof createCommandString;
            instance: InvokerManager;
            HookPoint: typeof HookPoint;
            reset: () => void;
        };
    }
}
/**
 * Manages the registration and execution of all custom `--` prefixed commands.
 * This class listens for the standard `CommandEvent` and routes recognized custom
 * commands to their registered JavaScript handlers with comprehensive error handling.
 */
export declare class InvokerManager {
    private static _instance;
    private readonly commands;
    private sortedCommandKeys;
    private commandStates;
    private andThenManager;
    private pipelineManager;
    private readonly performanceMonitor;
    private plugins;
    private middleware;
    static _interpolationEnabled: boolean;
    private constructor();
    /**
     * Gets the single, authoritative instance of the InvokerManager.
     */
    static getInstance(): InvokerManager;
    /**
     * Enables interpolation features for advanced event handling.
     * Internal method called by enableAdvancedEvents().
     */
    _enableInterpolation(): void;
    /**
     * Resets the InvokerManager to its initial state, clearing advanced features.
     */
    reset(): void;
    /**
     * Safely attempts to interpolate a template string with context data.
     * Only performs interpolation if advanced features are enabled.
     *
     * @param template The template string that may contain {{...}} placeholders
     * @param context The context object for interpolation
     * @returns The interpolated string, or the original template if interpolation is disabled
     */
    private _tryInterpolate;
    /**
     * Programmatically executes a command on a target element with comprehensive validation.
     * This is useful for chaining commands without dispatching events.
     *
     * @param command The command string to execute.
     * @param targetId The ID of the target element.
     * @param source Optional source element (for context).
     */
    executeCommand(command: string, targetId: string, source?: HTMLElement): Promise<void>;
    /**
     * Registers the internalized extended commands onto this instance.
     */
    registerExtendedCommands(): void;
    /**
      * Checks if a plugin is currently registered.
      */
    hasPlugin(pluginName: string): boolean;
    /**
      * Gets a list of all registered plugin names.
      */
    getRegisteredPlugins(): string[];
    /**
     * Registers a new custom command with comprehensive validation.
     * All commands must start with `--` to be valid.
     *
     * @param name The unique name of the command (e.g., `'--class'` or `'class'`).
     * @param callback The function to execute for this command.
     */
    register(name: string, callback: CommandCallback): void;
    /**
     * Handles incoming `CommandEvent`s. This is now an async method to allow
     * for awaiting the full command chain.
     */
    handleCommand(event: CommandEvent): Promise<void>;
    /**
     * Executes a custom command and then triggers a follow-up command if specified.
     * This is the new heart of the chaining mechanism with enhanced lifecycle support.
     */
    private executeCustomCommand;
    /**
     * Validates the command context before execution
     */
    private validateContext;
    /**
     * Generates context-aware recovery suggestions for failed commands
     */
    private generateRecoverySuggestion;
    /**
     * Attempts graceful degradation when a command fails
     */
    private attemptGracefulDegradation;
    /**
     * Finds similar commands to help with typos
     */
    private findSimilarCommands;
    /**
     * Calculates Levenshtein distance for typo detection
     */
    private levenshteinDistance;
    /**
     * Triggers a follow-up command. This is now a core utility of the InvokerManager.
     * It supports enhanced attribute-based chaining with conditional execution.
     */
    private triggerFollowup;
    /**
     * Extracts followup commands from enhanced attributes based on execution result.
     */
    private getFollowupCommands;
    private createContext;
    /**
     * Attaches the global `command` event listener to the document.
     */
    private listen;
    /**
     * Registers the core library commands, now prefixed with `--`.
     */
    /**
     * Schedules a command for execution with optional state management.
     */
    private scheduleCommand;
    private registerCoreLibraryCommands;
}
declare const invokerInstance: InvokerManager;
export { isInterestInvokersSupported, applyInterestInvokers, createInterestEvent } from './interest-invokers';
export type { InterestEvent, InterestEventInit, InterestInvokerElement } from './interest-invokers';
export default invokerInstance;
//# sourceMappingURL=index.d.ts.map
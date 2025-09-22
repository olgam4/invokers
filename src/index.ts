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

// --- Polyfill Integration ---
// Import and apply the polyfill to ensure CommandEvent and attributes are available
import './polyfill';

// *** FIX: Internalize the extended commands to prevent module resolution issues. ***
import { commands as extendedCommands } from './invoker-commands';
// Import Interest Invokers support
import './interest-invokers';

// --- Command String Utilities ---

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
export function parseCommandString(commandString: string): string[] {
  const parts: string[] = [];
  let currentPart = "";
  let i = 0;
  while (i < commandString.length) {
    const char = commandString[i];
    if (char === "\\") {
      currentPart += commandString[i + 1] ?? "";
      i += 2;
    } else if (char === ":") {
      parts.push(currentPart);
      currentPart = "";
      i++;
    } else {
      currentPart += char;
      i++;
    }
  }
  parts.push(currentPart);
  return parts;
}

/**
 * Programmatically creates a valid, spec-compliant command string from an array of parts.
 * It ensures the first part is prefixed with `--` if it isn't already.
 *
 * @param parts The parts of the command to join.
 * @returns A single, correctly formatted command string.
 * @example
 * createCommandString('class', 'toggle', 'is-active'); // returns '--class:toggle:is-active'
 */
export function createCommandString(...parts: string[]): string {
  if (parts.length > 0 && !parts[0].startsWith('--')) {
    parts[0] = `--${parts[0]}`;
  }
  return parts
    .map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:"))
    .join(":");
}

// --- Error Handling & Debugging ---

/**
 * Development mode flag - can be set via window.Invoker.debug = true
 */
export let isDebugMode = false;

/**
 * Error severity levels for better debugging
 */
export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
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
export function createInvokerError(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options: {
    element?: HTMLElement;
    command?: string;
    context?: any;
    recovery?: string;
    cause?: Error;
  } = {}
): InvokerError {
  const error = new Error(message) as InvokerError;
  error.severity = severity;
  error.element = options.element;
  error.command = options.command;
  error.context = options.context;
  error.recovery = options.recovery;
  if (options.cause) {
    error.cause = options.cause;
  }
  return error;
}

/**
 * Logs errors with appropriate severity and debugging information
 */
export function logInvokerError(error: InvokerError | Error, prefix = 'Invokers'): void {
  const isInvokerError = 'severity' in error;
  const severity = isInvokerError ? (error as InvokerError).severity : ErrorSeverity.ERROR;

  const logMethod = severity === ErrorSeverity.CRITICAL ? 'error'
    : severity === ErrorSeverity.ERROR ? 'error'
      : 'warn';

  if (isDebugMode || severity === ErrorSeverity.CRITICAL) {
    console.group(`${prefix}: ${error.message}`);
    console[logMethod]('Error:', error);

    if (isInvokerError) {
      const invokerError = error as InvokerError;
      if (invokerError.element) {
        console.log('Element:', invokerError.element);
      }
      if (invokerError.command) {
        console.log('Command:', invokerError.command);
      }
      if (invokerError.context) {
        console.log('Context:', invokerError.context);
      }
      if (invokerError.recovery) {
        console.log('Suggested fix:', invokerError.recovery);
      }
    }
    console.groupEnd();
  } else {
    console[logMethod](`${prefix}: ${error.message}`, isInvokerError ? (error as InvokerError).element : undefined);
  }
}

/**
 * Validates that an element exists and has the required attributes
 */
export function validateElement(element: HTMLElement | null, requirements: {
  id?: boolean;
  tagName?: string[];
  attributes?: string[];
}): string[] {
  const errors: string[] = [];

  if (!element) {
    errors.push('Element not found');
    return errors;
  }

  if (requirements.id && !element.id) {
    errors.push('Element missing required id attribute');
  }

  if (requirements.tagName && !requirements.tagName.includes(element.tagName.toLowerCase())) {
    errors.push(`Element must be one of: ${requirements.tagName.join(', ')}, got: ${element.tagName.toLowerCase()}`);
  }

  if (requirements.attributes) {
    for (const attr of requirements.attributes) {
      if (!element.hasAttribute(attr)) {
        errors.push(`Element missing required attribute: ${attr}`);
      }
    }
  }

  return errors;
}

/**
 * Sanitizes command parameters to prevent injection attacks
 */
export function sanitizeParams(params: readonly string[]): string[] {
  return params.map(param => {
    if (typeof param !== 'string') {
      return String(param);
    }

    // Remove potentially dangerous content
  let sanitized = param
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:text\/html/gi, '') // Remove data URLs that could contain HTML
    .replace(/vbscript:/gi, '') // Remove VBScript URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions

    // Additional validation for URLs
    if (param.includes('://') || param.startsWith('//')) {
      try {
        const url = new URL(param, window.location.href);
        if (!['http:', 'https:', 'ftp:', 'mailto:'].includes(url.protocol)) {
          console.warn(`Invokers: Potentially unsafe URL protocol "${url.protocol}" detected and removed`);
          return '';
        }
      } catch (e) {
        // If URL parsing fails, it might be malformed - safer to remove
        console.warn('Invokers: Malformed URL detected and removed:', param);
        return '';
      }
    }

    return sanitized;
  });
}

/**
 * Validates and sanitizes HTML content before DOM injection
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Create a temporary element to parse and sanitize HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove dangerous elements
  const dangerousElements = temp.querySelectorAll('script, object, embed, iframe, frame, meta, link[rel="import"]');
  dangerousElements.forEach(el => el.remove());

  // Remove dangerous attributes from all elements
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove event handler attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') ||
        attr.value.includes('javascript:') ||
        attr.value.includes('vbscript:') ||
        attr.value.includes('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}

/**
 * Rate limiting for command execution
 */
export class RateLimiter {
  private executions: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxExecutions: number;

  constructor(windowMs = 1000, maxExecutions = 50) {
    this.windowMs = windowMs;
    this.maxExecutions = maxExecutions;
  }

  checkLimit(key: string): boolean {
    const now = Date.now();
    const executions = this.executions.get(key) || [];

    // Remove old executions outside the window
    const validExecutions = executions.filter(time => now - time < this.windowMs);

    if (validExecutions.length >= this.maxExecutions) {
      return false; // Rate limit exceeded
    }

    validExecutions.push(now);
    this.executions.set(key, validExecutions);
    return true;
  }

  reset(key?: string): void {
    if (key) {
      this.executions.delete(key);
    } else {
      this.executions.clear();
    }
  }
}

// --- Core Type Definitions ---

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
export enum HookPoint {
  BEFORE_COMMAND = 'beforeCommand',
  AFTER_COMMAND = 'afterCommand',
  BEFORE_VALIDATION = 'beforeValidation',
  AFTER_VALIDATION = 'afterValidation',
  ON_SUCCESS = 'onSuccess',
  ON_ERROR = 'onError',
  ON_COMPLETE = 'onComplete'
}

  /**
   * Middleware function signature.
   */
  export type MiddlewareFunction = (context: CommandContext & { result?: CommandExecutionResult }, hookPoint: HookPoint) => void | Promise<void>;

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

// --- Global Type Augmentations ---

declare global {
  // The polyfill ensures these types exist. We declare them here for TypeScript's benefit.
  interface CommandEvent extends Event {
    readonly command: string;
    readonly source: HTMLButtonElement | null;
  }
  interface HTMLButtonElement {
    commandForElement: Element | null;
    command: string;
  }
  interface Window {
    Invoker: {
      register: (name: string, callback: CommandCallback) => void;
      executeCommand: (command: string, targetId?: string, invoker?: HTMLButtonElement) => Promise<void>;
      parseCommandString: typeof parseCommandString;
      createCommandString: typeof createCommandString;
      instance: InvokerManager;
      HookPoint: typeof HookPoint;
    };
  }
}

// --- List of native command keywords from the W3C/WHATWG proposal ---
const NATIVE_COMMAND_KEYWORDS = new Set([
  'show-modal',
  'close',
  'request-close',
  'show-popover',
  'hide-popover',
  'toggle-popover',
]);

// --- Performance Monitoring ---

/**
 * Monitors command execution performance and prevents abuse
 */
class PerformanceMonitor {
  private executionTimes: number[] = [];
  private readonly maxExecutionsPerSecond = 100;
  private readonly monitoringWindow = 1000; // 1 second

  recordExecution(): boolean {
    const now = Date.now();

    // Remove old entries outside the monitoring window
    this.executionTimes = this.executionTimes.filter(time => now - time < this.monitoringWindow);

    // Check if we're exceeding limits
    if (this.executionTimes.length >= this.maxExecutionsPerSecond) {
      const error = createInvokerError(
        `Too many command executions (${this.executionTimes.length}/second). Possible infinite loop detected.`,
        ErrorSeverity.CRITICAL,
        {
          recovery: 'Check for recursive command chains or remove data-and-then attributes causing loops'
        }
      );
      logInvokerError(error);
      return false;
    }

    this.executionTimes.push(now);
    return true;
  }

  getStats(): { executionsLastSecond: number; averageInterval: number } {
    const now = Date.now();
    const recentExecutions = this.executionTimes.filter(time => now - time < this.monitoringWindow);
    const intervals = recentExecutions.slice(1).map((time, i) => time - recentExecutions[i]);
    const averageInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

    return {
      executionsLastSecond: recentExecutions.length,
      averageInterval
    };
  }
}

// --- The Main Invoker Class ---

/**
 * Manages the registration and execution of all custom `--` prefixed commands.
 * This class listens for the standard `CommandEvent` and routes recognized custom
 * commands to their registered JavaScript handlers with comprehensive error handling.
 */

export class InvokerManager {
  // --- Singleton Implementation ---
  private static _instance: InvokerManager;

  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];
  private commandStates = new Map<string, CommandState>();
  private andThenManager: AndThenManager;
  private pipelineManager: PipelineManager;
  private readonly performanceMonitor = new PerformanceMonitor();

  // --- Plugin/Middleware System ---
  private plugins = new Map<string, InvokerPlugin>();
  private middleware = new Map<HookPoint, MiddlewareFunction[]>();

  // The constructor is now private to enforce the singleton pattern.
  private constructor() {
    this.andThenManager = new AndThenManager(this);
    this.pipelineManager = new PipelineManager(this);

    // Initialize for both browser and test environments
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      this.registerExtendedCommands();
      // Only add listeners if they haven't been added yet
      if (!(window as any).__invokerListenersAdded) {
        this.listen();
        (window as any).__invokerListenersAdded = true;
      }
      // Set up global Invoker API
      if (!window.Invoker) {
        window.Invoker = {
          register: this.register.bind(this),
          executeCommand: this.executeCommand.bind(this),
          parseCommandString,
          createCommandString,
          instance: this,
          HookPoint
        };
      }
    } else if (typeof global !== "undefined" && (global as any).window && (global as any).document) {
      // Test environment with jsdom
      this.registerCoreLibraryCommands();
      this.registerExtendedCommands();
      if (!(global as any).__invokerListenersAdded) {
        this.listen();
        (global as any).__invokerListenersAdded = true;
      }
    }
  }

  /**
   * Gets the single, authoritative instance of the InvokerManager.
   */
  public static getInstance(): InvokerManager {
    if (!InvokerManager._instance) {
      InvokerManager._instance = new InvokerManager();
    }
    return InvokerManager._instance;
  }

  /**
   * Programmatically executes a command on a target element with comprehensive validation.
   * This is useful for chaining commands without dispatching events.
   *
   * @param command The command string to execute.
   * @param targetId The ID of the target element.
   * @param source Optional source element (for context).
   */
  public async executeCommand(command: string, targetId: string, source?: HTMLElement): Promise<void> {
    // Performance check
    if (!this.performanceMonitor.recordExecution()) {
      return; // Abort if too many executions
    }

    // Validate inputs
    if (!command || typeof command !== 'string') {
      const error = createInvokerError(
        'Command must be a non-empty string',
        ErrorSeverity.ERROR,
        {
          command,
          recovery: 'Provide a valid command string like "--toggle" or "show-modal"'
        }
      );
      logInvokerError(error);
      return;
    }

    if (!targetId || typeof targetId !== 'string') {
      const error = createInvokerError(
        'Target ID must be a non-empty string',
        ErrorSeverity.ERROR,
        {
          command,
          context: { targetId },
          recovery: 'Provide a valid element ID that exists in the DOM'
        }
      );
      logInvokerError(error);
      return;
    }

    // Find target element with detailed error reporting
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(Boolean);
      const suggestions = allIds.filter(id => id.includes(targetId.toLowerCase()) || targetId.includes(id.toLowerCase()));

      const error = createInvokerError(
        `Target element with id "${targetId}" not found`,
        ErrorSeverity.ERROR,
        {
          command,
          element: source,
          context: {
            targetId,
            availableIds: allIds.slice(0, 10), // Show first 10 IDs
            suggestions: suggestions.slice(0, 3) // Show up to 3 suggestions
          },
          recovery: suggestions.length > 0
            ? `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
            : 'Check that the target element exists and has the correct id attribute'
        }
      );
      logInvokerError(error);
      return;
    }

    try {
      const mockEvent = {
        command,
        source: source || null,
        target: targetElement,
        preventDefault: () => { },
        type: 'command'
      } as any;

      await this.executeCustomCommand(command, mockEvent);
    } catch (error) {
      const invokerError = createInvokerError(
        `Failed to execute command "${command}" on element "${targetId}"`,
        ErrorSeverity.ERROR,
        {
          command,
          element: source || targetElement,
          cause: error as Error,
          recovery: 'Check the command syntax and ensure the target element supports this operation'
        }
      );
      logInvokerError(invokerError);
    }
  }

  /**
   * Registers the internalized extended commands onto this instance.
   */
  public registerExtendedCommands(): void {
    for (const name in extendedCommands) {
      if (Object.prototype.hasOwnProperty.call(extendedCommands, name)) {
        this.register(name, extendedCommands[name]);
      }
    }
  }

  /**
   * Registers a plugin with middleware and lifecycle hooks.
   */
  public registerPlugin(plugin: InvokerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Invokers: Plugin "${plugin.name}" is already registered`);
      return;
    }

    this.plugins.set(plugin.name, plugin);

    // Register middleware functions
    if (plugin.middleware) {
      for (const [hookPoint, middlewareFn] of Object.entries(plugin.middleware)) {
        if (middlewareFn) {
          this.registerMiddleware(hookPoint as HookPoint, middlewareFn);
        }
      }
    }

    // Call plugin's onRegister hook
    if (plugin.onRegister) {
      try {
        plugin.onRegister(this);
      } catch (error) {
        console.error(`Invokers: Error in plugin "${plugin.name}" onRegister:`, error);
      }
    }

    if (isDebugMode) {
      console.log(`Invokers: Plugin "${plugin.name}" registered successfully`);
    }
  }

  /**
   * Unregisters a plugin.
   */
  public unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`Invokers: Plugin "${pluginName}" is not registered`);
      return;
    }

    // Call plugin's onUnregister hook
    if (plugin.onUnregister) {
      try {
        plugin.onUnregister(this);
      } catch (error) {
        console.error(`Invokers: Error in plugin "${pluginName}" onUnregister:`, error);
      }
    }

    // Remove middleware functions
    if (plugin.middleware) {
      for (const hookPoint of Object.keys(plugin.middleware) as HookPoint[]) {
        this.unregisterMiddleware(hookPoint, plugin.middleware[hookPoint]!);
      }
    }

    this.plugins.delete(pluginName);

    if (isDebugMode) {
      console.log(`Invokers: Plugin "${pluginName}" unregistered successfully`);
    }
  }

  /**
   * Registers a middleware function for a specific hook point.
   */
  public registerMiddleware(hookPoint: HookPoint, middleware: MiddlewareFunction): void {
    if (!this.middleware.has(hookPoint)) {
      this.middleware.set(hookPoint, []);
    }
    this.middleware.get(hookPoint)!.push(middleware);
  }

  /**
   * Unregisters a middleware function from a specific hook point.
   */
  public unregisterMiddleware(hookPoint: HookPoint, middleware: MiddlewareFunction): void {
    const middlewareList = this.middleware.get(hookPoint);
    if (middlewareList) {
      const index = middlewareList.indexOf(middleware);
      if (index > -1) {
        middlewareList.splice(index, 1);
      }
    }
  }

  /**
   * Executes all middleware for a given hook point.
   */
  private async executeMiddleware(hookPoint: HookPoint, context: CommandContext & { result?: CommandExecutionResult }, allowErrors: boolean = false): Promise<void> {
    const middlewareList = this.middleware.get(hookPoint);
    if (!middlewareList || middlewareList.length === 0) {
      return;
    }

    for (const middleware of middlewareList) {
      try {
        await Promise.resolve(middleware(context, hookPoint));
      } catch (error) {
        if (allowErrors) {
          // For validation/pre-command middleware, errors should propagate
          throw error;
        } else {
          console.error(`Invokers: Middleware error at ${hookPoint}:`, error);
          // Continue with other middleware even if one fails
        }
      }
    }
  }

  /**
   * Registers a new custom command with comprehensive validation.
   * All commands must start with `--` to be valid.
   *
   * @param name The unique name of the command (e.g., `'--class'` or `'class'`).
   * @param callback The function to execute for this command.
   */
  public register(name: string, callback: CommandCallback): void {
    // Validate inputs
    if (!name || typeof name !== 'string') {
      const error = createInvokerError(
        'Command name must be a non-empty string',
        ErrorSeverity.ERROR,
        {
          context: { name },
          recovery: 'Provide a valid command name like "--my-command"'
        }
      );
      logInvokerError(error);
      return;
    }

    if (!callback || typeof callback !== 'function') {
      const error = createInvokerError(
        `Command callback for "${name}" must be a function`,
        ErrorSeverity.ERROR,
        {
          command: name,
          context: { callback },
          recovery: 'Provide a function that accepts a CommandContext parameter'
        }
      );
      logInvokerError(error);
      return;
    }

    // Validate command name format
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      const error = createInvokerError(
        'Command name cannot be empty or whitespace only',
        ErrorSeverity.ERROR,
        {
          recovery: 'Provide a meaningful command name like "--toggle" or "--fetch"'
        }
      );
      logInvokerError(error);
      return;
    }

    // Handle prefix normalization
    let normalizedName = trimmedName;
    if (!normalizedName.startsWith('--')) {
      normalizedName = `--${normalizedName}`;
      if (isDebugMode) {
        console.warn(`Invokers: Command "${trimmedName}" registered without '--' prefix. Automatically registered as "${normalizedName}".`);
      }
    }

    // Validate against reserved native commands
    if (NATIVE_COMMAND_KEYWORDS.has(normalizedName.slice(2))) {
      const error = createInvokerError(
        `Cannot register custom command "${normalizedName}" - conflicts with native command "${normalizedName.slice(2)}"`,
        ErrorSeverity.ERROR,
        {
          command: normalizedName,
          recovery: 'Choose a different command name that doesn\'t conflict with native commands'
        }
      );
      logInvokerError(error);
      return;
    }

    // Check for overwrites
    if (this.commands.has(normalizedName)) {
      const error = createInvokerError(
        `Command "${normalizedName}" is already registered and will be overwritten`,
        ErrorSeverity.WARNING,
        {
          command: normalizedName,
          recovery: 'Use a different command name or ensure this overwrite is intentional'
        }
      );
      logInvokerError(error);
    }

    try {
      this.commands.set(normalizedName, callback);
      this.sortedCommandKeys = Array.from(this.commands.keys()).sort((a, b) => b.length - a.length);

      if (isDebugMode) {
        console.log(`Invokers: Successfully registered command "${normalizedName}"`);
      }
    } catch (error) {
      const invokerError = createInvokerError(
        `Failed to register command "${normalizedName}"`,
        ErrorSeverity.CRITICAL,
        {
          command: normalizedName,
          cause: error as Error,
          recovery: 'Check that the callback function is valid and the command name is unique'
        }
      );
      logInvokerError(invokerError);
    }
  }

  /**
   * Handles incoming `CommandEvent`s. This is now an async method to allow
   * for awaiting the full command chain.
   */
  private async handleCommand(event: CommandEvent): Promise<void> {
    const commandStr = event.command;

    if (commandStr.startsWith('--')) {
      await this.executeCustomCommand(commandStr, event);
    } else if (!NATIVE_COMMAND_KEYWORDS.has(commandStr) && commandStr !== "") {
      // Backwards Compatibility: Handle old, non-prefixed library commands.
      console.warn(`Invokers (Compatibility): Non-spec-compliant command "${commandStr}" detected. Please update your HTML to use '--${commandStr}' for future compatibility. Attempting to handle...`);
      await this.executeCustomCommand(`--${commandStr}`, event);
    }
    // Native commands ('show-modal', etc.) are ignored and handled by the polyfill/browser.
  }

  /**
   * Executes a custom command and then triggers a follow-up command if specified.
   * This is the new heart of the chaining mechanism with enhanced lifecycle support.
   */
  private async executeCustomCommand(commandStr: string, event: CommandEvent): Promise<void> {
    // Validate command string
    if (!commandStr || typeof commandStr !== 'string') {
      const error = createInvokerError(
        'Invalid command string provided',
        ErrorSeverity.ERROR,
        {
          command: commandStr,
          element: event.source as HTMLElement,
          recovery: 'Ensure the command attribute contains a valid command string'
        }
      );
      logInvokerError(error);
      return;
    }

    // Performance monitoring
    if (!this.performanceMonitor.recordExecution()) {
      return; // Abort if too many executions
    }

    let commandFound = false;
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand) && (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":")) {
        commandFound = true;
        const callback = this.commands.get(registeredCommand);

        if (!callback) {
          const error = createInvokerError(
            `Command "${registeredCommand}" is registered but callback is missing`,
            ErrorSeverity.CRITICAL,
            {
              command: commandStr,
              element: event.source as HTMLElement,
              recovery: 'This is an internal error. Please report this issue.'
            }
          );
          logInvokerError(error);
          return;
        }

        try {
          event.preventDefault(); // Stop default polyfill/browser action
          const params = parseCommandString(commandStr.substring(registeredCommand.length + 1));
          const sanitizedParams = sanitizeParams(params);
          const context = this.createContext(event, commandStr, sanitizedParams);
          const invoker = event.source as HTMLButtonElement;

          // Execute BEFORE_COMMAND middleware (early, with full context)
          await this.executeMiddleware(HookPoint.BEFORE_COMMAND, context, true);

          // Execute BEFORE_VALIDATION middleware
          await this.executeMiddleware(HookPoint.BEFORE_VALIDATION, context, true);

          // Check command state before execution
          const commandKey = `${commandStr}:${context.targetElement.id}`;
          let currentState = this.commandStates.get(commandKey) || 'active';

          // Check if state is specified on the invoker (if it exists)
          if (invoker) {
            const invokerState = (invoker.dataset.state as CommandState) || (invoker.getAttribute('data-state') as CommandState);
            if (invokerState) {
              // If the state was already set in commandStates and is 'completed', don't override
              if (!(this.commandStates.has(commandKey) && this.commandStates.get(commandKey) === 'completed')) {
                currentState = invokerState;
              }
            }
          }

          // For chained commands (null invoker), check if the command should be prevented
          if (currentState === 'disabled' || currentState === 'completed') {
            return;
          }

          let executionResult: CommandExecutionResult = { success: true };

          try {
            // Validate context before execution
            const validationErrors = this.validateContext(context);
            if (validationErrors.length > 0) {
              throw createInvokerError(
                `Command execution aborted: ${validationErrors.join(', ')}`,
                ErrorSeverity.ERROR,
                {
                  command: commandStr,
                  element: context.invoker || context.targetElement,
                  context: { validationErrors },
                  recovery: 'Fix the validation errors and try again'
                }
              );
            }

            // Execute AFTER_VALIDATION middleware
            await this.executeMiddleware(HookPoint.AFTER_VALIDATION, context);

            // Await the primary command with timeout protection
            const executionPromise = Promise.resolve(callback(context));
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Command execution timeout')), 30000); // 30 second timeout
            });

            await Promise.race([executionPromise, timeoutPromise]);

            // Update state after successful execution
            if (currentState === 'once') {
              this.commandStates.set(commandKey, 'completed');
            }

            // Execute ON_SUCCESS middleware
            await this.executeMiddleware(HookPoint.ON_SUCCESS, { ...context, result: executionResult });

            if (isDebugMode) {
              console.log(`Invokers: Command "${registeredCommand}" executed successfully`);
            }

          } catch (error) {
            executionResult = { success: false, error: error as Error };

            // Execute ON_ERROR middleware
            await this.executeMiddleware(HookPoint.ON_ERROR, { ...context, result: executionResult });

            const invokerError = createInvokerError(
              `Command "${registeredCommand}" execution failed`,
              ErrorSeverity.ERROR,
              {
                command: commandStr,
                element: context.invoker || context.targetElement,
                cause: error as Error,
                context: {
                  params: context.params,
                  targetId: context.targetElement?.id,
                  invokerState: currentState
                },
                recovery: this.generateRecoverySuggestion(registeredCommand, error as Error, context)
              }
            );
            logInvokerError(invokerError);

            // Attempt graceful degradation
            this.attemptGracefulDegradation(context, error as Error);
          }

          // Execute ON_COMPLETE middleware (always runs)
          await this.executeMiddleware(HookPoint.ON_COMPLETE, { ...context, result: executionResult });

          // Execute AFTER_COMMAND middleware
          await this.executeMiddleware(HookPoint.AFTER_COMMAND, { ...context, result: executionResult });

          // Process <and-then> elements
          if (context.invoker) {
            await this.andThenManager.processAndThen(context.invoker, executionResult, context.targetElement);
          }

          // After the primary command is complete, trigger the follow-up.
          // Only trigger followup if we have an invoker (not for chained commands)
          if (context.invoker) {
            await this.triggerFollowup(context.invoker, context.targetElement, executionResult);
          }
        } catch (commandError) {
          // Handle errors in the command setup/execution wrapper
          // Re-throw middleware errors that should prevent command execution
          if ((commandError as Error).message.includes('Validation failed') ||
              (commandError as Error).message.includes('Plugin attempted to access')) {
            throw commandError;
          }

          const wrapperError = createInvokerError(
            `Failed to execute command "${registeredCommand}"`,
            ErrorSeverity.CRITICAL,
            {
              command: commandStr,
              element: event.source as HTMLElement,
              cause: commandError as Error,
              recovery: 'Check command syntax and ensure all required attributes are present'
            }
          );
          logInvokerError(wrapperError);
        }

        return; // Stop after the first, longest match
      }
    }

    // If no command was found, provide helpful suggestions
    if (!commandFound) {
      const suggestions = this.findSimilarCommands(commandStr);
      const error = createInvokerError(
        `Unknown command "${commandStr}"`,
        ErrorSeverity.ERROR,
        {
          command: commandStr,
          element: event.source as HTMLElement,
          context: {
            availableCommands: this.sortedCommandKeys.slice(0, 10),
            suggestions
          },
          recovery: suggestions.length > 0
            ? `Did you mean: ${suggestions.join(', ')}?`
            : 'Check the command name and ensure it\'s registered. Custom commands must start with "--"'
        }
      );
      logInvokerError(error);
    }
  }

  /**
   * Validates the command context before execution
   */
  private validateContext(context: CommandContext): string[] {
    const errors: string[] = [];

    if (!context.targetElement) {
      errors.push('Target element is null or undefined');
    } else if (!context.targetElement.isConnected) {
      errors.push('Target element is not connected to the DOM');
    }

    if (context.params.some(param => param == null)) {
      errors.push('Command contains null or undefined parameters');
    }

    return errors;
  }

  /**
   * Generates context-aware recovery suggestions for failed commands
   */
  private generateRecoverySuggestion(command: string, error: Error, _context: CommandContext): string {
    const errorMessage = error.message.toLowerCase();

    // Command-specific suggestions
    if (command.includes('fetch')) {
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return 'Check your network connection and ensure the URL is correct and reachable';
      }
      if (errorMessage.includes('cors')) {
        return 'CORS error: Ensure your server allows cross-origin requests or use a proxy';
      }
      return 'Verify the data-url attribute points to a valid endpoint that returns HTML';
    }

    if (command.includes('media')) {
      return 'Ensure the target element is a <video> or <audio> element';
    }

    if (command.includes('form')) {
      return 'Ensure the target element is a <form> element with a valid action attribute';
    }

    if (command.includes('class')) {
      return 'Check that the class name is valid and the target element exists';
    }

    if (command.includes('attr')) {
      return 'Verify the attribute name is valid and check data-attr-name/data-attr-value attributes';
    }

    // Generic suggestions based on error type
    if (errorMessage.includes('null') || errorMessage.includes('undefined')) {
      return 'Check that all required elements and attributes are present in the DOM';
    }

    if (errorMessage.includes('permission') || errorMessage.includes('security')) {
      return 'This operation requires user permission or HTTPS context';
    }

    return 'Check the command syntax and ensure all required attributes are present';
  }

  /**
   * Attempts graceful degradation when a command fails
   */
  private attemptGracefulDegradation(context: CommandContext, _error: Error): void {
    try {
      // For UI commands, try to maintain accessibility state
      if (context.invoker && context.invoker.hasAttribute('aria-expanded')) {
        const currentState = context.invoker.getAttribute('aria-expanded');
        if (currentState === null) {
          context.invoker.setAttribute('aria-expanded', 'false');
        }
      }

      // For disabled buttons, ensure they remain interactive
      if (context.invoker && context.invoker.hasAttribute('disabled')) {
        setTimeout(() => {
          if (context.invoker) {
            context.invoker.removeAttribute('disabled');
          }
        }, 3000); // Re-enable after 3 seconds
      }

      if (isDebugMode) {
        console.log('Invokers: Attempted graceful degradation for failed command');
      }
    } catch (degradationError) {
      // If degradation fails, just log it - don't throw
      console.warn('Invokers: Graceful degradation failed:', degradationError);
    }
  }

  /**
   * Finds similar commands to help with typos
   */
  private findSimilarCommands(commandStr: string): string[] {
    const command = commandStr.toLowerCase();
    const suggestions: string[] = [];

    for (const registeredCommand of this.sortedCommandKeys) {
      const registered = registeredCommand.toLowerCase();

      // Exact match after prefix
      if (command.includes(registered.slice(2))) {
        suggestions.push(registeredCommand);
        continue;
      }

      // Levenshtein distance for typos
      if (this.levenshteinDistance(command, registered) <= 2) {
        suggestions.push(registeredCommand);
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Calculates Levenshtein distance for typo detection
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Triggers a follow-up command. This is now a core utility of the InvokerManager.
   * It supports enhanced attribute-based chaining with conditional execution.
   */
  private async triggerFollowup(originalInvoker: HTMLButtonElement, primaryTarget: HTMLElement, executionResult?: CommandExecutionResult): Promise<void> {
    const followupCommands = this.getFollowupCommands(originalInvoker, executionResult);

    if (followupCommands.length === 0) {
      return;
    }

    for (const { command, target, state } of followupCommands) {
      if (!target && !primaryTarget.id) {
        console.warn("Invokers: A chained command requires the target element to have an ID.", primaryTarget);
        continue;
      }

      const targetId = target || primaryTarget.id;
      if (!targetId) continue;

      await this.scheduleCommand(command, targetId, state, primaryTarget);
    }
  }

  /**
   * Extracts followup commands from enhanced attributes based on execution result.
   */
  private getFollowupCommands(invoker: HTMLButtonElement | null, executionResult?: CommandExecutionResult): Array<{ command: string; target?: string; state: CommandState }> {
    if (!invoker) {
      return [];
    }
    const commands: Array<{ command: string; target?: string; state: CommandState }> = [];

    // Handle universal data-and-then (always executes)
    const universalCommand = invoker.dataset.andThen || invoker.dataset.thenCommand;
    if (universalCommand) {
      commands.push({
        command: universalCommand,
        target: invoker.dataset.thenTarget,
        state: (invoker.dataset.thenState as CommandState) || 'active'
      });
    }

    // Handle conditional commands based on execution result
    if (executionResult) {
      if (executionResult.success && invoker.dataset.afterSuccess) {
        invoker.dataset.afterSuccess.split(',').forEach(cmd => {
          commands.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: (invoker.dataset.thenState as CommandState) || 'active'
          });
        });
      }

      if (!executionResult.success && invoker.dataset.afterError) {
        invoker.dataset.afterError.split(',').forEach(cmd => {
          commands.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: (invoker.dataset.thenState as CommandState) || 'active'
          });
        });
      }

      // Handle complete commands (executes regardless of success/error)
      if (invoker.dataset.afterComplete) {
        invoker.dataset.afterComplete.split(',').forEach(cmd => {
          commands.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: (invoker.dataset.thenState as CommandState) || 'active'
          });
        });
      }
    }

    return commands;
  }

  private createContext(event: CommandEvent, fullCommand: string, params: readonly string[]): CommandContext {
    const invoker = event.source as HTMLButtonElement;
    const targetElement = event.target as HTMLElement;

    const getTargets = (): HTMLElement[] => {
      // For chained commands (null invoker), always get fresh references
      if (!invoker) {
        const freshTarget = getFreshTargetElement();
        return freshTarget ? [freshTarget] : [];
      }

      // Prioritize spec-compliant `commandfor` target, which is the event target.
      if (targetElement) return [targetElement];

      // Fallback for legacy `aria-controls` and `data-target`
      const controls = invoker.getAttribute("aria-controls")?.trim();
      const dataTarget = invoker.dataset.target;
      const selector = controls ? "#" + controls.split(/\s+/).join(", #") : dataTarget;
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    };

    // For chained commands (null invoker), ensure we get a fresh reference to the target element
    const getFreshTargetElement = (): HTMLElement | null => {
      if (targetElement && targetElement.id) {
        return document.getElementById(targetElement.id);
      }
      return targetElement;
    };

    const updateAriaState = (targets: HTMLElement[]) => {
      if (!invoker) return;
      const isExpanded = targets.some(t => !t.hidden);
      invoker.setAttribute("aria-expanded", String(isExpanded));
      if (invoker.hasAttribute("aria-pressed")) {
        invoker.setAttribute("aria-pressed", String(isExpanded));
      }
    };

    const manageGroupState = () => {
      if (!invoker) return;
      const targets = getTargets();
      if (targets.length === 0 || !targets[0].parentElement) return;

      const container = targets[0].parentElement;
      const allTargetIDs = new Set(Array.from(container.children).map(t => t.id).filter(Boolean));

      const invokersInGroup = Array.from(
        document.querySelectorAll<HTMLButtonElement>("[commandfor], [aria-controls]")
      ).filter(btn => {
        const controlledIds = (btn.getAttribute("commandfor") ? [btn.getAttribute("commandfor")] : []).concat(btn.getAttribute("aria-controls")?.split(/\s+/) ?? []);
        return controlledIds.some(id => allTargetIDs.has(id!));
      });

      invokersInGroup.forEach(otherInvoker => {
        if (otherInvoker !== invoker) {
          otherInvoker.setAttribute("aria-expanded", "false");
          if (otherInvoker.hasAttribute("aria-pressed")) {
            otherInvoker.setAttribute("aria-pressed", "false");
          }
        }
      });
    };

    const executeAfter = (command: string, target?: string, state: CommandState = 'active') => {
      if (!invoker) return;
      this.scheduleCommand(command, target || targetElement.id, state, targetElement);
    };

    const executeConditional = (options: ConditionalCommands) => {
      if (!invoker) return;
      // Store conditional commands in data attributes for later execution
      if (options.onSuccess && options.onSuccess.length > 0) {
        invoker.dataset.afterSuccess = options.onSuccess.join(',');
      }

      if (options.onError && options.onError.length > 0) {
        invoker.dataset.afterError = options.onError.join(',');
      }

      if (options.onComplete && options.onComplete.length > 0) {
        invoker.dataset.afterComplete = options.onComplete.join(',');
      }
    };

    return {
      invoker,
      targetElement: invoker ? targetElement : getFreshTargetElement() || targetElement,
      fullCommand,
      params,
      getTargets,
      updateAriaState,
      manageGroupState,
      executeAfter,
      executeConditional
    };
  }

  /**
   * Attaches the global `command` event listener to the document.
   */
  private listen(): void {
    // The listener now calls the async handleCommand method.
    document.addEventListener("command", (e) => this.handleCommand(e as CommandEvent), true);
  }





  /**
   * Registers the core library commands, now prefixed with `--`.
   */
  /**
   * Schedules a command for execution with optional state management.
   */
  private async scheduleCommand(command: string, targetId: string, state: CommandState, primaryTarget?: HTMLElement): Promise<void> {
    const commandKey = `${command}:${targetId}`;

    // Check command state
    if (this.commandStates.get(commandKey) === 'disabled') {
      return;
    }

    if (this.commandStates.get(commandKey) === 'completed') {
      return;
    }

    // For chained commands, directly execute the command instead of using synthetic buttons
    // This avoids issues with event propagation in test environments
    const targetElement = document.getElementById(targetId) || (primaryTarget && targetId === primaryTarget.id ? primaryTarget : null);
    if (targetElement) {
      const mockEvent = {
        command,
        source: null, // No source for chained commands
        target: targetElement,
        preventDefault: () => { },
        type: 'command'
      } as any;
      await this.executeCustomCommand(command, mockEvent);
    }

    // Update state after execution
    if (state === 'once') {
      this.commandStates.set(commandKey, 'completed');
    } else if (state === 'completed') {
      this.commandStates.set(commandKey, 'completed');
    }
  }

  private registerCoreLibraryCommands(): void {
    this.register("--toggle", async ({ getTargets, updateAriaState, invoker }) => {
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --toggle command',
          ErrorSeverity.WARNING,
          {
            command: '--toggle',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element id, or use aria-controls for multiple targets'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        const updateDOM = () => {
          targets.forEach(target => {
            if (!target.isConnected) {
              console.warn('Invokers: Skipping disconnected target element', target);
              return;
            }
            target.toggleAttribute("hidden");
          });
          updateAriaState(targets);
        };

        await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      } catch (error) {
        throw createInvokerError(
          'Failed to toggle element visibility',
          ErrorSeverity.ERROR,
          {
            command: '--toggle',
            element: invoker,
            cause: error as Error,
            recovery: 'Check that target elements are valid DOM elements'
          }
        );
      }
    });

    this.register("--show", async ({ getTargets, updateAriaState, manageGroupState, invoker }) => {
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --show command',
          ErrorSeverity.WARNING,
          {
            command: '--show',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element id'
          }
        );
        logInvokerError(error);
        return;
      }

      if (!targets[0].parentElement) {
        const error = createInvokerError(
          'Target element has no parent for --show command (cannot hide siblings)',
          ErrorSeverity.WARNING,
          {
            command: '--show',
            element: targets[0],
            recovery: 'Use --toggle instead, or ensure the target element has siblings to manage'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        const allSiblings = Array.from(targets[0].parentElement.children);
        const updateDOM = () => {
          manageGroupState();
          allSiblings.forEach(child => {
            if (child instanceof HTMLElement) {
              child.setAttribute("hidden", "");
            }
          });
          targets.forEach(target => target.removeAttribute("hidden"));
          updateAriaState(targets);
        };
        await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      } catch (error) {
        throw createInvokerError(
          'Failed to show element and hide siblings',
          ErrorSeverity.ERROR,
          {
            command: '--show',
            element: invoker,
            cause: error as Error,
            recovery: 'Check that target elements and their siblings are valid DOM elements'
          }
        );
      }
    });

    this.register("--hide", ({ getTargets, updateAriaState }) => {
      const targets = getTargets();
      if (targets.length === 0) return;
      targets.forEach(target => target.setAttribute("hidden", ""));
      updateAriaState(targets);
    });

    this.register("--class", ({ invoker, getTargets, params }) => {
      const [action, className] = params;
      const targets = getTargets();
      if (!action || !className || targets.length === 0) {
        console.warn('Invokers: `--class` command requires an action and a class name (e.g., "--class:toggle:my-class").', invoker);
        return;
      }
      targets.forEach(target => {
        switch (action) {
          case "add": target.classList.add(className); break;
          case "remove": target.classList.remove(className); break;
          case "toggle": target.classList.toggle(className); break;
          default: console.warn(`Invokers: Unknown action "${action}" for '--class' command.`, invoker);
        }
      });
    });

    this.register("--text", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const value = valueParts.join(' '); // Rejoin with spaces for text content
      const targets = getTargets();

      if (!action) {
        throw createInvokerError(
          'Text command requires an action (set, append, prepend, or clear)',
          ErrorSeverity.ERROR,
          {
            command: '--text',
            element: invoker,
            context: { params },
            recovery: 'Use format: --text:set:Hello World or --text:append: more text'
          }
        );
      }

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --text command',
          ErrorSeverity.WARNING,
          {
            command: '--text',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element id'
          }
        );
        logInvokerError(error);
        return;
      }

      const validActions = ['set', 'append', 'prepend', 'clear'];
      if (!validActions.includes(action)) {
        throw createInvokerError(
          `Invalid text action "${action}". Must be one of: ${validActions.join(', ')}`,
          ErrorSeverity.ERROR,
          {
            command: '--text',
            element: invoker,
            context: { action, validActions },
            recovery: 'Use a valid action like: --text:set:Hello or --text:append: World'
          }
        );
      }

      try {
        targets.forEach(target => {
          if (!target.isConnected) {
            console.warn('Invokers: Skipping disconnected target element', target);
            return;
          }

          switch (action) {
            case "set":
              target.textContent = value || "";
              break;
            case "append":
              target.textContent += value || "";
              break;
            case "prepend":
              target.textContent = (value || "") + target.textContent;
              break;
            case "clear":
              target.textContent = "";
              break;
          }
        });
      } catch (error) {
        throw createInvokerError(
          `Failed to update text content with action "${action}"`,
          ErrorSeverity.ERROR,
          {
            command: '--text',
            element: invoker,
            cause: error as Error,
            context: { action, value },
            recovery: 'Check that target elements support text content updates'
          }
        );
      }
    });

    this.register("--attr", ({ invoker, getTargets, params }) => {
      const [action, attrName, attrValue] = params;
      const targets = getTargets();

      if (!action) {
        throw createInvokerError(
          'Attribute command requires an action (set, remove, or toggle)',
          ErrorSeverity.ERROR,
          {
            command: '--attr',
            element: invoker,
            context: { params },
            recovery: 'Use format: --attr:set:disabled:true or --attr:remove:disabled'
          }
        );
      }

      if (!attrName) {
        throw createInvokerError(
          'Attribute command requires an attribute name',
          ErrorSeverity.ERROR,
          {
            command: '--attr',
            element: invoker,
            context: { action, params },
            recovery: 'Specify the attribute name: --attr:set:data-value:123'
          }
        );
      }

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --attr command',
          ErrorSeverity.WARNING,
          {
            command: '--attr',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element id'
          }
        );
        logInvokerError(error);
        return;
      }

      const validActions = ['set', 'remove', 'toggle'];
      if (!validActions.includes(action)) {
        throw createInvokerError(
          `Invalid attribute action "${action}". Must be one of: ${validActions.join(', ')}`,
          ErrorSeverity.ERROR,
          {
            command: '--attr',
            element: invoker,
            context: { action, validActions },
            recovery: 'Use a valid action like: --attr:set:disabled:true or --attr:toggle:hidden'
          }
        );
      }

      // Validate attribute name
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(attrName)) {
        throw createInvokerError(
          `Invalid attribute name "${attrName}". Attribute names must start with a letter and contain only letters, numbers, and hyphens`,
          ErrorSeverity.ERROR,
          {
            command: '--attr',
            element: invoker,
            context: { attrName },
            recovery: 'Use a valid HTML attribute name like "disabled" or "data-value"'
          }
        );
      }

      try {
        targets.forEach(target => {
          if (!target.isConnected) {
            console.warn('Invokers: Skipping disconnected target element', target);
            return;
          }

          switch (action) {
            case "set":
              target.setAttribute(attrName, attrValue || "");
              break;
            case "remove":
              target.removeAttribute(attrName);
              break;
            case "toggle":
              if (target.hasAttribute(attrName)) {
                target.removeAttribute(attrName);
              } else {
                target.setAttribute(attrName, attrValue || "");
              }
              break;
          }
        });
      } catch (error) {
        throw createInvokerError(
          `Failed to update attribute "${attrName}" with action "${action}"`,
          ErrorSeverity.ERROR,
          {
            command: '--attr',
            element: invoker,
            cause: error as Error,
            context: { action, attrName, attrValue },
            recovery: 'Check that the attribute operation is valid for the target elements'
          }
        );
      }
    });

    // --value command for setting form input values
    this.register("--value", ({ invoker, getTargets, params }) => {
      const [value] = params;
      const targets = getTargets();

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --value command',
          ErrorSeverity.WARNING,
          {
            command: '--value',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid form input element'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        targets.forEach(target => {
          if ('value' in target) {
            (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = value || '';
          } else {
            console.warn('Invokers: --value command target does not support value property', target);
          }
        });
      } catch (error) {
        throw createInvokerError(
          'Failed to set value on target elements',
          ErrorSeverity.ERROR,
          {
            command: '--value',
            element: invoker,
            cause: error as Error,
            recovery: 'Ensure target elements are form inputs that support the value property'
          }
        );
      }
    });

    // --focus command for focusing elements
    this.register("--focus", ({ invoker, getTargets }) => {
      const targets = getTargets();

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --focus command',
          ErrorSeverity.WARNING,
          {
            command: '--focus',
            element: invoker,
            recovery: 'Ensure commandfor points to a focusable element'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        // Focus the first target element
        if (typeof targets[0].focus === 'function') {
          targets[0].focus();
        } else {
          console.warn('Invokers: Target element does not support focus', targets[0]);
        }
      } catch (error) {
        throw createInvokerError(
          'Failed to focus target element',
          ErrorSeverity.ERROR,
          {
            command: '--focus',
            element: invoker,
            cause: error as Error,
            recovery: 'Ensure the target element is focusable and visible'
          }
        );
      }
    });

    // --disabled command for toggling disabled state
    this.register("--disabled", ({ invoker, getTargets, params }) => {
      const [action] = params;
      const targets = getTargets();

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --disabled command',
          ErrorSeverity.WARNING,
          {
            command: '--disabled',
            element: invoker,
            recovery: 'Ensure commandfor points to an element that supports the disabled property'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        targets.forEach(target => {
          if ('disabled' in target) {
            const element = target as HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement;
            switch (action) {
              case 'toggle':
                element.disabled = !element.disabled;
                break;
              case 'true':
              case 'enable':
                element.disabled = false;
                break;
              case 'false':
              case 'disable':
                element.disabled = true;
                break;
              default:
                console.warn(`Invokers: Unknown action "${action}" for --disabled command. Use "toggle", "true", "false", "enable", or "disable".`);
            }
          } else {
            console.warn('Invokers: --disabled command target does not support disabled property', target);
          }
        });
      } catch (error) {
        throw createInvokerError(
          'Failed to update disabled state on target elements',
          ErrorSeverity.ERROR,
          {
            command: '--disabled',
            element: invoker,
            cause: error as Error,
            recovery: 'Ensure target elements support the disabled property'
          }
        );
      }
    });

    // --scroll command for scrolling elements into view
    this.register("--scroll", ({ invoker, getTargets, params }) => {
      const [action] = params;
      const targets = getTargets();

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --scroll command',
          ErrorSeverity.WARNING,
          {
            command: '--scroll',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element'
          }
        );
        logInvokerError(error);
        return;
      }

      try {
        targets.forEach(target => {
          switch (action) {
            case 'into-view':
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              break;
            case 'top':
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              break;
            case 'bottom':
              target.scrollIntoView({ behavior: 'smooth', block: 'end' });
              break;
            case 'center':
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              break;
            default:
              console.warn(`Invokers: Unknown action "${action}" for --scroll command. Use "into-view", "top", "bottom", or "center".`);
              target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      } catch (error) {
        throw createInvokerError(
          'Failed to scroll target elements into view',
          ErrorSeverity.ERROR,
          {
            command: '--scroll',
            element: invoker,
            cause: error as Error,
            recovery: 'Ensure target elements are valid DOM elements'
          }
        );
      }
    });

    // --storage command for localStorage and sessionStorage with enhanced features
    this.register("--storage", ({ invoker, getTargets, params }) => {
      const [storageType, action, key, ...valueParts] = params;
      const targets = getTargets();

      // Enhanced storage with JSON support, expiration, and better error handling
      if (!storageType || !['local', 'session'].includes(storageType)) {
        throw createInvokerError(
          `Invalid storage type "${storageType}". Must be "local" or "session"`,
          ErrorSeverity.ERROR,
          {
            command: '--storage',
            element: invoker,
            context: { storageType, availableTypes: ['local', 'session'] },
            recovery: 'Use --storage:local:action:key or --storage:session:action:key'
          }
        );
      }

      const storage = storageType === 'local' ? localStorage : sessionStorage;

      // Check if storage is available
      if (typeof Storage === 'undefined') {
        throw createInvokerError(
          'Web Storage API not supported in this browser',
          ErrorSeverity.ERROR,
          {
            command: '--storage',
            element: invoker,
            recovery: 'Use a modern browser that supports localStorage/sessionStorage'
          }
        );
      }

      try {
        switch (action) {
          case 'set':
            if (!key) {
              throw createInvokerError(
                'Storage set requires a key',
                ErrorSeverity.ERROR,
                {
                  command: '--storage',
                  element: invoker,
                  recovery: 'Use --storage:local:set:key:value or --storage:session:set:key:value'
                }
              );
            }

            let valueToStore = valueParts.join(':');

            // Check for JSON flag
            const isJson = invoker?.dataset?.storageJson === 'true' || valueToStore.startsWith('{') || valueToStore.startsWith('[');
            if (isJson) {
              try {
                // If it's already JSON, validate it
                JSON.parse(valueToStore);
              } catch {
                // If not valid JSON, try to stringify the value
                valueToStore = JSON.stringify(valueToStore);
              }
            }

            // Check for expiration
            const expiresIn = invoker?.dataset?.storageExpires;
            if (expiresIn) {
              const expiresAt = Date.now() + (parseInt(expiresIn, 10) * 1000); // Convert seconds to ms
              const data = {
                value: valueToStore,
                expiresAt,
                isJson
              };
              storage.setItem(key, JSON.stringify(data));
            } else {
              storage.setItem(key, valueToStore);
            }
            break;

          case 'get':
            if (!key) {
              throw createInvokerError(
                'Storage get requires a key',
                ErrorSeverity.ERROR,
                {
                  command: '--storage',
                  element: invoker,
                  recovery: 'Use --storage:local:get:key or --storage:session:get:key'
                }
              );
            }

            let storedValue = storage.getItem(key);
            let finalValue = storedValue;

            if (storedValue !== null) {
              try {
                // Check if it's our enhanced storage format with expiration
                const parsed = JSON.parse(storedValue);
                if (parsed && typeof parsed === 'object' && 'value' in parsed && 'expiresAt' in parsed) {
                  if (Date.now() > parsed.expiresAt) {
                    // Expired, remove it
                    storage.removeItem(key);
                    finalValue = null;
                  } else {
                    finalValue = parsed.isJson ? JSON.stringify(parsed.value) : parsed.value;
                  }
                }
              } catch {
                // Not our format, use as-is
              }
            }

            if (targets.length > 0 && finalValue !== null) {
              if ('value' in targets[0]) {
                (targets[0] as HTMLInputElement).value = finalValue;
              } else {
                targets[0].textContent = finalValue;
              }
            }
            break;

          case 'remove':
            if (!key) {
              throw createInvokerError(
                'Storage remove requires a key',
                ErrorSeverity.ERROR,
                {
                  command: '--storage',
                  element: invoker,
                  recovery: 'Use --storage:local:remove:key or --storage:session:remove:key'
                }
              );
            }
            storage.removeItem(key);
            break;

          case 'clear':
            storage.clear();
            break;

          case 'keys':
            // Get all keys, optionally filtered by prefix
            const prefix = key || '';
            const allKeys = Object.keys(storage).filter(k => k.startsWith(prefix));
            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify(allKeys);
            }
            break;

          case 'has':
            // Check if key exists
            const exists = storage.getItem(key) !== null;
            if (targets.length > 0) {
              targets[0].textContent = exists.toString();
            }
            break;

          case 'size':
            // Get storage size in bytes
            let size = 0;
            for (let i = 0; i < storage.length; i++) {
              const k = storage.key(i);
              if (k) {
                size += k.length + (storage.getItem(k)?.length || 0);
              }
            }
            if (targets.length > 0) {
              targets[0].textContent = size.toString();
            }
            break;

          default:
            throw createInvokerError(
              `Unknown storage action "${action}"`,
              ErrorSeverity.ERROR,
              {
                command: '--storage',
                element: invoker,
                context: { action, availableActions: ['set', 'get', 'remove', 'clear', 'keys', 'has', 'size'] },
                recovery: 'Use set, get, remove, clear, keys, has, or size actions'
              }
            );
        }
      } catch (error) {
        // Handle quota exceeded errors specifically
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          throw createInvokerError(
            'Storage quota exceeded. Cannot store more data.',
            ErrorSeverity.ERROR,
            {
              command: '--storage',
              element: invoker,
              cause: error,
              recovery: 'Clear some storage space or use sessionStorage instead of localStorage'
            }
          );
        }

        throw createInvokerError(
          `Storage operation failed: ${(error as Error).message}`,
          ErrorSeverity.ERROR,
          {
            command: '--storage',
            element: invoker,
            cause: error as Error,
            recovery: 'Check storage availability, quota limits, and data format'
          }
        );
      }
    });

    // --animate command for CSS animations with enhanced options
    this.register("--animate", ({ invoker, getTargets, params }) => {
      const [animation, ...options] = params;
      const targets = getTargets();

      if (targets.length === 0) {
        const error = createInvokerError(
          'No target elements found for --animate command',
          ErrorSeverity.WARNING,
          {
            command: '--animate',
            element: invoker,
            recovery: 'Ensure commandfor points to a valid element'
          }
        );
        logInvokerError(error);
        return;
      }

      const validAnimations = [
        'fade-in', 'fade-out', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
        'bounce', 'shake', 'pulse', 'flip', 'rotate-in', 'zoom-in', 'zoom-out',
        'spin', 'wobble', 'jello', 'heartbeat', 'rubber-band'
      ];

      if (!validAnimations.includes(animation)) {
        throw createInvokerError(
          `Unknown animation "${animation}"`,
          ErrorSeverity.ERROR,
          {
            command: '--animate',
            element: invoker,
            context: { animation, validAnimations },
            recovery: `Use one of: ${validAnimations.join(', ')}`
          }
        );
      }

      // Parse options: duration, delay, easing, iterations
      let duration = '0.5s';
      let delay = '0s';
      let easing = 'ease-in-out';
      let iterations = '1';

      options.forEach(option => {
        if (option.includes('duration:')) {
          duration = option.split(':')[1] || '0.5s';
        } else if (option.includes('delay:')) {
          delay = option.split(':')[1] || '0s';
        } else if (option.includes('easing:')) {
          easing = option.split(':')[1] || 'ease-in-out';
        } else if (option.includes('iterations:')) {
          iterations = option.split(':')[1] || '1';
        }
      });

      // Also check data attributes for options
      if (invoker?.dataset?.animateDuration) duration = invoker.dataset.animateDuration;
      if (invoker?.dataset?.animateDelay) delay = invoker.dataset.animateDelay;
      if (invoker?.dataset?.animateEasing) easing = invoker.dataset.animateEasing;
      if (invoker?.dataset?.animateIterations) iterations = invoker.dataset.animateIterations;

      try {
        targets.forEach(target => {
          if (!target.isConnected) {
            console.warn('Invokers: Skipping disconnected target element', target);
            return;
          }

          // Remove any existing animation classes and styles
          target.classList.forEach(className => {
            if (className.startsWith('invokers-animate-')) {
              target.classList.remove(className);
            }
          });

          // Clear any existing animation styles
          target.style.animation = '';

          // Force reflow to restart animation
          void target.offsetHeight;

          // Create custom animation style
          const animationName = `invokers-animate-${animation}`;
          const animationValue = `${animationName} ${duration} ${easing} ${delay} ${iterations}`;

          // Apply the animation
          target.style.animation = animationValue;

          // Handle animation end
          const handleAnimationEnd = (e: AnimationEvent) => {
            // Only remove if it's our animation
            if (e.animationName === animationName) {
              target.style.animation = '';
              target.removeEventListener('animationend', handleAnimationEnd);
            }
          };

          target.addEventListener('animationend', handleAnimationEnd);

          // Fallback timeout in case animationend doesn't fire
          setTimeout(() => {
            if (target.style.animation.includes(animationName)) {
              target.style.animation = '';
              target.removeEventListener('animationend', handleAnimationEnd);
            }
          }, parseFloat(duration) * 1000 + parseFloat(delay) * 1000 + 100); // Add 100ms buffer
        });
      } catch (error) {
        throw createInvokerError(
          'Failed to animate target elements',
          ErrorSeverity.ERROR,
          {
            command: '--animate',
            element: invoker,
            cause: error as Error,
            recovery: 'Ensure target elements support CSS animations and check animation parameters'
          }
        );
      }
    });

    // --emit command for dispatching events with enhanced options
    this.register("--emit", ({ invoker, getTargets, params }) => {
      const [eventType, ...detailParts] = params;
      const targets = getTargets();

      if (!eventType) {
        throw createInvokerError(
          'Emit command requires an event type',
          ErrorSeverity.ERROR,
          {
            command: '--emit',
            element: invoker,
            recovery: 'Use --emit:event-type or --emit:event-type:detail-data'
          }
        );
      }

      // Parse event options from data attributes
      const bubbles = invoker?.dataset?.emitBubbles !== 'false'; // Default true
      const cancelable = invoker?.dataset?.emitCancelable !== 'false'; // Default true
      const composed = invoker?.dataset?.emitComposed === 'true'; // Default false

      // Check if this is a built-in event type
      const builtInEvents = [
        'click', 'input', 'change', 'submit', 'focus', 'blur',
        'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'mousemove',
        'scroll', 'resize', 'load', 'unload', 'beforeunload'
      ];

      const isBuiltInEvent = builtInEvents.includes(eventType);

      try {
        let eventToDispatch: Event;

        if (isBuiltInEvent) {
          // Create built-in event
          const eventClass = eventType === 'click' ? MouseEvent :
                           eventType === 'input' || eventType === 'change' ? InputEvent :
                           eventType === 'keydown' || eventType === 'keyup' || eventType === 'keypress' ? KeyboardEvent :
                           Event;

          if (eventClass === MouseEvent) {
            eventToDispatch = new MouseEvent(eventType, { bubbles, cancelable });
          } else if (eventClass === KeyboardEvent) {
            eventToDispatch = new KeyboardEvent(eventType, { bubbles, cancelable });
          } else if (eventClass === InputEvent) {
            eventToDispatch = new InputEvent(eventType, { bubbles, cancelable });
          } else {
            eventToDispatch = new Event(eventType, { bubbles, cancelable });
          }
        } else {
          // Create custom event with detail
          const detail = detailParts.length > 0 ? detailParts.join(':') : null;
          const eventInit: CustomEventInit = { bubbles, cancelable };

          if (detail !== null) {
            try {
              eventInit.detail = JSON.parse(detail);
            } catch {
              // Try to parse as number or boolean
              if (detail === 'true') eventInit.detail = true;
              else if (detail === 'false') eventInit.detail = false;
              else if (!isNaN(Number(detail))) eventInit.detail = Number(detail);
              else eventInit.detail = detail;
            }
          }

          if (composed) {
            (eventInit as any).composed = true;
          }

          eventToDispatch = new CustomEvent(eventType, eventInit);
        }

        if (targets.length > 0) {
          targets.forEach(target => {
            try {
              target.dispatchEvent(eventToDispatch);
            } catch (dispatchError) {
              console.warn('Invokers: Failed to dispatch event on target:', target, dispatchError);
            }
          });
        } else {
          // If no targets, dispatch on the document
          document.dispatchEvent(eventToDispatch);
        }

        // Dispatch success event for chaining
        if (invoker) {
          const successEvent = new CustomEvent('invoker:emit:success', {
            detail: { eventType, targetCount: targets.length || 1 }
          });
          invoker.dispatchEvent(successEvent);
        }
      } catch (error) {
        throw createInvokerError(
          'Failed to emit event',
          ErrorSeverity.ERROR,
          {
            command: '--emit',
            element: invoker,
            cause: error as Error,
            recovery: 'Check event type and target elements'
          }
        );
      }
    });

    // --url command for URL manipulation with enhanced features
    this.register("--url", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const targets = getTargets();

      try {
        switch (action) {
          case 'params:get':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'URL params:get requires a parameter name',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:params:get:param-name'
                }
              );
            }

            const paramName = valueParts[0];
            const urlParams = new URLSearchParams(window.location.search);
            const paramValue = urlParams.get(paramName) || '';

            if (targets.length > 0) {
              if ('value' in targets[0]) {
                (targets[0] as HTMLInputElement).value = paramValue;
              } else {
                targets[0].textContent = paramValue;
              }
            }

            // Value is set on target element for chaining
            break;

          case 'params:set':
            if (valueParts.length < 2) {
              throw createInvokerError(
                'URL params:set requires param-name and value',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:params:set:param-name:value'
                }
              );
            }

            const [setParamName, ...setParamValueParts] = valueParts;
            const setParamValue = setParamValueParts.join(':');
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set(setParamName, setParamValue);

            // Check for state preservation
            const preserveState = invoker?.dataset?.urlPreserveState === 'true';
            window.history.replaceState(
              preserveState ? window.history.state : null,
              '',
              currentUrl.toString()
            );
            break;

          case 'params:delete':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'URL params:delete requires a parameter name',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:params:delete:param-name'
                }
              );
            }

            const deleteParamName = valueParts[0];
            const deleteUrl = new URL(window.location.href);
            deleteUrl.searchParams.delete(deleteParamName);
            window.history.replaceState(null, '', deleteUrl.toString());
            break;

          case 'params:clear':
            const clearUrl = new URL(window.location.href);
            clearUrl.search = '';
            window.history.replaceState(null, '', clearUrl.toString());
            break;

          case 'params:all':
            const allParams = Object.fromEntries(new URLSearchParams(window.location.search));
            const paramsJson = JSON.stringify(allParams);
            if (targets.length > 0) {
              targets[0].textContent = paramsJson;
            }
            break;

          case 'hash:get':
            const hashValue = window.location.hash.substring(1); // Remove the #
            if (targets.length > 0) {
              if ('value' in targets[0]) {
                (targets[0] as HTMLInputElement).value = hashValue;
              } else {
                targets[0].textContent = hashValue;
              }
            }
            break;

          case 'hash:set':
            const hashToSet = valueParts.join(':');
            window.location.hash = hashToSet ? `#${hashToSet}` : '';
            break;

          case 'hash:clear':
            window.location.hash = '';
            break;

          case 'pathname:get':
            const pathname = window.location.pathname;
            if (targets.length > 0) {
              targets[0].textContent = pathname;
            }
            break;

          case 'pathname:set':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'URL pathname:set requires a pathname',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:pathname:set:/new-path'
                }
              );
            }
            const newPathname = valueParts[0];
            const pathnameUrl = new URL(window.location.href);
            pathnameUrl.pathname = newPathname;
            window.history.replaceState(null, '', pathnameUrl.toString());
            break;

          case 'reload':
            const forceReload = invoker?.dataset?.urlForceReload === 'true';
            (window.location.reload as any)(forceReload);
            break;

          case 'replace':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'URL replace requires a URL',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:replace:new-url'
                }
              );
            }
            const replaceUrl = valueParts.join(':');
            window.location.replace(replaceUrl);
            break;

          case 'navigate':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'URL navigate requires a URL',
                ErrorSeverity.ERROR,
                {
                  command: '--url',
                  element: invoker,
                  recovery: 'Use --url:navigate:new-url'
                }
              );
            }
            const navigateUrl = valueParts.join(':');
            window.location.href = navigateUrl;
            break;

          case 'base':
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            if (targets.length > 0) {
              targets[0].textContent = baseUrl;
            }
            break;

          case 'full':
            const fullUrl = window.location.href;
            if (targets.length > 0) {
              targets[0].textContent = fullUrl;
            }
            break;

          default:
            throw createInvokerError(
              `Unknown URL action "${action}"`,
              ErrorSeverity.ERROR,
              {
                command: '--url',
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    'params:get', 'params:set', 'params:delete', 'params:clear', 'params:all',
                    'hash:get', 'hash:set', 'hash:clear',
                    'pathname:get', 'pathname:set',
                    'reload', 'replace', 'navigate', 'base', 'full'
                  ]
                },
                recovery: 'Use a valid URL action'
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          'URL operation failed',
          ErrorSeverity.ERROR,
          {
            command: '--url',
            element: invoker,
            cause: error as Error,
            recovery: 'Check URL format, parameter names, and browser support'
          }
        );
      }
    });

    // --history command for browser history manipulation with enhanced state management
    this.register("--history", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const targets = getTargets();

      try {
        switch (action) {
          case 'push':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'History push requires a URL',
                ErrorSeverity.ERROR,
                {
                  command: '--history',
                  element: invoker,
                  recovery: 'Use --history:push:url or --history:push:url:title:state-data'
                }
              );
            }

            const pushUrl = valueParts[0];
            const pushTitle = valueParts[1] || '';
            const pushState = valueParts.slice(2).join(':');

            let state = null;
            if (pushState) {
              try {
                state = JSON.parse(pushState);
              } catch {
                state = pushState;
              }
            }

            window.history.pushState(state, pushTitle, pushUrl);
            break;

          case 'replace':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'History replace requires a URL',
                ErrorSeverity.ERROR,
                {
                  command: '--history',
                  element: invoker,
                  recovery: 'Use --history:replace:url or --history:replace:url:title:state-data'
                }
              );
            }

            const replaceUrl = valueParts[0];
            const replaceTitle = valueParts[1] || '';
            const replaceState = valueParts.slice(2).join(':');

            let replaceStateData = null;
            if (replaceState) {
              try {
                replaceStateData = JSON.parse(replaceState);
              } catch {
                replaceStateData = replaceState;
              }
            }

            window.history.replaceState(replaceStateData, replaceTitle, replaceUrl);
            break;

          case 'back':
            window.history.back();
            break;

          case 'forward':
            window.history.forward();
            break;

          case 'go':
            const delta = valueParts[0] ? parseInt(valueParts[0], 10) : -1;
            if (isNaN(delta)) {
              throw createInvokerError(
                'History go requires a valid number',
                ErrorSeverity.ERROR,
                {
                  command: '--history',
                  element: invoker,
                  recovery: 'Use --history:go:number (positive for forward, negative for back)'
                }
              );
            }
            window.history.go(delta);
            break;

          case 'state:get':
            const currentState = window.history.state;
            const stateJson = JSON.stringify(currentState);
            if (targets.length > 0) {
              targets[0].textContent = stateJson;
            }
            break;

          case 'state:set':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'History state:set requires state data',
                ErrorSeverity.ERROR,
                {
                  command: '--history',
                  element: invoker,
                  recovery: 'Use --history:state:set:json-data'
                }
              );
            }

            const stateData = valueParts.join(':');
            let newState;
            try {
              newState = JSON.parse(stateData);
            } catch {
              newState = stateData;
            }

            window.history.replaceState(newState, document.title);
            break;

          case 'length':
            const historyLength = window.history.length;
            if (targets.length > 0) {
              targets[0].textContent = historyLength.toString();
            }
            break;

          case 'clear':
            // Clear state but keep URL
            window.history.replaceState(null, document.title);
            break;

          default:
            throw createInvokerError(
              `Unknown history action "${action}"`,
              ErrorSeverity.ERROR,
              {
                command: '--history',
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    'push', 'replace', 'back', 'forward', 'go',
                    'state:get', 'state:set', 'length', 'clear'
                  ]
                },
                recovery: 'Use a valid history action'
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          'History operation failed',
          ErrorSeverity.ERROR,
          {
            command: '--history',
            element: invoker,
            cause: error as Error,
            recovery: 'Check browser history support and parameters'
          }
        );
      }
    });

    // --device command for device APIs with enhanced permission handling
    this.register("--device", async ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const targets = getTargets();

      // Helper function to request permissions
      const requestPermission = async (permissionName: string): Promise<boolean> => {
        if ('permissions' in navigator) {
          try {
            const permission = await (navigator as any).permissions.query({ name: permissionName });
            return permission.state === 'granted';
          } catch {
            return false;
          }
        }
        return true; // Assume granted if permissions API not available
      };

      try {
        switch (action) {
          case 'vibrate':
            if (valueParts.length === 0) {
              throw createInvokerError(
                'Device vibrate requires a pattern',
                ErrorSeverity.ERROR,
                {
                  command: '--device',
                  element: invoker,
                  recovery: 'Use --device:vibrate:200 or --device:vibrate:100:200:100'
                }
              );
            }

            if (!('vibrate' in navigator)) {
              console.warn('Invokers: Vibration API not supported');
              return;
            }

            const pattern = valueParts.map(n => parseInt(n, 10));
            const vibrateResult = (navigator as any).vibrate(pattern.length === 1 ? pattern[0] : pattern);

            if (!vibrateResult) {
              console.warn('Invokers: Vibration failed - may be blocked or not supported');
            }
            break;

          case 'share':
            if (!('share' in navigator)) {
              console.warn('Invokers: Web Share API not supported');
              return;
            }

            const shareData: ShareData = {};
            if (valueParts.length > 0) {
              // Parse key:value pairs
              for (let i = 0; i < valueParts.length; i += 2) {
                const key = valueParts[i];
                const val = valueParts[i + 1];
                if (key && val !== undefined) {
                  if (key === 'url') shareData.url = val;
                  else if (key === 'text') shareData.text = val;
                  else if (key === 'title') shareData.title = val;
                }
              }
            }

            try {
              await (navigator as any).share(shareData);
              // Dispatch success event
              document.dispatchEvent(new CustomEvent('device:share:success'));
            } catch (shareError) {
              // User cancelled or error occurred
              document.dispatchEvent(new CustomEvent('device:share:cancelled', {
                detail: shareError
              }));
            }
            break;

          case 'geolocation:get':
            if (!('geolocation' in navigator)) {
              throw createInvokerError(
                'Geolocation API not supported',
                ErrorSeverity.ERROR,
                {
                  command: '--device',
                  element: invoker,
                  recovery: 'Geolocation requires HTTPS and user permission'
                }
              );
            }

            const hasGeoPermission = await requestPermission('geolocation');
            if (!hasGeoPermission) {
              console.warn('Invokers: Geolocation permission not granted');
              document.dispatchEvent(new CustomEvent('geolocation:denied'));
              return;
            }

            const geoOptions: PositionOptions = {
              enableHighAccuracy: invoker?.dataset?.geoHighAccuracy === 'true',
              timeout: parseInt(invoker?.dataset?.geoTimeout || '10000'),
              maximumAge: parseInt(invoker?.dataset?.geoMaxAge || '0')
            };

            navigator.geolocation.getCurrentPosition(
              (position) => {
                const data = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude,
                  altitudeAccuracy: position.coords.altitudeAccuracy,
                  heading: position.coords.heading,
                  speed: position.coords.speed,
                  timestamp: position.timestamp
                };
                if (targets.length > 0) {
                  targets[0].textContent = JSON.stringify(data);
                }
                // Dispatch success event
                document.dispatchEvent(new CustomEvent('device:geolocation:success', { detail: data }));
              },
              (error) => {
                const errorData = {
                  code: error.code,
                  message: error.message
                };
                // Dispatch error event
                document.dispatchEvent(new CustomEvent('device:geolocation:error', { detail: errorData }));
              },
              geoOptions
            );
            break;

          case 'orientation:get':
            if (!window.DeviceOrientationEvent) {
              console.warn('Invokers: Device Orientation API not supported');
              return;
            }

            // Get current orientation if available
            const orientation = (window as any).screen?.orientation || (window as any).orientation;
            const orientationData = {
              angle: orientation?.angle || 0,
              type: orientation?.type || 'unknown'
            };

            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify(orientationData);
            }

            // Dispatch event
            document.dispatchEvent(new CustomEvent('device:orientation:current', { detail: orientationData }));
            break;

          case 'motion:get':
            if (!window.DeviceMotionEvent) {
              console.warn('Invokers: Device Motion API not supported');
              return;
            }

            // Request permission for iOS 13+
            if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
              try {
                const permission = await (DeviceMotionEvent as any).requestPermission();
                if (permission !== 'granted') {
                  console.warn('Invokers: Device motion permission denied');
                  return;
                }
              } catch {
                console.warn('Invokers: Failed to request device motion permission');
                return;
              }
            }

            // Note: Actual motion data requires event listeners, this just confirms support
            const motionSupported = true;
            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify({ supported: motionSupported });
            }
            break;

          case 'battery:get':
            if (!('getBattery' in navigator)) {
              console.warn('Invokers: Battery API not supported');
              return;
            }

            try {
              const battery = await (navigator as any).getBattery();
              const data = {
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
              };
              if (targets.length > 0) {
                targets[0].textContent = JSON.stringify(data);
              }
              // Dispatch event
              document.dispatchEvent(new CustomEvent('device:battery:status', { detail: data }));
            } catch (batteryError) {
              console.warn('Invokers: Failed to get battery status', batteryError);
            }
            break;

          case 'clipboard:read':
            if (!navigator.clipboard?.readText) {
              console.warn('Invokers: Clipboard read not supported');
              return;
            }

            try {
              const clipboardText = await navigator.clipboard.readText();
              if (targets.length > 0) {
                if ('value' in targets[0]) {
                  (targets[0] as HTMLInputElement).value = clipboardText;
                } else {
                  targets[0].textContent = clipboardText;
                }
              }
              document.dispatchEvent(new CustomEvent('device:clipboard:read', { detail: clipboardText }));
            } catch (clipboardError) {
              console.warn('Invokers: Clipboard read failed', clipboardError);
              document.dispatchEvent(new CustomEvent('device:clipboard:denied'));
            }
            break;

          case 'clipboard:write':
            if (!navigator.clipboard?.writeText) {
              console.warn('Invokers: Clipboard write not supported');
              return;
            }

            const textToWrite = valueParts.join(':');
            if (!textToWrite) {
              throw createInvokerError(
                'Clipboard write requires text to copy',
                ErrorSeverity.ERROR,
                {
                  command: '--device',
                  element: invoker,
                  recovery: 'Use --device:clipboard:write:text-to-copy'
                }
              );
            }

            try {
              await navigator.clipboard.writeText(textToWrite);
              document.dispatchEvent(new CustomEvent('device:clipboard:written', { detail: textToWrite }));
            } catch (clipboardError) {
              console.warn('Invokers: Clipboard write failed', clipboardError);
              document.dispatchEvent(new CustomEvent('device:clipboard:denied'));
            }
            break;

          case 'wake-lock':
            if (!('wakeLock' in navigator)) {
              console.warn('Invokers: Wake Lock API not supported');
              return;
            }

            try {
              const wakeLock = await (navigator as any).wakeLock.request('screen');
              // Store wake lock for potential release
              (window as any)._invokersWakeLock = wakeLock;

              document.dispatchEvent(new CustomEvent('device:wake-lock:acquired'));
            } catch (wakeError) {
              console.warn('Invokers: Wake lock request failed', wakeError);
              document.dispatchEvent(new CustomEvent('device:wake-lock:denied'));
            }
            break;

          case 'wake-lock:release':
            if ((window as any)._invokersWakeLock) {
              (window as any)._invokersWakeLock.release();
              delete (window as any)._invokersWakeLock;
              document.dispatchEvent(new CustomEvent('device:wake-lock:released'));
            }
            break;

          default:
            throw createInvokerError(
              `Unknown device action "${action}"`,
              ErrorSeverity.ERROR,
              {
                command: '--device',
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    'vibrate', 'share', 'geolocation:get', 'orientation:get', 'motion:get',
                    'battery:get', 'clipboard:read', 'clipboard:write', 'wake-lock', 'wake-lock:release'
                  ]
                },
                recovery: 'Use a supported device action'
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          'Device API operation failed',
          ErrorSeverity.ERROR,
          {
            command: '--device',
            element: invoker,
            cause: error as Error,
            recovery: 'Check device API support, permissions, and parameters'
          }
        );
      }
    });

    // --a11y command for comprehensive accessibility helpers
    this.register("--a11y", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const value = valueParts.join(':');
      const targets = getTargets();

      try {
        switch (action) {
          case 'announce':
            if (!value) {
              throw createInvokerError(
                'A11y announce requires text to announce',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:announce:Your announcement text'
                }
              );
            }

            // Determine announcement priority
            const priority = invoker?.dataset?.announcePriority || 'polite'; // polite or assertive

            // Create or find aria-live regions
            let liveRegion = document.getElementById(`invokers-a11y-announcer-${priority}`);
            if (!liveRegion) {
              liveRegion = document.createElement('div');
              liveRegion.id = `invokers-a11y-announcer-${priority}`;
              liveRegion.setAttribute('aria-live', priority);
              liveRegion.setAttribute('aria-atomic', 'true');
              liveRegion.style.position = 'absolute';
              liveRegion.style.left = '-10000px';
              liveRegion.style.width = '1px';
              liveRegion.style.height = '1px';
              liveRegion.style.overflow = 'hidden';
              document.body.appendChild(liveRegion);
            }

            // Clear previous content and set new content
            liveRegion.textContent = '';
            // Use setTimeout to ensure screen readers pick up the change
            setTimeout(() => {
              liveRegion!.textContent = value;
            }, 100);
            break;

          case 'focus':
            if (targets.length === 0) {
              throw createInvokerError(
                'A11y focus requires target elements',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use commandfor to specify which element to focus'
                }
              );
            }

            const focusTarget = targets[0] as HTMLElement;
            if (focusTarget.focus) {
              // Scroll into view first if needed
              focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Small delay to ensure scrolling is complete
              setTimeout(() => {
                focusTarget.focus();

                // Announce focus for screen readers
                document.dispatchEvent(new CustomEvent('a11y:focus:changed', {
                  detail: { element: focusTarget, label: focusTarget.textContent || focusTarget.getAttribute('aria-label') }
                }));
              }, 300);
            }
            break;

          case 'skip-to':
            if (!value) {
              throw createInvokerError(
                'A11y skip-to requires an element ID',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:skip-to:element-id'
                }
              );
            }

            const skipTarget = document.getElementById(value);
            if (skipTarget) {
              // Ensure the target is focusable
              if (!skipTarget.hasAttribute('tabindex') && !['button', 'input', 'select', 'textarea', 'a'].includes(skipTarget.tagName.toLowerCase())) {
                skipTarget.setAttribute('tabindex', '-1');
              }

              skipTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setTimeout(() => {
                (skipTarget as HTMLElement).focus();
              }, 300);
            } else {
              throw createInvokerError(
                `Element with id "${value}" not found`,
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Ensure the target element exists and has the correct ID'
                }
              );
            }
            break;

          case 'focus-trap':
            if (!value || !['enable', 'disable'].includes(value)) {
              throw createInvokerError(
                'A11y focus-trap requires "enable" or "disable"',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:focus-trap:enable or --a11y:focus-trap:disable'
                }
              );
            }

            if (value === 'enable' && targets.length > 0) {
              const container = targets[0] as HTMLElement;

              // Find all focusable elements within the container
              const getFocusableElements = () => {
                return container.querySelectorAll(
                  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
              };

              const focusableElements = getFocusableElements();
              const firstElement = focusableElements[0] as HTMLElement;

              const handleTabKey = (e: KeyboardEvent) => {
                const currentFocusable = getFocusableElements();
                const currentFirst = currentFocusable[0] as HTMLElement;
                const currentLast = currentFocusable[currentFocusable.length - 1] as HTMLElement;

                if (e.key === 'Tab') {
                  if (e.shiftKey) {
                    if (document.activeElement === currentFirst) {
                      currentLast.focus();
                      e.preventDefault();
                    }
                  } else {
                    if (document.activeElement === currentLast) {
                      currentFirst.focus();
                      e.preventDefault();
                    }
                  }
                }

                // Handle Escape key to exit focus trap
                if (e.key === 'Escape') {
                  document.dispatchEvent(new CustomEvent('a11y:focus-trap:escape', {
                    detail: { container }
                  }));
                }
              };

              const handleFocusIn = (e: FocusEvent) => {
                const target = e.target as HTMLElement;
                if (!container.contains(target)) {
                  // Focus moved outside container, bring it back
                  const focusableElements = getFocusableElements();
                  if (focusableElements.length > 0) {
                    (focusableElements[0] as HTMLElement).focus();
                  }
                }
              };

              container.addEventListener('keydown', handleTabKey);
              document.addEventListener('focusin', handleFocusIn);

              // Store handlers for cleanup
              (container as any)._a11yFocusTrap = {
                tabHandler: handleTabKey,
                focusHandler: handleFocusIn
              };

              // Focus first element
              firstElement?.focus();

              // Announce focus trap activation
              document.dispatchEvent(new CustomEvent('a11y:focus-trap:enabled', {
                detail: { container }
              }));

            } else if (value === 'disable' && targets.length > 0) {
              const container = targets[0] as HTMLElement;
              const handlers = (container as any)._a11yFocusTrap;

              if (handlers) {
                container.removeEventListener('keydown', handlers.tabHandler);
                document.removeEventListener('focusin', handlers.focusHandler);
                delete (container as any)._a11yFocusTrap;
              }

              document.dispatchEvent(new CustomEvent('a11y:focus-trap:disabled', {
                detail: { container }
              }));
            }
            break;

          case 'aria:set':
            if (!value || !value.includes(':')) {
              throw createInvokerError(
                'A11y aria:set requires attribute:value format',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:aria:set:attribute:value'
                }
              );
            }

            const [ariaAttr, ariaValue] = value.split(':', 2);
            if (targets.length > 0) {
              targets.forEach(target => {
                target.setAttribute(`aria-${ariaAttr}`, ariaValue);
              });
            }
            break;

          case 'aria:remove':
            if (!value) {
              throw createInvokerError(
                'A11y aria:remove requires an attribute name',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:aria:remove:attribute'
                }
              );
            }

            if (targets.length > 0) {
              targets.forEach(target => {
                target.removeAttribute(`aria-${value}`);
              });
            }
            break;

          case 'heading-level':
            if (!value || !['1', '2', '3', '4', '5', '6'].includes(value)) {
              throw createInvokerError(
                'A11y heading-level requires a level 1-6',
                ErrorSeverity.ERROR,
                {
                  command: '--a11y',
                  element: invoker,
                  recovery: 'Use --a11y:heading-level:1-6'
                }
              );
            }

            if (targets.length > 0) {
              targets.forEach(target => {
                if (target.tagName.match(/^H[1-6]$/)) {
                  // Change heading level by changing tag
                  const newTag = `H${value}`;
                  const newElement = document.createElement(newTag);
                  Array.from(target.attributes).forEach(attr => {
                    newElement.setAttribute(attr.name, attr.value);
                  });
                  newElement.innerHTML = target.innerHTML;
                  target.parentNode?.replaceChild(newElement, target);
                } else {
                  target.setAttribute('aria-level', value);
                }
              });
            }
            break;

          default:
            throw createInvokerError(
              `Unknown accessibility action "${action}"`,
              ErrorSeverity.ERROR,
              {
                command: '--a11y',
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    'announce', 'focus', 'skip-to', 'focus-trap',
                    'aria:set', 'aria:remove', 'heading-level'
                  ]
                },
                recovery: 'Use a valid accessibility action'
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          'Accessibility operation failed',
          ErrorSeverity.ERROR,
          {
            command: '--a11y',
            element: invoker,
            cause: error as Error,
            recovery: 'Check accessibility requirements and target elements'
          }
        );
      }
    });

    // Pipeline command for template-based workflows
    this.register("--pipeline", async ({ invoker, params }) => {
      const [action, pipelineId] = params;
      
      if (action !== 'execute') {
        throw createInvokerError(
          `Invalid pipeline action "${action}". Only "execute" is supported`,
          ErrorSeverity.ERROR,
          {
            command: '--pipeline',
            element: invoker,
            context: { action, availableActions: ['execute'] },
            recovery: 'Use --pipeline:execute:your-pipeline-id'
          }
        );
      }

      if (!pipelineId) {
        throw createInvokerError(
          'Pipeline command requires a pipeline ID',
          ErrorSeverity.ERROR,
          {
            command: '--pipeline',
            element: invoker,
            context: { params },
            recovery: 'Use --pipeline:execute:your-pipeline-id'
          }
        );
      }

      const context = this.createContext(
        { command: '--pipeline:execute', source: invoker, target: invoker } as any,
        '--pipeline:execute',
        params
      );

      await this.pipelineManager.executePipeline(pipelineId, context);
    });
  }
}



// --- Pipeline Manager Class ---

/**
 * Manages template-based command pipelines using <pipeline-step> elements.
 */
class PipelineManager {
  private invokerManager: InvokerManager;

  constructor(invokerManager: InvokerManager) {
    this.invokerManager = invokerManager;
  }

  /**
   * Executes a pipeline defined in a template element.
   */
  async executePipeline(pipelineId: string, context: CommandContext): Promise<void> {
    const template = document.getElementById(pipelineId) as HTMLTemplateElement;
    if (!template?.hasAttribute('data-pipeline')) {
      console.warn(`Invokers: Pipeline template "${pipelineId}" not found or not marked with data-pipeline attribute`);
      return;
    }

    try {
      const steps = this.parsePipelineSteps(template);
      let previousResult: CommandExecutionResult = { success: true };

      for (const step of steps) {
        if (this.shouldExecuteStep(step, previousResult)) {
          if (step.delay && step.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, step.delay));
          }

          previousResult = await this.executeStep(step, context);

          if (step.once) {
            this.removeStepFromTemplate(template, step);
          }

          // If a step fails and there are no error handlers, stop execution
          if (!previousResult.success && !this.hasErrorHandler(steps, steps.indexOf(step))) {
            console.warn(`Invokers: Pipeline "${pipelineId}" stopped due to failed step: ${step.command}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Invokers: Pipeline "${pipelineId}" execution failed:`, error);
    }
  }

  /**
   * Parses pipeline steps from a template element.
   */
  private parsePipelineSteps(template: HTMLTemplateElement): PipelineStep[] {
    const steps: PipelineStep[] = [];
    const content = template.content;
    const stepElements = content.querySelectorAll('pipeline-step');

    stepElements.forEach((stepEl, index) => {
      const command = stepEl.getAttribute('command');
      const target = stepEl.getAttribute('target');

      if (!command || !target) {
        console.warn(`Invokers: Pipeline step ${index} missing required command or target attribute`);
        return;
      }

      const step: PipelineStep = {
        command,
        target,
        condition: (stepEl.getAttribute('condition') as 'success' | 'error' | 'always') || 'always',
        once: stepEl.hasAttribute('once'),
        delay: parseInt(stepEl.getAttribute('delay') || '0', 10)
      };

      // Extract data attributes
      const data: Record<string, string> = {};
      Array.from(stepEl.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          data[attr.name] = attr.value;
        }
      });
      
      if (Object.keys(data).length > 0) {
        step.data = data;
      }

      steps.push(step);
    });

    return steps;
  }

  /**
   * Determines if a pipeline step should execute based on condition and previous result.
   */
  private shouldExecuteStep(step: PipelineStep, previousResult: CommandExecutionResult): boolean {
    switch (step.condition) {
      case 'success':
        return previousResult.success === true;
      case 'error':
        return previousResult.success === false;
      case 'always':
      default:
        return true;
    }
  }

  /**
   * Executes a single pipeline step.
   */
  private async executeStep(step: PipelineStep, _context: CommandContext): Promise<CommandExecutionResult> {
    try {
      // Create a synthetic invoker for the pipeline step
      const syntheticInvoker = document.createElement('button');
      syntheticInvoker.setAttribute('type', 'button');
      syntheticInvoker.setAttribute('command', step.command.startsWith('--') ? step.command : `--${step.command}`);
      syntheticInvoker.setAttribute('commandfor', step.target);

      // Apply data attributes from the pipeline step
      if (step.data) {
        Object.entries(step.data).forEach(([key, value]) => {
          syntheticInvoker.setAttribute(key, value);
        });
      }

      await this.invokerManager.executeCommand(step.command, step.target, syntheticInvoker);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Checks if there are error handlers after a given step index.
   */
  private hasErrorHandler(steps: PipelineStep[], currentIndex: number): boolean {
    return steps.slice(currentIndex + 1).some(step => step.condition === 'error');
  }

  /**
   * Removes a step from the template (for once-only steps).
   */
  private removeStepFromTemplate(template: HTMLTemplateElement, stepToRemove: PipelineStep): void {
    const content = template.content;
    const stepElements = content.querySelectorAll('pipeline-step');
    
    stepElements.forEach(stepEl => {
      if (stepEl.getAttribute('command') === stepToRemove.command && 
          stepEl.getAttribute('target') === stepToRemove.target) {
        stepEl.remove();
      }
    });
  }
}

// --- AndThen Manager Class ---

// --- AndThen Manager Class ---

/**
 * Manages declarative command chaining via <and-then> elements. This class
 * is responsible for parsing the nested structure of <and-then> tags,
 * respecting conditions and delays, and executing them sequentially without
 * causing infinite loops.
 */
class AndThenManager {
  private invokerManager: InvokerManager;

  constructor(invokerManager: InvokerManager) {
    this.invokerManager = invokerManager;
  }

  /**
   * Processes <and-then> elements after a command execution. This is the main
   * entry point that finds top-level <and-then> children of the invoker and
   * kicks off the recursive execution process.
   *
   * @param invokerElement The original <button> that was activated.
   * @param executionResult The success/failure result of the invoker's command.
   * @param primaryTarget The main target of the invoker's command.
   */
  public async processAndThen(
    invokerElement: HTMLButtonElement,
    executionResult: CommandExecutionResult,
    primaryTarget: HTMLElement
  ): Promise<void> {
    // Find all *top-level* and-then elements that are direct children of the invoker.
    const topLevelAndThens = Array.from(invokerElement.children).filter(
      child => child.tagName.toLowerCase() === 'and-then'
    ) as HTMLElement[];

    // Sequentially execute each top-level chain.
    for (const andThenElement of topLevelAndThens) {
      // The initial recursive call starts here.
      await this.executeAndThenRecursively(
        andThenElement,
        invokerElement,
        executionResult,
        primaryTarget
      );
    }
  }

  /**
   * Executes a command from an <and-then> element and its descendants recursively.
   * This is the core of the chaining logic.
   *
   * @param andThenElement The current <and-then> element to execute.
   * @param originalInvoker The very first button in the chain, used for context.
   * @param parentResult The execution result from the parent command.
   * @param primaryTarget The original target, used as a fallback.
   * @param depth The current recursion depth to prevent stack overflows.
   */
  private async executeAndThenRecursively(
    andThenElement: HTMLElement,
    originalInvoker: HTMLButtonElement,
    parentResult: CommandExecutionResult,
    primaryTarget: HTMLElement,
    depth: number = 0
  ): Promise<void> {
    // 1. Safety Check: Prevent infinite recursion.
    if (depth > 25) {
      logInvokerError(createInvokerError(
        'Maximum <and-then> depth reached, stopping execution to prevent infinite loop.',
        ErrorSeverity.CRITICAL,
        { element: andThenElement, recovery: 'Check for circular or excessively deep <and-then> nesting.' }
      ));
      return;
    }

    // 2. State Check: Skip elements that have already run or are disabled.
    const state = andThenElement.dataset.state;
    if (state === 'disabled' || state === 'completed') {
      return;
    }

    // 3. Conditional Check: Execute only if the condition is met.
    const condition = andThenElement.dataset.condition || 'always';
    if (!this.shouldExecuteCondition(condition, parentResult)) {
      return;
    }

    // 4. Get Command Details
    const command = andThenElement.getAttribute('command');
    const targetId = andThenElement.getAttribute('commandfor') || originalInvoker.getAttribute('commandfor') || primaryTarget.id;
    const delay = parseInt(andThenElement.dataset.delay || '0', 10);

    if (!command || !targetId) {
      logInvokerError(createInvokerError(
        '<and-then> element is missing required "command" or "commandfor" attribute.',
        ErrorSeverity.WARNING,
        { element: andThenElement }
      ));
      return;
    }

    // 5. Apply Delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 6. Execute the Command
    let currentExecutionResult: CommandExecutionResult = { success: true };
    try {
      // Use a synthetic invoker to pass context attributes like `data-*`
      // without re-triggering the top-level follow-up logic on the original invoker.
      const syntheticInvoker = this.createSyntheticInvoker(andThenElement, command, targetId);
      await this.invokerManager.executeCommand(command, targetId, syntheticInvoker);
    } catch (error) {
      // If the command fails, capture the result to pass to children.
      currentExecutionResult = { success: false, error: error as Error };
    }

    // 7. Update State (Post-Execution)
    if (andThenElement.hasAttribute('data-once')) {
      andThenElement.remove();
    } else {
      andThenElement.dataset.state = 'completed';
    }

    // 8. Recurse for Children
    const nestedAndThens = Array.from(andThenElement.children).filter(
      child => child.tagName.toLowerCase() === 'and-then'
    ) as HTMLElement[];

    for (const nested of nestedAndThens) {
      await this.executeAndThenRecursively(
        nested,
        originalInvoker,
        currentExecutionResult, // Pass the result of *this* command down.
        primaryTarget,
        depth + 1
      );
    }
  }

  /**
   * Creates a temporary, in-memory <button> to act as the invoker for an
   * <and-then> command, allowing `data-*` attributes to be passed for context.
   */
  private createSyntheticInvoker(andThenElement: HTMLElement, command: string, targetId: string): HTMLButtonElement {
    const syntheticInvoker = document.createElement('button');
    syntheticInvoker.setAttribute('command', command.startsWith('--') ? command : `--${command}`);
    syntheticInvoker.setAttribute('commandfor', targetId);

    // Copy all data attributes from the <and-then> to the synthetic button
    // so the command's context can access them via `invoker.dataset`.
    for (const key in andThenElement.dataset) {
      syntheticInvoker.dataset[key] = andThenElement.dataset[key];
    }
    return syntheticInvoker;
  }

  /**
   * Determines if a condition is met based on the result of the parent command.
   */
  private shouldExecuteCondition(condition: string, result: CommandExecutionResult): boolean {
    switch (condition.toLowerCase()) {
      case 'success':
        return result.success === true;
      case 'error':
        return result.success === false;
      case 'always':
        return true;
      default:
        logInvokerError(createInvokerError(
          `Unknown condition for <and-then> element: "${condition}"`,
          ErrorSeverity.WARNING
        ));
        return false; // Fail safe
    }
  }
}


// --- Initialize and Expose API ---

// Get the SINGLETON instance of the manager.
const invokerInstance = InvokerManager.getInstance();

// Set up global API
const setupGlobalAPI = () => {
  let targetWindow = null;

  // Try globalThis.window (browser)
  if (typeof globalThis !== "undefined" && (globalThis as any).window) {
    targetWindow = (globalThis as any).window;
  }

  // Try global.window (Node.js with jsdom)
  if (!targetWindow && typeof global !== "undefined" && (global as any).window) {
    targetWindow = (global as any).window;
  }

  // Try window directly
  if (!targetWindow && typeof window !== "undefined") {
    targetWindow = window;
  }

  if (targetWindow) {
    targetWindow.Invoker = {
      // Bind all public methods to the one true instance.
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),

      // *** FIX: Expose the new registration function on the global API. ***
      registerAll: invokerInstance.registerExtendedCommands.bind(invokerInstance),
      parseCommandString,
      createCommandString,
      instance: invokerInstance,
      get debug() { return isDebugMode; },
      set debug(value: boolean) {
        isDebugMode = value;
        console.log(`Invokers: Debug mode ${value ? 'enabled' : 'disabled'}.`);
      },
      getStats: () => invokerInstance['performanceMonitor'].getStats(),
      getRegisteredCommands: () => Array.from(invokerInstance['commands'].keys()),
      validateElement,
      createError: createInvokerError,
      logError: logInvokerError,

      // Plugin and middleware API
      registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
      unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
      registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
      unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),

      reset() {
        invokerInstance['commands'].clear();
        invokerInstance['commandStates'].clear();
        invokerInstance['sortedCommandKeys'] = [];
        invokerInstance['plugins'].clear();
        invokerInstance['middleware'].clear();
        console.log('Invokers: Reset complete.');
      }
    };
  }
};

setupGlobalAPI();



// --- Export Interest Invokers functionality ---
export { 
  isInterestInvokersSupported, 
  applyInterestInvokers, 
  createInterestEvent 
} from './interest-invokers';

export type { 
  InterestEvent, 
  InterestEventInit, 
  InterestInvokerElement 
} from './interest-invokers';

export default invokerInstance;
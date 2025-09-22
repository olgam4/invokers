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
      .trim();

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
  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];
  private commandStates = new Map<string, CommandState>();
  private andThenManager: AndThenManager;
  private pipelineManager: PipelineManager;
  private executionQueue: Promise<void> = Promise.resolve();

  // Performance and debugging tracking
  private executionCount = 0;
  private maxExecutionsPerSecond = 100;
  private executionTimes: number[] = [];
  private readonly performanceMonitor = new PerformanceMonitor();

  constructor() {
    this.andThenManager = new AndThenManager(this);
    this.pipelineManager = new PipelineManager(this);

    // Only initialize if this is the first instance to avoid duplicate listeners
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      // Only add listeners if they haven't been added yet
      if (!(window as any).__invokerListenersAdded) {
        this.listen();
        (window as any).__invokerListenersAdded = true;
      }
    } else if (typeof global !== "undefined" && (global as any).window && (global as any).document) {
      // Test environment with jsdom
      this.registerCoreLibraryCommands();
      if (!(global as any).__invokerListenersAdded) {
        this.listen();
        (global as any).__invokerListenersAdded = true;
      }
    }
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

            if (isDebugMode) {
              console.log(`Invokers: Command "${registeredCommand}" executed successfully`);
            }

          } catch (error) {
            executionResult = { success: false, error: error as Error };

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
  private generateRecoverySuggestion(command: string, error: Error, context: CommandContext): string {
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
  private attemptGracefulDegradation(context: CommandContext, error: Error): void {
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

    // Schedule the command to run after the current execution queue
    this.executionQueue = this.executionQueue.then(async () => {
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
    });

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
      const value = valueParts.join(':'); // Rejoin in case value contained colons
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
  private async executeStep(step: PipelineStep, context: CommandContext): Promise<CommandExecutionResult> {
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

/**
 * Handles declarative <and-then> elements for command chaining.
 */
class AndThenManager {
  private invokerManager: InvokerManager;

  constructor(invokerManager: InvokerManager) {
    this.invokerManager = invokerManager;
  }

  /**
   * Initializes <and-then> elements by setting default states.
   */
  private initializeAndThenElements(): void {
    // Set default state for and-then elements that don't have one
    const allElements = document.getElementsByTagName('and-then');
    const andThenElements = Array.from(allElements).filter(element =>
      !element.hasAttribute('data-state')
    );
    andThenElements.forEach(element => {
      element.setAttribute('data-state', 'active');
    });
  }

  /**
   * Processes <and-then> elements after a command execution.
   */
  async processAndThen(invokerElement: HTMLButtonElement, executionResult: CommandExecutionResult, primaryTarget: HTMLElement, depth: number = 0): Promise<void> {
    // Prevent infinite recursion
    if (depth > 10) {
      console.warn('Invokers: Maximum and-then depth reached, stopping execution to prevent infinite recursion');
      return;
    }

    // Re-initialize and-then elements in case new ones were added dynamically
    this.initializeAndThenElements();

    // Find all and-then elements in the invoker's hierarchy
    let current: HTMLElement | null = invokerElement;
    while (current) {
      const andThenElements = Array.from(current.children).filter(
        child => child.tagName.toLowerCase() === 'and-then'
      ) as HTMLElement[];

      for (const andThen of andThenElements) {
        // Skip elements that are not in active state
        if (andThen.getAttribute('data-state') !== 'active' && andThen.getAttribute('data-state') !== null) {
          continue;
        }

        const condition = andThen.getAttribute('data-condition') || 'always';
        if (this.shouldExecuteCondition(condition, executionResult)) {
          await this.executeAndThenCommand(andThen, invokerElement, executionResult, primaryTarget, depth + 1);

          // Handle state transitions
          if (andThen.hasAttribute('data-once')) {
            andThen.remove();
          } else {
            andThen.setAttribute('data-state', 'completed');
          }
        }
      }

      current = current.parentElement;
    }
  }

  /**
   * Executes a command from an and-then element
   */
  private async executeAndThenCommand(
    andThenElement: HTMLElement,
    invokerElement: HTMLButtonElement,
    executionResult: CommandExecutionResult,
    primaryTarget: HTMLElement,
    depth: number = 0
  ): Promise<void> {
    const command = andThenElement.getAttribute('command');
    const targetId = andThenElement.getAttribute('commandfor') || invokerElement.getAttribute('commandfor') || primaryTarget.id;
    const delay = parseInt(andThenElement.getAttribute('data-delay') || '0');

    if (!command) {
      console.warn('Invokers: <and-then> element missing command attribute', andThenElement);
      return;
    }

    // Apply delay if specified
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Find the target element
    const targetElement = targetId ? document.getElementById(targetId) || (targetId === primaryTarget.id ? primaryTarget : null) : null;
    if (!targetElement) {
      console.warn('Invokers: Target element not found for and-then command:', targetId);
      return;
    }

    // Create synthetic invoker for the and-then command
    const syntheticInvoker = document.createElement('button');
    syntheticInvoker.setAttribute('type', 'button');
    const fullCommand = command.startsWith('--') ? command : `--${command}`;
    syntheticInvoker.setAttribute('command', fullCommand);

    if (targetId) {
      syntheticInvoker.setAttribute('commandfor', targetId);
    }

    // Copy data attributes from and-then element to synthetic invoker
    for (const attr of andThenElement.attributes) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-state' && attr.name !== 'data-condition' && attr.name !== 'data-once' && attr.name !== 'data-delay') {
        syntheticInvoker.setAttribute(attr.name, attr.value);
      }
    }

    // Directly execute the command using the InvokerManager instance
    await this.invokerManager.executeCommand(fullCommand, targetId, syntheticInvoker);

    // Process only direct child and-then elements recursively (not all descendants)
    const nestedAndThens = Array.from(andThenElement.children).filter(
      child => child.tagName.toLowerCase() === 'and-then'
    );
    for (const nestedAndThen of nestedAndThens) {
      const nestedElement = nestedAndThen as HTMLElement;
      const nestedCondition = nestedElement.getAttribute('data-condition') || 'always';

      if (this.shouldExecuteCondition(nestedCondition, executionResult)) {
        const nestedCommand = nestedElement.getAttribute('command');
        const nestedTarget = nestedElement.getAttribute('commandfor') || targetId;

        if (nestedCommand && nestedTarget && depth < 10) {
          await this.invokerManager.executeCommand(nestedCommand, nestedTarget, invokerElement);

          // Handle nested state transitions
          if (nestedElement.hasAttribute('data-once')) {
            nestedElement.remove();
          } else {
            nestedElement.setAttribute('data-state', 'completed');
          }
        }
      }
    }
  }

  /**
   * Determines if a condition should execute based on the command execution result
   * @param condition The condition to check (success, error, always)
   * @param result The result of the command execution
   * @returns True if the condition is met, false otherwise
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
        console.warn('Invokers: Unknown condition for and-then element:', condition);
        return false;
    }
  }
}


// --- Initialize and Expose API ---
const invokerInstance = new InvokerManager();

if (typeof window !== "undefined") {
  Object.defineProperty(window, "Invoker", {
    value: {
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
      parseCommandString,
      createCommandString,
      instance: invokerInstance, // Expose the instance for internal use

      // Debugging and development utilities
      get debug() { return isDebugMode; },
      set debug(value: boolean) {
        isDebugMode = value;
        if (value) {
          console.log('Invokers: Debug mode enabled. You will see detailed execution logs.');
        } else {
          console.log('Invokers: Debug mode disabled.');
        }
      },

      // Performance monitoring
      getStats() {
        return invokerInstance['performanceMonitor'].getStats();
      },

      // Development utilities
      getRegisteredCommands() {
        return Array.from(invokerInstance['commands'].keys());
      },

      // Error handling utilities
      validateElement,
      createError: createInvokerError,
      logError: logInvokerError,

      // Reset functionality for development
      reset() {
        invokerInstance['commands'].clear();
        invokerInstance['commandStates'].clear();
        invokerInstance['sortedCommandKeys'] = [];
        console.log('Invokers: Reset complete. All commands and states cleared.');
      }
    },
    configurable: true,
    writable: true,
  });
}

// Automatically register extended command set if available
if (typeof window !== "undefined") {
  try {
    // Try to import and register extended commands
    // import('./invoker-commands').then(({ registerAll }) => {
    //   registerAll();
    // }).catch(() => {
    //   // Extended commands not available, continue with core commands only
    // });
  } catch (e) {
    // Extended commands not available, continue with core commands only
  }
}

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
// src/index.ts
import './polyfill'; // Apply the command polyfill immediately
import { InvokerManager } from './core';

// Global type declarations
declare global {
  interface Window {
    Invoker?: {
      instance?: InvokerManager;
      register?: (name: string, callback: any) => void;
      executeCommand?: (command: string, targetId: string, source?: HTMLElement) => Promise<any>;
      reset?: () => void;
      getRegisteredCommands?: () => string[];
      debug?: boolean;
      [key: string]: any;
    };
  }
}

// Export all types and classes from core that should be public
export * from './core';

// For now, until we properly modularize these functions, we'll provide stub implementations
export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface InvokerError extends Error {
  severity: ErrorSeverity;
  element?: HTMLElement;
  command?: string;
  context?: any;
  recovery?: string;
  cause?: Error;
}

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

export function logInvokerError(error: InvokerError | Error, prefix = 'Invokers'): void {
  const isInvokerError = 'severity' in error;
  const severity = isInvokerError ? (error as InvokerError).severity : ErrorSeverity.ERROR;
  const isDebugMode = typeof window !== 'undefined' && (window as any).Invoker?.debug;

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

export function isInterpolationEnabled(): boolean {
  return InvokerManager._interpolationEnabled;
}

// Command String Utilities (inline for now until moved to utils.ts)
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

export function createCommandString(...parts: string[]): string {
  if (parts.length > 0 && !parts[0].startsWith('--')) {
    parts[0] = `--${parts[0]}`;
  }
  return parts
    .map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:"))
    .join(":");
}

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
export function _dispatchCommandEvent(source: HTMLElement, command: string, _targetElement: HTMLElement, triggeringEvent?: Event): void {
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    console.log('Invokers: _dispatchCommandEvent called with command:', command);
  }

  // Command listener is now handled by InvokerManager

  // Create the CommandEvent with the triggering event attached
  const commandEvent = new (window as any).CommandEvent("command", {
    command,
    source,
    target: _targetElement,
    cancelable: true,
    bubbles: true,
    composed: true,
  });

  // Attach the triggering event for advanced features
  if (triggeringEvent) {
    (commandEvent as any).triggeringEvent = triggeringEvent;
  }

  document.dispatchEvent(commandEvent);
}

// Get the singleton instance
const invokerInstance = InvokerManager.getInstance();

// Command event listener is now handled by InvokerManager.deferListen()

// Setup the global for CDN users and backward compatibility
if (typeof window !== 'undefined') {
  (window as any).Invoker = {
    instance: invokerInstance,
    register: invokerInstance.register.bind(invokerInstance),
    executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
    registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
    unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
    hasPlugin: invokerInstance.hasPlugin.bind(invokerInstance),
    registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
    unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
    getStats: () => (invokerInstance as any).performanceMonitor.getStats(),
    parseCommandString,
    createCommandString,
    reset() {
      // Basic reset functionality
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log('Invokers: Reset complete.');
      }
    }
  };
}

export default invokerInstance;

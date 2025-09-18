/**
 * @file index.ts
 * @version 1.0.0
 * @summary A lightweight, zero-dependency polyfill and superset for the upcoming native HTML Invoker Commands API.
 * @license MIT
 * @author Patrick Glenn
 * @see https://github.com/doeixd/invokers
 * @description
 * This library builds upon the W3C/WHATWG `command` attribute proposal. It provides a
 * robust polyfill for browsers that don't yet support it, and extends it with a powerful
 * set of custom commands (prefixed with `--`) for fetching, DOM manipulation, class toggling, and more.
 *
 * It allows you to write declarative, accessible HTML that is both functional today
 * and forward-compatible with future browser standards. The library listens for the standard
 * `CommandEvent` and only processes custom commands, leaving native commands (like 'show-modal')
 * to the browser or the polyfill's default behavior.
 */

// --- Polyfill Integration ---
// This library assumes a polyfill (like the one in `src/polyfill.ts`) has been loaded.
// The polyfill ensures that `command`/`commandfor` attributes and `globalThis.CommandEvent`
// are available and behave according to the W3C/WHATWG specification.

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
}

/**
 * The function signature for a custom library command's implementation logic.
 * @param context A `CommandContext` object providing tools to manipulate the DOM.
 */
export type CommandCallback = (context: CommandContext) => void;

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
      parseCommandString: typeof parseCommandString;
      createCommandString: typeof createCommandString;
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

// --- The Main Invoker Class ---

/**
 * Manages the registration and execution of all custom `--` prefixed commands.
 * This class listens for the standard `CommandEvent` and routes recognized custom
 * commands to their registered JavaScript handlers.
 */
export class InvokerManager {
  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      this.listen();
    }
  }

  /**
   * Registers a new custom command. All commands must start with `--` to be valid.
   * This method will automatically prepend `--` if it is missing.
   *
   * @param name The unique name of the command (e.g., `'--class'` or `'class'`).
   * @param callback The function to execute for this command.
   */
  public register(name: string, callback: CommandCallback): void {
    if (!name.startsWith('--')) {
      name = `--${name}`;
      console.warn(`Invokers: Custom command "${name.slice(2)}" registered without '--' prefix. Automatically registered as "${name}".`);
    }

    if (this.commands.has(name)) {
      console.warn(`Invokers: Command "${name}" is already registered and will be overwritten.`);
    }
    this.commands.set(name, callback);
    this.sortedCommandKeys = Array.from(this.commands.keys()).sort((a, b) => b.length - a.length);
  }

  /**
   * Handles incoming `CommandEvent`s, filtering for custom commands (`--` prefixed)
   * and executing their corresponding callbacks.
   *
   * @param event The dispatched `CommandEvent`.
   */
  private handleCommand(event: CommandEvent): void {
    const commandStr = event.command;

    if (commandStr.startsWith('--')) {
      this.executeCustomCommand(commandStr, event);
    } else if (!NATIVE_COMMAND_KEYWORDS.has(commandStr) && commandStr !== "") {
      // Backwards Compatibility: Handle old, non-prefixed library commands.
      console.warn(`Invokers (Compatibility): Non-spec-compliant command "${commandStr}" detected. Please update your HTML to use '--${commandStr}' for future compatibility. Attempting to handle...`);
      this.executeCustomCommand(`--${commandStr}`, event);
    }
    // Native commands ('show-modal', etc.) are ignored and handled by the polyfill/browser.
  }

  private executeCustomCommand(commandStr: string, event: CommandEvent): void {
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand) && (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":")) {
        const callback = this.commands.get(registeredCommand);
        if (callback) {
          event.preventDefault(); // Stop default polyfill/browser action
          const params = parseCommandString(commandStr.substring(registeredCommand.length + 1));
          const context = this.createContext(event, commandStr, params);
          callback(context);
        }
        return; // Stop after the first, longest match
      }
    }
  }

  private createContext(event: CommandEvent, fullCommand: string, params: readonly string[]): CommandContext {
    const invoker = event.source as HTMLButtonElement;
    const targetElement = event.target as HTMLElement;

    const getTargets = (): HTMLElement[] => {
      // Prioritize spec-compliant `commandfor` target, which is the event target.
      if (targetElement) return [targetElement];
      
      // Fallback for legacy `aria-controls` and `data-target`
      const controls = invoker.getAttribute("aria-controls")?.trim();
      const selector = controls ? "#" + controls.split(/\s+/).join(", #") : invoker.dataset.target;
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    };

    const updateAriaState = (targets: HTMLElement[]) => {
      const isExpanded = targets.some(t => !t.hidden);
      invoker.setAttribute("aria-expanded", String(isExpanded));
      if (invoker.hasAttribute("aria-pressed")) {
        invoker.setAttribute("aria-pressed", String(isExpanded));
      }
    };
    
    const manageGroupState = () => {
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

    return {
      invoker,
      targetElement,
      fullCommand,
      params,
      getTargets,
      updateAriaState,
      manageGroupState
    };
  }

  /**
   * Attaches the global `command` event listener to the document.
   */
  private listen(): void {
    // Listen in the capturing phase to handle the event before it bubbles.
    document.addEventListener("command", (e) => this.handleCommand(e as CommandEvent), true);
  }

  /**
   * Registers the core library commands, now prefixed with `--`.
   */
  private registerCoreLibraryCommands(): void {
    this.register("--toggle", ({ getTargets, updateAriaState }) => {
      const targets = getTargets();
      if (targets.length === 0) return;
      const updateDOM = () => {
        targets.forEach(target => target.toggleAttribute("hidden"));
        updateAriaState(targets);
      };
      document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
    });

    this.register("--show", ({ getTargets, updateAriaState, manageGroupState }) => {
      const targets = getTargets();
      if (targets.length === 0 || !targets[0].parentElement) return;
      const allSiblings = Array.from(targets[0].parentElement.children);
      const updateDOM = () => {
        manageGroupState();
        allSiblings.forEach(child => child.setAttribute("hidden", ""));
        targets.forEach(target => target.removeAttribute("hidden"));
        updateAriaState(targets);
      };
      document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
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
  }
}

// --- Initialize and Expose API ---
const invokerInstance = new InvokerManager();

if (typeof window !== "undefined") {
  Object.defineProperty(window, "Invoker", {
    value: {
        register: invokerInstance.register.bind(invokerInstance),
        parseCommandString,
        createCommandString,
    },
    configurable: true,
    writable: true,
  });
}

export default invokerInstance;
/**
 * @file invoker.ts
 * @version 0.0.0
 * @summary A type-safe, platform-first library that brings declarative HTML and ARIA attributes to life.
 * @license MIT
 * @author Patrick Glenn
 * @see https://github.com/doeixd/invokers
 */

// --- Command String Utilities ---

/**
 * Parses a command string that uses a colon (`:`) as a delimiter, while respecting
 * the backslash (`\`) as an escape character for colons within arguments. This enables
 * complex command structures directly in HTML.
 *
 * @param commandString The raw string from the `command` attribute.
 * @returns An array of command parts.
 * @example
 * // Basic parsing
 * parseCommandString('class:toggle:is-active');
 * // returns ['class', 'toggle', 'is-active']
 *
 * // Parsing with an escaped colon
 * parseCommandString('class:toggle:md\\:grid-cols-2');
 * // returns ['class', 'toggle', 'md:grid-cols-2']
 */
export function parseCommandString(commandString: string): string[] {
  const parts: string[] = [];
  let currentPart = "";
  let i = 0;
  while (i < commandString.length) {
    const char = commandString[i];
    if (char === "\\") {
      // Escape sequence: add the next character to the current part and skip it.
      currentPart += commandString[i + 1] ?? "";
      i += 2;
    } else if (char === ":") {
      // Delimiter: push the current part and start a new one.
      parts.push(currentPart);
      currentPart = "";
      i++;
    } else {
      // Regular character: add to the current part.
      currentPart += char;
      i++;
    }
  }
  parts.push(currentPart);
  return parts;
}

/**
 * Programmatically creates a valid command string from an array of parts. It automatically
 * escapes any colons or backslashes within the parts to ensure the string can be
 * correctly parsed by `parseCommandString`.
 *
 * @param parts The parts of the command to join.
 * @returns A single, correctly formatted command string.
 * @example
 * // Create a command with a class name that contains a colon
 * createCommandString('class', 'toggle', 'md:grid-cols-2');
 * // returns 'class:toggle:md\\:grid-cols-2'
 */
export function createCommandString(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:"))
    .join(":");
}

// --- Core Type Definitions for Maximum DX ---

/**
 * The context object passed to every command's callback function.
 * It provides a rich, type-safe API for interacting with the invoker and its targets.
 */
export interface CommandContext {
  /** The `<button>` element that was invoked. */
  readonly invoker: HTMLButtonElement;
  /** The element that received the command event (often the invoker or a parent). */
  readonly targetElement: HTMLElement;
  /**
   * An array of string parameters that follow the matched command prefix.
   * For a `command="class:toggle:is-active"` and a registered command named `class`,
   * the `params` array will be `['toggle', 'is-active']`.
   */
  readonly params: readonly string[];
  /**
   * Retrieves the target elements controlled by the invoker.
   * Prioritizes the `aria-controls` attribute for accessibility, falling back to `data-target`.
   * @returns An array of `HTMLElement`s. An empty array is returned if no targets are found.
   */
  getTargets: () => HTMLElement[];
  /**
   * Automatically updates the invoker's `aria-expanded` and `aria-pressed` attributes
   * based on the visibility state of its targets.
   * @param targets The target elements whose state determines the ARIA update.
   */
  updateAriaState: (targets: HTMLElement[]) => void;
  /**
   * Manages the active state for a group of related invokers (e.g., in a tab group).
   * Deactivates other invokers within the same widget group when a new one is activated.
   */
  manageGroupState: () => void;
}

/**
 * The function signature for a command's implementation logic.
 * @param context A `CommandContext` object providing tools to manipulate the DOM.
 */
export type CommandCallback = (context: CommandContext) => void;

// --- Global Type Augmentations for Seamless Platform Integration ---

/**
 * We must inform TypeScript about the custom `CommandEvent` to handle it safely.
 */
interface CommandEvent extends Event {
  readonly command: string;
  readonly invokerElement: HTMLButtonElement;
}

/**
 * The InvokerAction interface, part of the nascent Invokers API proposal.
 */
interface InvokerAction {
  action: () => void;
  behavior?: "auto" | "toggle";
  type?: "button" | "reset" | "submit";
}

declare global {
  /**
   * Add the `command` event to the global event map for elements.
   * This enables type-safe `addEventListener('command', ...)`.
   */
  interface HTMLElementEventMap {
    command: CommandEvent;
  }
  /**
   * Augment HTMLElement with the proposed `invokers` property for better type alignment
   * with future platform APIs.
   */
  interface HTMLElement {
    invokers: {
      add: (invoker: InvokerAction) => void;
      remove: (invoker: InvokerAction) => void;
    };
  }
  interface Window {
    /** The global API for the Invoker.js library. */
    Invoker: {
      /**
       * Registers a new custom command with the library.
       * @param name The unique name of the command. Can be a prefix for namespaced commands.
       * @param callback The function to execute when the command is invoked.
       * @example
       * Invoker.register('console:log', ({ invoker, params }) => {
       *   console.log('Button clicked:', invoker);
       *   console.log('Message:', params[0]); // For command="console:log:Hello World"
       * });
       */
      register: (name: string, callback: CommandCallback) => void;
      /**
       * A utility to parse a command string with escaped delimiters.
       * @see parseCommandString
       */
      parseCommandString: typeof parseCommandString;
      /**
       * A utility to programmatically create a valid command string.
       * @see createCommandString
       */
      createCommandString: typeof createCommandString;
    };
  }
}

// --- The Main Invoker Class (Singleton Pattern) ---

/**
 * Manages the registration and execution of all declarative commands.
 * This class is instantiated once and handles all events globally.
 */
export class InvokerManager {
  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];

  constructor() {
    // Gracefully handle non-browser environments (e.g., SSR).
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreCommands();
      this.listen();
    }
  }

  /**
   * Registers a new command, making it available for use in HTML. Commands are matched
   * using a longest-prefix algorithm, allowing for namespaced command registration.
   * For example, registering `class` will handle commands like `class:toggle:is-active`.
   *
   * @param name The unique name of the command.
   * @param callback The function to execute for this command.
   */
  public register(name: string, callback: CommandCallback): void {
    if (this.commands.has(name)) {
      console.warn(
        `Invokers: Command "${name}" is already registered and will be overwritten.`,
      );
    }
    this.commands.set(name, callback);
    // Pre-sort keys by length (desc) to ensure longest-prefix matching.
    this.sortedCommandKeys = Array.from(this.commands.keys()).sort(
      (a, b) => b.length - a.length,
    );
  }

  /**
   * Handles the incoming 'command' event, finds the appropriate registered
   * command callback, and executes it with a constructed context.
   * @param event The dispatched CommandEvent.
   */
  private handleCommand(event: CommandEvent): void {
    const commandStr = event.command;

    // Find the longest registered command that is a prefix of the invoked command.
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand)) {
        // Ensure it's a full match or is followed by a delimiter to avoid partial matches
        // (e.g., 'show' matching 'showcase' incorrectly).
        if (
          commandStr.length === registeredCommand.length ||
          commandStr[registeredCommand.length] === ":"
        ) {
          const callback = this.commands.get(registeredCommand);
          if (callback) {
            // Parse the rest of the string into parameters.
            const paramsStr = commandStr.substring(
              registeredCommand.length + 1,
            );
            const params = paramsStr ? parseCommandString(paramsStr) : [];
            callback(this.createContext(event, params));
          }
          // Stop after the first, longest match is found and executed.
          return;
        }
      }
    }
  }

  /**
   * Creates the CommandContext object for a given command event.
   * @param event The CommandEvent from the DOM.
   * @param params The parsed parameters for the specific command invocation.
   * @returns A fully populated CommandContext object.
   */
  private createContext(
    event: CommandEvent,
    params: readonly string[],
  ): CommandContext {
    const invoker = event.invokerElement;

    const getTargetsInternal = (element: HTMLElement): HTMLElement[] => {
      const controls = element.getAttribute("aria-controls")?.trim();
      const selector = controls
        ? "#" + controls.split(/\s+/).join(", #")
        : element.dataset.target;
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    };

    return {
      invoker,
      targetElement: event.target as HTMLElement,
      params,
      getTargets: () => getTargetsInternal(invoker),
      updateAriaState: (targets) => {
        const isExpanded = targets.some((t) => !t.hasAttribute("hidden"));
        invoker.setAttribute("aria-expanded", String(isExpanded));
        if (invoker.hasAttribute("aria-pressed")) {
          invoker.setAttribute("aria-pressed", String(isExpanded));
        }
      },
      manageGroupState: () => {
        const targets = getTargetsInternal(invoker);
        if (targets.length === 0 || !targets[0].parentElement) return;

        const container = targets[0].parentElement;
        const allTargetIDs = new Set(
          Array.from(container.children)
            .map((t) => t.id)
            .filter(Boolean),
        );

        const invokersInGroup = Array.from(
          document.querySelectorAll<HTMLButtonElement>("[aria-controls]"),
        ).filter((btn) => {
          const controlledIds =
            btn.getAttribute("aria-controls")?.split(/\s+/) ?? [];
          return controlledIds.some((id) => allTargetIDs.has(id));
        });

        invokersInGroup.forEach((otherInvoker) => {
          if (otherInvoker !== invoker) {
            otherInvoker.setAttribute("aria-expanded", "false");
            if (otherInvoker.hasAttribute("aria-pressed")) {
              otherInvoker.setAttribute("aria-pressed", "false");
            }
          }
        });
      },
    };
  }

  /** Attaches the global command listener to the document. */
  private listen(): void {
    document.addEventListener("command", (e) =>
      this.handleCommand(e as CommandEvent),
    );
  }

  /** Registers the set of built-in commands provided by the library. */
  private registerCoreCommands(): void {
    /**
     * Toggles the `hidden` attribute on target element(s).
     * Ideal for simple accordions, dropdowns, and menus.
     * @example
     * ```html
     * <button command="toggle" aria-controls="menu" aria-expanded="false">Menu</button>
     * <div id="menu" hidden>...</div>
     * ```
     */
    this.register("toggle", (context) => {
      const targets = context.getTargets();
      if (targets.length === 0) return;

      const updateDOM = () => {
        targets.forEach((target) => target.toggleAttribute("hidden"));
        context.updateAriaState(targets);
      };

      document.startViewTransition
        ? document.startViewTransition(updateDOM)
        : updateDOM();
    });

    /**
     * Shows target element(s) while hiding their siblings within the same parent.
     * Automatically manages `aria-expanded` state for all related invokers in the group.
     * Ideal for tab panels.
     * @example
     * ```html
     * <div role="tablist">
     *   <button command="show" aria-controls="panel-1" aria-expanded="true">Tab 1</button>
     *   <button command="show" aria-controls="panel-2" aria-expanded="false">Tab 2</button>
     * </div>
     * <div>
     *   <div id="panel-1">...</div>
     *   <div id="panel-2" hidden>...</div>
     * </div>
     * ```
     */
    this.register("show", (context) => {
      const targetsToShow = context.getTargets();
      if (targetsToShow.length === 0 || !targetsToShow[0].parentElement) return;

      const container = targetsToShow[0].parentElement;
      const allTargetsInContainer = Array.from(container.children);

      const updateDOM = () => {
        context.manageGroupState();
        allTargetsInContainer.forEach((child) =>
          child.setAttribute("hidden", ""),
        );
        targetsToShow.forEach((target) => target.removeAttribute("hidden"));
        context.updateAriaState(targetsToShow);
      };

      document.startViewTransition
        ? document.startViewTransition(updateDOM)
        : updateDOM();
    });

    /**
     * Explicitly hides the target element(s) by setting the `hidden` attribute.
     * Ideal for close buttons on modals, dialogs, or popovers.
     * @example
     * ```html
     * <div id="modal">
     *   <p>This is a modal.</p>
     *   <button command="hide" aria-controls="modal">Close</button>
     * </div>
     * ```
     */
    this.register("hide", (context) => {
      const targets = context.getTargets();
      if (targets.length === 0) return;
      targets.forEach((target) => target.setAttribute("hidden", ""));
      context.updateAriaState(targets);
    });

    /**
     * Manipulates CSS classes on target elements based on sub-commands.
     * The command follows the pattern `class:<action>:<className>`.
     * The `<action>` can be `add`, `remove`, or `toggle`.
     *
     * @example
     * ```html
     * <!-- Toggle a class on the target element -->
     * <button command="class:toggle:is-active" data-target="#el">Toggle Active</button>
     *
     * <!-- Add a class -->
     * <button command="class:add:is-visible" data-target="#el">Show</button>
     *
     * <!-- Remove a class -->
     * <button command="class:remove:is-visible" data-target="#el">Hide</button>
     *
     * <!-- Handle class names with colons (e.g., Tailwind CSS) by escaping them -->
     * <button command="class:toggle:md\\:grid-cols-2" data-target="#grid">
     *   Toggle Grid Layout
     * </button>
     *
     * <div id="el">Target Element</div>
     * ```
     */
    this.register("class", (context) => {
      const [action, className] = context.params;
      const targets = context.getTargets();

      if (!action || !className || targets.length === 0) {
        console.warn(
          'Invokers: `class` command requires an action and a class name (e.g., "class:toggle:my-class").',
          context.invoker,
        );
        return;
      }

      targets.forEach((target) => {
        switch (action) {
          case "add":
            target.classList.add(className);
            break;
          case "remove":
            target.classList.remove(className);
            break;
          case "toggle":
            target.classList.toggle(className);
            break;
          default:
            console.warn(
              `Invokers: Unknown action "${action}" for 'class' command.`,
            );
        }
      });
    });
  }
}

// --- Initialize and Expose API ---

const invokerInstance = new InvokerManager();

// Make API available on the window for script tag usage.
if (typeof window !== "undefined") {
  window.Invoker = {
    register: invokerInstance.register.bind(invokerInstance),
    parseCommandString,
    createCommandString,
  };
}

// Default export for ES Module usage.
export default invokerInstance;


// export * as commands from  "./invoker-commands";
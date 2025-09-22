/**
 * @file polyfill.ts
 * @summary A high-fidelity polyfill for the W3C/WHATWG HTML Invoker Buttons proposal.
 * @license MIT (Assumed from project context)
 * @author Keith Cirkel, Luke Warlow (original authors of explainer/polyfill)
 * @description This code implements the proposed `command` and `commandfor` attributes for HTMLButtonElement
 *              and the `CommandEvent` interface, allowing declarative UI interactions in browsers
 *              that do not yet natively support these features.
 *              It includes handling for popovers and dialogs, and a mechanism for custom commands.
 */

export function isSupported() {
  return (
    typeof HTMLButtonElement !== "undefined" &&
    "command" in HTMLButtonElement.prototype &&
    // @ts-ignore
    "source" in ((globalThis!.CommandEvent || {}).prototype || {})
  );
}

// NOTE: The `isPolyfilled` function from the original polyfill code will not be exported
// directly from invokers itself, but its logic is relevant to understanding when to apply.
// For `invokers`, we will always apply the polyfill to ensure a consistent environment
// and to guarantee the `CommandEvent` and attributes are present, even if native support exists.

function enumerate(obj: object, key: PropertyKey, enumerable: boolean = true) {
  Object.defineProperty(obj, key, {
    ...Object.getOwnPropertyDescriptor(obj, key),
    enumerable,
  });
}

function getRootNode(node: Node): Node {
  if (node && typeof node.getRootNode === "function") {
    return node.getRootNode();
  }
  // Fallback for older environments or unusual node types
  if (node && node.parentNode) return getRootNode(node.parentNode);
  return node;
}

const commandEventSourceElements = new WeakMap<Event, Element | null>();
const commandEventActions = new WeakMap<Event, string>();

/**
 * Represents a declarative `command` event dispatched from an invoker button to its target.
 * This class mirrors the proposed W3C/WHATWG `CommandEvent` interface.
 */
declare global {
  interface CommandEventInit extends EventInit {
    command?: string;
    source?: Element;
  }
  interface CommandEvent extends Event {
    readonly command: string;
    readonly source: HTMLButtonElement | null;
  }
}

class CommandEventPolyfill extends Event {
  constructor(type: string, invokeEventInit: CommandEventInit = {}) {
    super(type, invokeEventInit);
    const { source, command } = invokeEventInit;
    if (source != null && !(source instanceof Element)) {
      throw new TypeError(`source must be an element`);
    }
    commandEventSourceElements.set(this, source || null);
    commandEventActions.set(
      this,
      command !== undefined ? String(command) : "",
    );
  }

  get [Symbol.toStringTag]() {
    return "CommandEvent";
  }

  /**
   * The element (usually a <button>) that initiated the command.
   * If the event's target is in a different root (e.g., Shadow DOM),
   * this will return the host of the invoker's root.
   */
  get source(): Element | null {
    if (!commandEventSourceElements.has(this)) {
      throw new TypeError("illegal invocation");
    }
    const source = commandEventSourceElements.get(this);
    if (!(source instanceof Element)) return null;
    const invokerRoot = getRootNode(source);
    // Ensure the source element is within the same document or shadow root context
    if (invokerRoot !== getRootNode(this.target as Node || document)) {
      // If cross-root, return the shadow host for encapsulation
      return invokerRoot instanceof ShadowRoot ? invokerRoot.host : null;
    }
    return source;
  }

  /**
   * The command string that was invoked (e.g., "show-modal", "--my-custom-command").
   */
  get command(): string {
    if (!commandEventActions.has(this)) {
      throw new TypeError("illegal invocation");
    }
    return commandEventActions.get(this) || "";
  }

  // Deprecated properties for compatibility with older proposals
  get action(): never {
    throw new Error(
      "CommandEvent#action was renamed to CommandEvent#command",
    );
  }

  get invoker(): never {
    throw new Error(
      "CommandEvent#invoker was renamed to CommandEvent#source",
    );
  }
}
enumerate(CommandEventPolyfill.prototype, "source");
enumerate(CommandEventPolyfill.prototype, "command");

// Deprecated InvokeEvent for compatibility
class InvokeEventPolyfill extends Event {
  constructor(type: string, invokeEventInit: EventInit = {}) {
    super(type, invokeEventInit);
    throw new Error(
      "InvokeEvent has been deprecated, it has been renamed to `CommandEvent`",
    );
  }
}



const invokerAssociatedElements = new WeakMap<HTMLElement, Element>();

/**
 * Mixin to apply `commandforElement` and `command` properties to `HTMLButtonElement`.
 * This extends the `HTMLButtonElement` prototype to include the declarative command API.
 * @param ElementClass The HTML element class to extend (e.g., HTMLButtonElement).
 */
function applyInvokerMixin(ElementClass: typeof HTMLElement) {
  Object.defineProperties(ElementClass.prototype, {
    /**
     * Imperatively sets or gets the element controlled by the button.
     * Reflects the `commandfor` attribute.
     */
    commandForElement: {
      enumerable: true,
      configurable: true,
      set(targetElement: Element | null) {
        // Handle deprecated attributes for warnings
        if (this.hasAttribute("invokeaction")) {
          throw new TypeError(
            "Element has deprecated `invokeaction` attribute, replace with `command`",
          );
        } else if (this.hasAttribute("invoketarget")) {
          throw new TypeError(
            "Element has deprecated `invoketarget` attribute, replace with `commandfor`",
          );
        } else if (targetElement === null) {
          // If null, remove the attribute and clear associated element
          this.removeAttribute("commandfor");
          invokerAssociatedElements.delete(this);
        } else if (!(targetElement instanceof Element)) {
          // Ensure valid element type
          throw new TypeError(`commandForElement must be an element or null`);
        } else {
          // Set attribute (value is irrelevant for IDREF, just presence)
          this.setAttribute("commandfor", targetElement.id || ""); // Use ID if available
          const targetRootNode = getRootNode(targetElement);
          const thisRootNode = getRootNode(this);
          // Only associate if in the same document/root, or owner document
          if (
            thisRootNode === targetRootNode ||
            targetRootNode === this.ownerDocument
          ) {
            invokerAssociatedElements.set(this, targetElement);
          } else {
            invokerAssociatedElements.delete(this); // Remove if cross-root
          }
        }
      },
      get(): Element | null {
        // Only buttons support commandfor
        if (this.localName !== "button") {
          return null;
        }
        // Warn for deprecated attributes
        if (
          this.hasAttribute("invokeaction") ||
          this.hasAttribute("invoketarget")
        ) {
          console.warn(
            "Element has deprecated `invoketarget` or `invokeaction` attribute, use `commandfor` and `command` instead",
          );
          return null;
        }
        // Disabled buttons don't invoke
        if (this.disabled) {
          return null;
        }
        // Buttons in forms must be type="button" to use commandfor
        if (this.form && this.getAttribute("type") !== "button") {
          console.warn(
            "Element with `commandfor` is a form participant. " +
              "It should explicitly set `type=button` in order for `commandfor` to work",
          );
          return null;
        }
        // First, check imperatively set element
        const targetElement = invokerAssociatedElements.get(this);
        if (targetElement) {
          if (targetElement.isConnected) {
            return targetElement;
          } else {
            invokerAssociatedElements.delete(this); // Clean up disconnected elements
            return null;
          }
        }
        // Fallback to IDREF lookup if not imperatively set
        const root = getRootNode(this);
        const idref = this.getAttribute("commandfor");
        if (
          (root instanceof Document || root instanceof ShadowRoot) &&
          idref
        ) {
          return root.getElementById(idref) || null;
        }
        return null;
      },
    },
    /**
     * Gets or sets the command string.
     * Handles normalization for built-in commands and enforces `--` prefix for custom commands.
     */
    command: {
      enumerable: true,
      configurable: true,
      get(): string {
        const value = this.getAttribute("command") || "";
        // Custom commands always return their raw value (starting with --)
        if (value.startsWith("--")) return value;
        // Built-in commands are normalized to lowercase
        const valueLower = value.toLowerCase();
        switch (valueLower) {
          // Core commands (already implemented)
          case "show-modal":
          case "close":
          case "request-close":
          case "toggle-popover":
          case "hide-popover":
          case "show-popover":
          
          // Future commands - Openable elements
          case "toggle-openable":
          case "close-openable":
          case "open-openable":
          
          // Details elements
          case "toggle":
          case "open":
          
          // Picker elements
          case "show-picker":
          
          // Media elements
          case "play-pause":
          case "pause":
          case "play":
          case "toggle-muted":
          
          // Fullscreen elements
          case "toggle-fullscreen":
          case "request-fullscreen":
          case "exit-fullscreen":
          
          // Clipboard and sharing
          case "copy-text":
          case "share":
          
          // Number input elements
          case "step-up":
          case "step-down":
            return valueLower;
        }
        return ""; // Invalid command if not built-in or custom
      },
      set(value: string) {
        this.setAttribute("command", value);
      },
    },

    // Deprecated properties for compatibility with older proposals
    invokeAction: {
      enumerable: false,
      configurable: true,
      get(): never {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`,
        );
      },
      set(_value: string): never {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`,
        );
      },
    },

    invokeTargetElement: {
      enumerable: false,
      configurable: true,
      get(): never {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`,
        );
      },
      set(_value: Element | null): never {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`,
        );
      },
    },
  });
}

const onHandlers = new WeakMap<HTMLElement, EventListenerOrEventListenerObject>();

// Extend HTMLElement to include the oncommand property for TypeScript
declare global {
  interface HTMLElement {
    oncommand: EventListenerOrEventListenerObject | null;
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
  interface HTMLButtonElement {
    /**
     * Gets or sets the command string for the button.
     */
    command: string;
    /**
     * Gets or sets the element controlled by the button.
     */
    commandForElement: Element | null;
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
  interface HTMLAnchorElement {
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
  interface HTMLAreaElement {
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
}

/**
 * Extends `HTMLElement.prototype` to include `oncommand` event handler.
 */
Object.defineProperties(HTMLElement.prototype, {
  oncommand: {
    enumerable: true,
    configurable: true,
    get(): EventListenerOrEventListenerObject | null {
      oncommandObserver.takeRecords(); // Ensure up-to-date state
      return onHandlers.get(this) || null;
    },
    set(handler: EventListenerOrEventListenerObject | null) {
      const existing = onHandlers.get(this) || null;
      if (existing) {
        this.removeEventListener("command", existing);
      }
      if (typeof handler === "object" || typeof handler === "function") {
        if (handler !== null) {
          onHandlers.set(this, handler);
        } else {
          onHandlers.delete(this);
        }
      } else {
        onHandlers.delete(this);
      }
      if (typeof handler == "function") {
        this.addEventListener("command", handler);
      }
    },
  },
});

/**
 * Applies `oncommand` attribute values as event handlers.
 * @param els An iterable of elements to apply handlers to.
 */
function applyOnCommandHandler(els: Iterable<Element>) {
  for (const el of els) {
    if (typeof Element !== "undefined" && !(el instanceof Element)) continue; // Skip if not an Element
    const oncommandAttr = el.getAttribute("oncommand");
    if (oncommandAttr !== null && (el as any).oncommand !== null) { // Only set if not already set by JS
        try {
            // eslint-disable-next-line no-new-func
            (el as any).oncommand = new Function("event", oncommandAttr) as EventListener;
        } catch (e) {
            console.error(`Invokers Polyfill: Error parsing oncommand attribute for element:`, el, e);
        }
    }
  }
}

/** MutationObserver to watch for new `oncommand` attributes or elements. */
const oncommandObserver = new MutationObserver((records) => {
  for (const record of records) {
    const { target } = record;
    if (record.type === "childList") {
      if (typeof Element !== "undefined" && target instanceof Element) {
        applyOnCommandHandler(Array.from(target.querySelectorAll("[oncommand]")));
      } else if (target && typeof (target as any).querySelectorAll === "function") {
        applyOnCommandHandler(Array.from((target as Element).querySelectorAll("[oncommand]")));
      }
    } else { // attributeChanged
      if (target instanceof HTMLElement && target.hasAttribute("oncommand")) {
        applyOnCommandHandler([target]);
      } else if (target instanceof HTMLElement) { // attribute removed
        target.oncommand = null; // Clear handler if attribute removed
      }
    }
  }
});

/**
 * Handles the activation of an invoker button, dispatches `CommandEvent`,
 * and performs default actions for built-in commands.
 * @param event The click event that triggered the activation.
 */
function handleInvokerActivation(event: MouseEvent | KeyboardEvent) {
  // Respect defaultPrevented (e.g., if another handler already stopped it)
  if (event.defaultPrevented) return;
  // Only process click events (or key events, if extending)
  if (event.type !== "click") return;

  // Check for deprecated attributes and warn
  const oldInvoker = (event.target as HTMLElement).closest(
    "button[invoketarget], button[invokeaction], input[invoketarget], input[invokeaction]",
  );
  if (oldInvoker) {
    console.warn(
      "Invokers Polyfill: Elements with `invoketarget` or `invokeaction` are deprecated and should be renamed to use `commandfor` and `command` respectively",
    );
    if (oldInvoker.matches("input")) {
      throw new Error("Input elements no longer support `commandfor`");
    }
  }

  // Find the actual invoker button
  const source = (event.target as HTMLElement).closest<HTMLButtonElement>("button[commandfor][command]");
  if (!source) return; // Not an invoker button

  // Validate button type and attributes for forms
  if (source.form && source.getAttribute("type") !== "button") {
    event.preventDefault(); // Prevent form submission
    console.error( // Use console.error as this is an invalid setup
      "Invokers Polyfill: Element with `commandfor` is a form participant. " +
        "It should explicitly set `type=button` in order for `commandfor` to work. " +
        "To act as a Submit/Reset button, it must not have command or commandfor attributes.",
        source
    );
    return;
  }

  // The `command` and `commandfor` attributes must both be present
  if (source.hasAttribute("command") !== source.hasAttribute("commandfor")) {
    const attr = source.hasAttribute("command") ? "command" : "commandfor";
    const missing = source.hasAttribute("command") ? "commandfor" : "command";
    console.error( // Use console.error as this is an invalid setup
      `Invokers Polyfill: Element with ${attr} attribute must also have a ${missing} attribute to function.`,
      source
    );
    return;
  }

  // Validate command value based on spec
  // Note: source.command getter already normalizes built-in values and validates `--` prefix
  if (source.command === "") {
    console.warn(
      `Invokers Polyfill: "${source.getAttribute("command")}" is not a valid command value for element:`,
      source,
      `Custom commands must begin with --`
    );
    return;
  }

  const invokee = source.commandForElement;
  if (!invokee) {
    console.warn("Invokers Polyfill: commandfor target not found for invoker:", source);
    return;
  }

  // 1. Dispatch the CommandEvent
  const commandEvent = new CommandEventPolyfill("command", {
    command: source.command,
    source,
    cancelable: true,
    bubbles: true, // Should bubble to be caught by document listeners
    composed: true, // Allow crossing shadow boundaries
  });
  invokee.dispatchEvent(commandEvent);

  // If the event was prevented, stop default behavior
  if (commandEvent.defaultPrevented) return;

  // 2. Perform default actions for built-in commands
  const command = commandEvent.command.toLowerCase(); // Use the normalized command from the event

  // Handle popover commands
  if (invokee.matches('[popover]')) {
    const isPopoverOpen = invokee.matches(":popover-open");
    if (command === "toggle-popover") {
        (invokee as HTMLElement & { showPopover?: (options?: any) => void; hidePopover?: (options?: any) => void; })[isPopoverOpen ? 'hidePopover' : 'showPopover']?.({ source });
    } else if (command === "hide-popover" && isPopoverOpen) {
        (invokee as HTMLElement & { hidePopover: Function }).hidePopover();
    } else if (command === "show-popover" && !isPopoverOpen) {
        (invokee as HTMLElement & { showPopover?: (options?: any) => void }).showPopover?.({ source });
    }
  }
  
  // Handle dialog commands
  if (invokee.localName === "dialog") {
    const isDialogOpen = invokee.hasAttribute("open");
    if (command === "show-modal" && !isDialogOpen) {
        (invokee as HTMLDialogElement).showModal();
    } else if (command === "close" && isDialogOpen) {
        (invokee as HTMLDialogElement).close(source.value);
    } else if (command === "request-close" && isDialogOpen) {
        const cancelEvent = new Event('cancel', { cancelable: true });
        invokee.dispatchEvent(cancelEvent);
        if (!cancelEvent.defaultPrevented) {
             (invokee as HTMLDialogElement).close(source.value);
        }
    }
  }
  
  // Handle details commands
  if (invokee.localName === "details") {
    const isOpen = (invokee as HTMLDetailsElement).open;
    if (command === "toggle") {
      (invokee as HTMLDetailsElement).open = !isOpen;
    } else if (command === "open" && !isOpen) {
      (invokee as HTMLDetailsElement).open = true;
    } else if (command === "close" && isOpen) {
      (invokee as HTMLDetailsElement).open = false;
    }
  }
  
  // Handle openable elements (elements with toggleOpenable method)
  if (command.includes("openable") && typeof (invokee as any).toggleOpenable === "function") {
    if (command === "toggle-openable") {
      (invokee as any).toggleOpenable();
    } else if (command === "open-openable") {
      (invokee as any).openOpenable?.();
    } else if (command === "close-openable") {
      (invokee as any).closeOpenable?.();
    }
  }
  
  // Handle picker commands for select and input elements
  if ((invokee.localName === "select" || invokee.localName === "input") && command === "show-picker") {
    try {
      if (typeof (invokee as any).showPicker === "function") {
        // Check if we're in a secure context and have user activation
        if (document.hasFocus() && source.ownerDocument.hasFocus()) {
          (invokee as any).showPicker();
        }
      }
    } catch (e) {
      // showPicker can throw for various security reasons, fail silently
      console.warn("Invokers: showPicker failed:", e);
    }
  }
  
  // Handle media element commands
  if (invokee.localName === "video" || invokee.localName === "audio") {
    const media = invokee as HTMLMediaElement;
    if (command === "play-pause") {
      if (media.paused) {
        media.play().catch(() => {
          // Autoplay policy might prevent play, fail silently
        });
      } else {
        media.pause();
      }
    } else if (command === "play" && media.paused) {
      media.play().catch(() => {
        // Autoplay policy might prevent play, fail silently
      });
    } else if (command === "pause" && !media.paused) {
      media.pause();
    } else if (command === "toggle-muted") {
      media.muted = !media.muted;
    }
  }
  
  // Handle fullscreen commands
  if (command.includes("fullscreen")) {
    try {
      if (command === "toggle-fullscreen") {
        if (document.fullscreenElement === invokee) {
          document.exitFullscreen();
        } else {
          (invokee as any).requestFullscreen?.();
        }
      } else if (command === "request-fullscreen" && document.fullscreenElement !== invokee) {
        (invokee as any).requestFullscreen?.();
      } else if (command === "exit-fullscreen" && document.fullscreenElement === invokee) {
        document.exitFullscreen();
      }
    } catch (e) {
      // Fullscreen operations can fail for various reasons
      console.warn("Invokers: Fullscreen operation failed:", e);
    }
  }
  
  // Handle clipboard and sharing commands
  if (command === "copy-text") {
    try {
      let textToCopy = "";
      if (invokee === source) {
        // Self-referencing: use value attribute if available
        textToCopy = (source as any).value || source.textContent || "";
      } else {
        textToCopy = invokee.textContent || "";
      }
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy.trim());
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy.trim();
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (e) {
      console.warn("Invokers: Copy operation failed:", e);
    }
  }
  
  if (command === "share") {
    try {
      let textToShare = "";
      if (invokee === source) {
        textToShare = (source as any).value || source.textContent || "";
      } else {
        textToShare = invokee.textContent || "";
      }
      
      if (navigator.share) {
        // Check if the text looks like a URL
        const trimmedText = textToShare.trim();
        if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://')) {
          navigator.share({ url: trimmedText });
        } else {
          navigator.share({ text: trimmedText });
        }
      }
    } catch (e) {
      console.warn("Invokers: Share operation failed:", e);
    }
  }
  
  // Handle number input step commands
  if (invokee.localName === "input" && (invokee as HTMLInputElement).type === "number") {
    const input = invokee as HTMLInputElement;
    try {
      if (command === "step-up") {
        input.stepUp();
      } else if (command === "step-down") {
        input.stepDown();
      }
    } catch (e) {
      console.warn("Invokers: Step operation failed:", e);
    }
  }
}

/**
 * Sets up global click listener for invoker buttons.
 * @param target The DOM node to attach the listener to (e.g., `document` or a ShadowRoot).
 */
function setupInvokeListeners(target: Node) {
  target.addEventListener("click", handleInvokerActivation as EventListener, true); // Use capturing to catch first
}

/**
 * Observes newly attached Shadow DOM roots to apply listeners and `oncommand` handlers.
 * @param ElementClass The base class (e.g., `HTMLElement`) to observe shadow roots for.
 * @param callback The function to call with the new ShadowRoot.
 */
function observeShadowRoots(ElementClass: typeof HTMLElement, callback: (shadowRoot: ShadowRoot) => void) {
  // Patch attachShadow
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function (init: ShadowRootInit) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
  // Patch attachInternals for declarative custom elements
  const attachInternals = ElementClass.prototype.attachInternals;
  ElementClass.prototype.attachInternals = function (this: Element) { // Use 'this' context
    const internals = attachInternals.call(this);
    if (internals.shadowRoot) callback(internals.shadowRoot);
    return internals;
  };
}

/**
 * Applies the Invoker Buttons polyfill to the current environment.
 * This should be called once to enable the `command`/`commandfor` attributes and `CommandEvent`.
 */
export function apply() {
  // Ensure the polyfill is only applied once
  if ((globalThis as any).CommandEvent === CommandEventPolyfill) {
      return; // Already applied
  }

  // Hijack native 'invoke' and 'command' events if they exist,
  // to prevent conflicts and ensure our polyfilled event is the one processed.
  // This is a crucial step if browsers partially implement or change behavior.
  document.addEventListener(
    "invoke",
    (e) => {
      if (e.type === "invoke" && e.isTrusted) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
  document.addEventListener(
    "command",
    (e) => {
      // Only prevent if it's a native/trusted command event
      if (e.type === "command" && e.isTrusted && !e.defaultPrevented && e.eventPhase === Event.AT_TARGET) {
         // Check if a CommandEvent, not just a generic custom event type "command"
         // This is a tricky part: we want to block native CommandEvents if they exist,
         // but allow our own polyfilled CommandEvents to proceed.
         // A heuristic could be `e instanceof CommandEventPolyfill` but that might not work
         // if `globalThis.CommandEvent` is already the native one.
         // For now, if native is supported, our polyfill will largely step aside anyway.
         // This listener is primarily for older `invoke` event issues and preventing double-firing
         // in environments where CommandEvent is partially or inconsistently implemented.
         // For a full polyfill, we'd ensure `isSupported()` is false before applying.
         // Given `invokers` wants a consistent environment, we always apply.
         // For now, let's assume if it's a trusted 'command' event from another source, we block.
         // The `invokers` library will then dispatch its own `CommandEventPolyfill` which won't be blocked here.
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );

  // Apply the `command` and `commandfor` properties to HTMLButtonElement
  applyInvokerMixin(HTMLButtonElement);

  // Observe newly attached Shadow DOM roots
  observeShadowRoots(HTMLElement, (shadow) => {
    setupInvokeListeners(shadow);
    oncommandObserver.observe(shadow, { subtree: true, childList: true, attributeFilter: ["oncommand"] });
    applyOnCommandHandler(Array.from(shadow.querySelectorAll("[oncommand]")));
  });

  // Set up listeners for the main document
  setupInvokeListeners(document);

  // Initial scan for `oncommand` attributes
  oncommandObserver.observe(document, {
    subtree: true,
    childList: true,
    attributeFilter: ["oncommand"],
  });
  applyOnCommandHandler(Array.from(document.querySelectorAll("[oncommand]")));


  // Expose the polyfilled CommandEvent globally if not already defined
  if (typeof (globalThis as any)['CommandEvent'] === 'undefined') {
    Object.defineProperty(globalThis, "CommandEvent", {
        value: CommandEventPolyfill,
        configurable: true,
        writable: true,
        enumerable: false,
    });
  } else {
      console.warn("Invokers Polyfill: `globalThis.CommandEvent` already exists. The polyfill's CommandEvent will not overwrite it.");
  }
  // Expose InvokeEvent globally (for deprecation warnings)
  if (typeof (globalThis as any)['InvokeEvent'] === 'undefined') {
      Object.defineProperty(globalThis, "InvokeEvent", {
          value: InvokeEventPolyfill,
          configurable: true,
          writable: true,
          enumerable: false,
      });
  }
}

// Automatically apply the polyfill when this module is imported.
// This ensures that the global CommandEvent and attribute setters are ready
// before InvokerManager tries to use them.
apply();
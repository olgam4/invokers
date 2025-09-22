// src/polyfill.ts
function enumerate(obj, key, enumerable = true) {
  Object.defineProperty(obj, key, {
    ...Object.getOwnPropertyDescriptor(obj, key),
    enumerable
  });
}
function getRootNode(node) {
  if (node && typeof node.getRootNode === "function") {
    return node.getRootNode();
  }
  if (node && node.parentNode) return getRootNode(node.parentNode);
  return node;
}
var commandEventSourceElements = /* @__PURE__ */ new WeakMap();
var commandEventActions = /* @__PURE__ */ new WeakMap();
var CommandEventPolyfill = class extends Event {
  constructor(type, invokeEventInit = {}) {
    super(type, invokeEventInit);
    const { source, command } = invokeEventInit;
    if (source != null && !(source instanceof Element)) {
      throw new TypeError(`source must be an element`);
    }
    commandEventSourceElements.set(this, source || null);
    commandEventActions.set(
      this,
      command !== void 0 ? String(command) : ""
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
  get source() {
    if (!commandEventSourceElements.has(this)) {
      throw new TypeError("illegal invocation");
    }
    const source = commandEventSourceElements.get(this);
    if (!(source instanceof Element)) return null;
    const invokerRoot = getRootNode(source);
    if (invokerRoot !== getRootNode(this.target || document)) {
      return invokerRoot instanceof ShadowRoot ? invokerRoot.host : null;
    }
    return source;
  }
  /**
   * The command string that was invoked (e.g., "show-modal", "--my-custom-command").
   */
  get command() {
    if (!commandEventActions.has(this)) {
      throw new TypeError("illegal invocation");
    }
    return commandEventActions.get(this) || "";
  }
  // Deprecated properties for compatibility with older proposals
  get action() {
    throw new Error(
      "CommandEvent#action was renamed to CommandEvent#command"
    );
  }
  get invoker() {
    throw new Error(
      "CommandEvent#invoker was renamed to CommandEvent#source"
    );
  }
};
enumerate(CommandEventPolyfill.prototype, "source");
enumerate(CommandEventPolyfill.prototype, "command");
var InvokeEventPolyfill = class extends Event {
  constructor(type, invokeEventInit = {}) {
    super(type, invokeEventInit);
    throw new Error(
      "InvokeEvent has been deprecated, it has been renamed to `CommandEvent`"
    );
  }
};
var invokerAssociatedElements = /* @__PURE__ */ new WeakMap();
function applyInvokerMixin(ElementClass) {
  Object.defineProperties(ElementClass.prototype, {
    /**
     * Imperatively sets or gets the element controlled by the button.
     * Reflects the `commandfor` attribute.
     */
    commandForElement: {
      enumerable: true,
      configurable: true,
      set(targetElement) {
        if (this.hasAttribute("invokeaction")) {
          throw new TypeError(
            "Element has deprecated `invokeaction` attribute, replace with `command`"
          );
        } else if (this.hasAttribute("invoketarget")) {
          throw new TypeError(
            "Element has deprecated `invoketarget` attribute, replace with `commandfor`"
          );
        } else if (targetElement === null) {
          this.removeAttribute("commandfor");
          invokerAssociatedElements.delete(this);
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(`commandForElement must be an element or null`);
        } else {
          this.setAttribute("commandfor", targetElement.id || "");
          const targetRootNode = getRootNode(targetElement);
          const thisRootNode = getRootNode(this);
          if (thisRootNode === targetRootNode || targetRootNode === this.ownerDocument) {
            invokerAssociatedElements.set(this, targetElement);
          } else {
            invokerAssociatedElements.delete(this);
          }
        }
      },
      get() {
        if (this.localName !== "button") {
          return null;
        }
        if (this.hasAttribute("invokeaction") || this.hasAttribute("invoketarget")) {
          console.warn(
            "Element has deprecated `invoketarget` or `invokeaction` attribute, use `commandfor` and `command` instead"
          );
          return null;
        }
        if (this.disabled) {
          return null;
        }
        if (this.form && this.getAttribute("type") !== "button") {
          console.warn(
            "Element with `commandfor` is a form participant. It should explicitly set `type=button` in order for `commandfor` to work"
          );
          return null;
        }
        const targetElement = invokerAssociatedElements.get(this);
        if (targetElement) {
          if (targetElement.isConnected) {
            return targetElement;
          } else {
            invokerAssociatedElements.delete(this);
            return null;
          }
        }
        const root = getRootNode(this);
        const idref = this.getAttribute("commandfor");
        if ((root instanceof Document || root instanceof ShadowRoot) && idref) {
          return root.getElementById(idref) || null;
        }
        return null;
      }
    },
    /**
     * Gets or sets the command string.
     * Handles normalization for built-in commands and enforces `--` prefix for custom commands.
     */
    command: {
      enumerable: true,
      configurable: true,
      get() {
        const value = this.getAttribute("command") || "";
        if (value.startsWith("--")) return value;
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
        return "";
      },
      set(value) {
        this.setAttribute("command", value);
      }
    },
    // Deprecated properties for compatibility with older proposals
    invokeAction: {
      enumerable: false,
      configurable: true,
      get() {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`
        );
      },
      set(_value) {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`
        );
      }
    },
    invokeTargetElement: {
      enumerable: false,
      configurable: true,
      get() {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`
        );
      },
      set(_value) {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`
        );
      }
    }
  });
}
var onHandlers = /* @__PURE__ */ new WeakMap();
Object.defineProperties(HTMLElement.prototype, {
  oncommand: {
    enumerable: true,
    configurable: true,
    get() {
      oncommandObserver.takeRecords();
      return onHandlers.get(this) || null;
    },
    set(handler) {
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
    }
  }
});
function applyOnCommandHandler(els) {
  for (const el of els) {
    if (typeof Element !== "undefined" && !(el instanceof Element)) continue;
    const oncommandAttr = el.getAttribute("oncommand");
    if (oncommandAttr !== null && el.oncommand !== null) {
      try {
        el.oncommand = new Function("event", oncommandAttr);
      } catch (e) {
        console.error(`Invokers Polyfill: Error parsing oncommand attribute for element:`, el, e);
      }
    }
  }
}
var oncommandObserver = new MutationObserver((records) => {
  for (const record of records) {
    const { target } = record;
    if (record.type === "childList") {
      if (typeof Element !== "undefined" && target instanceof Element) {
        applyOnCommandHandler(Array.from(target.querySelectorAll("[oncommand]")));
      } else if (target && typeof target.querySelectorAll === "function") {
        applyOnCommandHandler(Array.from(target.querySelectorAll("[oncommand]")));
      }
    } else {
      if (target instanceof HTMLElement && target.hasAttribute("oncommand")) {
        applyOnCommandHandler([target]);
      } else if (target instanceof HTMLElement) {
        target.oncommand = null;
      }
    }
  }
});
function handleInvokerActivation(event) {
  var _a, _b, _c, _d, _e, _f;
  if (event.defaultPrevented) return;
  if (event.type !== "click") return;
  const oldInvoker = event.target.closest(
    "button[invoketarget], button[invokeaction], input[invoketarget], input[invokeaction]"
  );
  if (oldInvoker) {
    console.warn(
      "Invokers Polyfill: Elements with `invoketarget` or `invokeaction` are deprecated and should be renamed to use `commandfor` and `command` respectively"
    );
    if (oldInvoker.matches("input")) {
      throw new Error("Input elements no longer support `commandfor`");
    }
  }
  const source = event.target.closest("button[commandfor][command]");
  if (!source) return;
  if (source.form && source.getAttribute("type") !== "button") {
    event.preventDefault();
    console.error(
      // Use console.error as this is an invalid setup
      "Invokers Polyfill: Element with `commandfor` is a form participant. It should explicitly set `type=button` in order for `commandfor` to work. To act as a Submit/Reset button, it must not have command or commandfor attributes.",
      source
    );
    return;
  }
  if (source.hasAttribute("command") !== source.hasAttribute("commandfor")) {
    const attr = source.hasAttribute("command") ? "command" : "commandfor";
    const missing = source.hasAttribute("command") ? "commandfor" : "command";
    console.error(
      // Use console.error as this is an invalid setup
      `Invokers Polyfill: Element with ${attr} attribute must also have a ${missing} attribute to function.`,
      source
    );
    return;
  }
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
  const commandEvent = new CommandEventPolyfill("command", {
    command: source.command,
    source,
    cancelable: true,
    bubbles: true,
    // Should bubble to be caught by document listeners
    composed: true
    // Allow crossing shadow boundaries
  });
  invokee.dispatchEvent(commandEvent);
  if (commandEvent.defaultPrevented) return;
  const command = commandEvent.command.toLowerCase();
  if (invokee.matches("[popover]")) {
    const isPopoverOpen = invokee.matches(":popover-open");
    if (command === "toggle-popover") {
      (_a = invokee[isPopoverOpen ? "hidePopover" : "showPopover"]) == null ? void 0 : _a.call(invokee, { source });
    } else if (command === "hide-popover" && isPopoverOpen) {
      invokee.hidePopover();
    } else if (command === "show-popover" && !isPopoverOpen) {
      (_b = invokee.showPopover) == null ? void 0 : _b.call(invokee, { source });
    }
  }
  if (invokee.localName === "dialog") {
    const isDialogOpen = invokee.hasAttribute("open");
    if (command === "show-modal" && !isDialogOpen) {
      invokee.showModal();
    } else if (command === "close" && isDialogOpen) {
      invokee.close(source.value);
    } else if (command === "request-close" && isDialogOpen) {
      const cancelEvent = new Event("cancel", { cancelable: true });
      invokee.dispatchEvent(cancelEvent);
      if (!cancelEvent.defaultPrevented) {
        invokee.close(source.value);
      }
    }
  }
  if (invokee.localName === "details") {
    const isOpen = invokee.open;
    if (command === "toggle") {
      invokee.open = !isOpen;
    } else if (command === "open" && !isOpen) {
      invokee.open = true;
    } else if (command === "close" && isOpen) {
      invokee.open = false;
    }
  }
  if (command.includes("openable") && typeof invokee.toggleOpenable === "function") {
    if (command === "toggle-openable") {
      invokee.toggleOpenable();
    } else if (command === "open-openable") {
      (_c = invokee.openOpenable) == null ? void 0 : _c.call(invokee);
    } else if (command === "close-openable") {
      (_d = invokee.closeOpenable) == null ? void 0 : _d.call(invokee);
    }
  }
  if ((invokee.localName === "select" || invokee.localName === "input") && command === "show-picker") {
    try {
      if (typeof invokee.showPicker === "function") {
        if (document.hasFocus() && source.ownerDocument.hasFocus()) {
          invokee.showPicker();
        }
      }
    } catch (e) {
      console.warn("Invokers: showPicker failed:", e);
    }
  }
  if (invokee.localName === "video" || invokee.localName === "audio") {
    const media = invokee;
    if (command === "play-pause") {
      if (media.paused) {
        media.play().catch(() => {
        });
      } else {
        media.pause();
      }
    } else if (command === "play" && media.paused) {
      media.play().catch(() => {
      });
    } else if (command === "pause" && !media.paused) {
      media.pause();
    } else if (command === "toggle-muted") {
      media.muted = !media.muted;
    }
  }
  if (command.includes("fullscreen")) {
    try {
      if (command === "toggle-fullscreen") {
        if (document.fullscreenElement === invokee) {
          document.exitFullscreen();
        } else {
          (_e = invokee.requestFullscreen) == null ? void 0 : _e.call(invokee);
        }
      } else if (command === "request-fullscreen" && document.fullscreenElement !== invokee) {
        (_f = invokee.requestFullscreen) == null ? void 0 : _f.call(invokee);
      } else if (command === "exit-fullscreen" && document.fullscreenElement === invokee) {
        document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Invokers: Fullscreen operation failed:", e);
    }
  }
  if (command === "copy-text") {
    try {
      let textToCopy = "";
      if (invokee === source) {
        textToCopy = source.value || source.textContent || "";
      } else {
        textToCopy = invokee.textContent || "";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy.trim());
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy.trim();
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
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
        textToShare = source.value || source.textContent || "";
      } else {
        textToShare = invokee.textContent || "";
      }
      if (navigator.share) {
        const trimmedText = textToShare.trim();
        if (trimmedText.startsWith("http://") || trimmedText.startsWith("https://")) {
          navigator.share({ url: trimmedText });
        } else {
          navigator.share({ text: trimmedText });
        }
      }
    } catch (e) {
      console.warn("Invokers: Share operation failed:", e);
    }
  }
  if (invokee.localName === "input" && invokee.type === "number") {
    const input = invokee;
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
function setupInvokeListeners(target) {
  target.addEventListener("click", handleInvokerActivation, true);
}
function observeShadowRoots(ElementClass, callback) {
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function(init) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
  const attachInternals = ElementClass.prototype.attachInternals;
  ElementClass.prototype.attachInternals = function() {
    const internals = attachInternals.call(this);
    if (internals.shadowRoot) callback(internals.shadowRoot);
    return internals;
  };
}
function apply() {
  if (globalThis.CommandEvent === CommandEventPolyfill) {
    return;
  }
  document.addEventListener(
    "invoke",
    (e) => {
      if (e.type === "invoke" && e.isTrusted) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  document.addEventListener(
    "command",
    (e) => {
      if (e.type === "command" && e.isTrusted && !e.defaultPrevented && e.eventPhase === Event.AT_TARGET) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  applyInvokerMixin(HTMLButtonElement);
  observeShadowRoots(HTMLElement, (shadow) => {
    setupInvokeListeners(shadow);
    oncommandObserver.observe(shadow, { subtree: true, childList: true, attributeFilter: ["oncommand"] });
    applyOnCommandHandler(Array.from(shadow.querySelectorAll("[oncommand]")));
  });
  setupInvokeListeners(document);
  oncommandObserver.observe(document, {
    subtree: true,
    childList: true,
    attributeFilter: ["oncommand"]
  });
  applyOnCommandHandler(Array.from(document.querySelectorAll("[oncommand]")));
  if (typeof globalThis["CommandEvent"] === "undefined") {
    Object.defineProperty(globalThis, "CommandEvent", {
      value: CommandEventPolyfill,
      configurable: true,
      writable: true,
      enumerable: false
    });
  } else {
    console.warn("Invokers Polyfill: `globalThis.CommandEvent` already exists. The polyfill's CommandEvent will not overwrite it.");
  }
  if (typeof globalThis["InvokeEvent"] === "undefined") {
    Object.defineProperty(globalThis, "InvokeEvent", {
      value: InvokeEventPolyfill,
      configurable: true,
      writable: true,
      enumerable: false
    });
  }
}
apply();

// src/interest-invokers.ts
function isInterestInvokersSupported() {
  return typeof HTMLButtonElement !== "undefined" && "interestForElement" in HTMLButtonElement.prototype;
}
var _InterestInvokersPolyfill = class _InterestInvokersPolyfill {
  constructor() {
    this.initialized = false;
    // Constants
    this.attributeName = "interestfor";
    this.interestEventName = "interest";
    this.loseInterestEventName = "loseinterest";
    this.interestDelayStartProp = "--interest-delay-start";
    this.interestDelayEndProp = "--interest-delay-end";
    this.interestDelayProp = "--interest-delay";
    this.dataField = "__interestForData";
    this.targetDataField = "__interestForTargetData";
    // State tracking
    this.invokersWithInterest = /* @__PURE__ */ new Set();
    this.touchInProgress = false;
    // State enum
    this.InterestState = {
      NoInterest: "none",
      FullInterest: "full"
    };
    // Source enum
    this.Source = {
      Hover: "hover",
      DeHover: "dehover",
      Focus: "focus",
      Blur: "blur",
      Touch: "touch"
    };
  }
  static getInstance() {
    if (!_InterestInvokersPolyfill.instance) {
      _InterestInvokersPolyfill.instance = new _InterestInvokersPolyfill();
    }
    return _InterestInvokersPolyfill.instance;
  }
  /**
   * Initialize the Interest Invokers polyfill
   */
  apply() {
    if (window.interestForPolyfillInstalled) {
      return;
    }
    window.interestForPolyfillInstalled = true;
    const nativeSupported = isInterestInvokersSupported();
    if (nativeSupported && !window.interestForUsePolyfillAlways) {
      return;
    }
    if (nativeSupported) {
      this.disableNativeSupport();
    }
    this.setupPolyfill();
    this.initialized = true;
    console.log(`Interest Invokers polyfill installed (native: ${nativeSupported}).`);
  }
  /**
   * Disable native support if present to allow polyfill to take effect
   */
  disableNativeSupport() {
    const cancel = (e) => {
      if (e.isTrusted) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.body.addEventListener(this.interestEventName, cancel, { capture: true });
    document.body.addEventListener(this.loseInterestEventName, cancel, { capture: true });
  }
  /**
   * Setup the complete polyfill
   */
  setupPolyfill() {
    this.registerCustomProperties();
    this.addEventHandlers();
    this.setupElementMixins();
  }
  /**
   * Register CSS custom properties for interest delays
   */
  registerCustomProperties() {
    const style = document.createElement("style");
    style.textContent = `
      @property ${this.interestDelayStartProp} {
        syntax: "normal | <time>";
        inherits: false;
        initial-value: normal;
      }
      @property ${this.interestDelayEndProp} {
        syntax: "normal | <time>";
        inherits: false;
        initial-value: normal;
      }
      @property ${this.interestDelayProp} {
        syntax: "[ normal | <time> ]{1,2}";
        inherits: false;
        initial-value: normal;
      }
    `;
    document.head.appendChild(style);
    document[this.dataField] = { globalPropsStyle: style };
  }
  /**
   * Setup element mixins for supported elements
   */
  setupElementMixins() {
    this.applyInterestInvokerMixin(HTMLButtonElement);
    this.applyInterestInvokerMixin(HTMLAnchorElement);
    this.applyInterestInvokerMixin(HTMLAreaElement);
    if (typeof SVGAElement !== "undefined") {
      this.applyInterestInvokerMixin(SVGAElement);
    }
  }
  /**
   * Apply the interestForElement property to supported elements
   */
  applyInterestInvokerMixin(ElementClass) {
    Object.defineProperty(ElementClass.prototype, "interestForElement", {
      enumerable: true,
      configurable: true,
      get() {
        return this.getInterestForTarget();
      },
      set(value) {
        if (value === null) {
          this.removeAttribute("interestfor");
        } else if (value instanceof Element) {
          this.setAttribute("interestfor", value.id || "");
        } else {
          throw new TypeError("interestForElement must be an element or null");
        }
      }
    });
    if (!ElementClass.prototype.getInterestForTarget) {
      ElementClass.prototype.getInterestForTarget = function() {
        const id = this.getAttribute("interestfor");
        return id ? document.getElementById(id) : null;
      };
    }
  }
  /**
   * Add all event handlers for interest detection
   */
  addEventHandlers() {
    document.body.addEventListener(
      "mouseover",
      (e) => this.handleInterestHoverOrFocus(e.target, this.Source.Hover)
    );
    document.body.addEventListener(
      "mouseout",
      (e) => this.handleInterestHoverOrFocus(e.target, this.Source.DeHover)
    );
    document.body.addEventListener(
      "focusin",
      (e) => this.handleInterestHoverOrFocus(e.target, this.Source.Focus)
    );
    document.body.addEventListener(
      "focusout",
      (e) => this.handleInterestHoverOrFocus(e.target, this.Source.Blur)
    );
    document.body.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.invokersWithInterest.forEach((invoker) => {
          this.clearState(invoker);
        });
      }
    });
    this.setupTouchHandlers();
  }
  /**
   * Setup touch event handlers for long press support
   */
  setupTouchHandlers() {
    const longPressTime = 500;
    document.body.addEventListener("touchstart", (e) => {
      this.touchInProgress = true;
      const invoker = e.target.closest("button[interestfor]");
      if (invoker) {
        this.initializeDataField(invoker);
        const data = invoker[this.dataField];
        data.longPressTimer = setTimeout(() => {
          this.gainOrLoseInterest(
            invoker,
            this.getInterestForTarget(invoker),
            this.InterestState.FullInterest
          );
          data.longPressTimer = null;
        }, longPressTime);
      }
    });
    const cancelLongPress = (e) => {
      const invoker = e.target.closest("button[interestfor]");
      if (invoker) {
        const data = invoker[this.dataField];
        if (data == null ? void 0 : data.longPressTimer) {
          clearTimeout(data.longPressTimer);
          data.longPressTimer = null;
        }
      }
    };
    document.body.addEventListener("touchend", (e) => {
      cancelLongPress(e);
      this.touchInProgress = false;
    });
    document.body.addEventListener("touchmove", cancelLongPress);
  }
  /**
   * Handle interest changes from hover or focus events
   */
  handleInterestHoverOrFocus(el, source) {
    var _a, _b, _c, _d, _e, _f;
    if (this.touchInProgress) return;
    if (!el.isConnected) return;
    const target = this.getInterestForTarget(el);
    if (!target) {
      this.handleUpstreamInterest(el, source);
      return;
    }
    if (el instanceof HTMLButtonElement && el.disabled) {
      return;
    }
    this.initializeDataField(el);
    const data = el[this.dataField];
    const upstreamInvoker = this.getInterestInvoker(el);
    if (source === this.Source.Hover || source === this.Source.Focus) {
      (_a = data.clearLostTask) == null ? void 0 : _a.call(data);
      (_c = (_b = upstreamInvoker == null ? void 0 : upstreamInvoker[this.dataField]) == null ? void 0 : _b.clearLostTask) == null ? void 0 : _c.call(_b);
      this.scheduleInterestGainedTask(el, this.InterestState.FullInterest);
    } else {
      (_d = data.clearGainedTask) == null ? void 0 : _d.call(data);
      if (data.state !== this.InterestState.NoInterest) {
        this.scheduleInterestLostTask(el);
      }
      if (upstreamInvoker) {
        (_f = (_e = upstreamInvoker[this.dataField]) == null ? void 0 : _e.clearGainedTask) == null ? void 0 : _f.call(_e);
        if (source === this.Source.Blur || !el.matches(":hover")) {
          this.scheduleInterestLostTask(upstreamInvoker);
        }
      }
    }
  }
  /**
   * Handle upstream interest for elements without direct targets
   */
  handleUpstreamInterest(el, source) {
    var _a;
    const containingTarget = el.closest(".interest-target");
    if (containingTarget) {
      const upstreamInvoker = this.getInterestInvoker(containingTarget);
      if (upstreamInvoker) {
        const data = upstreamInvoker[this.dataField];
        if (source === this.Source.Hover || source === this.Source.Focus) {
          (_a = data == null ? void 0 : data.clearLostTask) == null ? void 0 : _a.call(data);
        } else {
          if (source === this.Source.Blur || !el.matches(":hover")) {
            this.scheduleInterestLostTask(upstreamInvoker);
          }
        }
      }
    }
  }
  /**
   * Gain or lose interest in an element
   */
  gainOrLoseInterest(invoker, target, newState) {
    var _a, _b;
    if (!invoker || !target) return false;
    if (!invoker.isConnected || this.getInterestForTarget(invoker) !== target || newState === this.InterestState.NoInterest && this.getInterestInvoker(target) !== invoker) {
      return false;
    }
    if (newState !== this.InterestState.NoInterest) {
      const existing = this.getInterestInvoker(target);
      if (existing) {
        if (existing === invoker) {
          (_b = (_a = existing[this.dataField]) == null ? void 0 : _a.clearLostTask) == null ? void 0 : _b.call(_a);
          return false;
        } else {
          if (!this.gainOrLoseInterest(existing, target, this.InterestState.NoInterest)) {
            return false;
          }
          if (!invoker.isConnected || this.getInterestForTarget(invoker) !== target) {
            return false;
          }
        }
      }
      return this.applyState(invoker, newState);
    }
    this.clearState(invoker);
    return true;
  }
  /**
   * Apply interest state to an invoker
   */
  applyState(invoker, newState) {
    const data = invoker[this.dataField];
    const target = this.getInterestForTarget(invoker);
    if (!target) return false;
    switch (newState) {
      case this.InterestState.FullInterest:
        if (data.state !== this.InterestState.NoInterest) {
          throw new Error("Invalid state");
        }
        const interestEvent = new CustomEvent(this.interestEventName, {
          bubbles: true,
          // Allow bubbling for integration with command system
          cancelable: true
        });
        Object.defineProperty(interestEvent, "source", {
          value: invoker,
          writable: false
        });
        target.dispatchEvent(interestEvent);
        invoker.dispatchEvent(new CustomEvent("interest:shown", {
          bubbles: true,
          detail: { target, source: invoker }
        }));
        try {
          if (target.hasAttribute("popover") && typeof target.showPopover === "function") {
            target.showPopover({ source: invoker });
          }
        } catch (e) {
        }
        data.state = this.InterestState.FullInterest;
        if (!target[this.targetDataField]) {
          target[this.targetDataField] = {};
        }
        target[this.targetDataField].invoker = invoker;
        if (target.hasAttribute("popover")) {
          const toggleListener = this.createPopoverToggleListener();
          target[this.targetDataField].toggleListener = toggleListener;
          target.addEventListener("toggle", toggleListener);
        }
        this.invokersWithInterest.add(invoker);
        invoker.classList.add("interest-source");
        target.classList.add("interest-target");
        if (!this.isPlainHint(target)) {
          invoker.setAttribute("aria-expanded", "true");
        }
        this.setupAnchorPositioning(invoker, target, data);
        break;
      default:
        throw new Error("Invalid state");
    }
    return true;
  }
  /**
   * Clear interest state from an invoker
   */
  clearState(invoker) {
    const data = invoker[this.dataField];
    if (!data) return;
    clearTimeout(data.gainedTimer);
    clearTimeout(data.lostTimer);
    if (data.state !== this.InterestState.NoInterest) {
      const target = this.getInterestForTarget(invoker);
      if (target) {
        const loseInterestEvent = new CustomEvent(this.loseInterestEventName, {
          bubbles: true,
          // Allow bubbling for integration with command system
          cancelable: true
        });
        Object.defineProperty(loseInterestEvent, "source", {
          value: invoker,
          writable: false
        });
        target.dispatchEvent(loseInterestEvent);
        invoker.dispatchEvent(new CustomEvent("interest:lost", {
          bubbles: true,
          detail: { target, source: invoker }
        }));
        try {
          if (typeof target.hidePopover === "function") {
            target.hidePopover();
          }
        } catch (e) {
        }
        const targetData = target[this.targetDataField];
        if (targetData == null ? void 0 : targetData.toggleListener) {
          target.removeEventListener("toggle", targetData.toggleListener);
        }
        target[this.targetDataField] = null;
        this.invokersWithInterest.delete(invoker);
        invoker.classList.remove("interest-source");
        target.classList.remove("interest-target");
        if (!this.isPlainHint(target)) {
          invoker.setAttribute("aria-expanded", "false");
        }
        this.cleanupAnchorPositioning(invoker, target, data);
      }
      data.state = this.InterestState.NoInterest;
    }
  }
  /**
   * Setup anchor positioning between invoker and target
   */
  setupAnchorPositioning(invoker, target, data) {
    const anchorName = `--interest-anchor-${Math.random().toString(36).substring(2)}`;
    invoker.style.anchorName = anchorName;
    target.style.positionAnchor = anchorName;
    data.anchorName = anchorName;
  }
  /**
   * Cleanup anchor positioning
   */
  cleanupAnchorPositioning(invoker, target, data) {
    if (data.anchorName) {
      invoker.style.anchorName = "";
      target.style.positionAnchor = "";
      data.anchorName = null;
    }
  }
  /**
   * Create popover toggle event listener
   */
  createPopoverToggleListener() {
    return (e) => {
      const popover = e.target;
      const toggleEvent = e;
      if (toggleEvent.newState === "closed") {
        const targetData = popover[this.targetDataField];
        const invoker = targetData == null ? void 0 : targetData.invoker;
        if (invoker) {
          this.gainOrLoseInterest(invoker, popover, this.InterestState.NoInterest);
        }
      }
    };
  }
  /**
   * Schedule task to gain interest after delay
   */
  scheduleInterestGainedTask(invoker, newState) {
    var _a;
    const delay = this.getDelaySeconds(invoker, this.interestDelayStartProp) * 1e3;
    if (!isFinite(delay) || delay < 0) return;
    const data = invoker[this.dataField];
    (_a = data.clearGainedTask) == null ? void 0 : _a.call(data);
    data.gainedTimer = setTimeout(() => {
      this.gainOrLoseInterest(invoker, this.getInterestForTarget(invoker), newState);
    }, delay);
  }
  /**
   * Schedule task to lose interest after delay
   */
  scheduleInterestLostTask(invoker) {
    var _a;
    const delay = this.getDelaySeconds(invoker, this.interestDelayEndProp) * 1e3;
    if (!isFinite(delay) || delay < 0) return;
    const data = invoker[this.dataField];
    (_a = data.clearLostTask) == null ? void 0 : _a.call(data);
    data.lostTimer = setTimeout(() => {
      this.gainOrLoseInterest(
        invoker,
        this.getInterestForTarget(invoker),
        this.InterestState.NoInterest
      );
    }, delay);
  }
  /**
   * Get delay in seconds for a CSS property
   */
  getDelaySeconds(el, prop) {
    const style = getComputedStyle(el);
    const longhandValue = style.getPropertyValue(prop).trim();
    if (longhandValue.toLowerCase() !== "normal") {
      return this.parseTimeValue(longhandValue);
    }
    const shorthand = style.getPropertyValue(this.interestDelayProp).trim();
    if (shorthand && shorthand.toLowerCase() !== "normal") {
      const parts = shorthand.split(/\s+/).filter((s) => s.length > 0);
      if (parts.length > 0) {
        const firstValue = parts[0];
        const secondValue = parts.length > 1 ? parts[1] : firstValue;
        const valueFromShorthand = prop === this.interestDelayStartProp ? firstValue : secondValue;
        if (valueFromShorthand.toLowerCase() !== "normal") {
          return this.parseTimeValue(valueFromShorthand);
        }
      }
    }
    return prop === this.interestDelayStartProp ? 0.5 : 0.25;
  }
  /**
   * Parse time value from CSS
   */
  parseTimeValue(val) {
    const s = String(val).trim();
    const m_s = s.match(/^([\d.]+)s$/);
    if (m_s) {
      return parseFloat(m_s[1]);
    }
    const m_ms = s.match(/^([\d.]+)ms$/);
    if (m_ms) {
      return parseFloat(m_ms[1]) / 1e3;
    }
    return parseFloat(s) || 0;
  }
  /**
   * Initialize data field for an element
   */
  initializeDataField(el) {
    if (el[this.dataField]) return;
    el[this.dataField] = {
      state: this.InterestState.NoInterest,
      gainedTimer: null,
      lostTimer: null,
      longPressTimer: null,
      anchorName: null,
      clearGainedTask() {
        clearTimeout(this.gainedTimer);
      },
      clearLostTask() {
        clearTimeout(this.lostTimer);
      }
    };
    const target = this.getInterestForTarget(el);
    if (target) {
      this.setupAccessibility(el, target);
    }
  }
  /**
   * Setup accessibility attributes
   */
  setupAccessibility(invoker, target) {
    if (this.isPlainHint(target)) {
      invoker.setAttribute("aria-describedby", target.id);
    } else {
      invoker.setAttribute("aria-details", target.id);
      invoker.setAttribute("aria-expanded", "false");
      if (!target.hasAttribute("role")) {
        target.setAttribute("role", "tooltip");
      }
    }
  }
  /**
   * Check if target is a plain hint (simple tooltip)
   */
  isPlainHint(target) {
    var _a, _b;
    if (((_a = target.getAttribute("popover")) == null ? void 0 : _a.toLowerCase()) !== "hint") {
      return false;
    }
    const focusableSelector = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");
    if (target.querySelector(focusableSelector)) {
      return false;
    }
    const structuralSelector = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "table",
      "nav",
      "header",
      "footer",
      "main",
      "aside",
      "article",
      "section",
      "form",
      "blockquote",
      "details",
      "summary",
      "dialog"
    ].join(",");
    if (target.querySelector(structuralSelector)) {
      return false;
    }
    const elementsWithRoles = target.querySelectorAll("[role]");
    for (const el of elementsWithRoles) {
      const role = (_b = el.getAttribute("role")) == null ? void 0 : _b.toLowerCase();
      if (role && !["presentation", "none", "generic", "image"].includes(role)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Get interest target for an element
   */
  getInterestForTarget(el) {
    const id = el.getAttribute(this.attributeName);
    return id ? document.getElementById(id) : null;
  }
  /**
   * Get interest invoker for a target element
   */
  getInterestInvoker(target) {
    var _a;
    const targetData = target[this.targetDataField];
    const inv = (targetData == null ? void 0 : targetData.invoker) || null;
    return inv && ((_a = inv[this.dataField]) == null ? void 0 : _a.state) !== this.InterestState.NoInterest ? inv : null;
  }
  /**
   * Check if polyfill is initialized
   */
  isInitialized() {
    return this.initialized;
  }
};
_InterestInvokersPolyfill.instance = null;
var InterestInvokersPolyfill = _InterestInvokersPolyfill;
function applyInterestInvokers() {
  const polyfill = InterestInvokersPolyfill.getInstance();
  if (document.readyState === "complete") {
    polyfill.apply();
  } else {
    window.addEventListener("load", () => polyfill.apply());
  }
}
applyInterestInvokers();

// src/index.ts
function parseCommandString(commandString) {
  var _a;
  const parts = [];
  let currentPart = "";
  let i = 0;
  while (i < commandString.length) {
    const char = commandString[i];
    if (char === "\\") {
      currentPart += (_a = commandString[i + 1]) != null ? _a : "";
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
function createCommandString(...parts) {
  if (parts.length > 0 && !parts[0].startsWith("--")) {
    parts[0] = `--${parts[0]}`;
  }
  return parts.map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:")).join(":");
}
var isDebugMode = false;
function createInvokerError(message, severity = "error" /* ERROR */, options = {}) {
  const error = new Error(message);
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
function logInvokerError(error, prefix = "Invokers") {
  const isInvokerError = "severity" in error;
  const severity = isInvokerError ? error.severity : "error" /* ERROR */;
  const logMethod = severity === "critical" /* CRITICAL */ ? "error" : severity === "error" /* ERROR */ ? "error" : "warn";
  if (isDebugMode || severity === "critical" /* CRITICAL */) {
    console.group(`${prefix}: ${error.message}`);
    console[logMethod]("Error:", error);
    if (isInvokerError) {
      const invokerError = error;
      if (invokerError.element) {
        console.log("Element:", invokerError.element);
      }
      if (invokerError.command) {
        console.log("Command:", invokerError.command);
      }
      if (invokerError.context) {
        console.log("Context:", invokerError.context);
      }
      if (invokerError.recovery) {
        console.log("Suggested fix:", invokerError.recovery);
      }
    }
    console.groupEnd();
  } else {
    console[logMethod](`${prefix}: ${error.message}`, isInvokerError ? error.element : void 0);
  }
}
function validateElement(element, requirements) {
  const errors = [];
  if (!element) {
    errors.push("Element not found");
    return errors;
  }
  if (requirements.id && !element.id) {
    errors.push("Element missing required id attribute");
  }
  if (requirements.tagName && !requirements.tagName.includes(element.tagName.toLowerCase())) {
    errors.push(`Element must be one of: ${requirements.tagName.join(", ")}, got: ${element.tagName.toLowerCase()}`);
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
function sanitizeParams(params) {
  return params.map((param) => {
    if (typeof param !== "string") {
      return String(param);
    }
    let sanitized = param.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").replace(/data:text\/html/gi, "").replace(/vbscript:/gi, "").replace(/on\w+\s*=/gi, "").replace(/expression\s*\(/gi, "").trim();
    if (param.includes("://") || param.startsWith("//")) {
      try {
        const url = new URL(param, window.location.href);
        if (!["http:", "https:", "ftp:", "mailto:"].includes(url.protocol)) {
          console.warn(`Invokers: Potentially unsafe URL protocol "${url.protocol}" detected and removed`);
          return "";
        }
      } catch (e) {
        console.warn("Invokers: Malformed URL detected and removed:", param);
        return "";
      }
    }
    return sanitized;
  });
}
function sanitizeHTML(html) {
  if (!html || typeof html !== "string") {
    return "";
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const dangerousElements = temp.querySelectorAll('script, object, embed, iframe, frame, meta, link[rel="import"]');
  dangerousElements.forEach((el) => el.remove());
  const allElements = temp.querySelectorAll("*");
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on") || attr.value.includes("javascript:") || attr.value.includes("vbscript:") || attr.value.includes("data:text/html")) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return temp.innerHTML;
}
var NATIVE_COMMAND_KEYWORDS = /* @__PURE__ */ new Set([
  "show-modal",
  "close",
  "request-close",
  "show-popover",
  "hide-popover",
  "toggle-popover"
]);
var PerformanceMonitor = class {
  constructor() {
    this.executionTimes = [];
    this.maxExecutionsPerSecond = 100;
    this.monitoringWindow = 1e3;
  }
  // 1 second
  recordExecution() {
    const now = Date.now();
    this.executionTimes = this.executionTimes.filter((time) => now - time < this.monitoringWindow);
    if (this.executionTimes.length >= this.maxExecutionsPerSecond) {
      const error = createInvokerError(
        `Too many command executions (${this.executionTimes.length}/second). Possible infinite loop detected.`,
        "critical" /* CRITICAL */,
        {
          recovery: "Check for recursive command chains or remove data-and-then attributes causing loops"
        }
      );
      logInvokerError(error);
      return false;
    }
    this.executionTimes.push(now);
    return true;
  }
  getStats() {
    const now = Date.now();
    const recentExecutions = this.executionTimes.filter((time) => now - time < this.monitoringWindow);
    const intervals = recentExecutions.slice(1).map((time, i) => time - recentExecutions[i]);
    const averageInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    return {
      executionsLastSecond: recentExecutions.length,
      averageInterval
    };
  }
};
var InvokerManager = class {
  constructor() {
    this.commands = /* @__PURE__ */ new Map();
    this.sortedCommandKeys = [];
    this.commandStates = /* @__PURE__ */ new Map();
    this.executionQueue = Promise.resolve();
    // Performance and debugging tracking
    this.executionCount = 0;
    this.maxExecutionsPerSecond = 100;
    this.executionTimes = [];
    this.performanceMonitor = new PerformanceMonitor();
    this.andThenManager = new AndThenManager(this);
    this.pipelineManager = new PipelineManager(this);
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      if (!window.__invokerListenersAdded) {
        this.listen();
        window.__invokerListenersAdded = true;
      }
    } else if (typeof global !== "undefined" && global.window && global.document) {
      this.registerCoreLibraryCommands();
      if (!global.__invokerListenersAdded) {
        this.listen();
        global.__invokerListenersAdded = true;
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
  async executeCommand(command, targetId, source) {
    if (!this.performanceMonitor.recordExecution()) {
      return;
    }
    if (!command || typeof command !== "string") {
      const error = createInvokerError(
        "Command must be a non-empty string",
        "error" /* ERROR */,
        {
          command,
          recovery: 'Provide a valid command string like "--toggle" or "show-modal"'
        }
      );
      logInvokerError(error);
      return;
    }
    if (!targetId || typeof targetId !== "string") {
      const error = createInvokerError(
        "Target ID must be a non-empty string",
        "error" /* ERROR */,
        {
          command,
          context: { targetId },
          recovery: "Provide a valid element ID that exists in the DOM"
        }
      );
      logInvokerError(error);
      return;
    }
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      const allIds = Array.from(document.querySelectorAll("[id]")).map((el) => el.id).filter(Boolean);
      const suggestions = allIds.filter((id) => id.includes(targetId.toLowerCase()) || targetId.includes(id.toLowerCase()));
      const error = createInvokerError(
        `Target element with id "${targetId}" not found`,
        "error" /* ERROR */,
        {
          command,
          element: source,
          context: {
            targetId,
            availableIds: allIds.slice(0, 10),
            // Show first 10 IDs
            suggestions: suggestions.slice(0, 3)
            // Show up to 3 suggestions
          },
          recovery: suggestions.length > 0 ? `Did you mean: ${suggestions.slice(0, 3).join(", ")}?` : "Check that the target element exists and has the correct id attribute"
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
        preventDefault: () => {
        },
        type: "command"
      };
      await this.executeCustomCommand(command, mockEvent);
    } catch (error) {
      const invokerError = createInvokerError(
        `Failed to execute command "${command}" on element "${targetId}"`,
        "error" /* ERROR */,
        {
          command,
          element: source || targetElement,
          cause: error,
          recovery: "Check the command syntax and ensure the target element supports this operation"
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
  register(name, callback) {
    if (!name || typeof name !== "string") {
      const error = createInvokerError(
        "Command name must be a non-empty string",
        "error" /* ERROR */,
        {
          context: { name },
          recovery: 'Provide a valid command name like "--my-command"'
        }
      );
      logInvokerError(error);
      return;
    }
    if (!callback || typeof callback !== "function") {
      const error = createInvokerError(
        `Command callback for "${name}" must be a function`,
        "error" /* ERROR */,
        {
          command: name,
          context: { callback },
          recovery: "Provide a function that accepts a CommandContext parameter"
        }
      );
      logInvokerError(error);
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      const error = createInvokerError(
        "Command name cannot be empty or whitespace only",
        "error" /* ERROR */,
        {
          recovery: 'Provide a meaningful command name like "--toggle" or "--fetch"'
        }
      );
      logInvokerError(error);
      return;
    }
    let normalizedName = trimmedName;
    if (!normalizedName.startsWith("--")) {
      normalizedName = `--${normalizedName}`;
      if (isDebugMode) {
        console.warn(`Invokers: Command "${trimmedName}" registered without '--' prefix. Automatically registered as "${normalizedName}".`);
      }
    }
    if (NATIVE_COMMAND_KEYWORDS.has(normalizedName.slice(2))) {
      const error = createInvokerError(
        `Cannot register custom command "${normalizedName}" - conflicts with native command "${normalizedName.slice(2)}"`,
        "error" /* ERROR */,
        {
          command: normalizedName,
          recovery: "Choose a different command name that doesn't conflict with native commands"
        }
      );
      logInvokerError(error);
      return;
    }
    if (this.commands.has(normalizedName)) {
      const error = createInvokerError(
        `Command "${normalizedName}" is already registered and will be overwritten`,
        "warning" /* WARNING */,
        {
          command: normalizedName,
          recovery: "Use a different command name or ensure this overwrite is intentional"
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
        "critical" /* CRITICAL */,
        {
          command: normalizedName,
          cause: error,
          recovery: "Check that the callback function is valid and the command name is unique"
        }
      );
      logInvokerError(invokerError);
    }
  }
  /**
   * Handles incoming `CommandEvent`s. This is now an async method to allow
   * for awaiting the full command chain.
   */
  async handleCommand(event) {
    const commandStr = event.command;
    if (commandStr.startsWith("--")) {
      await this.executeCustomCommand(commandStr, event);
    } else if (!NATIVE_COMMAND_KEYWORDS.has(commandStr) && commandStr !== "") {
      console.warn(`Invokers (Compatibility): Non-spec-compliant command "${commandStr}" detected. Please update your HTML to use '--${commandStr}' for future compatibility. Attempting to handle...`);
      await this.executeCustomCommand(`--${commandStr}`, event);
    }
  }
  /**
   * Executes a custom command and then triggers a follow-up command if specified.
   * This is the new heart of the chaining mechanism with enhanced lifecycle support.
   */
  async executeCustomCommand(commandStr, event) {
    var _a;
    if (!commandStr || typeof commandStr !== "string") {
      const error = createInvokerError(
        "Invalid command string provided",
        "error" /* ERROR */,
        {
          command: commandStr,
          element: event.source,
          recovery: "Ensure the command attribute contains a valid command string"
        }
      );
      logInvokerError(error);
      return;
    }
    if (!this.performanceMonitor.recordExecution()) {
      return;
    }
    let commandFound = false;
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand) && (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":")) {
        commandFound = true;
        const callback = this.commands.get(registeredCommand);
        if (!callback) {
          const error = createInvokerError(
            `Command "${registeredCommand}" is registered but callback is missing`,
            "critical" /* CRITICAL */,
            {
              command: commandStr,
              element: event.source,
              recovery: "This is an internal error. Please report this issue."
            }
          );
          logInvokerError(error);
          return;
        }
        try {
          event.preventDefault();
          const params = parseCommandString(commandStr.substring(registeredCommand.length + 1));
          const sanitizedParams = sanitizeParams(params);
          const context = this.createContext(event, commandStr, sanitizedParams);
          const invoker = event.source;
          const commandKey = `${commandStr}:${context.targetElement.id}`;
          let currentState = this.commandStates.get(commandKey) || "active";
          if (invoker) {
            const invokerState = invoker.dataset.state || invoker.getAttribute("data-state");
            if (invokerState) {
              if (!(this.commandStates.has(commandKey) && this.commandStates.get(commandKey) === "completed")) {
                currentState = invokerState;
              }
            }
          }
          if (currentState === "disabled" || currentState === "completed") {
            return;
          }
          let executionResult = { success: true };
          try {
            const validationErrors = this.validateContext(context);
            if (validationErrors.length > 0) {
              throw createInvokerError(
                `Command execution aborted: ${validationErrors.join(", ")}`,
                "error" /* ERROR */,
                {
                  command: commandStr,
                  element: context.invoker || context.targetElement,
                  context: { validationErrors },
                  recovery: "Fix the validation errors and try again"
                }
              );
            }
            const executionPromise = Promise.resolve(callback(context));
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Command execution timeout")), 3e4);
            });
            await Promise.race([executionPromise, timeoutPromise]);
            if (currentState === "once") {
              this.commandStates.set(commandKey, "completed");
            }
            if (isDebugMode) {
              console.log(`Invokers: Command "${registeredCommand}" executed successfully`);
            }
          } catch (error) {
            executionResult = { success: false, error };
            const invokerError = createInvokerError(
              `Command "${registeredCommand}" execution failed`,
              "error" /* ERROR */,
              {
                command: commandStr,
                element: context.invoker || context.targetElement,
                cause: error,
                context: {
                  params: context.params,
                  targetId: (_a = context.targetElement) == null ? void 0 : _a.id,
                  invokerState: currentState
                },
                recovery: this.generateRecoverySuggestion(registeredCommand, error, context)
              }
            );
            logInvokerError(invokerError);
            this.attemptGracefulDegradation(context, error);
          }
          if (context.invoker) {
            await this.andThenManager.processAndThen(context.invoker, executionResult, context.targetElement);
          }
          if (context.invoker) {
            await this.triggerFollowup(context.invoker, context.targetElement, executionResult);
          }
        } catch (commandError) {
          const wrapperError = createInvokerError(
            `Failed to execute command "${registeredCommand}"`,
            "critical" /* CRITICAL */,
            {
              command: commandStr,
              element: event.source,
              cause: commandError,
              recovery: "Check command syntax and ensure all required attributes are present"
            }
          );
          logInvokerError(wrapperError);
        }
        return;
      }
    }
    if (!commandFound) {
      const suggestions = this.findSimilarCommands(commandStr);
      const error = createInvokerError(
        `Unknown command "${commandStr}"`,
        "error" /* ERROR */,
        {
          command: commandStr,
          element: event.source,
          context: {
            availableCommands: this.sortedCommandKeys.slice(0, 10),
            suggestions
          },
          recovery: suggestions.length > 0 ? `Did you mean: ${suggestions.join(", ")}?` : `Check the command name and ensure it's registered. Custom commands must start with "--"`
        }
      );
      logInvokerError(error);
    }
  }
  /**
   * Validates the command context before execution
   */
  validateContext(context) {
    const errors = [];
    if (!context.targetElement) {
      errors.push("Target element is null or undefined");
    } else if (!context.targetElement.isConnected) {
      errors.push("Target element is not connected to the DOM");
    }
    if (context.params.some((param) => param == null)) {
      errors.push("Command contains null or undefined parameters");
    }
    return errors;
  }
  /**
   * Generates context-aware recovery suggestions for failed commands
   */
  generateRecoverySuggestion(command, error, context) {
    const errorMessage = error.message.toLowerCase();
    if (command.includes("fetch")) {
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        return "Check your network connection and ensure the URL is correct and reachable";
      }
      if (errorMessage.includes("cors")) {
        return "CORS error: Ensure your server allows cross-origin requests or use a proxy";
      }
      return "Verify the data-url attribute points to a valid endpoint that returns HTML";
    }
    if (command.includes("media")) {
      return "Ensure the target element is a <video> or <audio> element";
    }
    if (command.includes("form")) {
      return "Ensure the target element is a <form> element with a valid action attribute";
    }
    if (command.includes("class")) {
      return "Check that the class name is valid and the target element exists";
    }
    if (command.includes("attr")) {
      return "Verify the attribute name is valid and check data-attr-name/data-attr-value attributes";
    }
    if (errorMessage.includes("null") || errorMessage.includes("undefined")) {
      return "Check that all required elements and attributes are present in the DOM";
    }
    if (errorMessage.includes("permission") || errorMessage.includes("security")) {
      return "This operation requires user permission or HTTPS context";
    }
    return "Check the command syntax and ensure all required attributes are present";
  }
  /**
   * Attempts graceful degradation when a command fails
   */
  attemptGracefulDegradation(context, error) {
    try {
      if (context.invoker && context.invoker.hasAttribute("aria-expanded")) {
        const currentState = context.invoker.getAttribute("aria-expanded");
        if (currentState === null) {
          context.invoker.setAttribute("aria-expanded", "false");
        }
      }
      if (context.invoker && context.invoker.hasAttribute("disabled")) {
        setTimeout(() => {
          if (context.invoker) {
            context.invoker.removeAttribute("disabled");
          }
        }, 3e3);
      }
      if (isDebugMode) {
        console.log("Invokers: Attempted graceful degradation for failed command");
      }
    } catch (degradationError) {
      console.warn("Invokers: Graceful degradation failed:", degradationError);
    }
  }
  /**
   * Finds similar commands to help with typos
   */
  findSimilarCommands(commandStr) {
    const command = commandStr.toLowerCase();
    const suggestions = [];
    for (const registeredCommand of this.sortedCommandKeys) {
      const registered = registeredCommand.toLowerCase();
      if (command.includes(registered.slice(2))) {
        suggestions.push(registeredCommand);
        continue;
      }
      if (this.levenshteinDistance(command, registered) <= 2) {
        suggestions.push(registeredCommand);
      }
    }
    return suggestions.slice(0, 3);
  }
  /**
   * Calculates Levenshtein distance for typo detection
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          // deletion
          matrix[j - 1][i] + 1,
          // insertion
          matrix[j - 1][i - 1] + substitutionCost
          // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }
  /**
   * Triggers a follow-up command. This is now a core utility of the InvokerManager.
   * It supports enhanced attribute-based chaining with conditional execution.
   */
  async triggerFollowup(originalInvoker, primaryTarget, executionResult) {
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
  getFollowupCommands(invoker, executionResult) {
    if (!invoker) {
      return [];
    }
    const commands2 = [];
    const universalCommand = invoker.dataset.andThen || invoker.dataset.thenCommand;
    if (universalCommand) {
      commands2.push({
        command: universalCommand,
        target: invoker.dataset.thenTarget,
        state: invoker.dataset.thenState || "active"
      });
    }
    if (executionResult) {
      if (executionResult.success && invoker.dataset.afterSuccess) {
        invoker.dataset.afterSuccess.split(",").forEach((cmd) => {
          commands2.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: invoker.dataset.thenState || "active"
          });
        });
      }
      if (!executionResult.success && invoker.dataset.afterError) {
        invoker.dataset.afterError.split(",").forEach((cmd) => {
          commands2.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: invoker.dataset.thenState || "active"
          });
        });
      }
      if (invoker.dataset.afterComplete) {
        invoker.dataset.afterComplete.split(",").forEach((cmd) => {
          commands2.push({
            command: cmd.trim(),
            target: invoker.dataset.thenTarget,
            state: invoker.dataset.thenState || "active"
          });
        });
      }
    }
    return commands2;
  }
  createContext(event, fullCommand, params) {
    const invoker = event.source;
    const targetElement = event.target;
    const getTargets = () => {
      var _a;
      if (!invoker) {
        const freshTarget = getFreshTargetElement();
        return freshTarget ? [freshTarget] : [];
      }
      if (targetElement) return [targetElement];
      const controls = (_a = invoker.getAttribute("aria-controls")) == null ? void 0 : _a.trim();
      const dataTarget = invoker.dataset.target;
      const selector = controls ? "#" + controls.split(/\s+/).join(", #") : dataTarget;
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    };
    const getFreshTargetElement = () => {
      if (targetElement && targetElement.id) {
        return document.getElementById(targetElement.id);
      }
      return targetElement;
    };
    const updateAriaState = (targets) => {
      if (!invoker) return;
      const isExpanded = targets.some((t) => !t.hidden);
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
      const allTargetIDs = new Set(Array.from(container.children).map((t) => t.id).filter(Boolean));
      const invokersInGroup = Array.from(
        document.querySelectorAll("[commandfor], [aria-controls]")
      ).filter((btn) => {
        var _a, _b;
        const controlledIds = (btn.getAttribute("commandfor") ? [btn.getAttribute("commandfor")] : []).concat((_b = (_a = btn.getAttribute("aria-controls")) == null ? void 0 : _a.split(/\s+/)) != null ? _b : []);
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
    };
    const executeAfter = (command, target, state = "active") => {
      if (!invoker) return;
      this.scheduleCommand(command, target || targetElement.id, state, targetElement);
    };
    const executeConditional = (options) => {
      if (!invoker) return;
      if (options.onSuccess && options.onSuccess.length > 0) {
        invoker.dataset.afterSuccess = options.onSuccess.join(",");
      }
      if (options.onError && options.onError.length > 0) {
        invoker.dataset.afterError = options.onError.join(",");
      }
      if (options.onComplete && options.onComplete.length > 0) {
        invoker.dataset.afterComplete = options.onComplete.join(",");
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
  listen() {
    document.addEventListener("command", (e) => this.handleCommand(e), true);
  }
  /**
   * Registers the core library commands, now prefixed with `--`.
   */
  /**
   * Schedules a command for execution with optional state management.
   */
  async scheduleCommand(command, targetId, state, primaryTarget) {
    const commandKey = `${command}:${targetId}`;
    if (this.commandStates.get(commandKey) === "disabled") {
      return;
    }
    if (this.commandStates.get(commandKey) === "completed") {
      return;
    }
    this.executionQueue = this.executionQueue.then(async () => {
      const targetElement = document.getElementById(targetId) || (primaryTarget && targetId === primaryTarget.id ? primaryTarget : null);
      if (targetElement) {
        const mockEvent = {
          command,
          source: null,
          // No source for chained commands
          target: targetElement,
          preventDefault: () => {
          },
          type: "command"
        };
        await this.executeCustomCommand(command, mockEvent);
      }
    });
    if (state === "once") {
      this.commandStates.set(commandKey, "completed");
    } else if (state === "completed") {
      this.commandStates.set(commandKey, "completed");
    }
  }
  registerCoreLibraryCommands() {
    this.register("--toggle", async ({ getTargets, updateAriaState, invoker }) => {
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --toggle command",
          "warning" /* WARNING */,
          {
            command: "--toggle",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element id, or use aria-controls for multiple targets"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        const updateDOM = () => {
          targets.forEach((target) => {
            if (!target.isConnected) {
              console.warn("Invokers: Skipping disconnected target element", target);
              return;
            }
            target.toggleAttribute("hidden");
          });
          updateAriaState(targets);
        };
        await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      } catch (error) {
        throw createInvokerError(
          "Failed to toggle element visibility",
          "error" /* ERROR */,
          {
            command: "--toggle",
            element: invoker,
            cause: error,
            recovery: "Check that target elements are valid DOM elements"
          }
        );
      }
    });
    this.register("--show", async ({ getTargets, updateAriaState, manageGroupState, invoker }) => {
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --show command",
          "warning" /* WARNING */,
          {
            command: "--show",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element id"
          }
        );
        logInvokerError(error);
        return;
      }
      if (!targets[0].parentElement) {
        const error = createInvokerError(
          "Target element has no parent for --show command (cannot hide siblings)",
          "warning" /* WARNING */,
          {
            command: "--show",
            element: targets[0],
            recovery: "Use --toggle instead, or ensure the target element has siblings to manage"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        const allSiblings = Array.from(targets[0].parentElement.children);
        const updateDOM = () => {
          manageGroupState();
          allSiblings.forEach((child) => {
            if (child instanceof HTMLElement) {
              child.setAttribute("hidden", "");
            }
          });
          targets.forEach((target) => target.removeAttribute("hidden"));
          updateAriaState(targets);
        };
        await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      } catch (error) {
        throw createInvokerError(
          "Failed to show element and hide siblings",
          "error" /* ERROR */,
          {
            command: "--show",
            element: invoker,
            cause: error,
            recovery: "Check that target elements and their siblings are valid DOM elements"
          }
        );
      }
    });
    this.register("--hide", ({ getTargets, updateAriaState }) => {
      const targets = getTargets();
      if (targets.length === 0) return;
      targets.forEach((target) => target.setAttribute("hidden", ""));
      updateAriaState(targets);
    });
    this.register("--class", ({ invoker, getTargets, params }) => {
      const [action, className] = params;
      const targets = getTargets();
      if (!action || !className || targets.length === 0) {
        console.warn('Invokers: `--class` command requires an action and a class name (e.g., "--class:toggle:my-class").', invoker);
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
            console.warn(`Invokers: Unknown action "${action}" for '--class' command.`, invoker);
        }
      });
    });
    this.register("--text", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const value = valueParts.join(":");
      const targets = getTargets();
      if (!action) {
        throw createInvokerError(
          "Text command requires an action (set, append, prepend, or clear)",
          "error" /* ERROR */,
          {
            command: "--text",
            element: invoker,
            context: { params },
            recovery: "Use format: --text:set:Hello World or --text:append: more text"
          }
        );
      }
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --text command",
          "warning" /* WARNING */,
          {
            command: "--text",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element id"
          }
        );
        logInvokerError(error);
        return;
      }
      const validActions = ["set", "append", "prepend", "clear"];
      if (!validActions.includes(action)) {
        throw createInvokerError(
          `Invalid text action "${action}". Must be one of: ${validActions.join(", ")}`,
          "error" /* ERROR */,
          {
            command: "--text",
            element: invoker,
            context: { action, validActions },
            recovery: "Use a valid action like: --text:set:Hello or --text:append: World"
          }
        );
      }
      try {
        targets.forEach((target) => {
          if (!target.isConnected) {
            console.warn("Invokers: Skipping disconnected target element", target);
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
          "error" /* ERROR */,
          {
            command: "--text",
            element: invoker,
            cause: error,
            context: { action, value },
            recovery: "Check that target elements support text content updates"
          }
        );
      }
    });
    this.register("--attr", ({ invoker, getTargets, params }) => {
      const [action, attrName, attrValue] = params;
      const targets = getTargets();
      if (!action) {
        throw createInvokerError(
          "Attribute command requires an action (set, remove, or toggle)",
          "error" /* ERROR */,
          {
            command: "--attr",
            element: invoker,
            context: { params },
            recovery: "Use format: --attr:set:disabled:true or --attr:remove:disabled"
          }
        );
      }
      if (!attrName) {
        throw createInvokerError(
          "Attribute command requires an attribute name",
          "error" /* ERROR */,
          {
            command: "--attr",
            element: invoker,
            context: { action, params },
            recovery: "Specify the attribute name: --attr:set:data-value:123"
          }
        );
      }
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --attr command",
          "warning" /* WARNING */,
          {
            command: "--attr",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element id"
          }
        );
        logInvokerError(error);
        return;
      }
      const validActions = ["set", "remove", "toggle"];
      if (!validActions.includes(action)) {
        throw createInvokerError(
          `Invalid attribute action "${action}". Must be one of: ${validActions.join(", ")}`,
          "error" /* ERROR */,
          {
            command: "--attr",
            element: invoker,
            context: { action, validActions },
            recovery: "Use a valid action like: --attr:set:disabled:true or --attr:toggle:hidden"
          }
        );
      }
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(attrName)) {
        throw createInvokerError(
          `Invalid attribute name "${attrName}". Attribute names must start with a letter and contain only letters, numbers, and hyphens`,
          "error" /* ERROR */,
          {
            command: "--attr",
            element: invoker,
            context: { attrName },
            recovery: 'Use a valid HTML attribute name like "disabled" or "data-value"'
          }
        );
      }
      try {
        targets.forEach((target) => {
          if (!target.isConnected) {
            console.warn("Invokers: Skipping disconnected target element", target);
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
          "error" /* ERROR */,
          {
            command: "--attr",
            element: invoker,
            cause: error,
            context: { action, attrName, attrValue },
            recovery: "Check that the attribute operation is valid for the target elements"
          }
        );
      }
    });
    this.register("--pipeline", async ({ invoker, params }) => {
      const [action, pipelineId] = params;
      if (action !== "execute") {
        throw createInvokerError(
          `Invalid pipeline action "${action}". Only "execute" is supported`,
          "error" /* ERROR */,
          {
            command: "--pipeline",
            element: invoker,
            context: { action, availableActions: ["execute"] },
            recovery: "Use --pipeline:execute:your-pipeline-id"
          }
        );
      }
      if (!pipelineId) {
        throw createInvokerError(
          "Pipeline command requires a pipeline ID",
          "error" /* ERROR */,
          {
            command: "--pipeline",
            element: invoker,
            context: { params },
            recovery: "Use --pipeline:execute:your-pipeline-id"
          }
        );
      }
      const context = this.createContext(
        { command: "--pipeline:execute", source: invoker, target: invoker },
        "--pipeline:execute",
        params
      );
      await this.pipelineManager.executePipeline(pipelineId, context);
    });
  }
};
var PipelineManager = class {
  constructor(invokerManager) {
    this.invokerManager = invokerManager;
  }
  /**
   * Executes a pipeline defined in a template element.
   */
  async executePipeline(pipelineId, context) {
    const template = document.getElementById(pipelineId);
    if (!(template == null ? void 0 : template.hasAttribute("data-pipeline"))) {
      console.warn(`Invokers: Pipeline template "${pipelineId}" not found or not marked with data-pipeline attribute`);
      return;
    }
    try {
      const steps = this.parsePipelineSteps(template);
      let previousResult = { success: true };
      for (const step of steps) {
        if (this.shouldExecuteStep(step, previousResult)) {
          if (step.delay && step.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, step.delay));
          }
          previousResult = await this.executeStep(step, context);
          if (step.once) {
            this.removeStepFromTemplate(template, step);
          }
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
  parsePipelineSteps(template) {
    const steps = [];
    const content = template.content;
    const stepElements = content.querySelectorAll("pipeline-step");
    stepElements.forEach((stepEl, index) => {
      const command = stepEl.getAttribute("command");
      const target = stepEl.getAttribute("target");
      if (!command || !target) {
        console.warn(`Invokers: Pipeline step ${index} missing required command or target attribute`);
        return;
      }
      const step = {
        command,
        target,
        condition: stepEl.getAttribute("condition") || "always",
        once: stepEl.hasAttribute("once"),
        delay: parseInt(stepEl.getAttribute("delay") || "0", 10)
      };
      const data = {};
      Array.from(stepEl.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-")) {
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
  shouldExecuteStep(step, previousResult) {
    switch (step.condition) {
      case "success":
        return previousResult.success === true;
      case "error":
        return previousResult.success === false;
      case "always":
      default:
        return true;
    }
  }
  /**
   * Executes a single pipeline step.
   */
  async executeStep(step, context) {
    try {
      const syntheticInvoker = document.createElement("button");
      syntheticInvoker.setAttribute("type", "button");
      syntheticInvoker.setAttribute("command", step.command.startsWith("--") ? step.command : `--${step.command}`);
      syntheticInvoker.setAttribute("commandfor", step.target);
      if (step.data) {
        Object.entries(step.data).forEach(([key, value]) => {
          syntheticInvoker.setAttribute(key, value);
        });
      }
      await this.invokerManager.executeCommand(step.command, step.target, syntheticInvoker);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
  /**
   * Checks if there are error handlers after a given step index.
   */
  hasErrorHandler(steps, currentIndex) {
    return steps.slice(currentIndex + 1).some((step) => step.condition === "error");
  }
  /**
   * Removes a step from the template (for once-only steps).
   */
  removeStepFromTemplate(template, stepToRemove) {
    const content = template.content;
    const stepElements = content.querySelectorAll("pipeline-step");
    stepElements.forEach((stepEl) => {
      if (stepEl.getAttribute("command") === stepToRemove.command && stepEl.getAttribute("target") === stepToRemove.target) {
        stepEl.remove();
      }
    });
  }
};
var AndThenManager = class {
  constructor(invokerManager) {
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
  async processAndThen(invokerElement, executionResult, primaryTarget) {
    const topLevelAndThens = Array.from(invokerElement.children).filter(
      (child) => child.tagName.toLowerCase() === "and-then"
    );
    for (const andThenElement of topLevelAndThens) {
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
  async executeAndThenRecursively(andThenElement, originalInvoker, parentResult, primaryTarget, depth = 0) {
    if (depth > 25) {
      logInvokerError(createInvokerError(
        "Maximum <and-then> depth reached, stopping execution to prevent infinite loop.",
        "critical" /* CRITICAL */,
        { element: andThenElement, recovery: "Check for circular or excessively deep <and-then> nesting." }
      ));
      return;
    }
    const state = andThenElement.dataset.state;
    if (state === "disabled" || state === "completed") {
      return;
    }
    const condition = andThenElement.dataset.condition || "always";
    if (!this.shouldExecuteCondition(condition, parentResult)) {
      return;
    }
    const command = andThenElement.getAttribute("command");
    const targetId = andThenElement.getAttribute("commandfor") || originalInvoker.getAttribute("commandfor") || primaryTarget.id;
    const delay = parseInt(andThenElement.dataset.delay || "0", 10);
    if (!command || !targetId) {
      logInvokerError(createInvokerError(
        '<and-then> element is missing required "command" or "commandfor" attribute.',
        "warning" /* WARNING */,
        { element: andThenElement }
      ));
      return;
    }
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    let currentExecutionResult = { success: true };
    try {
      const syntheticInvoker = this.createSyntheticInvoker(andThenElement, command, targetId);
      await this.invokerManager.executeCommand(command, targetId, syntheticInvoker);
    } catch (error) {
      currentExecutionResult = { success: false, error };
    }
    if (andThenElement.hasAttribute("data-once")) {
      andThenElement.remove();
    } else {
      andThenElement.dataset.state = "completed";
    }
    const nestedAndThens = Array.from(andThenElement.children).filter(
      (child) => child.tagName.toLowerCase() === "and-then"
    );
    for (const nested of nestedAndThens) {
      await this.executeAndThenRecursively(
        nested,
        originalInvoker,
        currentExecutionResult,
        // Pass the result of *this* command down.
        primaryTarget,
        depth + 1
      );
    }
  }
  /**
   * Creates a temporary, in-memory <button> to act as the invoker for an
   * <and-then> command, allowing `data-*` attributes to be passed for context.
   */
  createSyntheticInvoker(andThenElement, command, targetId) {
    const syntheticInvoker = document.createElement("button");
    syntheticInvoker.setAttribute("command", command.startsWith("--") ? command : `--${command}`);
    syntheticInvoker.setAttribute("commandfor", targetId);
    for (const key in andThenElement.dataset) {
      syntheticInvoker.dataset[key] = andThenElement.dataset[key];
    }
    return syntheticInvoker;
  }
  /**
   * Determines if a condition is met based on the result of the parent command.
   */
  shouldExecuteCondition(condition, result) {
    switch (condition.toLowerCase()) {
      case "success":
        return result.success === true;
      case "error":
        return result.success === false;
      case "always":
        return true;
      default:
        logInvokerError(createInvokerError(
          `Unknown condition for <and-then> element: "${condition}"`,
          "warning" /* WARNING */
        ));
        return false;
    }
  }
};
var invokerInstance = new InvokerManager();
if (typeof window !== "undefined") {
  Object.defineProperty(window, "Invoker", {
    value: {
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
      parseCommandString,
      createCommandString,
      instance: invokerInstance,
      // Expose the instance for internal use
      // Debugging and development utilities
      get debug() {
        return isDebugMode;
      },
      set debug(value) {
        isDebugMode = value;
        if (value) {
          console.log("Invokers: Debug mode enabled. You will see detailed execution logs.");
        } else {
          console.log("Invokers: Debug mode disabled.");
        }
      },
      // Performance monitoring
      getStats() {
        return invokerInstance["performanceMonitor"].getStats();
      },
      // Development utilities
      getRegisteredCommands() {
        return Array.from(invokerInstance["commands"].keys());
      },
      // Error handling utilities
      validateElement,
      createError: createInvokerError,
      logError: logInvokerError,
      // Reset functionality for development
      reset() {
        invokerInstance["commands"].clear();
        invokerInstance["commandStates"].clear();
        invokerInstance["sortedCommandKeys"] = [];
        console.log("Invokers: Reset complete. All commands and states cleared.");
      }
    },
    configurable: true,
    writable: true
  });
}
if (typeof window !== "undefined") {
  try {
  } catch (e) {
  }
}

// src/invoker-commands.ts
var commands = {
  // --- Media Commands ---
  /**
   * `--media:toggle`: Toggles play/pause on a target `<video>` or `<audio>` element.
   * It automatically updates the invoker's text content (from `data-play-text` and
   * `data-pause-text`) and its `aria-pressed` state for accessibility.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--media:toggle"
   *   commandfor="my-video"
   *   data-play-text="Pause Video"
   *   data-pause-text="Play Video"
   * >
   *   Play Video
   * </button>
   * <video id="my-video" src="..."></video>
   * ```
   */
  "--media:toggle": async ({ invoker, targetElement }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["video", "audio"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--media:toggle",
        element: invoker,
        recovery: "Ensure commandfor points to a <video> or <audio> element."
      });
    }
    const media = targetElement;
    const playText = invoker.dataset.playText || "Pause";
    const pauseText = invoker.dataset.pauseText || "Play";
    try {
      if (media.paused) {
        await media.play();
        invoker.textContent = playText;
        invoker.setAttribute("aria-pressed", "true");
      } else {
        media.pause();
        invoker.textContent = pauseText;
        invoker.setAttribute("aria-pressed", "false");
      }
    } catch (error) {
      throw createInvokerError("Failed to toggle media playback", "error" /* ERROR */, {
        command: "--media:toggle",
        element: invoker,
        cause: error,
        recovery: error.name === "NotAllowedError" ? "Media autoplay blocked by browser. User interaction may be required." : "Check that the media element has a valid source and is ready to play."
      });
    }
  },
  /**
   * `--media:seek`: Seeks a target `<video>` or `<audio>` element forward or backward
   * by a specified number of seconds.
   *
   * @example
   * ```html
   * <button type="button" command="--media:seek:-10" commandfor="my-video">Rewind 10s</button>
   * <button type="button" command="--media:seek:30" commandfor="my-video">Forward 30s</button>
   * ```
   */
  "--media:seek": ({ invoker, targetElement, params }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["video", "audio"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--media:seek",
        element: invoker,
        recovery: "Ensure commandfor points to a <video> or <audio> element."
      });
    }
    const media = targetElement;
    const seekTime = parseFloat(params[0]);
    if (isNaN(seekTime)) {
      throw createInvokerError("Media seek command requires a numeric value for seconds", "error" /* ERROR */, {
        command: "--media:seek",
        element: invoker,
        context: { provided: params[0] },
        recovery: "Use format: --media:seek:10 (for 10s) or --media:seek:-5 (for -5s)."
      });
    }
    media.currentTime = Math.max(0, Math.min(media.duration, media.currentTime + seekTime));
  },
  /**
   * `--media:mute`: Toggles the mute state on a target `<video>` or `<audio>` element
   * and updates the invoker's `aria-pressed` state to reflect the current muted status.
   *
   * @example
   * ```html
   * <button type="button" command="--media:mute" commandfor="my-video" aria-pressed="false">Mute</button>
   * ```
   */
  "--media:mute": ({ invoker, targetElement }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["video", "audio"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--media:mute",
        element: invoker,
        recovery: "Ensure commandfor points to a <video> or <audio> element."
      });
    }
    const media = targetElement;
    media.muted = !media.muted;
    invoker.setAttribute("aria-pressed", String(media.muted));
  },
  // --- Carousel / Slider Commands ---
  /**
   * `--carousel:nav`: Navigates a carousel by showing the next or previous item.
   * Assumes items are direct children of the target, with visibility controlled by `hidden`.
   *
   * @example
   * ```html
   * <div id="my-carousel">
   *   <div>Slide 1</div>
   *   <div hidden>Slide 2</div>
   * </div>
   * <button type="button" command="--carousel:nav:prev" commandfor="my-carousel">‹</button>
   * <button type="button" command="--carousel:nav:next" commandfor="my-carousel">›</button>
   * ```
   */
  "--carousel:nav": ({ invoker, targetElement, params }) => {
    const [direction] = params;
    if (direction !== "next" && direction !== "prev") {
      throw createInvokerError('Carousel nav requires a direction parameter of "next" or "prev"', "error" /* ERROR */, {
        command: "--carousel:nav",
        element: invoker,
        recovery: "Use format: --carousel:nav:next or --carousel:nav:prev"
      });
    }
    const slides = Array.from(targetElement.children);
    if (slides.length < 2) return;
    const activeIndex = slides.findIndex((slide) => !slide.hasAttribute("hidden"));
    const currentIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = (direction === "next" ? currentIndex + 1 : currentIndex - 1 + slides.length) % slides.length;
    const updateDOM = () => {
      slides.forEach((slide, index) => {
        slide.toggleAttribute("hidden", index !== nextIndex);
      });
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  // --- Clipboard and Form Commands ---
  /**
   * `--clipboard:copy`: Copies the text content (or value for inputs) of the target
   * element to the clipboard. Provides visual feedback on the invoker button.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--clipboard:copy"
   *   commandfor="code-snippet"
   *   data-feedback-text="Copied!"
   * >
   *   Copy
   * </button>
   * <pre id="code-snippet">npm install invokers</pre>
   * ```
   */
  "--clipboard:copy": async ({ invoker, targetElement }) => {
    if (!navigator.clipboard) {
      throw createInvokerError("Clipboard API not available", "error" /* ERROR */, {
        command: "--clipboard:copy",
        element: invoker,
        recovery: "This feature requires a secure context (HTTPS)."
      });
    }
    const originalText = invoker.textContent || "";
    const feedbackText = invoker.dataset.feedbackText || "Copied!";
    const errorText = invoker.dataset.errorText || "Error!";
    const textToCopy = targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement ? targetElement.value : targetElement.textContent || "";
    invoker.setAttribute("disabled", "");
    try {
      await navigator.clipboard.writeText(textToCopy);
      invoker.textContent = feedbackText;
    } catch (err) {
      invoker.textContent = errorText;
      throw createInvokerError("Failed to copy text to clipboard", "error" /* ERROR */, {
        command: "--clipboard:copy",
        element: invoker,
        cause: err
      });
    } finally {
      setTimeout(() => {
        invoker.textContent = originalText;
        invoker.removeAttribute("disabled");
      }, 2e3);
    }
  },
  /**
   * `--form:reset`: Resets the target `<form>` element.
   * @example `<button command="--form:reset" commandfor="my-form">Reset</button>`
   */
  "--form:reset": ({ invoker, targetElement }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["form"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form reset failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--form:reset",
        element: invoker,
        recovery: "Ensure commandfor points to a <form> element."
      });
    }
    targetElement.reset();
  },
  /**
   * `--form:submit`: Submits the target `<form>` element.
   * @example `<button command="--form:submit" commandfor="my-form">Submit</button>`
   */
  "--form:submit": ({ invoker, targetElement }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["form"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form submit failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--form:submit",
        element: invoker,
        recovery: "Ensure commandfor points to a <form> element."
      });
    }
    targetElement.requestSubmit();
  },
  /**
   * `--input:step`: Increments/decrements a target `<input type="number">`.
   *
   * @example
   * ```html
   * <button command="--input:step:-1" commandfor="quantity">-</button>
   * <input type="number" id="quantity" value="1" min="0">
   * <button command="--input:step:1" commandfor="quantity">+</button>
   * ```
   */
  "--input:step": ({ invoker, targetElement, params }) => {
    if (!(targetElement instanceof HTMLInputElement) || targetElement.type !== "number") {
      throw createInvokerError('Input step target must be an <input type="number">', "error" /* ERROR */, {
        command: "--input:step",
        element: invoker
      });
    }
    const stepAmount = parseFloat(params[0] || "1");
    if (isNaN(stepAmount)) {
      throw createInvokerError("Input step requires a valid numeric parameter", "error" /* ERROR */, {
        command: "--input:step",
        element: invoker,
        context: { provided: params[0] },
        recovery: "Use --input:step:1 or --input:step:-1"
      });
    }
    if (stepAmount > 0) targetElement.stepUp(stepAmount);
    else if (stepAmount < 0) targetElement.stepDown(Math.abs(stepAmount));
    targetElement.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  },
  // --- Scroll Commands ---
  /**
   * `--scroll:to`: Smoothly scrolls the viewport to bring the target element into view.
   * @example `<button command="--scroll:to" commandfor="section-2">Go to Section 2</button>`
   */
  "--scroll:to": ({ targetElement }) => {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  },
  // --- DOM Manipulation Commands ---
  /**
   * `--dom:remove`: Removes the target element from the DOM.
   * @example `<button command="--dom:remove" commandfor="alert-1">&times;</button>`
   */
  "--dom:remove": ({ targetElement }) => {
    const updateDOM = () => targetElement.remove();
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:replace`: Replaces the target element with content from a `<template>`.
   * @example `<button command="--dom:replace" commandfor="placeholder" data-template-id="content">Load</button>`
   */
  "--dom:replace": ({ invoker, targetElement }) => {
    const sourceNode = getSourceNode(invoker, "replace");
    const updateDOM = () => targetElement.replaceWith(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:swap`: Swaps the inner content of the target with content from a `<template>`.
   * @example `<button command="--dom:swap" commandfor="content-area" data-template-id="panel-2">Load Panel 2</button>`
   */
  "--dom:swap": ({ invoker, targetElement }) => {
    const sourceNode = getSourceNode(invoker, "swap");
    const updateDOM = () => targetElement.replaceChildren(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:append`: Appends content from a `<template>` to the target.
   * @example `<button command="--dom:append" commandfor="item-list" data-template-id="new-item">Add</button>`
   */
  "--dom:append": ({ invoker, targetElement }) => {
    const sourceNode = getSourceNode(invoker, "append");
    targetElement.append(sourceNode.cloneNode(true));
  },
  /**
   * `--dom:prepend`: Prepends content from a `<template>` to the target.
   * @example `<button command="--dom:prepend" commandfor="log" data-template-id="new-log">Log</button>`
   */
  "--dom:prepend": ({ invoker, targetElement }) => {
    const sourceNode = getSourceNode(invoker, "prepend");
    targetElement.prepend(sourceNode.cloneNode(true));
  },
  /**
   * `--text:copy`: Copies the `textContent` from one element to another.
   * The source element is specified via a CSS selector in `data-copy-from` on the invoker.
   * If `data-copy-from` is omitted, it copies the invoker's own `textContent`.
   */
  "--text:copy": (context) => {
    const { invoker, targetElement } = context;
    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement = invoker;
    if (sourceSelector) {
      sourceElement = document.querySelector(sourceSelector);
      if (!sourceElement) {
        throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, "error" /* ERROR */, {
          command: "--text:copy",
          element: invoker
        });
      }
    }
    const textToCopy = sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement ? sourceElement.value : sourceElement.textContent || "";
    targetElement.textContent = textToCopy;
  },
  // --- Fetch and Navigation Commands ---
  /**
   * `--fetch:get`: Performs a GET request and swaps the response HTML into the target.
   * Supports loading/error states via templates.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:get"
   *   data-url="/api/content"
   *   commandfor="content-area"
   *   data-loading-template="spinner-template"
   *   data-after-error="--class:add:load-error"
   * >
   *   Load Content
   * </button>
   * ```
   */
  "--fetch:get": async ({ invoker, targetElement }) => {
    const url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError("Fetch GET command requires a data-url attribute", "error" /* ERROR */, {
        command: "--fetch:get",
        element: invoker,
        recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }
    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw createInvokerError(`HTTP Error: ${response.status} ${response.statusText}`, "error" /* ERROR */, {
          command: "--fetch:get",
          element: invoker,
          context: { url, status: response.status }
        });
      }
      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => targetElement.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, targetElement, "data-error-template");
      if (error instanceof Error && "severity" in error) throw error;
      throw createInvokerError("Fetch GET failed", "error" /* ERROR */, {
        command: "--fetch:get",
        element: invoker,
        cause: error,
        context: { url },
        recovery: "Check the URL, network connection, and server response."
      });
    } finally {
      setBusyState(invoker, false);
    }
  },
  /**
   * `--fetch:send`: Submits the target `<form>` via a POST/PUT/DELETE request.
   * The response is swapped into the element from `data-response-target`, or the form itself.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post"></form>
   * <button type="button"
   *   command="--fetch:send"
   *   commandfor="my-form"
   *   data-response-target="#response-area"
   * >
   *   Submit via Fetch
   * </button>
   * ```
   */
  "--fetch:send": async ({ invoker, targetElement }) => {
    const validationErrors = validateElement(targetElement, { tagName: ["form"] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Fetch send failed: ${validationErrors.join(", ")}`, "error" /* ERROR */, {
        command: "--fetch:send",
        element: invoker,
        recovery: "Ensure commandfor points to a <form> element."
      });
    }
    const form = targetElement;
    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector(responseSelector) : form;
    if (!responseTarget) {
      throw createInvokerError(`Response target "${responseSelector}" not found`, "error" /* ERROR */, {
        command: "--fetch:send",
        element: invoker
      });
    }
    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");
    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: getHeadersFromAttributes(invoker)
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => responseTarget.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, responseTarget, "data-error-template");
      throw createInvokerError("Fetch send failed", "error" /* ERROR */, {
        command: "--fetch:send",
        element: invoker,
        cause: error,
        recovery: "Check the form action, network connection, and server response."
      });
    } finally {
      setBusyState(invoker, false);
    }
  },
  /**
   * `--navigate:to`: Navigates to a new URL using the History API.
   *
   * @example
   * ```html
   * <button type="button" command="--navigate:to:/about">Go to About Page</button>
   * ```
   */
  "--navigate:to": (context) => {
    var _a;
    const url = context.params.join(":");
    if (!url) {
      throw createInvokerError("Navigate command requires a URL parameter", "error" /* ERROR */, {
        command: "--navigate:to",
        element: context.invoker,
        recovery: "Use format: --navigate:to:/your/path"
      });
    }
    if ((_a = window.history) == null ? void 0 : _a.pushState) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else {
      window.location.href = url;
    }
  }
};
function registerAll(specificCommands) {
  if (!window.Invoker) {
    console.error("Invokers: Core library not found. Ensure it is loaded before the commands module.");
    return;
  }
  const commandsToRegister = specificCommands || Object.keys(commands);
  for (const name of commandsToRegister) {
    const prefixedName = name.startsWith("--") ? name : `--${name}`;
    if (commands[prefixedName]) {
      window.Invoker.register(prefixedName, commands[prefixedName]);
    }
  }
}
function getSourceNode(invoker, commandName) {
  const templateId = invoker.dataset.templateId;
  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      throw createInvokerError(`Source <template> with ID "${templateId}" not found`, "error" /* ERROR */, {
        command: `--dom:${commandName}`,
        element: invoker
      });
    }
    return template.content;
  }
  throw createInvokerError(`DOM command --dom:${commandName} requires a data-template-id attribute`, "error" /* ERROR */, {
    command: `--dom:${commandName}`,
    element: invoker
  });
}
function setBusyState(invoker, isBusy) {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}
function showFeedbackState(invoker, target, templateAttr) {
  const templateKey = templateAttr.replace("data-", "").replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const templateId = invoker.dataset[templateKey];
  if (!templateId || !target) return;
  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    const error = createInvokerError(`Feedback template "#${templateId}" not found or is not a <template>`, "warning" /* WARNING */, { element: invoker });
    console.error(error);
    return;
  }
  target.replaceChildren(template.content.cloneNode(true));
}
function parseHTML(html) {
  const sanitizedHTML = sanitizeHTML(html);
  const doc = new DOMParser().parseFromString(sanitizedHTML, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}
function getHeadersFromAttributes(invoker) {
  const headers = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr.substring(6).replace(/([A-Z])/g, "-$1").toLowerCase();
      if (headerName) headers[headerName] = invoker.dataset[attr];
    }
  }
  return headers;
}
export {
  commands,
  registerAll
};
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
/**
 * @file interest-invokers.ts
 * @summary Interest Invokers polyfill and TypeScript support for the Invokers library
 * @description
 * This module provides comprehensive support for Interest Invokers as specified in:
 * https://open-ui.org/components/interest-invokers.explainer/
 * 
 * Based on the official polyfill by Mason Freed with TypeScript adaptation
 * and integration with the existing Invokers library patterns.
 * 
 * @author Mason Freed (original polyfill), Patrick Glenn (TypeScript adaptation)
 * @license MIT / BSD (compatible with original polyfill license)
 */
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
//# sourceMappingURL=commands.js.map

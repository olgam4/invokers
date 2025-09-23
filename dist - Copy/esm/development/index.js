// src/polyfill.ts
function isSupported() {
  const target = typeof window !== "undefined" ? window : globalThis;
  return typeof HTMLButtonElement !== "undefined" && "command" in HTMLButtonElement.prototype && // @ts-ignore
  "source" in ((target.CommandEvent || {}).prototype || {});
}
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
        if (this.localName !== "button" && this.localName !== "input" && this.localName !== "textarea") {
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
  const target = typeof window !== "undefined" ? window : globalThis;
  if (isSupported()) {
    return;
  }
  if (target.CommandEvent === CommandEventPolyfill) {
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
  applyInvokerMixin(HTMLInputElement);
  applyInvokerMixin(HTMLTextAreaElement);
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
  if (typeof target["CommandEvent"] === "undefined") {
    Object.defineProperty(target, "CommandEvent", {
      value: CommandEventPolyfill,
      configurable: true,
      writable: true,
      enumerable: false
    });
  } else {
    console.warn("Invokers Polyfill: `CommandEvent` already exists. The polyfill's CommandEvent will not overwrite it.");
  }
  if (typeof target["InvokeEvent"] === "undefined") {
    Object.defineProperty(target, "InvokeEvent", {
      value: InvokeEventPolyfill,
      configurable: true,
      writable: true,
      enumerable: false
    });
  }
}
apply();

// src/expression-lexer.ts
var TOKEN_REGEX = [
  [1 /* NUMBER */, /^[0-9]+(\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/],
  [2 /* STRING */, /^'(?:[^'\\]|\\.)*'|^"(?:[^"\\]|\\.)*"/],
  [5 /* BOOLEAN */, /^(true|false)\b/],
  [6 /* NULL */, /^null\b/],
  [0 /* IDENTIFIER */, /^[a-zA-Z_$][a-zA-Z0-9_$]*/],
  [3 /* OPERATOR */, /^(===|!==|==|!=|<=|>=|&&|\|\||[<>\+\-\*\/%?!])/],
  [4 /* DOT */, /^\./],
  [7 /* LPAREN */, /^\(/],
  [8 /* RPAREN */, /^\)/],
  [9 /* LBRACKET */, /^\[/],
  [10 /* RBRACKET */, /^\]/],
  [11 /* COLON */, /^:/]
];
var _Lexer = class _Lexer {
  tokenize(input) {
    if (typeof input !== "string") {
      throw new Error("Invokers Expression Error: Expression must be a string");
    }
    if (input.length > _Lexer.MAX_EXPRESSION_LENGTH) {
      throw new Error(`Invokers Expression Error: Expression too long (max ${_Lexer.MAX_EXPRESSION_LENGTH} characters)`);
    }
    if (input.includes("\0") || input.includes("\u2028") || input.includes("\u2029")) {
      throw new Error("Invokers Expression Error: Expression contains invalid characters");
    }
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /XMLHttpRequest/i,
      /fetch\s*\(/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /process\./i,
      /globalThis\./i,
      /window\./i,
      /document\./i,
      /console\./i,
      /alert\s*\(/i,
      /prompt\s*\(/i,
      /confirm\s*\(/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        throw new Error("Invokers Expression Error: Expression contains potentially unsafe operations");
      }
    }
    const tokens = [];
    let cursor = 0;
    while (cursor < input.length) {
      if (tokens.length >= _Lexer.MAX_TOKEN_COUNT) {
        throw new Error(`Invokers Expression Error: Expression too complex (max ${_Lexer.MAX_TOKEN_COUNT} tokens)`);
      }
      if (/\s/.test(input[cursor])) {
        cursor++;
        continue;
      }
      let matched = false;
      for (const [type, regex] of TOKEN_REGEX) {
        const match = input.substring(cursor).match(regex);
        if (match) {
          if (type === 0 /* IDENTIFIER */) {
            const identifier = match[0];
            if (this.isDangerousIdentifier(identifier)) {
              throw new Error(`Invokers Expression Error: Access to '${identifier}' is not allowed`);
            }
          }
          tokens.push({
            type,
            value: match[0],
            position: cursor
          });
          cursor += match[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const char = input[cursor];
        const start = Math.max(0, cursor - 10);
        const end = Math.min(input.length, cursor + 10);
        const context = input.substring(start, end);
        const pointer = " ".repeat(cursor - start) + "^";
        throw new Error(`Invokers Expression Error: Unexpected character '${char}' at position ${cursor}
${context}
${pointer}`);
      }
    }
    tokens.push({
      type: 12 /* EOF */,
      value: "",
      position: cursor
    });
    return tokens;
  }
  isDangerousIdentifier(identifier) {
    const dangerousIdentifiers = [
      // Global objects (allow 'this' as it's a context variable)
      "globalThis",
      "global",
      "self",
      // Browser APIs
      "document",
      "navigator",
      "location",
      "history",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "cookies",
      "XMLHttpRequest",
      "fetch",
      "WebSocket",
      // Node.js globals
      "process",
      "Buffer",
      "require",
      "module",
      "exports",
      "__dirname",
      "__filename",
      // Dangerous functions
      "eval",
      "Function",
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      "alert",
      "prompt",
      "confirm",
      "console",
      "debugger",
      // Prototype pollution
      "prototype",
      "constructor",
      // Other dangerous properties
      "innerHTML",
      "outerHTML",
      "innerText",
      "insertAdjacentHTML"
    ];
    return dangerousIdentifiers.includes(identifier) || identifier.startsWith("__") || identifier.includes("script") || identifier.includes("javascript") || identifier.includes("vbscript");
  }
};
_Lexer.MAX_EXPRESSION_LENGTH = 1e4;
_Lexer.MAX_TOKEN_COUNT = 1e3;
var Lexer = _Lexer;

// src/expression-parser.ts
var ExpressionParser = class {
  constructor(tokens) {
    this.current = 0;
    this.tokens = tokens;
  }
  parse() {
    const expr = this.expression();
    if (!this.isAtEnd()) {
      const token = this.peek();
      throw new Error(`Invokers Expression Error: Unexpected token '${token.value}' at position ${token.position}. Expected end of expression.`);
    }
    return expr;
  }
  expression() {
    return this.conditional();
  }
  conditional() {
    let expr = this.logicalOr();
    if (this.match(3 /* OPERATOR */, "?")) {
      const test = expr;
      const consequent = this.expression();
      this.consume(11 /* COLON */, "Expected ':' after '?' in conditional expression");
      const alternate = this.conditional();
      return {
        type: "CONDITIONAL" /* CONDITIONAL */,
        test,
        consequent,
        alternate
      };
    }
    return expr;
  }
  logicalOr() {
    let expr = this.logicalAnd();
    while (this.match(3 /* OPERATOR */, "||")) {
      const operator = "||";
      const right = this.logicalAnd();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  logicalAnd() {
    let expr = this.equality();
    while (this.match(3 /* OPERATOR */, "&&")) {
      const operator = "&&";
      const right = this.equality();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  equality() {
    let expr = this.comparison();
    while (this.match(3 /* OPERATOR */, "===", "!==", "==", "!=")) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  comparison() {
    let expr = this.term();
    while (this.match(3 /* OPERATOR */, "<", ">", "<=", ">=")) {
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  term() {
    let expr = this.factor();
    while (this.match(3 /* OPERATOR */, "+", "-")) {
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  factor() {
    let expr = this.unary();
    while (this.match(3 /* OPERATOR */, "*", "/", "%")) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: "BINARY_OP" /* BINARY_OP */,
        left: expr,
        operator,
        right
      };
    }
    return expr;
  }
  unary() {
    if (this.match(3 /* OPERATOR */, "!", "-")) {
      const operator = this.previous().value;
      const right = this.unary();
      return {
        type: "UNARY_OP" /* UNARY_OP */,
        operator,
        right
      };
    }
    return this.memberAccess();
  }
  memberAccess() {
    let expr = this.primary();
    while (true) {
      if (this.match(4 /* DOT */)) {
        const property = this.consume(0 /* IDENTIFIER */, "Expected property name after '.'").value;
        expr = {
          type: "MEMBER_ACCESS" /* MEMBER_ACCESS */,
          object: expr,
          property
        };
      } else if (this.match(9 /* LBRACKET */)) {
        const index = this.expression();
        this.consume(10 /* RBRACKET */, "Expected ']' after array index");
        expr = {
          type: "ARRAY_ACCESS" /* ARRAY_ACCESS */,
          object: expr,
          index
        };
      } else {
        break;
      }
    }
    return expr;
  }
  primary() {
    if (this.match(1 /* NUMBER */)) {
      return {
        type: "LITERAL" /* LITERAL */,
        value: parseFloat(this.previous().value)
      };
    }
    if (this.match(2 /* STRING */)) {
      const str = this.previous().value;
      return {
        type: "LITERAL" /* LITERAL */,
        value: str.slice(1, -1)
      };
    }
    if (this.match(5 /* BOOLEAN */)) {
      return {
        type: "LITERAL" /* LITERAL */,
        value: this.previous().value === "true"
      };
    }
    if (this.match(6 /* NULL */)) {
      return {
        type: "LITERAL" /* LITERAL */,
        value: null
      };
    }
    if (this.match(0 /* IDENTIFIER */)) {
      return {
        type: "IDENTIFIER" /* IDENTIFIER */,
        value: this.previous().value
      };
    }
    if (this.match(7 /* LPAREN */)) {
      const expr = this.expression();
      this.consume(8 /* RPAREN */, "Expected ')' after expression");
      return expr;
    }
    throw new Error(`Invokers Expression Error: Unexpected token at position ${this.peek().position}: '${this.peek().value}'`);
  }
  match(first, ...rest) {
    if (Array.isArray(first)) {
      for (const type of first) {
        if (this.check(type)) {
          this.advance();
          return true;
        }
      }
      return false;
    } else {
      if (this.check(first)) {
        if (rest.length === 0 || rest.includes(this.peek().value)) {
          this.advance();
          return true;
        }
      }
      return false;
    }
  }
  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw new Error(`Invokers Expression Error: ${message}. Found '${this.peek().value}' at position ${this.peek().position}`);
  }
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  isAtEnd() {
    return this.peek().type === 12 /* EOF */;
  }
  peek() {
    return this.tokens[this.current];
  }
  previous() {
    return this.tokens[this.current - 1];
  }
};

// src/expression-evaluator.ts
var _ExpressionEvaluator = class _ExpressionEvaluator {
  constructor(context) {
    this.recursionDepth = 0;
    this.context = this.sanitizeContext(context);
  }
  sanitizeContext(context) {
    const safeContext = {};
    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeProperty(key)) {
        safeContext[key] = this.sanitizeValue(value);
      }
    }
    return safeContext;
  }
  sanitizeValue(value) {
    if (value === null || value === void 0) {
      return value;
    }
    if (typeof value === "function") {
      return void 0;
    }
    if (Array.isArray(value)) {
      return value.slice(0, 1e3);
    }
    if (typeof value === "object" && value !== null) {
      if (value.constructor !== Object && !Array.isArray(value)) {
        return this.createSafeDOMObject(value);
      }
      return this.sanitizeObject(value, 0);
    }
    return value;
  }
  sanitizeObject(obj, depth) {
    if (depth > 50) return {};
    const safeObj = {};
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (count >= 50) break;
      if (this.isSafeProperty(key)) {
        safeObj[key] = this.sanitizeValue(value);
        count++;
      }
    }
    return safeObj;
  }
  isSafeProperty(key) {
    return !key.startsWith("__") && !["prototype", "constructor", "__proto__", "window", "document", "eval", "Function"].includes(key) && key.length <= 50;
  }
  createSafeDOMObject(domObject) {
    return new Proxy(domObject, {
      get: (target, property) => {
        if (typeof property === "string" && this.isSafeProperty(property)) {
          const value = target[property];
          if (typeof value === "function") {
            return void 0;
          }
          if (typeof value !== "object" || value === null) {
            return value;
          }
          return this.sanitizeValue(value);
        }
        return void 0;
      },
      set: () => false,
      // Don't allow setting properties
      has: (target, property) => {
        return typeof property === "string" && this.isSafeProperty(property) && property in target;
      }
    });
  }
  evaluate(node) {
    if (this.recursionDepth > _ExpressionEvaluator.MAX_RECURSION_DEPTH) {
      throw new Error("Invokers Expression Error: Maximum recursion depth exceeded");
    }
    this.recursionDepth++;
    try {
      switch (node.type) {
        case "LITERAL" /* LITERAL */:
          return node.value;
        case "IDENTIFIER" /* IDENTIFIER */:
          return this.resolveIdentifier(node.value);
        case "BINARY_OP" /* BINARY_OP */:
          return this.evaluateBinaryOp(node);
        case "UNARY_OP" /* UNARY_OP */:
          return this.evaluateUnaryOp(node);
        case "MEMBER_ACCESS" /* MEMBER_ACCESS */:
          return this.evaluateMemberAccess(node);
        case "ARRAY_ACCESS" /* ARRAY_ACCESS */:
          return this.evaluateArrayAccess(node);
        case "CONDITIONAL" /* CONDITIONAL */:
          return this.evaluateConditional(node);
        default:
          throw new Error(`Invokers Expression Error: Unknown AST node type: ${node.type}`);
      }
    } finally {
      this.recursionDepth--;
    }
  }
  evaluateBinaryOp(node) {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);
    const op = node.operator;
    if (left === void 0 || left === null || Number.isNaN(left) || (right === void 0 || right === null || Number.isNaN(right))) {
      switch (op) {
        case "===":
          return left === right;
        case "!==":
          return left !== right;
        case "==":
          return left == right;
        // eslint-disable-line eqeqeq
        case "!=":
          return left != right;
        // eslint-disable-line eqeqeq
        case "&&":
          return left && right;
        case "||":
          return left || right;
        default:
          if (["+", "-", "*", "/", "%"].includes(op)) {
            return Number.NaN;
          }
          return false;
      }
    }
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) throw new Error("Invokers Expression Error: Division by zero");
        return left / right;
      case "%":
        return left % right;
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      case "==":
        return left == right;
      // eslint-disable-line eqeqeq
      case "!=":
        return left != right;
      // eslint-disable-line eqeqeq
      case "<":
        return left < right;
      case ">":
        return left > right;
      case "<=":
        return left <= right;
      case ">=":
        return left >= right;
      case "&&":
        return left && right;
      case "||":
        return left || right;
      default:
        throw new Error(`Invokers Expression Error: Unknown binary operator: ${op}`);
    }
  }
  evaluateUnaryOp(node) {
    const right = this.evaluate(node.right);
    const op = node.operator;
    switch (op) {
      case "!":
        return !right;
      case "-":
        return -right;
      default:
        throw new Error(`Invokers Expression Error: Unknown unary operator: ${op}`);
    }
  }
  evaluateMemberAccess(node) {
    const object = this.evaluate(node.object);
    if (object != null && (typeof object === "object" || typeof object === "string")) {
      const property = node.property;
      if (typeof property === "string" && this.isSafeProperty(property)) {
        return object[property];
      }
    }
    return void 0;
  }
  evaluateArrayAccess(node) {
    const object = this.evaluate(node.object);
    const index = this.evaluate(node.index);
    if (typeof index === "string") {
      if (!this.isSafeProperty(index)) {
        return void 0;
      }
    } else if (typeof index === "number") {
      if (index < 0 || index > 1e4 || !Number.isInteger(index)) {
        return void 0;
      }
    } else {
      return void 0;
    }
    if (object && (typeof object === "object" || Array.isArray(object)) && index in object) {
      return object[index];
    }
    return void 0;
  }
  resolveIdentifier(name) {
    if (!this.isSafeProperty(name)) {
      throw new Error(`Invokers Expression Error: Access to '${name}' is not allowed`);
    }
    if (name in this.context) {
      return this.context[name];
    }
    return void 0;
  }
  evaluateConditional(node) {
    const test = this.evaluate(node.test);
    return test ? this.evaluate(node.consequent) : this.evaluate(node.alternate);
  }
};
_ExpressionEvaluator.MAX_RECURSION_DEPTH = 100;
var ExpressionEvaluator = _ExpressionEvaluator;

// src/expression.ts
var ExpressionCache = class {
  constructor(maxSize = 100) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
  }
  get(key) {
    const value = this.cache.get(key);
    if (value !== void 0) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== void 0) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
  clear() {
    this.cache.clear();
  }
};
var expressionCache = new ExpressionCache();
var _ExpressionRateLimiter = class _ExpressionRateLimiter {
  constructor() {
    this.evaluations = [];
  }
  canEvaluate() {
    const now = Date.now();
    this.evaluations = this.evaluations.filter((time) => now - time < _ExpressionRateLimiter.WINDOW_SIZE_MS);
    if (this.evaluations.length >= _ExpressionRateLimiter.MAX_EVALUATIONS_PER_SECOND) {
      return false;
    }
    this.evaluations.push(now);
    return true;
  }
};
_ExpressionRateLimiter.MAX_EVALUATIONS_PER_SECOND = 1e3;
_ExpressionRateLimiter.WINDOW_SIZE_MS = 1e3;
var ExpressionRateLimiter = _ExpressionRateLimiter;
var rateLimiter = new ExpressionRateLimiter();
function evaluateExpression(expression, context) {
  if (!rateLimiter.canEvaluate()) {
    console.warn("Invokers: Expression evaluation rate limit exceeded");
    return void 0;
  }
  try {
    let ast = expressionCache.get(expression);
    if (!ast) {
      const lexer = new Lexer();
      const tokens = lexer.tokenize(expression);
      const parser = new ExpressionParser(tokens);
      ast = parser.parse();
      expressionCache.set(expression, ast);
    }
    const evaluator = new ExpressionEvaluator(context);
    return evaluator.evaluate(ast);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not allowed") || errorMessage.includes("potentially unsafe") || errorMessage.includes("invalid characters") || errorMessage.includes("Maximum recursion depth") || errorMessage.includes("Expression too")) {
      throw error;
    }
    if (errorMessage.includes("Maximum call stack")) {
      throw new Error("Invokers Expression Error: Maximum recursion depth exceeded");
    }
    console.error(`Invokers Expression Error in "${expression}": ${errorMessage}`);
    return void 0;
  }
}

// src/utils.ts
function generateUid(prefix = "invoker", length = 8) {
  let randomPart = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    randomPart = Array.from(array, (byte) => byte.toString(36)).join("").slice(0, length);
  } else {
    randomPart = Math.random().toString(36).substring(2, 2 + length);
  }
  return `${prefix}-${randomPart}`;
}

// src/interpolation.ts
function interpolateString(template, context) {
  if (typeof template !== "string") {
    return "";
  }
  if (template.length > 1e4) {
    console.warn("Invokers: Template too large, truncating");
    template = template.substring(0, 1e4);
  }
  let result = template;
  let replacements = 0;
  result = result.replace(/\{\{(.*?)\}\}/g, (_, expression) => {
    replacements++;
    if (replacements > 50) {
      console.warn("Invokers: Too many interpolations in template, stopping");
      return "";
    }
    try {
      if (expression.trim() === "__uid") {
        return generateUid();
      }
      const value = evaluateExpression(expression.trim(), context);
      return value !== void 0 && value !== null ? String(value) : "";
    } catch (error) {
      console.warn(`Invokers: Expression evaluation failed in interpolation: ${expression}`, error);
      return "";
    }
  });
  return result;
}

// src/target-resolver.ts
function resolveTargets(selector, invoker) {
  const trimmedSelector = selector.trim();
  if (trimmedSelector.startsWith("@")) {
    const match = trimmedSelector.match(/^@([a-z]+)\((.*)\)$/);
    if (match) {
      const type = match[1];
      let innerSelector = match[2];
      innerSelector = innerSelector.replace(/\\([()])/g, "$1");
      switch (type) {
        case "closest":
          const closest = invoker.closest(innerSelector);
          return closest ? [closest] : [];
        case "child":
          const child = invoker.querySelector(innerSelector);
          return child ? [child] : [];
        case "children":
          return Array.from(invoker.querySelectorAll(innerSelector));
        default:
          console.warn(`Invokers: Unknown contextual selector type "@${type}".`);
          return [];
      }
    }
    return [];
  }
  if (trimmedSelector.startsWith("#")) {
    const element = document.querySelector(trimmedSelector);
    return element ? [element] : [];
  }
  const elementById = document.getElementById(trimmedSelector);
  if (elementById) {
    return [elementById];
  }
  try {
    return Array.from(document.querySelectorAll(trimmedSelector));
  } catch (e) {
    console.error(`Invokers: Invalid CSS selector in commandfor: "${trimmedSelector}"`, e);
    return [];
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
   * Supports `:outer` (default) to replace the entire element, or `:inner` to replace inner content.
   * Alias for `--dom:swap:outer` and `--dom:swap:inner` respectively.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:replace" commandfor="placeholder" data-template-id="content">Load</button>`
   * @example `<button command="--dom:replace:inner" commandfor="content-area" data-template-id="panel-2">Update Content</button>`
   */
  "--dom:replace": ({ invoker, targetElement, params }) => {
    const style = params[0] || "outer";
    let fragment = getSourceNode(invoker, "replace").cloneNode(true);
    if (isInterpolationEnabled()) {
      fragment = processTemplateFragment(fragment, invoker);
    }
    const updateDOM = () => {
      if (style === "inner") {
        targetElement.replaceChildren(fragment);
      } else {
        targetElement.replaceWith(fragment);
      }
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:swap`: Swaps content of the target with content from a `<template>`.
   * Supports `:inner` (default) to replace inner content, or `:outer` to replace the entire element.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:swap" commandfor="content-area" data-template-id="panel-2">Load Panel 2</button>`
   * @example `<button command="--dom:swap:outer" commandfor="content-area" data-template-id="panel-2">Replace Element</button>`
   */
  "--dom:swap": ({ invoker, targetElement, params }) => {
    const [swapType = "inner"] = params;
    let fragment = getSourceNode(invoker, "swap").cloneNode(true);
    if (isInterpolationEnabled()) {
      const context = {
        this: {
          ...invoker,
          dataset: { ...invoker.dataset },
          value: invoker.value || ""
        },
        data: document.body.dataset,
        event: invoker.triggeringEvent
      };
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(fragment.cloneNode(true));
      const html = tempDiv.innerHTML;
      const interpolatedHtml = interpolateString(html, context);
      tempDiv.innerHTML = interpolatedHtml;
      const interpolatedFragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        interpolatedFragment.appendChild(tempDiv.firstChild);
      }
      fragment = processTemplateFragment(interpolatedFragment, invoker);
    }
    const updateDOM = () => {
      if (swapType === "outer") {
        targetElement.replaceWith(fragment);
      } else {
        targetElement.replaceChildren(fragment);
      }
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:append`: Appends content from a `<template>` to the target.
   * Supports `:inner` (default) to append as last child, or `:outer` to insert after the target.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:append" commandfor="item-list" data-template-id="new-item">Add</button>`
   * @example `<button command="--dom:append:outer" commandfor="#item-1" data-template-id="item-2">Load Next</button>`
   */
  "--dom:append": ({ invoker, targetElement, params }) => {
    const style = params[0] || "inner";
    let fragment = getSourceNode(invoker, "append").cloneNode(true);
    if (isInterpolationEnabled()) {
      fragment = processTemplateFragment(fragment, invoker);
    }
    const updateDOM = () => {
      if (style === "outer") {
        targetElement.after(fragment);
      } else {
        targetElement.append(fragment);
      }
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:prepend`: Prepends content from a `<template>` to the target.
   * Supports `:inner` (default) to prepend as first child, or `:outer` to insert before the target.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:prepend" commandfor="log" data-template-id="new-log">Log</button>`
   * @example `<button command="--dom:prepend:outer" commandfor="#item-2" data-template-id="item-1">Insert Before</button>`
   */
  "--dom:prepend": ({ invoker, targetElement, params }) => {
    const style = params[0] || "inner";
    let fragment = getSourceNode(invoker, "prepend").cloneNode(true);
    if (isInterpolationEnabled()) {
      fragment = processTemplateFragment(fragment, invoker);
    }
    const updateDOM = () => {
      if (style === "outer") {
        targetElement.before(fragment);
      } else {
        targetElement.prepend(fragment);
      }
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:wrap`: Wraps the target element with content from a `<template>` or a simple tag.
  * Supports `--dom:wrap:tagname` for simple wrappers with optional class/id.
  * @example `<button command="--dom:wrap" commandfor="#my-image" data-template-id="figure-tpl">Add Caption</button>`
  * @example `<button command="--dom:wrap:div" commandfor="#content" data-wrapper-class="card">Wrap in Card</button>`
  */
  "--dom:wrap": ({ invoker, targetElement, params }) => {
    const wrapperTag = params[0] || null;
    let wrapperElement;
    if (wrapperTag) {
      wrapperElement = document.createElement(wrapperTag);
      const wrapperClass = invoker.dataset.wrapperClass;
      const wrapperId = invoker.dataset.wrapperId;
      if (wrapperClass) wrapperElement.className = wrapperClass;
      if (wrapperId) wrapperElement.id = wrapperId;
    } else {
      let fragment = getSourceNode(invoker, "wrap").cloneNode(true);
      if (isInterpolationEnabled()) {
        fragment = processTemplateFragment(fragment, invoker);
      }
      const children = Array.from(fragment.children);
      if (children.length !== 1) {
        throw createInvokerError("Wrap template must contain exactly one root element", "error" /* ERROR */, {
          command: "--dom:wrap",
          element: invoker
        });
      }
      wrapperElement = children[0];
    }
    const updateDOM = () => {
      targetElement.replaceWith(wrapperElement);
      wrapperElement.appendChild(targetElement);
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:unwrap`: Removes the parent of the target element, promoting it up one level in the DOM tree.
   * @example `<button command="--dom:unwrap" commandfor="#content">Remove Wrapper</button>`
   */
  "--dom:unwrap": ({ targetElement }) => {
    const parent = targetElement.parentElement;
    if (!parent) return;
    const updateDOM = () => {
      parent.replaceWith(targetElement);
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * `--dom:toggle-empty-class`: Adds or removes a class on the target based on whether it has child elements.
   * @example `<button command="--dom:toggle-empty-class:list-is-empty" commandfor="#todo-list">Remove Item</button>`
   */
  "--dom:toggle-empty-class": ({ targetElement, params }) => {
    const className = params[0];
    if (!className) {
      throw createInvokerError("Toggle empty class command requires a class name parameter", "error" /* ERROR */, {
        command: "--dom:toggle-empty-class",
        element: targetElement
      });
    }
    const hasChildren = targetElement.children.length > 0;
    targetElement.classList.toggle(className, !hasChildren);
  },
  /**
   * `--data:set`: Sets a data attribute on the target element.
   * @example `<button command="--data:set:userId:123" commandfor="#profile">Set User ID</button>`
   */
  "--data:set": ({ invoker, targetElement, params }) => {
    const key = params[0];
    let value = params[1];
    if (!key) {
      throw createInvokerError("Data set command requires a key parameter", "error" /* ERROR */, {
        command: "--data:set",
        element: invoker
      });
    }
    if (isInterpolationEnabled() && value) {
      const context = {
        this: {
          ...invoker,
          dataset: { ...invoker.dataset },
          value: invoker.value || ""
        },
        data: document.body.dataset,
        event: invoker.triggeringEvent
      };
      value = interpolateString(value, context);
    }
    targetElement.dataset[key] = value || "";
  },
  /**
   * `--data:copy`: Copies a data attribute from a source element to the target.
   * @example `<button command="--data:copy:userId" commandfor="#edit-form" data-copy-from="#user-profile">Edit User</button>`
   */
  "--data:copy": ({ invoker, targetElement, params }) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError("Data copy command requires a key parameter", "error" /* ERROR */, {
        command: "--data:copy",
        element: invoker
      });
    }
    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement = invoker;
    if (sourceSelector) {
      sourceElement = document.querySelector(sourceSelector);
      if (!sourceElement) {
        throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, "error" /* ERROR */, {
          command: "--data:copy",
          element: invoker
        });
      }
    }
    const value = sourceElement.dataset[key];
    if (value !== void 0) {
      targetElement.dataset[key] = value;
    }
  },
  /**
   * `--data:set:array:push`: Adds an item to the end of an array stored in a data attribute.
   * @example `<button command="--data:set:array:push:todos" data-value='{"title": "New Task"}' commandfor="#app">Add Todo</button>`
   */
  "--data:set:array:push": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array push command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:push",
        element: invoker
      });
    }
    const valueToAdd = invoker.dataset.value;
    if (!valueToAdd) {
      throw createInvokerError("Array push command requires a data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:push",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    try {
      const newItem = JSON.parse(valueToAdd);
      arrayData.push(newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError("Invalid JSON in data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:push",
        element: invoker
      });
    }
  },
  /**
   * `--data:set:array:remove`: Removes an item at a specific index from an array stored in a data attribute.
   * @example `<button command="--data:set:array:remove:todos" data-index="2" commandfor="#app">Remove Item</button>`
   */
  "--data:set:array:remove": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array remove command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:remove",
        element: invoker
      });
    }
    const indexToRemove = parseInt(invoker.dataset.index || "0", 10);
    if (isNaN(indexToRemove)) {
      throw createInvokerError("Array remove command requires a valid data-index attribute", "error" /* ERROR */, {
        command: "--data:set:array:remove",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    if (indexToRemove >= 0 && indexToRemove < arrayData.length) {
      arrayData.splice(indexToRemove, 1);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    }
  },
  /**
   * `--data:set:array:update`: Updates an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:update:todos" data-index="1" data-value='{"title": "Updated"}' commandfor="#app">Update Item</button>`
   */
  "--data:set:array:update": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array update command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:update",
        element: invoker
      });
    }
    const indexToUpdate = parseInt(invoker.dataset.index || "0", 10);
    const valueToUpdate = invoker.dataset.value;
    if (isNaN(indexToUpdate)) {
      throw createInvokerError("Array update command requires a valid data-index attribute", "error" /* ERROR */, {
        command: "--data:set:array:update",
        element: invoker
      });
    }
    if (!valueToUpdate) {
      throw createInvokerError("Array update command requires a data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:update",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    if (indexToUpdate >= 0 && indexToUpdate < arrayData.length) {
      try {
        const updateData = JSON.parse(valueToUpdate);
        arrayData[indexToUpdate] = { ...arrayData[indexToUpdate], ...updateData };
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError("Invalid JSON in data-value attribute", "error" /* ERROR */, {
          command: "--data:set:array:update",
          element: invoker
        });
      }
    }
  },
  /**
   * `--data:set:array:insert`: Inserts an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:insert:todos" data-index="1" data-value='{"title": "Inserted Item"}' commandfor="#app">Insert at Position 1</button>`
   */
  "--data:set:array:insert": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array insert command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:insert",
        element: invoker
      });
    }
    const indexToInsert = parseInt(invoker.dataset.index || "0", 10);
    const valueToInsert = invoker.dataset.value;
    if (isNaN(indexToInsert)) {
      throw createInvokerError("Array insert command requires a valid data-index attribute", "error" /* ERROR */, {
        command: "--data:set:array:insert",
        element: invoker
      });
    }
    if (!valueToInsert) {
      throw createInvokerError("Array insert command requires a data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:insert",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    if (indexToInsert >= 0 && indexToInsert <= arrayData.length) {
      try {
        const newItem = JSON.parse(valueToInsert);
        arrayData.splice(indexToInsert, 0, newItem);
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError("Invalid JSON in data-value attribute", "error" /* ERROR */, {
          command: "--data:set:array:insert",
          element: invoker
        });
      }
    }
  },
  /**
   * `--data:set:array:unshift`: Adds an item to the beginning of an array stored in a data attribute.
   * @example `<button command="--data:set:array:unshift:todos" data-value='{"title": "First Item"}' commandfor="#app">Add to Beginning</button>`
   */
  "--data:set:array:unshift": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array unshift command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:unshift",
        element: invoker
      });
    }
    const valueToAdd = invoker.dataset.value;
    if (!valueToAdd) {
      throw createInvokerError("Array unshift command requires a data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:unshift",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    try {
      const newItem = JSON.parse(valueToAdd);
      arrayData.unshift(newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError("Invalid JSON in data-value attribute", "error" /* ERROR */, {
        command: "--data:set:array:unshift",
        element: invoker
      });
    }
  },
  /**
   * `--data:set:array:clear`: Removes all items from an array stored in a data attribute.
   * @example `<button command="--data:set:array:clear:todos" commandfor="#app">Clear All Todos</button>`
   */
  "--data:set:array:clear": ({ targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array clear command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:clear",
        element: targetElement
      });
    }
    targetElement.dataset[arrayKey] = JSON.stringify([]);
  },
  /**
   * `--data:set:array:sort`: Sorts an array stored in a data attribute.
   * @example `<button command="--data:set:array:sort:todos" data-sort-by="priority" data-sort-order="desc" commandfor="#app">Sort by Priority</button>`
   */
  "--data:set:array:sort": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array sort command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:sort",
        element: invoker
      });
    }
    const sortBy = invoker.dataset.sortBy || invoker.dataset.sort_by;
    const sortOrder = invoker.dataset.sortOrder || invoker.dataset.sort_order || "asc";
    if (!sortBy) {
      throw createInvokerError("Array sort command requires a data-sort-by attribute", "error" /* ERROR */, {
        command: "--data:set:array:sort",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    arrayData.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      return sortOrder === "desc" ? -comparison : comparison;
    });
    targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
  },
  /**
   * `--data:set:array:filter`: Filters an array stored in a data attribute and stores the result in a new key.
   * @example `<button command="--data:set:array:filter:todos" data-filter-by="completed" data-filter-value="false" data-result-key="filtered-todos" commandfor="#app">Show Pending</button>`
   */
  "--data:set:array:filter": ({ invoker, targetElement, params }) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError("Array filter command requires an array key parameter", "error" /* ERROR */, {
        command: "--data:set:array:filter",
        element: invoker
      });
    }
    const filterBy = invoker.dataset.filterBy || invoker.dataset.filter_by;
    const filterValue = invoker.dataset.filterValue || invoker.dataset.filter_value;
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-filtered`;
    if (!filterBy) {
      throw createInvokerError("Array filter command requires a data-filter-by attribute", "error" /* ERROR */, {
        command: "--data:set:array:filter",
        element: invoker
      });
    }
    let arrayData = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }
    const filteredData = arrayData.filter((item) => {
      const itemValue = item[filterBy];
      if (filterValue === "true") return itemValue === true;
      if (filterValue === "false") return itemValue === false;
      return String(itemValue) === filterValue;
    });
    targetElement.dataset[resultKey] = JSON.stringify(filteredData);
  },
  /**
   * `--data:set:new-todo`: Adds a new todo item to the todos array.
   * @example `<form command="--data:set:new-todo" data-bind-to="#form-data" data-bind-as="data:new-todo-json">`
   */
  "--data:set:new-todo": ({ invoker, targetElement }) => {
    const formData = getFormData(invoker);
    const newTodo = {
      id: generateId(),
      title: formData.title || "",
      description: formData.description || "",
      priority: formData.priority || "medium",
      tags: formData.tags || "",
      completed: false,
      created: (/* @__PURE__ */ new Date()).toLocaleDateString()
    };
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    todos.push(newTodo);
    targetElement.dataset.todos = JSON.stringify(todos);
    targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
  },
  /**
   * `--data:set:filter:status`: Sets the status filter for todos.
   * @example `<select command="--data:set:filter:status" data-bind-to="body" data-bind-as="data:filter-status">`
   */
  "--data:set:filter:status": ({ invoker, targetElement }) => {
    const filterValue = invoker.value;
    targetElement.dataset.filterStatus = filterValue;
    targetElement.dispatchEvent(new CustomEvent("filter-changed", { bubbles: true }));
  },
  /**
   * `--data:set:filter:priority`: Sets the priority filter for todos.
   * @example `<select command="--data:set:filter:priority" data-bind-to="body" data-bind-as="data:filter-priority">`
   */
  "--data:set:filter:priority": ({ invoker, targetElement }) => {
    const filterValue = invoker.value;
    targetElement.dataset.filterPriority = filterValue;
    targetElement.dispatchEvent(new CustomEvent("filter-changed", { bubbles: true }));
  },
  /**
   * `--data:set:search`: Sets the search term for todos.
   * @example `<input command="--data:set:search" data-bind-to="body" data-bind-as="data:search-term">`
   */
  "--data:set:search": ({ invoker, targetElement }) => {
    const searchTerm = invoker.value;
    targetElement.dataset.searchTerm = searchTerm;
    targetElement.dispatchEvent(new CustomEvent("filter-changed", { bubbles: true }));
  },
  /**
   * `--data:set:sort:by`: Sets the sort field for todos.
   * @example `<select command="--data:set:sort:by" data-bind-to="body" data-bind-as="data:sort-by">`
   */
  "--data:set:sort:by": ({ invoker, targetElement }) => {
    const sortBy = invoker.value;
    targetElement.dataset.sortBy = sortBy;
    targetElement.dispatchEvent(new CustomEvent("filter-changed", { bubbles: true }));
  },
  /**
   * `--data:set:sort:order`: Sets the sort order for todos.
   * @example `<select command="--data:set:sort:order" data-bind-to="body" data-bind-as="data:sort-order">`
   */
  "--data:set:sort:order": ({ invoker, targetElement }) => {
    const sortOrder = invoker.value;
    targetElement.dataset.sortOrder = sortOrder;
    targetElement.dispatchEvent(new CustomEvent("filter-changed", { bubbles: true }));
  },
  /**
   * `--data:set:toggle:{id}`: Toggles the completed status of a todo item.
   * @example `<input command="--data:set:toggle:123" data-bind-to="body" data-bind-as="data:toggle-item">`
   */
  "--data:set:toggle": ({ invoker, targetElement, params }) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError("Toggle command requires a todo ID parameter", "error" /* ERROR */, {
        command: "--data:set:toggle",
        element: invoker
      });
    }
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const todoIndex = todos.findIndex((t) => t.id === todoId);
    if (todoIndex !== -1) {
      todos[todoIndex].completed = !todos[todoIndex].completed;
      targetElement.dataset.todos = JSON.stringify(todos);
      targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
    }
  },
  /**
   * `--data:set:edit:{id}`: Sets a todo item into edit mode.
   * @example `<button command="--data:set:edit:123" data-bind-to="body" data-bind-as="data:edit-item">`
   */
  "--data:set:edit": ({ invoker, targetElement, params }) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError("Edit command requires a todo ID parameter", "error" /* ERROR */, {
        command: "--data:set:edit",
        element: invoker
      });
    }
    targetElement.dataset.editingId = todoId;
    targetElement.dispatchEvent(new CustomEvent("edit-mode-changed", { bubbles: true }));
  },
  /**
   * `--data:set:delete:{id}`: Deletes a todo item.
   * @example `<button command="--data:set:delete:123" data-bind-to="body" data-bind-as="data:delete-item">`
   */
  "--data:set:delete": ({ invoker, targetElement, params }) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError("Delete command requires a todo ID parameter", "error" /* ERROR */, {
        command: "--data:set:delete",
        element: invoker
      });
    }
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const filteredTodos = todos.filter((t) => t.id !== todoId);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
  },
  /**
   * `--data:set:cancel-edit:{id}`: Cancels edit mode for a todo item.
   * @example `<button command="--data:set:cancel-edit:123" data-bind-to="body" data-bind-as="data:cancel-edit">`
   */
  "--data:set:cancel-edit": ({ invoker, targetElement, params }) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError("Cancel edit command requires a todo ID parameter", "error" /* ERROR */, {
        command: "--data:set:cancel-edit",
        element: invoker
      });
    }
    delete targetElement.dataset.editingId;
    targetElement.dispatchEvent(new CustomEvent("edit-mode-changed", { bubbles: true }));
  },
  /**
   * `--data:set:save-edit:{id}`: Saves changes to a todo item in edit mode.
   * @example `<button command="--data:set:save-edit:123" data-bind-to="#edit-form" data-bind-as="data:save-edit-json">`
   */
  "--data:set:save-edit": ({ invoker, targetElement, params }) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError("Save edit command requires a todo ID parameter", "error" /* ERROR */, {
        command: "--data:set:save-edit",
        element: invoker
      });
    }
    const editForm = document.getElementById(`edit-form-${todoId}`);
    if (!editForm) {
      throw createInvokerError(`Edit form for id ${todoId} not found`, "error" /* ERROR */, {
        command: "--data:set:save-edit",
        element: invoker
      });
    }
    const updateData = {
      title: editForm.dataset.title || "",
      description: editForm.dataset.description || "",
      priority: editForm.dataset.priority || "medium"
    };
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const todoIndex = todos.findIndex((t) => t.id === todoId);
    if (todoIndex !== -1) {
      todos[todoIndex] = { ...todos[todoIndex], ...updateData };
      targetElement.dataset.todos = JSON.stringify(todos);
      delete targetElement.dataset.editingId;
      targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
    }
  },
  /**
   * `--data:set:bulk-action:complete-all`: Marks all pending todos as completed.
  * @example `<button command="--data:set:bulk-action:complete-all" data-bind-to="body" data-bind-as="data:bulk-action">`
  */
  "--data:set:bulk-action:complete-all": ({ targetElement }) => {
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const updatedTodos = todos.map(
      (todo) => todo.completed ? todo : { ...todo, completed: true }
    );
    targetElement.dataset.todos = JSON.stringify(updatedTodos);
    targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
  },
  /**
   * `--data:set:bulk-action:clear-completed`: Removes all completed todos.
   * @example `<button command="--data:set:bulk-action:clear-completed" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:clear-completed": ({ targetElement }) => {
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const filteredTodos = todos.filter((todo) => !todo.completed);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    targetElement.dispatchEvent(new CustomEvent("todo-updated", { bubbles: true }));
  },
  /**
   * `--data:set:bulk-action:export`: Exports todos as JSON.
   * @example `<button command="--data:set:bulk-action:export" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:export": ({ targetElement }) => {
    let todos = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todos-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  /**
   * `--cookie:set`: Sets a browser cookie.
   * @example `<button command="--cookie:set:theme:dark" data-cookie-expires="365">Set Dark Theme</button>`
   */
  "--cookie:set": ({ invoker, params }) => {
    const key = params[0];
    const value = params[1];
    if (!key) {
      throw createInvokerError("Cookie set command requires a key parameter", "error" /* ERROR */, {
        command: "--cookie:set",
        element: invoker
      });
    }
    let cookieString = `${encodeURIComponent(key)}=${encodeURIComponent(value || "")}`;
    const expires = invoker.dataset.cookieExpires;
    if (expires) {
      const days = parseInt(expires, 10);
      if (!isNaN(days)) {
        const date = /* @__PURE__ */ new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1e3);
        cookieString += `; expires=${date.toUTCString()}`;
      }
    }
    cookieString += "; path=/";
    document.cookie = cookieString;
  },
  /**
   * `--cookie:get`: Gets a cookie value and sets it on the target element.
   * @example `<button command="--cookie:get:theme" commandfor="#theme-display">Show Theme</button>`
   */
  "--cookie:get": ({ targetElement, params }) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError("Cookie get command requires a key parameter", "error" /* ERROR */, {
        command: "--cookie:get",
        element: targetElement
      });
    }
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.trim().split("=");
      if (decodeURIComponent(cookieKey) === key) {
        targetElement.textContent = decodeURIComponent(cookieValue || "");
        return;
      }
    }
    targetElement.textContent = "";
  },
  /**
   * `--cookie:remove`: Removes a browser cookie.
   * @example `<button command="--cookie:remove:theme">Clear Theme</button>`
   */
  "--cookie:remove": ({ params }) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError("Cookie remove command requires a key parameter", "error" /* ERROR */, {
        command: "--cookie:remove"
      });
    }
    document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  },
  /**
   * `--command:trigger`: Triggers an event on another element.
   * @example `<button command="--command:trigger:click" commandfor="#save-btn" data-and-then="--command:trigger:click" data-then-target="#close-btn">Save and Close</button>`
   */
  "--command:trigger": ({ targetElement, params }) => {
    const eventType = params[0] || "click";
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    targetElement.dispatchEvent(event);
  },
  /**
   * `--command:delay`: Waits for a specified number of milliseconds.
   * @example `<button command="--text:set:Saved!" commandfor="#status" data-and-then="--command:delay:2000" data-then-target="#status">Save</button>`
   */
  "--command:delay": ({ params }) => {
    const delay = parseInt(params[0], 10);
    if (isNaN(delay) || delay < 0) {
      throw createInvokerError("Delay command requires a valid positive number of milliseconds", "error" /* ERROR */, {
        command: "--command:delay"
      });
    }
    return new Promise((resolve) => setTimeout(resolve, delay));
  },
  /**
   * `--on:interval`: Executes a command repeatedly at a given interval.
   * The interval is cleared when the element is removed from the DOM.
   * @example `<div command-on="load" command="--on:interval:10000" commandfor="#live-data" data-interval-command="--fetch:get" data-url="/api/latest-stats">Loading...</div>`
   */
  "--on:interval": ({ invoker, targetElement, params }) => {
    const intervalMs = parseInt(params[0], 10);
    if (isNaN(intervalMs) || intervalMs <= 0) {
      throw createInvokerError("Interval command requires a valid positive interval in milliseconds", "error" /* ERROR */, {
        command: "--on:interval",
        element: invoker
      });
    }
    const intervalCommand = invoker.dataset.intervalCommand;
    if (!intervalCommand) {
      throw createInvokerError("Interval command requires data-interval-command attribute", "error" /* ERROR */, {
        command: "--on:interval",
        element: invoker
      });
    }
    const existingIntervalId = invoker._invokerIntervalId;
    if (existingIntervalId) {
      clearInterval(existingIntervalId);
    }
    const intervalId = setInterval(() => {
      if (window.Invoker) {
        const targetId = targetElement.id || `__invoker-target-${Date.now()}`;
        if (!targetElement.id) targetElement.id = targetId;
        window.Invoker.executeCommand(intervalCommand, targetId, invoker);
      }
    }, intervalMs);
    invoker._invokerIntervalId = intervalId;
    const observer = new MutationObserver(() => {
      if (!document.contains(invoker)) {
        clearInterval(intervalId);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },
  /**
   * `--bind`: Creates a one-way data binding from the target element to another element.
   * @example `<input command-on="input" command="--bind:value" commandfor="#input" data-bind-to="#output" data-bind-as="text">`
   */
  "--bind": ({ invoker, targetElement, params }) => {
    const sourceProperty = params.join(":");
    if (!sourceProperty) {
      throw createInvokerError("Bind command requires a source property (e.g., value, text, data:name)", "error" /* ERROR */, {
        command: "--bind",
        element: invoker
      });
    }
    let sourceValue;
    const sourceElement = sourceProperty === "value" && (invoker instanceof HTMLInputElement || invoker instanceof HTMLTextAreaElement || invoker instanceof HTMLSelectElement) ? invoker : targetElement;
    if (sourceProperty === "value" && (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement || sourceElement instanceof HTMLSelectElement)) {
      sourceValue = sourceElement.value;
    } else if (sourceProperty === "text") {
      sourceValue = sourceElement.textContent;
    } else if (sourceProperty === "html") {
      sourceValue = sourceElement.innerHTML;
    } else if (sourceProperty.startsWith("attr:")) {
      const attrName = sourceProperty.substring(5);
      sourceValue = sourceElement.getAttribute(attrName);
    } else if (sourceProperty.startsWith("data:")) {
      const dataName = sourceProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      sourceValue = sourceElement.dataset[dataName];
    } else {
      throw createInvokerError(`Invalid source property for --bind: "${sourceProperty}"`, "error" /* ERROR */, {
        command: "--bind",
        element: invoker
      });
    }
    const destinationSelector = invoker.dataset.bindTo;
    const destinations = destinationSelector ? resolveTargets(destinationSelector, invoker) : [targetElement];
    const destinationProperty = invoker.dataset.bindAs || "text";
    destinations.forEach((dest) => {
      if (destinationProperty === "value" && (dest instanceof HTMLInputElement || dest instanceof HTMLTextAreaElement || dest instanceof HTMLSelectElement)) {
        dest.value = sourceValue || "";
      } else if (destinationProperty === "text") {
        dest.textContent = sourceValue || "";
      } else if (destinationProperty === "html") {
        dest.innerHTML = sanitizeHTML(sourceValue || "");
      } else if (destinationProperty.startsWith("attr:")) {
        const attrName = destinationProperty.substring(5);
        if (sourceValue === null || sourceValue === void 0) {
          dest.removeAttribute(attrName);
        } else {
          dest.setAttribute(attrName, sourceValue);
        }
      } else if (destinationProperty.startsWith("data:")) {
        const dataName = destinationProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        if (sourceValue === null || sourceValue === void 0) {
          delete dest.dataset[dataName];
        } else {
          dest.dataset[dataName] = sourceValue;
        }
      } else if (destinationProperty === "class:add") {
        if (sourceValue) dest.classList.add(sourceValue);
      } else if (destinationProperty === "class:remove") {
        if (sourceValue) dest.classList.remove(sourceValue);
      }
    });
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
  /**
   * `--text:set`: Sets the text content of the target element.
   * @example `<button command="--text:set:Hello World" commandfor="message">Set Text</button>`
   */
  "--text:set": ({ targetElement, params }) => {
    targetElement.textContent = params.join(":");
  },
  /**
   * `--attr:set`: Sets an attribute on the target element.
   * @example `<button command="--attr:set:disabled:true" commandfor="button">Disable</button>`
   */
  "--attr:set": ({ targetElement, params }) => {
    const attr = params[0];
    const value = params.slice(1).join(":");
    targetElement.setAttribute(attr, value);
  },
  /**
   * `--attr:remove`: Removes an attribute from the target element.
   * @example `<button command="--attr:remove:hidden" commandfor="toast">Show</button>`
   */
  "--attr:remove": ({ targetElement, params }) => {
    const attr = params[0];
    targetElement.removeAttribute(attr);
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
    let url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError("Fetch GET command requires a data-url attribute", "error" /* ERROR */, {
        command: "--fetch:get",
        element: invoker,
        recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }
    const context = {
      this: {
        ...invoker,
        value: invoker.value || ""
      },
      event: invoker.triggeringEvent
    };
    url = interpolateString(url, context);
    const fetchEvent = new CustomEvent("fetch:before", { detail: { url, invoker }, cancelable: true });
    window.dispatchEvent(fetchEvent);
    if (fetchEvent.defaultPrevented) {
      setBusyState(invoker, false);
      return;
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
  },
  /**
   * `--emit`: Dispatches custom events for advanced interactions.
   * The first parameter is the event type, remaining parameters form the event detail.
   *
   * @example
   * ```html
   * <button type="button" command="--emit:user-action:save-form">
   *   Emit Save Event
   * </button>
   * ```
   */
  "--emit": ({ params, targetElement }) => {
    const [eventType, ...detailParts] = params;
    if (!eventType) {
      throw createInvokerError("Emit command requires an event type parameter", "error" /* ERROR */, {
        command: "--emit",
        recovery: "Use format: --emit:event-type or --emit:event-type:detail"
      });
    }
    let detail = detailParts.length > 0 ? detailParts.join(":") : void 0;
    if (typeof detail === "string" && (detail.startsWith("{") || detail.startsWith("["))) {
      try {
        detail = JSON.parse(detail);
      } catch (e) {
      }
    }
    const event = new CustomEvent(eventType, {
      bubbles: true,
      composed: true,
      detail
    });
    (targetElement || document.body).dispatchEvent(event);
  }
};
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
function getFormData(form) {
  const data = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
function parseHTML(html) {
  const sanitizedHTML = sanitizeHTML(html);
  const doc = new DOMParser().parseFromString(sanitizedHTML, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}
function processTemplateFragment(fragment, invoker) {
  const jsonData = invoker.dataset.withJson;
  if (!jsonData) return fragment;
  const textInput = document.getElementById("text-input");
  const context = {
    this: {
      ...invoker,
      value: (textInput == null ? void 0 : textInput.value) || ""
    },
    event: invoker.triggeringEvent
  };
  let interpolatedJson;
  try {
    interpolatedJson = interpolateString(jsonData, context);
  } catch (error) {
    console.error("Invokers: Failed to interpolate data-with-json:", error);
    return fragment;
  }
  let dataContext;
  try {
    dataContext = JSON.parse(interpolatedJson);
  } catch (error) {
    console.error("Invokers: Invalid JSON in data-with-json attribute:", error);
    return fragment;
  }
  fragment.querySelectorAll("[data-tpl-text]").forEach((el) => {
    const key = el.getAttribute("data-tpl-text");
    if (key && dataContext.hasOwnProperty(key)) {
      const value = String(dataContext[key]);
      if (el.children.length === 0) {
        el.textContent = value;
      } else {
        const textNode = document.createTextNode(value);
        el.insertBefore(textNode, el.firstChild);
      }
    }
  });
  fragment.querySelectorAll("[data-tpl-attr]").forEach((el) => {
    const attrMapping = el.getAttribute("data-tpl-attr");
    if (attrMapping) {
      attrMapping.split(",").forEach((mapping) => {
        const [attrName, key] = mapping.split(":").map((s) => s.trim());
        if (attrName && key && dataContext.hasOwnProperty(key)) {
          el.setAttribute(attrName, String(dataContext[key]));
        }
      });
    }
  });
  fragment.querySelectorAll("[data-tpl-value]").forEach((el) => {
    const key = el.getAttribute("data-tpl-value");
    if (key && dataContext.hasOwnProperty(key) && "value" in el) {
      el.value = String(dataContext[key]);
    }
  });
  const firstElement = fragment.firstElementChild;
  if (firstElement == null ? void 0 : firstElement.id) {
    fragment.querySelectorAll('[commandfor^="@"]').forEach((childInvoker) => {
      const originalSelector = childInvoker.getAttribute("commandfor");
      if (originalSelector == null ? void 0 : originalSelector.startsWith("@closest(")) {
        const match = originalSelector.match(/^@closest\(([^)]+)\)$/);
        if (match) {
          const innerSelector = match[1];
          if (firstElement.matches(innerSelector)) {
            childInvoker.setAttribute("commandfor", firstElement.id);
          }
        }
      }
    });
  }
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
        const id = this.getAttribute("interestfor");
        return id ? document.getElementById(id) : null;
      },
      set(value) {
        if (value === null) {
          this.removeAttribute("interestfor");
        } else if (value && typeof value === "object" && "id" in value) {
          this.setAttribute("interestfor", value.id || "");
        } else {
          throw new TypeError("interestForElement must be an element or null");
        }
      }
    });
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
            target.showPopover();
            if (!this.supportsAnchorPositioning()) {
              requestAnimationFrame(() => this.positionPopover(invoker, target));
            }
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
   * Check if anchor positioning is supported
   */
  supportsAnchorPositioning() {
    return "anchorName" in document.body.style;
  }
  /**
   * Setup anchor positioning between invoker and target
   */
  setupAnchorPositioning(invoker, target, data) {
    const anchorName = `--interest-anchor-${Math.random().toString(36).substring(2)}`;
    invoker.style.anchorName = anchorName;
    target.style.positionAnchor = anchorName;
    data.anchorName = anchorName;
    if (this.supportsAnchorPositioning()) {
      const className = `interest-anchored-${Math.random().toString(36).substring(2)}`;
      const style = document.createElement("style");
      style.textContent = `
      .${className} {
        margin: 0;
        top: calc(anchor(${anchorName} bottom) - 4px);
        left: anchor(${anchorName});
        justify-self: center;
      }
    `;
      document.head.appendChild(style);
      target.classList.add(className);
      data.styleElement = style;
      data.className = className;
    }
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
    if (data.styleElement) {
      data.styleElement.remove();
      data.styleElement = null;
    }
    if (data.className) {
      target.classList.remove(data.className);
      data.className = null;
    }
    target.style.position = "";
    target.style.top = "";
    target.style.left = "";
    target.style.zIndex = "";
  }
  /**
   * Position popover relative to invoker since top-layer popovers are centered by default
   * Prefers positioning below (GitHub-style), then above if not enough space
   */
  positionPopover(invoker, target) {
    const invokerRect = invoker.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let top;
    let left;
    left = invokerRect.left + invokerRect.width / 2 - targetRect.width / 2;
    top = invokerRect.bottom - 4;
    if (top + targetRect.height > viewportHeight) {
      top = invokerRect.top - targetRect.height + 4;
      if (top < 0) {
        top = invokerRect.bottom + 8;
      }
    }
    const adjustedLeft = Math.max(8, Math.min(left, viewportWidth - targetRect.width - 8));
    const adjustedTop = Math.max(8, Math.min(top, viewportHeight - targetRect.height - 8));
    target.style.position = "fixed";
    target.style.top = `${adjustedTop}px`;
    target.style.left = `${adjustedLeft}px`;
    target.style.zIndex = "9999";
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
function createInterestEvent(type, source) {
  const event = new CustomEvent(type, {
    bubbles: false,
    cancelable: false
  });
  Object.defineProperty(event, "source", {
    value: source || null,
    writable: false,
    enumerable: true
  });
  return event;
  return event;
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
function _dispatchCommandEvent(source, command, targetElement, triggeringEvent) {
  const commandEvent = new window.CommandEvent("command", {
    command,
    source,
    cancelable: true,
    bubbles: true,
    composed: true
  });
  if (triggeringEvent) {
    commandEvent.triggeringEvent = triggeringEvent;
  }
  targetElement.dispatchEvent(commandEvent);
}
var isDebugMode = false;
var ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
  ErrorSeverity2["WARNING"] = "warning";
  ErrorSeverity2["ERROR"] = "error";
  ErrorSeverity2["CRITICAL"] = "critical";
  return ErrorSeverity2;
})(ErrorSeverity || {});
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
    let sanitized = param.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").replace(/data:text\/html/gi, "").replace(/vbscript:/gi, "").replace(/on\w+\s*=/gi, "").replace(/expression\s*\(/gi, "");
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
function isInterpolationEnabled() {
  return InvokerManager._interpolationEnabled;
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
var RateLimiter = class {
  constructor(windowMs = 1e3, maxExecutions = 50) {
    this.executions = /* @__PURE__ */ new Map();
    this.windowMs = windowMs;
    this.maxExecutions = maxExecutions;
  }
  checkLimit(key) {
    const now = Date.now();
    const executions = this.executions.get(key) || [];
    const validExecutions = executions.filter((time) => now - time < this.windowMs);
    if (validExecutions.length >= this.maxExecutions) {
      return false;
    }
    validExecutions.push(now);
    this.executions.set(key, validExecutions);
    return true;
  }
  reset(key) {
    if (key) {
      this.executions.delete(key);
    } else {
      this.executions.clear();
    }
  }
};
var HookPoint = /* @__PURE__ */ ((HookPoint2) => {
  HookPoint2["BEFORE_COMMAND"] = "beforeCommand";
  HookPoint2["AFTER_COMMAND"] = "afterCommand";
  HookPoint2["BEFORE_VALIDATION"] = "beforeValidation";
  HookPoint2["AFTER_VALIDATION"] = "afterValidation";
  HookPoint2["ON_SUCCESS"] = "onSuccess";
  HookPoint2["ON_ERROR"] = "onError";
  HookPoint2["ON_COMPLETE"] = "onComplete";
  return HookPoint2;
})(HookPoint || {});
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
    this.monitoringWindow = 1e3;
  }
  // 1 second
  recordExecution() {
    const now = Date.now();
    this.executionTimes = this.executionTimes.filter((time) => now - time < this.monitoringWindow);
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
var _InvokerManager = class _InvokerManager {
  // The constructor is now private to enforce the singleton pattern.
  constructor() {
    this.commands = /* @__PURE__ */ new Map();
    this.sortedCommandKeys = [];
    this.commandStates = /* @__PURE__ */ new Map();
    this.performanceMonitor = new PerformanceMonitor();
    // --- Plugin/Middleware System ---
    this.plugins = /* @__PURE__ */ new Map();
    this.middleware = /* @__PURE__ */ new Map();
    this.andThenManager = new AndThenManager(this);
    this.pipelineManager = new PipelineManager(this);
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      this.registerExtendedCommands();
      if (!window.__invokerListenersAdded) {
        this.listen();
        window.__invokerListenersAdded = true;
      }
      if (!window.Invoker) {
        window.Invoker = {
          register: this.register.bind(this),
          executeCommand: this.executeCommand.bind(this),
          registerPlugin: this.registerPlugin.bind(this),
          unregisterPlugin: this.unregisterPlugin.bind(this),
          registerMiddleware: this.registerMiddleware.bind(this),
          hasPlugin: this.hasPlugin.bind(this),
          getRegisteredPlugins: this.getRegisteredPlugins.bind(this),
          parseCommandString,
          createCommandString,
          instance: this,
          HookPoint,
          reset: this.reset.bind(this)
        };
      }
    } else if (typeof global !== "undefined" && global.window && global.document) {
      this.registerCoreLibraryCommands();
      this.registerExtendedCommands();
      if (!global.__invokerListenersAdded) {
        this.listen();
        global.__invokerListenersAdded = true;
      }
    }
  }
  /**
   * Gets the single, authoritative instance of the InvokerManager.
   */
  static getInstance() {
    if (!_InvokerManager._instance) {
      _InvokerManager._instance = new _InvokerManager();
    }
    return _InvokerManager._instance;
  }
  /**
   * Enables interpolation features for advanced event handling.
   * Internal method called by enableAdvancedEvents().
   */
  _enableInterpolation() {
    _InvokerManager._interpolationEnabled = true;
  }
  /**
   * Resets the InvokerManager to its initial state, clearing advanced features.
   */
  reset() {
    _InvokerManager._interpolationEnabled = false;
    if (typeof window !== "undefined" && window.Invoker) {
      window.Invoker.interpolateString = void 0;
      window.Invoker.generateUid = void 0;
      window.Invoker.getInterpolationUtility = void 0;
    }
    console.log("Invokers: Reset complete.");
  }
  /**
   * Safely attempts to interpolate a template string with context data.
   * Only performs interpolation if advanced features are enabled.
   *
   * @param template The template string that may contain {{...}} placeholders
   * @param context The context object for interpolation
   * @returns The interpolated string, or the original template if interpolation is disabled
   */
  _tryInterpolate(template, context) {
    var _a;
    if (_InvokerManager._interpolationEnabled && typeof window !== "undefined" && ((_a = window.Invoker) == null ? void 0 : _a.getInterpolationUtility)) {
      const interpolate = window.Invoker.getInterpolationUtility();
      return interpolate(template, context);
    }
    return template;
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
    const targets = resolveTargets(targetId, source || document.body);
    if (targets.length === 0) {
      const allIds = Array.from(document.querySelectorAll("[id]")).map((el) => el.id).filter(Boolean);
      const suggestions = allIds.filter((id) => id.includes(targetId.toLowerCase()) || targetId.includes(id.toLowerCase()));
      const error = createInvokerError(
        `Target element with selector "${targetId}" not found`,
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
          recovery: suggestions.length > 0 ? `Did you mean: ${suggestions.slice(0, 3).join(", ")}?` : "Check that the target element exists and has the correct selector"
        }
      );
      logInvokerError(error);
      return;
    }
    const targetElement = targets[0];
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
   * Registers the internalized extended commands onto this instance.
   */
  registerExtendedCommands() {
    for (const name in commands) {
      if (Object.prototype.hasOwnProperty.call(commands, name)) {
        this.register(name, commands[name]);
      }
    }
  }
  /**
   * Registers a plugin with middleware and lifecycle hooks.
   */
  registerPlugin(plugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Invokers: Plugin "${plugin.name}" is already registered`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    if (plugin.middleware) {
      for (const [hookPoint, middlewareFn] of Object.entries(plugin.middleware)) {
        if (middlewareFn) {
          this.registerMiddleware(hookPoint, middlewareFn);
        }
      }
    }
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
  unregisterPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`Invokers: Plugin "${pluginName}" is not registered`);
      return;
    }
    if (plugin.onUnregister) {
      try {
        plugin.onUnregister(this);
      } catch (error) {
        console.error(`Invokers: Error in plugin "${pluginName}" onUnregister:`, error);
      }
    }
    if (plugin.middleware) {
      for (const hookPoint of Object.keys(plugin.middleware)) {
        this.unregisterMiddleware(hookPoint, plugin.middleware[hookPoint]);
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
  registerMiddleware(hookPoint, middleware) {
    if (!this.middleware.has(hookPoint)) {
      this.middleware.set(hookPoint, []);
    }
    this.middleware.get(hookPoint).push(middleware);
  }
  /**
    * Unregisters a middleware function from a specific hook point.
    */
  unregisterMiddleware(hookPoint, middleware) {
    const middlewareList = this.middleware.get(hookPoint);
    if (middlewareList) {
      const index = middlewareList.indexOf(middleware);
      if (index > -1) {
        middlewareList.splice(index, 1);
      }
    }
  }
  /**
    * Checks if a plugin is currently registered.
    */
  hasPlugin(pluginName) {
    return this.plugins.has(pluginName);
  }
  /**
    * Gets a list of all registered plugin names.
    */
  getRegisteredPlugins() {
    return Array.from(this.plugins.keys());
  }
  /**
   * Executes all middleware for a given hook point.
   */
  async executeMiddleware(hookPoint, context, allowErrors = false) {
    const middlewareList = this.middleware.get(hookPoint);
    if (!middlewareList || middlewareList.length === 0) {
      return;
    }
    for (const middleware of middlewareList) {
      try {
        await Promise.resolve(middleware(context, hookPoint));
      } catch (error) {
        if (allowErrors) {
          throw error;
        } else {
          console.error(`Invokers: Middleware error at ${hookPoint}:`, error);
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
    var _a, _b;
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
          const interpolationContext = {
            event: event.triggeringEvent,
            // The original DOM event
            this: event.source,
            // The invoker element itself
            target: event.target,
            // The command target element
            detail: (_a = event.triggeringEvent) == null ? void 0 : _a.detail
            // Detail from CustomEvent
          };
          const interpolatedCommandStr = this._tryInterpolate(commandStr, interpolationContext);
          const params = parseCommandString(interpolatedCommandStr.substring(registeredCommand.length + 1));
          const sanitizedParams = sanitizeParams(params);
          const context = this.createContext(event, interpolatedCommandStr, sanitizedParams);
          const invoker = event.source;
          const targets = context.getTargets();
          if (targets.length === 0) {
            const error = createInvokerError(
              "No target elements found for command execution",
              "warning" /* WARNING */,
              {
                command: commandStr,
                element: invoker,
                recovery: "Ensure commandfor, aria-controls, or data-target points to valid elements"
              }
            );
            logInvokerError(error);
            return;
          }
          for (const target of targets) {
            const targetContext = {
              ...context,
              targetElement: target
            };
            await this.executeMiddleware("beforeCommand" /* BEFORE_COMMAND */, targetContext, true);
            await this.executeMiddleware("beforeValidation" /* BEFORE_VALIDATION */, targetContext, true);
            const commandKey = `${commandStr}:${target.id}`;
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
              continue;
            }
            let executionResult = { success: true };
            try {
              const validationErrors = this.validateContext(targetContext);
              if (validationErrors.length > 0) {
                throw createInvokerError(
                  `Command execution aborted: ${validationErrors.join(", ")}`,
                  "error" /* ERROR */,
                  {
                    command: commandStr,
                    element: targetContext.invoker || targetContext.targetElement,
                    context: { validationErrors },
                    recovery: "Fix the validation errors and try again"
                  }
                );
              }
              await this.executeMiddleware("afterValidation" /* AFTER_VALIDATION */, targetContext);
              const executionPromise = Promise.resolve(callback(targetContext));
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Command execution timeout")), 3e4);
              });
              await Promise.race([executionPromise, timeoutPromise]);
              if (currentState === "once") {
                this.commandStates.set(commandKey, "completed");
              }
              await this.executeMiddleware("onSuccess" /* ON_SUCCESS */, { ...targetContext, result: executionResult });
              if (isDebugMode) {
                console.log(`Invokers: Command "${registeredCommand}" executed successfully on target ${target.id || target}`);
              }
            } catch (error) {
              executionResult = { success: false, error };
              await this.executeMiddleware("onError" /* ON_ERROR */, { ...targetContext, result: executionResult });
              const invokerError = createInvokerError(
                `Command "${registeredCommand}" execution failed`,
                "error" /* ERROR */,
                {
                  command: commandStr,
                  element: targetContext.invoker || targetContext.targetElement,
                  cause: error,
                  context: {
                    params: targetContext.params,
                    targetId: (_b = targetContext.targetElement) == null ? void 0 : _b.id,
                    invokerState: currentState
                  },
                  recovery: this.generateRecoverySuggestion(registeredCommand, error, targetContext)
                }
              );
              logInvokerError(invokerError);
              this.attemptGracefulDegradation(targetContext, error);
            }
            await this.executeMiddleware("onComplete" /* ON_COMPLETE */, { ...targetContext, result: executionResult });
            await this.executeMiddleware("afterCommand" /* AFTER_COMMAND */, { ...targetContext, result: executionResult });
            if (context.invoker && target === targets[0]) {
              await this.andThenManager.processAndThen(context.invoker, executionResult, target);
              await this.triggerFollowup(context.invoker, target, executionResult);
            }
          }
        } catch (commandError) {
          if (commandError.message.includes("Validation failed") || commandError.message.includes("Plugin attempted to access")) {
            throw commandError;
          }
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
  generateRecoverySuggestion(command, error, _context) {
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
  attemptGracefulDegradation(context, _error) {
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
    var _a, _b, _c, _d;
    if (!invoker) {
      return [];
    }
    const commands2 = [];
    const universalCommandTemplate = invoker.dataset.andThen || invoker.dataset.thenCommand;
    if (universalCommandTemplate) {
      const interpolationContext = {
        event: invoker.triggeringEvent,
        // Original event if available
        this: invoker,
        // The invoker that defined the chain
        target: null,
        // Will be set when scheduling
        detail: (_a = invoker.triggeringEvent) == null ? void 0 : _a.detail
        // Detail from CustomEvent
      };
      const interpolatedCommand = this._tryInterpolate(universalCommandTemplate, interpolationContext);
      commands2.push({
        command: interpolatedCommand,
        target: invoker.dataset.thenTarget || invoker.dataset.target,
        state: invoker.dataset.state || "active"
      });
    }
    if (executionResult) {
      if (executionResult.success && invoker.dataset.afterSuccess) {
        const interpolationContext = {
          event: invoker.triggeringEvent,
          this: invoker,
          target: null,
          detail: (_b = invoker.triggeringEvent) == null ? void 0 : _b.detail
        };
        invoker.dataset.afterSuccess.split(",").forEach((cmdTemplate) => {
          const interpolatedCommand = this._tryInterpolate(cmdTemplate.trim(), interpolationContext);
          commands2.push({
            command: interpolatedCommand,
            target: invoker.dataset.thenTarget || invoker.dataset.target,
            state: invoker.dataset.state || "active"
          });
        });
      }
      if (!executionResult.success && invoker.dataset.afterError) {
        const interpolationContext = {
          event: invoker.triggeringEvent,
          this: invoker,
          target: null,
          detail: (_c = invoker.triggeringEvent) == null ? void 0 : _c.detail
        };
        invoker.dataset.afterError.split(",").forEach((cmdTemplate) => {
          const interpolatedCommand = this._tryInterpolate(cmdTemplate.trim(), interpolationContext);
          commands2.push({
            command: interpolatedCommand,
            target: invoker.dataset.thenTarget || invoker.dataset.target,
            state: invoker.dataset.state || "active"
          });
        });
      }
      if (invoker.dataset.afterComplete) {
        const interpolationContext = {
          event: invoker.triggeringEvent,
          this: invoker,
          target: null,
          detail: (_d = invoker.triggeringEvent) == null ? void 0 : _d.detail
        };
        invoker.dataset.afterComplete.split(",").forEach((cmdTemplate) => {
          const interpolatedCommand = this._tryInterpolate(cmdTemplate.trim(), interpolationContext);
          commands2.push({
            command: interpolatedCommand,
            target: invoker.dataset.thenTarget || invoker.dataset.target,
            state: invoker.dataset.state || "active"
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
      let selector = invoker.getAttribute("commandfor");
      if (selector) {
        return resolveTargets(selector, invoker);
      }
      const controls = (_a = invoker.getAttribute("aria-controls")) == null ? void 0 : _a.trim();
      if (controls) {
        selector = "#" + controls.split(/\s+/).join(", #");
        return resolveTargets(selector, invoker);
      }
      const dataTarget = invoker.dataset.target;
      if (dataTarget) {
        return resolveTargets(dataTarget, invoker);
      }
      return targetElement ? [targetElement] : [];
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
      triggeringEvent: event.triggeringEvent,
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
      const [action, ...rest] = params;
      const targets = getTargets();
      if (!action || targets.length === 0) {
        console.warn('Invokers: `--class` command requires an action (e.g., "--class:toggle:my-class").', invoker);
        return;
      }
      targets.forEach((target) => {
        if (action === "ternary") {
          const [classIfTrue, classIfFalse, condition] = rest;
          if (!classIfTrue || !classIfFalse || !condition) {
            console.warn("Invokers: `--class:ternary` requires class-if-true, class-if-false, and condition.", invoker);
            return;
          }
          let useTrue = false;
          if (condition === "has-content") {
            useTrue = !!(target.textContent && target.textContent.trim());
          } else if (condition === "has-no-content") {
            useTrue = !(target.textContent && target.textContent.trim());
          }
          if (useTrue) {
            target.classList.add(classIfTrue);
            target.classList.remove(classIfFalse);
          } else {
            target.classList.remove(classIfTrue);
            target.classList.add(classIfFalse);
          }
        } else if (action === "toggle" && rest[1]) {
          const [className, condition] = rest;
          if (condition === "has-content") {
            const hasContent = target.textContent && target.textContent.trim() !== "";
            if (hasContent) {
              target.classList.add(className);
            } else {
              target.classList.remove(className);
            }
          } else if (condition === "has-no-content") {
            const hasContent = target.textContent && target.textContent.trim() !== "";
            if (!hasContent) {
              target.classList.add(className);
            } else {
              target.classList.remove(className);
            }
          } else {
            target.classList.toggle(className);
          }
        } else {
          const className = rest[0];
          if (!className && action !== "clear") {
            console.warn("Invokers: `--class` command requires a class name.", invoker);
            return;
          }
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
            case "clear":
              target.className = "";
              break;
            default:
              console.warn(`Invokers: Unknown action "${action}" for '--class' command.`, invoker);
          }
        }
      });
    });
    this.register("--text", ({ invoker, getTargets, params }) => {
      const [action, ...valueParts] = params;
      const value = valueParts.join(" ");
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
      let interpolatedAttrValue = attrValue;
      if (isInterpolationEnabled() && attrValue) {
        const context = {
          this: {
            ...invoker,
            dataset: { ...invoker.dataset },
            value: invoker.value || ""
          },
          data: document.body.dataset,
          event: invoker.triggeringEvent
        };
        interpolatedAttrValue = interpolateString(attrValue, context);
      }
      try {
        targets.forEach((target) => {
          if (!target.isConnected) {
            console.warn("Invokers: Skipping disconnected target element", target);
            return;
          }
          switch (action) {
            case "set":
              target.setAttribute(attrName, interpolatedAttrValue || "");
              break;
            case "remove":
              target.removeAttribute(attrName);
              break;
            case "toggle":
              if (target.hasAttribute(attrName)) {
                target.removeAttribute(attrName);
              } else {
                target.setAttribute(attrName, interpolatedAttrValue || "");
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
    this.register("--value", ({ invoker, getTargets, params }) => {
      const [actionOrValue, ...rest] = params;
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --value command",
          "warning" /* WARNING */,
          {
            command: "--value",
            element: invoker,
            recovery: "Ensure commandfor points to a valid form input element"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        targets.forEach((target) => {
          if ("value" in target) {
            let valueToSet = "";
            if (actionOrValue === "clear") {
              valueToSet = "";
            } else if (actionOrValue === "set" && rest.length > 0) {
              valueToSet = rest.join(":");
            } else {
              valueToSet = actionOrValue || "";
            }
            target.value = valueToSet;
          } else {
            console.warn("Invokers: --value command target does not support value property", target);
          }
        });
      } catch (error) {
        throw createInvokerError(
          "Failed to set value on target elements",
          "error" /* ERROR */,
          {
            command: "--value",
            element: invoker,
            cause: error,
            recovery: "Ensure target elements are form inputs that support the value property"
          }
        );
      }
    });
    this.register("--focus", ({ invoker, getTargets }) => {
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --focus command",
          "warning" /* WARNING */,
          {
            command: "--focus",
            element: invoker,
            recovery: "Ensure commandfor points to a focusable element"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        if (typeof targets[0].focus === "function") {
          targets[0].focus();
        } else {
          console.warn("Invokers: Target element does not support focus", targets[0]);
        }
      } catch (error) {
        throw createInvokerError(
          "Failed to focus target element",
          "error" /* ERROR */,
          {
            command: "--focus",
            element: invoker,
            cause: error,
            recovery: "Ensure the target element is focusable and visible"
          }
        );
      }
    });
    this.register("--disabled", ({ invoker, getTargets, params }) => {
      const [action] = params;
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --disabled command",
          "warning" /* WARNING */,
          {
            command: "--disabled",
            element: invoker,
            recovery: "Ensure commandfor points to an element that supports the disabled property"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        targets.forEach((target) => {
          if ("disabled" in target) {
            const element = target;
            switch (action) {
              case "toggle":
                element.disabled = !element.disabled;
                break;
              case "true":
              case "enable":
                element.disabled = false;
                break;
              case "false":
              case "disable":
                element.disabled = true;
                break;
              default:
                console.warn(`Invokers: Unknown action "${action}" for --disabled command. Use "toggle", "true", "false", "enable", or "disable".`);
            }
          } else {
            console.warn("Invokers: --disabled command target does not support disabled property", target);
          }
        });
      } catch (error) {
        throw createInvokerError(
          "Failed to update disabled state on target elements",
          "error" /* ERROR */,
          {
            command: "--disabled",
            element: invoker,
            cause: error,
            recovery: "Ensure target elements support the disabled property"
          }
        );
      }
    });
    this.register("--scroll", ({ invoker, getTargets, params }) => {
      const [action] = params;
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --scroll command",
          "warning" /* WARNING */,
          {
            command: "--scroll",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element"
          }
        );
        logInvokerError(error);
        return;
      }
      try {
        targets.forEach((target) => {
          switch (action) {
            case "into-view":
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              break;
            case "top":
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              break;
            case "bottom":
              target.scrollIntoView({ behavior: "smooth", block: "end" });
              break;
            case "center":
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              break;
            default:
              console.warn(`Invokers: Unknown action "${action}" for --scroll command. Use "into-view", "top", "bottom", or "center".`);
              target.scrollIntoView({ behavior: "smooth" });
          }
        });
      } catch (error) {
        throw createInvokerError(
          "Failed to scroll target elements into view",
          "error" /* ERROR */,
          {
            command: "--scroll",
            element: invoker,
            cause: error,
            recovery: "Ensure target elements are valid DOM elements"
          }
        );
      }
    });
    this.register("--storage", ({ invoker, getTargets, params }) => {
      var _a, _b, _c;
      const [storageType, action, key, ...valueParts] = params;
      const targets = getTargets();
      if (!storageType || !["local", "session"].includes(storageType)) {
        throw createInvokerError(
          `Invalid storage type "${storageType}". Must be "local" or "session"`,
          "error" /* ERROR */,
          {
            command: "--storage",
            element: invoker,
            context: { storageType, availableTypes: ["local", "session"] },
            recovery: "Use --storage:local:action:key or --storage:session:action:key"
          }
        );
      }
      const storage = storageType === "local" ? localStorage : sessionStorage;
      if (typeof Storage === "undefined") {
        throw createInvokerError(
          "Web Storage API not supported in this browser",
          "error" /* ERROR */,
          {
            command: "--storage",
            element: invoker,
            recovery: "Use a modern browser that supports localStorage/sessionStorage"
          }
        );
      }
      try {
        switch (action) {
          case "set":
            if (!key) {
              throw createInvokerError(
                "Storage set requires a key",
                "error" /* ERROR */,
                {
                  command: "--storage",
                  element: invoker,
                  recovery: "Use --storage:local:set:key:value or --storage:session:set:key:value"
                }
              );
            }
            let valueToStore = valueParts.join(":");
            if (!valueToStore && targets.length > 0 && "value" in targets[0]) {
              valueToStore = targets[0].value;
            }
            const isJson = ((_a = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _a.storageJson) === "true" || valueToStore.startsWith("{") || valueToStore.startsWith("[");
            if (isJson) {
              try {
                JSON.parse(valueToStore);
              } catch (e) {
                valueToStore = JSON.stringify(valueToStore);
              }
            }
            const expiresIn = (_b = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _b.storageExpires;
            if (expiresIn) {
              const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1e3;
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
          case "get":
            if (!key) {
              throw createInvokerError(
                "Storage get requires a key",
                "error" /* ERROR */,
                {
                  command: "--storage",
                  element: invoker,
                  recovery: "Use --storage:local:get:key or --storage:session:get:key"
                }
              );
            }
            let storedValue = storage.getItem(key);
            let finalValue = storedValue;
            if (storedValue !== null) {
              try {
                const parsed = JSON.parse(storedValue);
                if (parsed && typeof parsed === "object" && "value" in parsed && "expiresAt" in parsed) {
                  if (Date.now() > parsed.expiresAt) {
                    storage.removeItem(key);
                    finalValue = null;
                  } else {
                    finalValue = parsed.isJson ? JSON.stringify(parsed.value) : parsed.value;
                  }
                }
              } catch (e) {
              }
            }
            if (targets.length > 0 && finalValue !== null) {
              if ("value" in targets[0]) {
                targets[0].value = finalValue;
              } else {
                targets[0].textContent = finalValue;
              }
            }
            break;
          case "remove":
            if (!key) {
              throw createInvokerError(
                "Storage remove requires a key",
                "error" /* ERROR */,
                {
                  command: "--storage",
                  element: invoker,
                  recovery: "Use --storage:local:remove:key or --storage:session:remove:key"
                }
              );
            }
            storage.removeItem(key);
            if (targets.length > 0) {
              if ("value" in targets[0]) {
                targets[0].value = "";
              } else {
                targets[0].textContent = "Stored username will appear here";
              }
            }
            break;
          case "clear":
            storage.clear();
            if (targets.length > 0) {
              targets[0].textContent = "Storage cleared successfully";
            }
            break;
          case "keys":
            const prefix = key || "";
            const allKeys = Object.keys(storage).filter((k) => k.startsWith(prefix));
            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify(allKeys);
            }
            break;
          case "has":
            const exists = storage.getItem(key) !== null;
            if (targets.length > 0) {
              targets[0].textContent = exists.toString();
            }
            break;
          case "size":
            let size = 0;
            for (let i = 0; i < storage.length; i++) {
              const k = storage.key(i);
              if (k) {
                size += k.length + (((_c = storage.getItem(k)) == null ? void 0 : _c.length) || 0);
              }
            }
            if (targets.length > 0) {
              targets[0].textContent = size.toString();
            }
            break;
          default:
            throw createInvokerError(
              `Unknown storage action "${action}"`,
              "error" /* ERROR */,
              {
                command: "--storage",
                element: invoker,
                context: { action, availableActions: ["set", "get", "remove", "clear", "keys", "has", "size"] },
                recovery: "Use set, get, remove, clear, keys, has, or size actions"
              }
            );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "QuotaExceededError") {
          throw createInvokerError(
            "Storage quota exceeded. Cannot store more data.",
            "error" /* ERROR */,
            {
              command: "--storage",
              element: invoker,
              cause: error,
              recovery: "Clear some storage space or use sessionStorage instead of localStorage"
            }
          );
        }
        throw createInvokerError(
          `Storage operation failed: ${error.message}`,
          "error" /* ERROR */,
          {
            command: "--storage",
            element: invoker,
            cause: error,
            recovery: "Check storage availability, quota limits, and data format"
          }
        );
      }
    });
    this.register("--animate", ({ invoker, getTargets, params }) => {
      var _a, _b, _c, _d;
      const [animation, ...options] = params;
      const targets = getTargets();
      if (targets.length === 0) {
        const error = createInvokerError(
          "No target elements found for --animate command",
          "warning" /* WARNING */,
          {
            command: "--animate",
            element: invoker,
            recovery: "Ensure commandfor points to a valid element"
          }
        );
        logInvokerError(error);
        return;
      }
      const validAnimations = [
        "fade-in",
        "fade-out",
        "slide-up",
        "slide-down",
        "slide-left",
        "slide-right",
        "bounce",
        "shake",
        "pulse",
        "flip",
        "rotate-in",
        "zoom-in",
        "zoom-out",
        "spin",
        "wobble",
        "jello",
        "heartbeat",
        "rubber-band"
      ];
      if (!validAnimations.includes(animation)) {
        throw createInvokerError(
          `Unknown animation "${animation}"`,
          "error" /* ERROR */,
          {
            command: "--animate",
            element: invoker,
            context: { animation, validAnimations },
            recovery: `Use one of: ${validAnimations.join(", ")}`
          }
        );
      }
      let duration = "0.5s";
      let delay = "0s";
      let easing = "ease-in-out";
      let iterations = "1";
      options.forEach((option) => {
        if (option.includes("duration:")) {
          duration = option.split(":")[1] || "0.5s";
        } else if (option.includes("delay:")) {
          delay = option.split(":")[1] || "0s";
        } else if (option.includes("easing:")) {
          easing = option.split(":")[1] || "ease-in-out";
        } else if (option.includes("iterations:")) {
          iterations = option.split(":")[1] || "1";
        }
      });
      if ((_a = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _a.animateDuration) duration = invoker.dataset.animateDuration;
      if ((_b = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _b.animateDelay) delay = invoker.dataset.animateDelay;
      if ((_c = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _c.animateEasing) easing = invoker.dataset.animateEasing;
      if ((_d = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _d.animateIterations) iterations = invoker.dataset.animateIterations;
      try {
        targets.forEach((target) => {
          if (!target.isConnected) {
            console.warn("Invokers: Skipping disconnected target element", target);
            return;
          }
          target.classList.forEach((className) => {
            if (className.startsWith("invokers-animate-")) {
              target.classList.remove(className);
            }
          });
          target.style.animation = "";
          void target.offsetHeight;
          const animationName = `invokers-${animation}`;
          const animationValue = `${animationName} ${duration} ${easing} ${delay} ${iterations}`;
          target.style.animation = animationValue;
          const handleAnimationEnd = (e) => {
            if (e.animationName === animationName) {
              target.style.animation = "";
              target.removeEventListener("animationend", handleAnimationEnd);
            }
          };
          target.addEventListener("animationend", handleAnimationEnd);
          setTimeout(() => {
            if (target.style.animation.includes(animationName)) {
              target.style.animation = "";
              target.removeEventListener("animationend", handleAnimationEnd);
            }
          }, parseFloat(duration) * 1e3 + parseFloat(delay) * 1e3 + 100);
        });
      } catch (error) {
        throw createInvokerError(
          "Failed to animate target elements",
          "error" /* ERROR */,
          {
            command: "--animate",
            element: invoker,
            cause: error,
            recovery: "Ensure target elements support CSS animations and check animation parameters"
          }
        );
      }
    });
    this.register("--url", ({ invoker, getTargets, params }) => {
      var _a, _b, _c, _d;
      const [action, ...valueParts] = params;
      const targets = getTargets();
      const location = window.location;
      const history = window.history;
      try {
        switch (action) {
          case "params-get":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "URL params-get requires a parameter name",
                "error" /* ERROR */,
                {
                  command: "--url",
                  element: invoker,
                  recovery: "Use --url:params-get:param-name"
                }
              );
            }
            const paramName = valueParts[0];
            const searchParams = location.search.startsWith("?") ? location.search.substring(1) : location.search;
            const urlParams = new URLSearchParams(searchParams);
            const paramValue = urlParams.get(paramName) || "";
            if (targets.length > 0) {
              if ("value" in targets[0]) {
                targets[0].value = paramValue;
              } else {
                targets[0].textContent = paramValue;
              }
            }
            break;
          case "params-set":
            let setParamName;
            let setParamValue;
            if (valueParts.length >= 2) {
              const [paramName2, ...paramValueParts] = valueParts;
              setParamName = paramName2;
              setParamValue = paramValueParts.join(":");
            } else if (valueParts.length === 1) {
              setParamName = valueParts[0];
              if (targets.length > 0 && "value" in targets[0]) {
                setParamValue = targets[0].value;
              } else {
                throw createInvokerError(
                  "URL params-set with single parameter requires a target input element with a value",
                  "error" /* ERROR */,
                  {
                    command: "--url",
                    element: invoker,
                    recovery: "Use --url:params-set:param-name and commandfor pointing to an input element, or provide value: --url:params-set:param-name:value"
                  }
                );
              }
            } else if (valueParts.length === 0) {
              setParamName = ((_a = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _a.urlParamName) || ((_b = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _b.paramName) || "";
              if (!setParamName) {
                throw createInvokerError(
                  "URL params-set without parameters requires data-url-param-name attribute",
                  "error" /* ERROR */,
                  {
                    command: "--url",
                    element: invoker,
                    recovery: 'Add data-url-param-name="param-name" or use --url:params-set:param-name:value'
                  }
                );
              }
              if (targets.length > 0 && "value" in targets[0]) {
                setParamValue = targets[0].value;
              } else {
                throw createInvokerError(
                  "URL params-set without value parameter requires a target input element",
                  "error" /* ERROR */,
                  {
                    command: "--url",
                    element: invoker,
                    recovery: "Use commandfor pointing to an input element with the parameter value"
                  }
                );
              }
            } else {
              throw createInvokerError(
                "URL params-set requires parameter name and value",
                "error" /* ERROR */,
                {
                  command: "--url",
                  element: invoker,
                  recovery: "Use --url:params-set:param-name:value, or --url:params-set:param-name with commandfor to input element"
                }
              );
            }
            const currentUrl = new URL(location.href);
            currentUrl.searchParams.set(setParamName, setParamValue);
            const preserveState = ((_c = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _c.urlPreserveState) === "true";
            history.replaceState(
              preserveState ? history.state : null,
              "",
              currentUrl.toString()
            );
            break;
          case "params-delete":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "URL params-delete requires a parameter name",
                "error" /* ERROR */,
                {
                  command: "--url",
                  element: invoker,
                  recovery: "Use --url:params-delete:param-name"
                }
              );
            }
            const deleteParamName = valueParts[0];
            const deleteUrl = new URL(location.href);
            deleteUrl.searchParams.delete(deleteParamName);
            history.replaceState(null, "", deleteUrl.toString());
            break;
          case "params-clear":
            const clearUrl = new URL(location.href);
            clearUrl.search = "";
            history.replaceState(null, "", clearUrl.toString());
            break;
          case "params-all":
            const allSearchParams = location.search.startsWith("?") ? location.search.substring(1) : location.search;
            const allParams = Object.fromEntries(new URLSearchParams(allSearchParams));
            const paramsJson = JSON.stringify(allParams);
            if (targets.length > 0) {
              targets[0].textContent = paramsJson;
            }
            break;
          case "hash-get":
            const hashValue = location.hash.substring(1);
            if (targets.length > 0) {
              if ("value" in targets[0]) {
                targets[0].value = hashValue;
              } else {
                targets[0].textContent = hashValue;
              }
            }
            break;
          case "hash-set":
            let hashToSet;
            if (valueParts.length > 0) {
              hashToSet = valueParts.join(":");
            } else {
              if (targets.length > 0 && "value" in targets[0]) {
                hashToSet = targets[0].value;
              } else {
                throw createInvokerError(
                  "URL hash-set without value requires a target input element with a value",
                  "error" /* ERROR */,
                  {
                    command: "--url",
                    element: invoker,
                    recovery: "Use --url:hash-set:hash-value or commandfor pointing to an input element"
                  }
                );
              }
            }
            location.hash = hashToSet ? `#${hashToSet}` : "";
            break;
          case "hash-clear":
            location.hash = "";
            break;
          case "pathname-get":
            const pathname = location.pathname;
            if (targets.length > 0) {
              targets[0].textContent = pathname;
            }
            break;
          case "pathname-set":
            let newPathname;
            if (valueParts.length > 0) {
              newPathname = valueParts[0];
            } else {
              if (targets.length > 0 && "value" in targets[0]) {
                newPathname = targets[0].value;
              } else {
                throw createInvokerError(
                  "URL pathname-set without value requires a target input element with a value",
                  "error" /* ERROR */,
                  {
                    command: "--url",
                    element: invoker,
                    recovery: "Use --url:pathname-set:/new-path or commandfor pointing to an input element"
                  }
                );
              }
            }
            const pathnameUrl = new URL(location.href);
            pathnameUrl.pathname = newPathname;
            history.replaceState(null, "", pathnameUrl.toString());
            break;
          case "reload":
            const forceReload = ((_d = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _d.urlForceReload) === "true";
            location.reload(forceReload);
            break;
          case "replace":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "URL replace requires a URL",
                "error" /* ERROR */,
                {
                  command: "--url",
                  element: invoker,
                  recovery: "Use --url:replace:new-url"
                }
              );
            }
            const replaceUrl = valueParts.join(":");
            history.replaceState(null, "", replaceUrl);
            break;
          case "navigate":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "URL navigate requires a URL",
                "error" /* ERROR */,
                {
                  command: "--url",
                  element: invoker,
                  recovery: "Use --url:navigate:new-url"
                }
              );
            }
            const navigateUrl = valueParts.join(":");
            history.pushState({}, "", navigateUrl);
            break;
          case "base":
            const baseUrl = `${location.protocol}//${location.host}`;
            if (targets.length > 0) {
              targets[0].textContent = baseUrl;
            }
            break;
          case "full":
            const fullUrl = location.href;
            if (targets.length > 0) {
              targets[0].textContent = fullUrl;
            }
            break;
          default:
            throw createInvokerError(
              `Unknown URL action "${action}"`,
              "error" /* ERROR */,
              {
                command: "--url",
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    "params-get",
                    "params-set",
                    "params-delete",
                    "params-clear",
                    "params-all",
                    "hash-get",
                    "hash-set",
                    "hash-clear",
                    "pathname-get",
                    "pathname-set",
                    "reload",
                    "replace",
                    "navigate",
                    "base",
                    "full"
                  ]
                },
                recovery: "Use a valid URL action"
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          "URL operation failed",
          "error" /* ERROR */,
          {
            command: "--url",
            element: invoker,
            cause: error,
            recovery: "Check URL format, parameter names, and browser support"
          }
        );
      }
    });
    this.register("--history", ({ invoker, getTargets, params }) => {
      const targets = getTargets();
      let action = params[0];
      let valueParts = params.slice(1);
      if (params[0] === "state") {
        if (params.length === 1) {
          action = "state:get";
          valueParts = [];
        } else {
          action = `${params[0]}:${params[1]}`;
          valueParts = params.slice(2);
        }
      } else if (params.length >= 2 && ["length", "clear"].includes(params[0])) {
        action = `${params[0]}:${params[1]}`;
        valueParts = params.slice(2);
      }
      try {
        switch (action) {
          case "push":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "History push requires a URL",
                "error" /* ERROR */,
                {
                  command: "--history",
                  element: invoker,
                  recovery: "Use --history:push:url or --history:push:url:title:state-data"
                }
              );
            }
            const pushUrl = valueParts[0];
            const pushTitle = valueParts[1] || "";
            const pushState = valueParts.slice(2).join(":");
            let state = null;
            if (pushState) {
              try {
                state = JSON.parse(pushState);
              } catch (e) {
                state = pushState;
              }
            }
            window.history.pushState(state, pushTitle, pushUrl);
            if (targets.length > 0) {
              targets[0].textContent = `Pushed ${pushUrl} to history`;
            }
            break;
          case "replace":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "History replace requires a URL",
                "error" /* ERROR */,
                {
                  command: "--history",
                  element: invoker,
                  recovery: "Use --history:replace:url or --history:replace:url:title:state-data"
                }
              );
            }
            const replaceUrl = valueParts[0];
            const replaceTitle = valueParts[1] || "";
            const replaceState = valueParts.slice(2).join(":");
            let replaceStateData = null;
            if (replaceState) {
              try {
                replaceStateData = JSON.parse(replaceState);
              } catch (e) {
                replaceStateData = replaceState;
              }
            }
            window.history.replaceState(replaceStateData, replaceTitle, replaceUrl);
            if (targets.length > 0) {
              targets[0].textContent = `Replaced current URL with ${replaceUrl}`;
            }
            break;
          case "back":
            window.history.back();
            if (targets.length > 0) {
              targets[0].textContent = "Navigated back in history";
            }
            break;
          case "forward":
            window.history.forward();
            if (targets.length > 0) {
              targets[0].textContent = "Navigated forward in history";
            }
            break;
          case "go":
            const delta = valueParts[0] ? parseInt(valueParts[0], 10) : -1;
            if (isNaN(delta)) {
              throw createInvokerError(
                "History go requires a valid number",
                "error" /* ERROR */,
                {
                  command: "--history",
                  element: invoker,
                  recovery: "Use --history:go:number (positive for forward, negative for back)"
                }
              );
            }
            window.history.go(delta);
            if (targets.length > 0) {
              targets[0].textContent = `Navigated ${delta > 0 ? "forward" : "back"} ${Math.abs(delta)} page(s) in history`;
            }
            break;
          case "state:get":
            const currentState = window.history.state;
            const stateJson = JSON.stringify(currentState);
            if (targets.length > 0) {
              targets[0].textContent = stateJson;
            }
            break;
          case "state:set":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "History state:set requires state data",
                "error" /* ERROR */,
                {
                  command: "--history",
                  element: invoker,
                  recovery: "Use --history:state:set:json-data"
                }
              );
            }
            const stateData = valueParts.join(":");
            let newState;
            try {
              newState = JSON.parse(stateData);
            } catch (e) {
              newState = stateData;
            }
            window.history.replaceState(newState, document.title);
            break;
          case "length":
            const historyLength = window.history.length;
            if (targets.length > 0) {
              targets[0].textContent = historyLength.toString();
            }
            break;
          case "clear":
            window.history.replaceState(null, document.title);
            break;
          default:
            throw createInvokerError(
              `Unknown history action "${action}"`,
              "error" /* ERROR */,
              {
                command: "--history",
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    "push",
                    "replace",
                    "back",
                    "forward",
                    "go",
                    "state",
                    "state:get",
                    "state:set",
                    "length",
                    "clear"
                  ]
                },
                recovery: "Use a valid history action"
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          "History operation failed",
          "error" /* ERROR */,
          {
            command: "--history",
            element: invoker,
            cause: error,
            recovery: "Check browser history support and parameters"
          }
        );
      }
    });
    this.register("--device", async ({ invoker, getTargets, params }) => {
      var _a, _b, _c, _d, _e, _f;
      const [action, ...valueParts] = params;
      const targets = getTargets();
      const requestPermission = async (permissionName) => {
        if ("permissions" in navigator) {
          try {
            const permission = await navigator.permissions.query({ name: permissionName });
            return permission.state === "granted";
          } catch (e) {
            return false;
          }
        }
        return true;
      };
      try {
        switch (action) {
          case "vibrate":
            if (valueParts.length === 0) {
              throw createInvokerError(
                "Device vibrate requires a pattern",
                "error" /* ERROR */,
                {
                  command: "--device",
                  element: invoker,
                  recovery: "Use --device:vibrate:200 or --device:vibrate:100:200:100"
                }
              );
            }
            if (!("vibrate" in navigator)) {
              console.warn("Invokers: Vibration API not supported");
              return;
            }
            const pattern = valueParts.map((n) => parseInt(n, 10));
            const vibrateResult = navigator.vibrate(pattern.length === 1 ? pattern[0] : pattern);
            if (!vibrateResult) {
              console.warn("Invokers: Vibration failed - may be blocked or not supported");
            }
            break;
          case "share":
            if (!("share" in navigator)) {
              console.warn("Invokers: Web Share API not supported");
              return;
            }
            const shareData = {};
            if (valueParts.length > 0) {
              for (let i = 0; i < valueParts.length; i += 2) {
                const key = valueParts[i];
                const val = valueParts[i + 1];
                if (key && val !== void 0) {
                  if (key === "url") shareData.url = val;
                  else if (key === "text") shareData.text = val;
                  else if (key === "title") shareData.title = val;
                }
              }
            }
            try {
              await navigator.share(shareData);
              document.dispatchEvent(new CustomEvent("device:share:success"));
            } catch (shareError) {
              document.dispatchEvent(new CustomEvent("device:share:cancelled", {
                detail: shareError
              }));
            }
            break;
          case "geolocation:get":
            if (!("geolocation" in navigator)) {
              throw createInvokerError(
                "Geolocation API not supported",
                "error" /* ERROR */,
                {
                  command: "--device",
                  element: invoker,
                  recovery: "Geolocation requires HTTPS and user permission"
                }
              );
            }
            const hasGeoPermission = await requestPermission("geolocation");
            if (!hasGeoPermission) {
              console.warn("Invokers: Geolocation permission not granted");
              document.dispatchEvent(new CustomEvent("geolocation:denied"));
              return;
            }
            const geoOptions = {
              enableHighAccuracy: ((_a = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _a.geoHighAccuracy) === "true",
              timeout: parseInt(((_b = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _b.geoTimeout) || "10000"),
              maximumAge: parseInt(((_c = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _c.geoMaxAge) || "0")
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
                document.dispatchEvent(new CustomEvent("device:geolocation:success", { detail: data }));
              },
              (error) => {
                const errorData = {
                  code: error.code,
                  message: error.message
                };
                document.dispatchEvent(new CustomEvent("device:geolocation:error", { detail: errorData }));
              },
              geoOptions
            );
            break;
          case "orientation:get":
            if (!window.DeviceOrientationEvent) {
              console.warn("Invokers: Device Orientation API not supported");
              return;
            }
            const orientation = ((_d = window.screen) == null ? void 0 : _d.orientation) || window.orientation;
            const orientationData = {
              angle: (orientation == null ? void 0 : orientation.angle) || 0,
              type: (orientation == null ? void 0 : orientation.type) || "unknown"
            };
            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify(orientationData);
            }
            document.dispatchEvent(new CustomEvent("device:orientation:current", { detail: orientationData }));
            break;
          case "motion:get":
            if (!window.DeviceMotionEvent) {
              console.warn("Invokers: Device Motion API not supported");
              return;
            }
            if (typeof DeviceMotionEvent.requestPermission === "function") {
              try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== "granted") {
                  console.warn("Invokers: Device motion permission denied");
                  return;
                }
              } catch (e) {
                console.warn("Invokers: Failed to request device motion permission");
                return;
              }
            }
            const motionSupported = true;
            if (targets.length > 0) {
              targets[0].textContent = JSON.stringify({ supported: motionSupported });
            }
            break;
          case "battery:get":
            if (!("getBattery" in navigator)) {
              console.warn("Invokers: Battery API not supported");
              return;
            }
            try {
              const battery = await navigator.getBattery();
              const data = {
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
              };
              if (targets.length > 0) {
                targets[0].textContent = JSON.stringify(data);
              }
              document.dispatchEvent(new CustomEvent("device:battery:status", { detail: data }));
            } catch (batteryError) {
              console.warn("Invokers: Failed to get battery status", batteryError);
            }
            break;
          case "clipboard:read":
            if (!((_e = navigator.clipboard) == null ? void 0 : _e.readText)) {
              console.warn("Invokers: Clipboard read not supported");
              return;
            }
            try {
              const clipboardText = await navigator.clipboard.readText();
              if (targets.length > 0) {
                if ("value" in targets[0]) {
                  targets[0].value = clipboardText;
                } else {
                  targets[0].textContent = clipboardText;
                }
              }
              document.dispatchEvent(new CustomEvent("device:clipboard:read", { detail: clipboardText }));
            } catch (clipboardError) {
              console.warn("Invokers: Clipboard read failed", clipboardError);
              document.dispatchEvent(new CustomEvent("device:clipboard:denied"));
            }
            break;
          case "clipboard:write":
            if (!((_f = navigator.clipboard) == null ? void 0 : _f.writeText)) {
              console.warn("Invokers: Clipboard write not supported");
              return;
            }
            const textToWrite = valueParts.join(":");
            if (!textToWrite) {
              throw createInvokerError(
                "Clipboard write requires text to copy",
                "error" /* ERROR */,
                {
                  command: "--device",
                  element: invoker,
                  recovery: "Use --device:clipboard:write:text-to-copy"
                }
              );
            }
            try {
              await navigator.clipboard.writeText(textToWrite);
              document.dispatchEvent(new CustomEvent("device:clipboard:written", { detail: textToWrite }));
            } catch (clipboardError) {
              console.warn("Invokers: Clipboard write failed", clipboardError);
              document.dispatchEvent(new CustomEvent("device:clipboard:denied"));
            }
            break;
          case "wake-lock":
            if (!("wakeLock" in navigator)) {
              console.warn("Invokers: Wake Lock API not supported");
              return;
            }
            try {
              const wakeLock = await navigator.wakeLock.request("screen");
              window._invokersWakeLock = wakeLock;
              document.dispatchEvent(new CustomEvent("device:wake-lock:acquired"));
            } catch (wakeError) {
              console.warn("Invokers: Wake lock request failed", wakeError);
              document.dispatchEvent(new CustomEvent("device:wake-lock:denied"));
            }
            break;
          case "wake-lock:release":
            if (window._invokersWakeLock) {
              window._invokersWakeLock.release();
              delete window._invokersWakeLock;
              document.dispatchEvent(new CustomEvent("device:wake-lock:released"));
            }
            break;
          default:
            throw createInvokerError(
              `Unknown device action "${action}"`,
              "error" /* ERROR */,
              {
                command: "--device",
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    "vibrate",
                    "share",
                    "geolocation:get",
                    "orientation:get",
                    "motion:get",
                    "battery:get",
                    "clipboard:read",
                    "clipboard:write",
                    "wake-lock",
                    "wake-lock:release"
                  ]
                },
                recovery: "Use a supported device action"
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          "Device API operation failed",
          "error" /* ERROR */,
          {
            command: "--device",
            element: invoker,
            cause: error,
            recovery: "Check device API support, permissions, and parameters"
          }
        );
      }
    });
    this.register("--a11y", ({ invoker, getTargets, params }) => {
      var _a;
      const [action, ...valueParts] = params;
      const value = valueParts.join(":");
      const targets = getTargets();
      try {
        switch (action) {
          case "announce":
            if (!value) {
              throw createInvokerError(
                "A11y announce requires text to announce",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:announce:Your announcement text"
                }
              );
            }
            const priority = ((_a = invoker == null ? void 0 : invoker.dataset) == null ? void 0 : _a.announcePriority) || "polite";
            let liveRegion = document.getElementById(`invokers-a11y-announcer-${priority}`);
            if (!liveRegion) {
              liveRegion = document.createElement("div");
              liveRegion.id = `invokers-a11y-announcer-${priority}`;
              liveRegion.setAttribute("aria-live", priority);
              liveRegion.setAttribute("aria-atomic", "true");
              liveRegion.style.position = "absolute";
              liveRegion.style.left = "-10000px";
              liveRegion.style.width = "1px";
              liveRegion.style.height = "1px";
              liveRegion.style.overflow = "hidden";
              document.body.appendChild(liveRegion);
            }
            liveRegion.textContent = "";
            setTimeout(() => {
              liveRegion.textContent = value;
            }, 100);
            break;
          case "focus":
            if (targets.length === 0) {
              throw createInvokerError(
                "A11y focus requires target elements",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use commandfor to specify which element to focus"
                }
              );
            }
            const focusTarget = targets[0];
            if (focusTarget.focus) {
              focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => {
                focusTarget.focus();
                document.dispatchEvent(new CustomEvent("a11y:focus:changed", {
                  detail: { element: focusTarget, label: focusTarget.textContent || focusTarget.getAttribute("aria-label") }
                }));
              }, 300);
            }
            break;
          case "skip-to":
            if (!value) {
              throw createInvokerError(
                "A11y skip-to requires an element ID",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:skip-to:element-id"
                }
              );
            }
            const skipTarget = document.getElementById(value);
            if (skipTarget) {
              if (!skipTarget.hasAttribute("tabindex") && !["button", "input", "select", "textarea", "a"].includes(skipTarget.tagName.toLowerCase())) {
                skipTarget.setAttribute("tabindex", "-1");
              }
              skipTarget.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => {
                skipTarget.focus();
              }, 300);
            } else {
              throw createInvokerError(
                `Element with id "${value}" not found`,
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Ensure the target element exists and has the correct ID"
                }
              );
            }
            break;
          case "focus-trap":
            if (!value || !["enable", "disable"].includes(value)) {
              throw createInvokerError(
                'A11y focus-trap requires "enable" or "disable"',
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:focus-trap:enable or --a11y:focus-trap:disable"
                }
              );
            }
            if (value === "enable" && targets.length > 0) {
              const container = targets[0];
              const getFocusableElements = () => {
                return container.querySelectorAll(
                  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
              };
              const focusableElements = getFocusableElements();
              const firstElement = focusableElements[0];
              const handleTabKey = (e) => {
                const currentFocusable = getFocusableElements();
                const currentFirst = currentFocusable[0];
                const currentLast = currentFocusable[currentFocusable.length - 1];
                if (e.key === "Tab") {
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
                if (e.key === "Escape") {
                  document.dispatchEvent(new CustomEvent("a11y:focus-trap:escape", {
                    detail: { container }
                  }));
                }
              };
              const handleFocusIn = (e) => {
                const target = e.target;
                if (!container.contains(target)) {
                  const focusableElements2 = getFocusableElements();
                  if (focusableElements2.length > 0) {
                    focusableElements2[0].focus();
                  }
                }
              };
              container.addEventListener("keydown", handleTabKey);
              document.addEventListener("focusin", handleFocusIn);
              container._a11yFocusTrap = {
                tabHandler: handleTabKey,
                focusHandler: handleFocusIn
              };
              firstElement == null ? void 0 : firstElement.focus();
              document.dispatchEvent(new CustomEvent("a11y:focus-trap:enabled", {
                detail: { container }
              }));
            } else if (value === "disable" && targets.length > 0) {
              const container = targets[0];
              const handlers = container._a11yFocusTrap;
              if (handlers) {
                container.removeEventListener("keydown", handlers.tabHandler);
                document.removeEventListener("focusin", handlers.focusHandler);
                delete container._a11yFocusTrap;
              }
              document.dispatchEvent(new CustomEvent("a11y:focus-trap:disabled", {
                detail: { container }
              }));
            }
            break;
          case "aria:set":
            if (!value || !value.includes(":")) {
              throw createInvokerError(
                "A11y aria:set requires attribute:value format",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:aria:set:attribute:value"
                }
              );
            }
            const [ariaAttr, ariaValue] = value.split(":", 2);
            if (targets.length > 0) {
              targets.forEach((target) => {
                target.setAttribute(`aria-${ariaAttr}`, ariaValue);
              });
            }
            break;
          case "aria:remove":
            if (!value) {
              throw createInvokerError(
                "A11y aria:remove requires an attribute name",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:aria:remove:attribute"
                }
              );
            }
            if (targets.length > 0) {
              targets.forEach((target) => {
                target.removeAttribute(`aria-${value}`);
              });
            }
            break;
          case "heading-level":
            if (!value || !["1", "2", "3", "4", "5", "6"].includes(value)) {
              throw createInvokerError(
                "A11y heading-level requires a level 1-6",
                "error" /* ERROR */,
                {
                  command: "--a11y",
                  element: invoker,
                  recovery: "Use --a11y:heading-level:1-6"
                }
              );
            }
            if (targets.length > 0) {
              targets.forEach((target) => {
                var _a2;
                if (target.tagName.match(/^H[1-6]$/)) {
                  const newTag = `H${value}`;
                  const newElement = document.createElement(newTag);
                  Array.from(target.attributes).forEach((attr) => {
                    newElement.setAttribute(attr.name, attr.value);
                  });
                  newElement.innerHTML = target.innerHTML;
                  (_a2 = target.parentNode) == null ? void 0 : _a2.replaceChild(newElement, target);
                } else {
                  target.setAttribute("aria-level", value);
                }
              });
            }
            break;
          default:
            throw createInvokerError(
              `Unknown accessibility action "${action}"`,
              "error" /* ERROR */,
              {
                command: "--a11y",
                element: invoker,
                context: {
                  action,
                  availableActions: [
                    "announce",
                    "focus",
                    "skip-to",
                    "focus-trap",
                    "aria:set",
                    "aria:remove",
                    "heading-level"
                  ]
                },
                recovery: "Use a valid accessibility action"
              }
            );
        }
      } catch (error) {
        throw createInvokerError(
          "Accessibility operation failed",
          "error" /* ERROR */,
          {
            command: "--a11y",
            element: invoker,
            cause: error,
            recovery: "Check accessibility requirements and target elements"
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
  /**
   * Registers a plugin with middleware hooks.
   */
  registerPlugin(plugin) {
    if (this.plugins.has(plugin.name)) {
      throw createInvokerError(
        `Plugin "${plugin.name}" is already registered`,
        "error" /* ERROR */,
        {
          recovery: "Unregister the plugin first or use a different name"
        }
      );
    }
    this.plugins.set(plugin.name, plugin);
    if (plugin.middleware) {
      for (const [hookPoint, middleware] of Object.entries(plugin.middleware)) {
        if (middleware) {
          this.registerMiddleware(hookPoint, middleware);
        }
      }
    }
    if (plugin.onRegister) {
      plugin.onRegister();
    }
  }
  /**
   * Unregisters a plugin and removes its middleware.
   */
  unregisterPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw createInvokerError(
        `Plugin "${name}" is not registered`,
        "error" /* ERROR */,
        {
          recovery: "Check the plugin name and ensure it is registered"
        }
      );
    }
    if (plugin.onUnregister) {
      plugin.onUnregister();
    }
    if (plugin.middleware) {
      for (const [hookPoint, middleware] of Object.entries(plugin.middleware)) {
        if (middleware) {
          this.unregisterMiddleware(hookPoint, middleware);
        }
      }
    }
    this.plugins.delete(name);
  }
  /**
   * Registers a middleware function for a specific hook point.
   */
  registerMiddleware(hookPoint, middleware) {
    if (!this.middleware.has(hookPoint)) {
      this.middleware.set(hookPoint, []);
    }
    this.middleware.get(hookPoint).push(middleware);
  }
  /**
   * Unregisters a middleware function from a specific hook point.
   */
  unregisterMiddleware(hookPoint, middleware) {
    const middlewares = this.middleware.get(hookPoint);
    if (middlewares) {
      const index = middlewares.indexOf(middleware);
      if (index > -1) {
        middlewares.splice(index, 1);
      }
    }
  }
  /**
   * Executes middleware for a specific hook point.
   */
  async executeMiddleware(hookPoint, context) {
    const middlewares = this.middleware.get(hookPoint);
    if (middlewares) {
      for (const middleware of middlewares) {
        try {
          await middleware(context);
        } catch (error) {
          logInvokerError(
            createInvokerError(
              `Middleware execution failed for hook "${hookPoint}"`,
              "error" /* ERROR */,
              {
                cause: error,
                recovery: "Check the middleware implementation for errors"
              }
            )
          );
        }
      }
    }
  }
};
// --- Advanced Event Features ---
_InvokerManager._interpolationEnabled = false;
var InvokerManager = _InvokerManager;
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
  async executeStep(step, _context) {
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
var invokerInstance = InvokerManager.getInstance();
var setupGlobalAPI = () => {
  let targetWindow = null;
  if (typeof globalThis !== "undefined" && globalThis.window) {
    targetWindow = globalThis.window;
  }
  if (!targetWindow && typeof global !== "undefined" && global.window) {
    targetWindow = global.window;
  }
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
      get debug() {
        return isDebugMode;
      },
      set debug(value) {
        isDebugMode = value;
        console.log(`Invokers: Debug mode ${value ? "enabled" : "disabled"}.`);
      },
      getStats: () => invokerInstance["performanceMonitor"].getStats(),
      getRegisteredCommands: () => Array.from(invokerInstance["commands"].keys()),
      validateElement,
      createError: createInvokerError,
      logError: logInvokerError,
      // Plugin and middleware API
      registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
      unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
      registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
      unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
      reset() {
        invokerInstance["commands"].clear();
        invokerInstance["commandStates"].clear();
        invokerInstance["sortedCommandKeys"] = [];
        invokerInstance["plugins"].clear();
        invokerInstance["middleware"].clear();
        console.log("Invokers: Reset complete.");
      }
    };
  }
  if (typeof window !== "undefined" && !window.Invoker) {
    window.Invoker = (targetWindow == null ? void 0 : targetWindow.Invoker) || {
      // Bind all public methods to the one true instance.
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
      // *** FIX: Expose the new registration function on the global API. ***
      registerAll: invokerInstance.registerExtendedCommands.bind(invokerInstance),
      parseCommandString,
      createCommandString,
      instance: invokerInstance,
      get debug() {
        return isDebugMode;
      },
      set debug(value) {
        isDebugMode = value;
        console.log(`Invokers: Debug mode ${value ? "enabled" : "disabled"}.`);
      },
      getStats: () => invokerInstance["performanceMonitor"].getStats(),
      getRegisteredCommands: () => Array.from(invokerInstance["commands"].keys()),
      validateElement,
      createError: createInvokerError,
      logError: logInvokerError,
      // Plugin and middleware API
      registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
      unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
      registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
      unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
      reset() {
        invokerInstance["commands"].clear();
        invokerInstance["commandStates"].clear();
        invokerInstance["sortedCommandKeys"] = [];
        invokerInstance["plugins"].clear();
        invokerInstance["middleware"].clear();
        console.log("Invokers: Reset complete.");
      }
    };
  }
};
setupGlobalAPI();
var src_default = invokerInstance;
export {
  ErrorSeverity,
  HookPoint,
  InvokerManager,
  RateLimiter,
  _dispatchCommandEvent,
  applyInterestInvokers,
  createCommandString,
  createInterestEvent,
  createInvokerError,
  src_default as default,
  isDebugMode,
  isInterestInvokersSupported,
  isInterpolationEnabled,
  logInvokerError,
  parseCommandString,
  sanitizeHTML,
  sanitizeParams,
  validateElement
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
//# sourceMappingURL=index.js.map

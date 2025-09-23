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
export {
  applyInterestInvokers,
  createInterestEvent,
  isInterestInvokersSupported
};
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
//# sourceMappingURL=interest.js.map

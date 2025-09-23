"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  InvokerManager: () => InvokerManager,
  commands: () => invoker_commands_exports,
  createCommandString: () => createCommandString,
  default: () => src_default,
  parseCommandString: () => parseCommandString
});
module.exports = __toCommonJS(src_exports);

// src/invoker-commands.ts
var invoker_commands_exports = {};
__export(invoker_commands_exports, {
  commands: () => commands,
  registerAll: () => registerAll
});
var commands = {
  // --- Media Commands ---
  /**
   * Toggles play/pause on a target `<video>` or `<audio>` element. It automatically
   * updates the invoker's text content and `aria-pressed` state for accessibility.
   * Gracefully handles the promise returned by the `play()` method.
   *
   * @example
   * ```html
   * <button
   *   command="media:toggle"
   *   aria-controls="my-video"
   *   data-play-text="Pause Video"
   *   data-pause-text="Play Video"
   *   aria-pressed="false"
   * >
   *   Play Video
   * </button>
   * <video id="my-video" src="..."></video>
   * ```
   */
  "media:toggle": (context) => {
    const media = context.getTargets()[0];
    if (!media || typeof media.play !== "function") return;
    const { invoker } = context;
    const playText = invoker.dataset.playText || "Pause";
    const pauseText = invoker.dataset.pauseText || "Play";
    if (media.paused) {
      media.play().then(() => {
        invoker.textContent = playText;
        invoker.setAttribute("aria-pressed", "true");
      }).catch((err) => console.error("Invokers: Media play failed.", err));
    } else {
      media.pause();
      invoker.textContent = pauseText;
      invoker.setAttribute("aria-pressed", "false");
    }
  },
  /**
   * Seeks a target `<video>` or `<audio>` element forward or backward by a specified
   * number of seconds. Ensures the new time remains within the media's valid duration.
   *
   * @example
   * ```html
   * <button command="media:seek" aria-controls="my-video" data-seek="-10">Rewind 10s</button>
   * <button command="media:seek" aria-controls="my-video" data-seek="30">Forward 30s</button>
   * ```
   */
  "media:seek": (context) => {
    const media = context.getTargets()[0];
    const seekTime = parseFloat(context.invoker.dataset.seek || "0");
    if (!media || !isFinite(seekTime)) return;
    media.currentTime = Math.max(
      0,
      Math.min(media.duration, media.currentTime + seekTime)
    );
  },
  /**
   * Toggles the mute state on a target `<video>` or `<audio>` element and updates the
   * invoker's `aria-pressed` state to reflect the current muted status.
   *
   * @example
   * ```html
   * <button command="media:mute" aria-controls="my-video" aria-pressed="false">Mute</button>
   * ```
   */
  "media:mute": (context) => {
    const media = context.getTargets()[0];
    if (!media) return;
    media.muted = !media.muted;
    context.invoker.setAttribute("aria-pressed", String(media.muted));
  },
  // --- Carousel / Slider Commands ---
  /**
   * Navigates a carousel or slider by showing the next or previous item. It assumes
   * a structure where items are direct children of a container, and visibility is
   * controlled by the `hidden` attribute. Wraps around at the beginning and end.
   *
   * @example
   * ```html
   * <div id="my-carousel" class="carousel-container">
   *   <div class="slide">Slide 1</div>
   *   <div class="slide" hidden>Slide 2</div>
   *   <div class="slide" hidden>Slide 3</div>
   * </div>
   * <button command="carousel:nav" aria-controls="my-carousel" data-direction="prev">‹</button>
   * <button command="carousel:nav" aria-controls="my-carousel" data-direction="next">›</button>
   * ```
   */
  "carousel:nav": (context) => {
    const carousel = context.getTargets()[0];
    const direction = context.invoker.dataset.direction;
    if (!carousel || direction !== "next" && direction !== "prev") return;
    const slides = Array.from(carousel.children);
    if (slides.length < 2) return;
    const activeIndex = slides.findIndex(
      (slide) => !slide.hasAttribute("hidden")
    );
    const currentIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = direction === "next" ? (currentIndex + 1) % slides.length : (currentIndex - 1 + slides.length) % slides.length;
    const updateDOM = () => {
      slides.forEach((slide, index) => {
        slide.toggleAttribute("hidden", index !== nextIndex);
      });
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  // --- Clipboard and Form Commands ---
  /**
   * Copies the text content of the target element to the clipboard. It provides visual
   * feedback by temporarily changing the invoker's text. Handles permissions and
   * non-secure contexts gracefully.
   *
   * @example
   * ```html
   * <button
   *   command="clipboard:copy"
   *   aria-controls="code-snippet"
   *   data-feedback-text="Copied!"
   * >
   *   Copy
   * </button>
   * <pre id="code-snippet">npm install invokers</pre>
   * ```
   */
  "clipboard:copy": async (context) => {
    const target = context.getTargets()[0];
    const { invoker } = context;
    if (!target) return;
    if (!navigator.clipboard) {
      console.warn(
        "Invokers: Clipboard API not available or not in a secure context."
      );
      return;
    }
    const originalText = invoker.textContent || "";
    const feedbackText = invoker.dataset.feedbackText || "Copied!";
    const errorText = invoker.dataset.errorText || "Error!";
    const textToCopy = target.tagName === "INPUT" || target.tagName === "TEXTAREA" ? target.value : target.textContent || "";
    invoker.setAttribute("disabled", "");
    try {
      await navigator.clipboard.writeText(textToCopy);
      invoker.textContent = feedbackText;
    } catch (err) {
      console.error("Invokers: Failed to copy text.", err);
      invoker.textContent = errorText;
    } finally {
      setTimeout(() => {
        invoker.textContent = originalText;
        invoker.removeAttribute("disabled");
      }, 2e3);
    }
  },
  /**
   * Resets the target `<form>` element to its initial state.
   *
   * @example
   * ```html
   * <form id="my-form">...</form>
   * <button command="form:reset" aria-controls="my-form">Reset Form</button>
   * ```
   */
  "form:reset": (context) => {
    const form = context.getTargets()[0];
    if (form instanceof HTMLFormElement) form.reset();
  },
  /**
   * Submits the target `<form>` element, triggering browser validation.
   *
   * @example
   * ```html
   * <form id="my-form">...</form>
   * <button command="form:submit" aria-controls="my-form">Submit</button>
   * ```
   */
  "form:submit": (context) => {
    const form = context.getTargets()[0];
    if (form instanceof HTMLFormElement) form.requestSubmit();
  },
  /**
   * Increments or decrements the value of a target `<input type="number">`.
   * It respects the input's `step`, `min`, and `max` attributes. After changing
   * the value, it dispatches an `input` event to ensure compatibility with
   * other scripts or frameworks that listen for value changes.
   *
   * @example
   * ```html
   * <button command="input:step" aria-controls="quantity" data-step="-1">-</button>
   * <input type="number" id="quantity" value="1" step="1" min="0" max="10">
   * <button command="input:step" aria-controls="quantity" data-step="1">+</button>
   * ```
   */
  "input:step": (context) => {
    const input = context.getTargets()[0];
    if (!(input instanceof HTMLInputElement) || input.type !== "number") return;
    const stepDirection = parseFloat(context.invoker.dataset.step || "0");
    if (!isFinite(stepDirection)) return;
    if (stepDirection > 0) {
      input.stepUp(stepDirection);
    } else if (stepDirection < 0) {
      input.stepDown(Math.abs(stepDirection));
    }
    input.dispatchEvent(
      new Event("input", { bubbles: true, cancelable: true })
    );
  },
  // --- Scroll Commands ---
  /**
   * Smoothly scrolls the viewport to bring the target element into view.
   *
   * @example
   * ```html
   * <button command="scroll:to" aria-controls="section-2">Go to Section 2</button>
   * ...
   * <section id="section-2" style="height: 100vh;"></section>
   * ```
   */
  "scroll:to": (context) => {
    const target = context.getTargets()[0];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },
  // --- DOM Manipulation Commands ---
  /**
   * Removes the target element(s) from the DOM. Useful for dismissible alerts.
   * Can be animated with the View Transition API.
   *
   * @example
   * ```html
   * <div id="alert-1">
   *   Welcome!
   *   <button command="dom:remove" aria-controls="alert-1" aria-label="Dismiss">&times;</button>
   * </div>
   * ```
   */
  "dom:remove": (context) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;
    const updateDOM = () => targets.forEach((target) => target.remove());
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * Replaces the target element(s) entirely with new content.
   * Content can be sourced from a `<template>` using `data-template-id`
   * or by cloning an existing element using `data-clone-id`.
   *
   * @example
   * ```html
   * <!-- Using a template -->
   * <button command="dom:replace" aria-controls="placeholder" data-template-id="content-template">Load</button>
   * <div id="placeholder">Loading...</div>
   * <template id="content-template"><div>Loaded Content</div></template>
   *
   * <!-- Using a clone -->
   * <button command="dom:replace" aria-controls="item-a" data-clone-id="item-b">Swap A for B</button>
   * ```
   */
  "dom:replace": (context) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;
    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;
    const updateDOM = () => {
      targets.forEach((target, index) => {
        const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
        target.replaceWith(content);
      });
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * Swaps the *inner content* of the target element(s) with new content.
   * Content is sourced from a `<template>` or by cloning another element.
   * Uses `replaceChildren` for performance and correctness.
   *
   * @example
   * ```html
   * <button command="dom:swap" aria-controls="content-area" data-template-id="panel-2-template">Load Panel 2</button>
   * <div id="content-area">Original Content</div>
   * <template id="panel-2-template"><h2>Panel 2</h2></template>
   * ```
   */
  "dom:swap": (context) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;
    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;
    const updateDOM = () => {
      targets.forEach((target, index) => {
        const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
        target.replaceChildren(content);
      });
    };
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },
  /**
   * Appends content to the end of the target element(s).
   * Content is sourced from a `<template>` or by cloning another element.
   *
   * @example
   * ```html
   * <button command="dom:append" aria-controls="item-list" data-template-id="new-item-template">Add Item</button>
   * <ul id="item-list"><li>First item</li></ul>
   * <template id="new-item-template"><li>A new item</li></template>
   * ```
   */
  "dom:append": (context) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;
    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;
    targets.forEach((target, index) => {
      const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
      target.append(content);
    });
  },
  /**
   * Prepends content to the beginning of the target element(s).
   * Content is sourced from a `<template>` or by cloning another element.
   *
   * @example
   * ```html
   * <button command="dom:prepend" aria-controls="log" data-template-id="new-log-template">New Log</button>
   * <div id="log"><p>Old log</p></div>
   * <template id="new-log-template"><p>New log</p></template>
   * ```
   */
  "dom:prepend": (context) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;
    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;
    targets.forEach((target, index) => {
      const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
      target.prepend(content);
    });
  },
  // --- Fetch and Navigation Commands ---
  /**
   * Performs a GET request and swaps the response HTML into the target element(s).
   * Handles loading/error states by swapping content from corresponding `<template>`s.
   * Can trigger a follow-up command upon success for chained actions.
   *
   * @example
   * ```html
   * <button
   *   command="fetch:get"
   *   data-url="/api/content"
   *   aria-controls="content-area"
   *   data-loading-template="spinner-template"
   *   data-error-template="error-template"
   *   data-then-command="show"
   * >
   *   Load Content
   * </button>
   *
   * <div id="content-area"></div>
   * <template id="spinner-template">Loading...</template>
   * <template id="error-template">Error!</template>
   * ```
   */
  "fetch:get": async (context) => {
    const { invoker, getTargets } = context;
    const targets = getTargets();
    const url = invoker.dataset.url;
    if (!url) {
      console.warn(
        "Invokers: `fetch:get` requires a `data-url` attribute.",
        invoker
      );
      return;
    }
    if (targets.length === 0) {
      console.warn(
        "Invokers: `fetch:get` requires `aria-controls` or `data-target`.",
        invoker
      );
      return;
    }
    setBusyState(invoker, true);
    showFeedbackState(invoker, targets, "data-loading-template");
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) }
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => {
        targets.forEach((target, i) => {
          const content = i === 0 ? newContent : newContent.cloneNode(true);
          target.replaceChildren(content);
        });
      };
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      triggerFollowup(invoker, targets);
    } catch (error) {
      console.error("Invokers: `fetch:get` failed.", error);
      showFeedbackState(invoker, targets, "data-error-template");
    } finally {
      setBusyState(invoker, false);
    }
  },
  /**
   * Performs a POST/PUT/DELETE request, using a `<form>` as the data source.
   * The response HTML is swapped into the element(s) specified by `data-response-target`.
   * If no response target is specified, the form itself is updated.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post">...</form>
   * <button
   *   command="fetch:send"
   *   aria-controls="my-form"
   *   data-response-target="#response-area"
   * >
   *   Submit Form
   * </button>
   * <div id="response-area"></div>
   * ```
   */
  "fetch:send": async (context) => {
    const form = context.getTargets()[0];
    if (!(form instanceof HTMLFormElement)) {
      console.warn(
        "Invokers: `fetch:send` requires `aria-controls` to point to a valid <form>.",
        context.invoker
      );
      return;
    }
    const responseSelector = context.invoker.dataset.responseTarget;
    const responseTargets = responseSelector ? Array.from(
      document.querySelectorAll(responseSelector)
    ) : [form];
    const url = form.action;
    const method = (form.method || "POST").toUpperCase();
    if (!url) {
      console.warn(
        "Invokers: Target form for `fetch:send` must have an `action` attribute.",
        form
      );
      return;
    }
    setBusyState(context.invoker, true);
    showFeedbackState(
      context.invoker,
      responseTargets,
      "data-loading-template"
    );
    try {
      const response = await fetch(url, {
        method,
        body: new FormData(form),
        headers: getHeadersFromAttributes(context.invoker)
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => {
        responseTargets.forEach((target, i) => {
          const content = i === 0 ? newContent : newContent.cloneNode(true);
          target.replaceChildren(content);
        });
      };
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      triggerFollowup(context.invoker, responseTargets);
    } catch (error) {
      console.error(`Invokers: \`fetch:send\` (${method}) failed.`, error);
      showFeedbackState(
        context.invoker,
        responseTargets,
        "data-error-template"
      );
    } finally {
      setBusyState(context.invoker, false);
    }
  },
  /**
   * Navigates to a new URL using the History API for client-side routing.
   * This does NOT cause a full page reload, allowing integration with SPAs.
   * A `popstate` event is dispatched to signal the URL change.
   *
   * @example
   * ```html
   * <button command="navigate:to" data-url="/about">About Us</button>
   * ```
   */
  "navigate:to": (context) => {
    const url = context.invoker.dataset.url;
    if (!url) {
      console.warn(
        "Invokers: `navigate:to` command requires a `data-url` attribute.",
        context.invoker
      );
      return;
    }
    if (window.history && typeof window.history.pushState === "function") {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else {
      window.location.href = url;
    }
  }
};
function registerAll(specificCommands) {
  if (!window.Invoker) {
    console.error(
      "Invokers core library not found. Please ensure it is loaded before the commands module."
    );
    return;
  }
  const commandsToRegister = specificCommands || Object.keys(commands);
  for (const name of commandsToRegister) {
    if (commands[name]) {
      window.Invoker.register(name, commands[name]);
    }
  }
}
function getSourceNode(invoker) {
  const templateId = invoker.dataset.templateId;
  const cloneId = invoker.dataset.cloneId;
  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      console.error(
        `Invokers: Source with ID "${templateId}" not found or is not a <template>.`,
        invoker
      );
      return null;
    }
    return template.content.cloneNode(true);
  }
  if (cloneId) {
    const cloneSource = document.getElementById(cloneId);
    if (!cloneSource) {
      console.error(
        `Invokers: Clone source with ID "${cloneId}" not found.`,
        invoker
      );
      return null;
    }
    const fragment = document.createDocumentFragment();
    fragment.appendChild(cloneSource.cloneNode(true));
    return fragment;
  }
  console.warn(
    "Invokers: DOM command requires `data-template-id` or `data-clone-id`.",
    invoker
  );
  return null;
}
function setBusyState(invoker, isBusy) {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}
function showFeedbackState(invoker, targets, templateAttr) {
  const templateId = invoker.getAttribute(templateAttr);
  if (!templateId || targets.length === 0) return;
  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    console.warn(
      `Invokers: Feedback template "#${templateId}" not found or is not a <template>.`
    );
    return;
  }
  const content = template.content.cloneNode(true);
  targets.forEach((target, i) => {
    const node = i === 0 ? content : content.cloneNode(true);
    target.replaceChildren(node);
  });
}
function parseHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}
function triggerFollowup(originalInvoker, primaryTargets) {
  const followupCommand = originalInvoker.dataset.thenCommand;
  if (!followupCommand || primaryTargets.length === 0) return;
  const syntheticInvoker = document.createElement("button");
  syntheticInvoker.setAttribute("command", followupCommand);
  for (const attr in originalInvoker.dataset) {
    if (attr.startsWith("then")) {
      const newAttrName = attr.charAt(4).toLowerCase() + attr.slice(5);
      syntheticInvoker.dataset[newAttrName] = originalInvoker.dataset[attr];
    }
  }
  const targetIds = primaryTargets.map((t) => t.id).filter(Boolean);
  if (targetIds.length > 0) {
    syntheticInvoker.setAttribute("aria-controls", targetIds.join(" "));
  }
  const eventTarget = primaryTargets[0];
  const commandEvent = new CustomEvent("command", {
    bubbles: true,
    cancelable: true,
    detail: { command: followupCommand, invokerElement: syntheticInvoker }
  });
  commandEvent.command = followupCommand;
  commandEvent.invokerElement = syntheticInvoker;
  eventTarget.dispatchEvent(commandEvent);
}
function getHeadersFromAttributes(invoker) {
  const headers = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr.substring(6).replace(/([A-Z])/g, "-$1").toLowerCase();
      if (headerName) {
        headers[headerName] = invoker.dataset[attr];
      }
    }
  }
  return headers;
}

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
  return parts.map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:")).join(":");
}
var InvokerManager = class {
  constructor() {
    this.commands = /* @__PURE__ */ new Map();
    this.sortedCommandKeys = [];
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
  register(name, callback) {
    if (this.commands.has(name)) {
      console.warn(
        `Invokers: Command "${name}" is already registered and will be overwritten.`
      );
    }
    this.commands.set(name, callback);
    this.sortedCommandKeys = Array.from(this.commands.keys()).sort(
      (a, b) => b.length - a.length
    );
  }
  /**
   * Handles the incoming 'command' event, finds the appropriate registered
   * command callback, and executes it with a constructed context.
   * @param event The dispatched CommandEvent.
   */
  handleCommand(event) {
    const commandStr = event.command;
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand)) {
        if (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":") {
          const callback = this.commands.get(registeredCommand);
          if (callback) {
            const paramsStr = commandStr.substring(
              registeredCommand.length + 1
            );
            const params = paramsStr ? parseCommandString(paramsStr) : [];
            callback(this.createContext(event, params));
          }
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
  createContext(event, params) {
    const invoker = event.invokerElement;
    const getTargetsInternal = (element) => {
      var _a;
      const controls = (_a = element.getAttribute("aria-controls")) == null ? void 0 : _a.trim();
      const selector = controls ? "#" + controls.split(/\s+/).join(", #") : element.dataset.target;
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    };
    return {
      invoker,
      targetElement: event.target,
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
          Array.from(container.children).map((t) => t.id).filter(Boolean)
        );
        const invokersInGroup = Array.from(
          document.querySelectorAll("[aria-controls]")
        ).filter((btn) => {
          var _a, _b;
          const controlledIds = (_b = (_a = btn.getAttribute("aria-controls")) == null ? void 0 : _a.split(/\s+/)) != null ? _b : [];
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
      }
    };
  }
  /** Attaches the global command listener to the document. */
  listen() {
    document.addEventListener(
      "command",
      (e) => this.handleCommand(e)
    );
  }
  /** Registers the set of built-in commands provided by the library. */
  registerCoreCommands() {
    this.register("toggle", (context) => {
      const targets = context.getTargets();
      if (targets.length === 0) return;
      const updateDOM = () => {
        targets.forEach((target) => target.toggleAttribute("hidden"));
        context.updateAriaState(targets);
      };
      document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
    });
    this.register("show", (context) => {
      const targetsToShow = context.getTargets();
      if (targetsToShow.length === 0 || !targetsToShow[0].parentElement) return;
      const container = targetsToShow[0].parentElement;
      const allTargetsInContainer = Array.from(container.children);
      const updateDOM = () => {
        context.manageGroupState();
        allTargetsInContainer.forEach(
          (child) => child.setAttribute("hidden", "")
        );
        targetsToShow.forEach((target) => target.removeAttribute("hidden"));
        context.updateAriaState(targetsToShow);
      };
      document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
    });
    this.register("hide", (context) => {
      const targets = context.getTargets();
      if (targets.length === 0) return;
      targets.forEach((target) => target.setAttribute("hidden", ""));
      context.updateAriaState(targets);
    });
    this.register("class", (context) => {
      const [action, className] = context.params;
      const targets = context.getTargets();
      if (!action || !className || targets.length === 0) {
        console.warn(
          'Invokers: `class` command requires an action and a class name (e.g., "class:toggle:my-class").',
          context.invoker
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
              `Invokers: Unknown action "${action}" for 'class' command.`
            );
        }
      });
    });
  }
};
var invokerInstance = new InvokerManager();
if (typeof window !== "undefined") {
  window.Invoker = {
    register: invokerInstance.register.bind(invokerInstance),
    parseCommandString,
    createCommandString
  };
}
var src_default = invokerInstance;
/**
 * @file invoker.ts
 * @version 0.0.0
 * @summary A type-safe, platform-first library that brings declarative HTML and ARIA attributes to life.
 * @license MIT
 * @author Patrick Glenn
 * @see https://github.com/doeixd/invokers
 */
//# sourceMappingURL=0.js.map

/**
 * @file invoker-commands.ts
 * @summary An optional collection of powerful, reusable custom commands for the Invokers library.
 * @description
 * This module extends the native Invoker Buttons API with a suite of feature-rich commands
 * for common UI patterns like dynamic content fetching, DOM manipulation, media control, and more.
 *
 * All commands are prefixed with `--` to comply with the W3C/WHATWG specification for custom commands,
 * ensuring they are clearly distinct from native browser actions.
 * @example
 * // To use these commands, first import the core library, then register these commands:
 * import 'invokers'; // Core library (includes the necessary polyfill)
 * import { registerAll } from 'invokers/commands';
 *
 * // Make all extra commands from this module available for use in your HTML.
 * registerAll();
 */

import type { CommandContext, CommandCallback } from "./index";

type CommandRegistry = Record<string, CommandCallback>;

/**
 * A collection of useful custom commands to enhance the Invokers library.
 * Each command is designed to be robust, handle common edge cases, and provide
 * excellent developer experience through clear error messaging.
 */
export const commands: CommandRegistry = {
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
   *   aria-pressed="false"
   * >
   *   Play Video
   * </button>
   * <video id="my-video" src="..."></video>
   * ```
   */
  "--media:toggle": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const media = targetElement as HTMLMediaElement;
    if (!(media instanceof HTMLMediaElement)) {
        console.warn('Invokers: `--media:toggle` target is not a valid <video> or <audio> element.', invoker);
        return;
    }

    const playText = invoker.dataset.playText || "Pause";
    const pauseText = invoker.dataset.pauseText || "Play";

    if (media.paused) {
      media.play()
        .then(() => {
          invoker.textContent = playText;
          invoker.setAttribute("aria-pressed", "true");
        })
        .catch((err) => console.error("Invokers: Media play failed. This may be due to browser autoplay policies.", err, invoker));
    } else {
      media.pause();
      invoker.textContent = pauseText;
      invoker.setAttribute("aria-pressed", "false");
    }
  },

  /**
   * `--media:seek`: Seeks a target `<video>` or `<audio>` element forward or backward
   * by a specified number of seconds. The amount (in seconds) is specified in the
   * `data-seek` attribute on the invoker button.
   *
   * @example
   * ```html
   * <button type="button" command="--media:seek" commandfor="my-video" data-seek="-10">Rewind 10s</button>
   * <button type="button" command="--media:seek" commandfor="my-video" data-seek="30">Forward 30s</button>
   * ```
   */
  "--media:seek": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const media = targetElement as HTMLMediaElement;
    const seekTime = parseFloat(invoker.dataset.seek || "0");

    if (!(media instanceof HTMLMediaElement)) {
        console.warn('Invokers: `--media:seek` target is not a valid <video> or <audio> element.', invoker);
        return;
    }
    if (!isFinite(seekTime)) {
        console.warn('Invokers: `--media:seek` requires a valid numeric `data-seek` attribute.', invoker);
        return;
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
  "--media:mute": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const media = targetElement as HTMLMediaElement;
    if (!(media instanceof HTMLMediaElement)) {
        console.warn('Invokers: `--media:mute` target is not a valid <video> or <audio> element.', invoker);
        return;
    }

    media.muted = !media.muted;
    invoker.setAttribute("aria-pressed", String(media.muted));
  },

  // --- Carousel / Slider Commands ---

  /**
   * `--carousel:nav`: Navigates a carousel by showing the next or previous item.
   * Assumes items are direct children of the target container, with visibility
   * controlled by the `hidden` attribute. Wraps around seamlessly.
   * The direction (`next` or `prev`) is specified in `data-direction`.
   *
   * @example
   * ```html
   * <div id="my-carousel" class="carousel-container">
   *   <div class="slide">Slide 1</div>
   *   <div class="slide" hidden>Slide 2</div>
   * </div>
   * <button type="button" command="--carousel:nav" commandfor="my-carousel" data-direction="prev">‹</button>
   * <button type="button" command="--carousel:nav" commandfor="my-carousel" data-direction="next">›</button>
   * ```
   */
  "--carousel:nav": (context: CommandContext) => {
    const { invoker, targetElement: carousel } = context;
    const direction = invoker.dataset.direction;

    if (!carousel || (direction !== "next" && direction !== "prev")) {
        console.warn('Invokers: `--carousel:nav` requires a valid target and `data-direction` ("next" or "prev").', invoker);
        return;
    }

    const slides = Array.from(carousel.children) as HTMLElement[];
    if (slides.length < 2) return; // No navigation needed for 0 or 1 slides.

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
   *   data-error-text="Failed!"
   * >
   *   Copy
   * </button>
   * <pre id="code-snippet">npm install invokers</pre>
   * ```
   */
  "--clipboard:copy": async (context: CommandContext) => {
    const { invoker, targetElement: target } = context;
    if (!navigator.clipboard) {
      console.warn("Invokers: Clipboard API not available. This may be due to an insecure context (non-HTTPS).", invoker);
      return;
    }

    const originalText = invoker.textContent || "";
    const feedbackText = invoker.dataset.feedbackText || "Copied!";
    const errorText = invoker.dataset.errorText || "Error!";
    const textToCopy = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target.value : target.textContent || "";

    invoker.setAttribute("disabled", "");
    try {
      await navigator.clipboard.writeText(textToCopy);
      invoker.textContent = feedbackText;
    } catch (err) {
      console.error("Invokers: Failed to copy text to clipboard.", err, invoker);
      invoker.textContent = errorText;
    } finally {
      setTimeout(() => {
        invoker.textContent = originalText;
        invoker.removeAttribute("disabled");
      }, 2000);
    }
  },

  /**
   * `--form:reset`: Resets the target `<form>` element to its initial state.
   *
   * @example
   * ```html
   * <form id="my-form"><!-- inputs --></form>
   * <button type="button" command="--form:reset" commandfor="my-form">Reset Form</button>
   * ```
   */
  "--form:reset": (context: CommandContext) => {
    const form = context.targetElement;
    if (form instanceof HTMLFormElement) {
        form.reset();
    } else {
        console.warn('Invokers: `--form:reset` target must be a <form> element.', context.invoker);
    }
  },

  /**
   * `--form:submit`: Submits the target `<form>` element, triggering native browser validation.
   *
   * @example
   * ```html
   * <form id="my-form"><!-- inputs --></form>
   * <button type="button" command="--form:submit" commandfor="my-form">Submit</button>
   * ```
   */
  "--form:submit": (context: CommandContext) => {
    const form = context.targetElement;
    if (form instanceof HTMLFormElement) {
        form.requestSubmit();
    } else {
        console.warn('Invokers: `--form:submit` target must be a <form> element.', context.invoker);
    }
  },

  /**
   * `--input:step`: Increments or decrements the value of a target `<input type="number">`,
   * respecting its `step`, `min`, and `max` attributes. The step amount is specified
   * in the `data-step` attribute on the invoker.
   *
   * @example
   * ```html
   * <button type="button" command="--input:step" commandfor="quantity" data-step="-1">-</button>
   * <input type="number" id="quantity" value="1" step="1" min="0" max="10">
   * <button type="button" command="--input:step" commandfor="quantity" data-step="1">+</button>
   * ```
   */
  "--input:step": (context: CommandContext) => {
    const { invoker, targetElement: input } = context;
    if (!(input instanceof HTMLInputElement) || input.type !== "number") {
        console.warn('Invokers: `--input:step` target must be an <input type="number">.', invoker);
        return;
    }

    const stepAmount = parseFloat(invoker.dataset.step || "1"); // Default to 1 if not specified
    if (!isFinite(stepAmount)) {
        console.warn('Invokers: `--input:step` requires a valid numeric `data-step` attribute.', invoker);
        return;
    }

    if (stepAmount > 0) {
      input.stepUp(stepAmount);
    } else if (stepAmount < 0) {
      input.stepDown(Math.abs(stepAmount));
    }
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  },

  // --- Scroll Commands ---

  /**
   * `--scroll:to`: Smoothly scrolls the viewport to bring the target element into view.
   *
   * @example
   * ```html
   * <button type="button" command="--scroll:to" commandfor="section-2">Go to Section 2</button>
   * <!-- ... content ... -->
   * <section id="section-2" style="height: 100vh;"></section>
   * ```
   */
  "--scroll:to": (context: CommandContext) => {
    context.targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // --- DOM Manipulation Commands ---

  /**
   * `--dom:remove`: Removes the target element from the DOM. Supports View Transitions.
   *
   * @example
   * ```html
   * <div id="alert-1">
   *   Welcome!
   *   <button type="button" command="--dom:remove" commandfor="alert-1">&times;</button>
   * </div>
   * ```
   */
  "--dom:remove": (context: CommandContext) => {
    const updateDOM = () => context.targetElement.remove();
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:replace`: Replaces the target element entirely with new content from a
   * `<template>` (`data-template-id`) or a cloned element (`data-clone-id`).
   *
   * @example
   * ```html
   * <button type="button" command="--dom:replace" commandfor="placeholder" data-template-id="content">Load</button>
   * <div id="placeholder">Loading...</div>
   * <template id="content"><div>Loaded Content</div></template>
   * ```
   */
  "--dom:replace": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const sourceNode = getSourceNode(invoker);
    if (!sourceNode) return;
    const updateDOM = () => targetElement.replaceWith(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:swap`: Swaps the *inner content* of the target element with new content
   * from a `<template>` (`data-template-id`) or a cloned element (`data-clone-id`).
   *
   * @example
   * ```html
   * <button type="button" command="--dom:swap" commandfor="content-area" data-template-id="panel-2">Load Panel 2</button>
   * <div id="content-area">Original Content</div>
   * <template id="panel-2"><h2>Panel 2</h2></template>
   * ```
   */
  "--dom:swap": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const sourceNode = getSourceNode(invoker);
    if (!sourceNode) return;
    const updateDOM = () => targetElement.replaceChildren(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:append`: Appends content to the end of the target element from a
   * `<template>` (`data-template-id`) or a cloned element (`data-clone-id`).
   *
   * @example
   * ```html
   * <button type="button" command="--dom:append" commandfor="item-list" data-template-id="new-item">Add Item</button>
   * <ul id="item-list"><li>First item</li></ul>
   * <template id="new-item"><li>A new item</li></template>
   * ```
   */
  "--dom:append": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const sourceNode = getSourceNode(invoker);
    if (!sourceNode) return;
    targetElement.append(sourceNode.cloneNode(true));
  },

  /**
   * `--dom:prepend`: Prepends content to the beginning of the target element from a
   * `<template>` (`data-template-id`) or a cloned element (`data-clone-id`).
   *
   * @example
   * ```html
   * <button type="button" command="--dom:prepend" commandfor="log" data-template-id="new-log">New Log</button>
   * <div id="log"><p>Old log</p></div>
   * <template id="new-log"><p>New log</p></template>
   * ```
   */
  "--dom:prepend": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const sourceNode = getSourceNode(invoker);
    if (!sourceNode) return;
    targetElement.prepend(sourceNode.cloneNode(true));
  },

  // --- Fetch and Navigation Commands ---

  /**
   * `--fetch:get`: Performs a GET request to the URL in `data-url` and swaps the
   * response HTML into the target element. Supports loading/error states via
   * templates and can chain another command on success via `data-then-command`.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:get"
   *   data-url="/api/content"
   *   commandfor="content-area"
   *   data-loading-template="spinner-template"
   *   data-error-template="error-template"
   *   data-then-command="--class:add:loaded"
   * >
   *   Load Content
   * </button>
   * <div id="content-area"></div>
   * ```
   */
  "--fetch:get": async (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const url = invoker.dataset.url;
    if (!url) {
      console.warn("Invokers: `--fetch:get` requires a `data-url` attribute.", invoker);
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) },
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);

      const updateDOM = () => targetElement.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));

      triggerFollowup(invoker, targetElement);
    } catch (error) {
      console.error("Invokers: `--fetch:get` failed.", error, invoker);
      showFeedbackState(invoker, targetElement, "data-error-template");
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:send`: Submits the target `<form>` via a POST/PUT/DELETE request.
   * The response HTML is swapped into the element specified by `data-response-target`,
   * or the form itself if omitted. `commandfor` MUST point to the `<form>`.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post"><!-- ... --></form>
   * <button type="button"
   *   command="--fetch:send"
   *   commandfor="my-form"
   *   data-response-target="#response-area"
   * >
   *   Submit via Fetch
   * </button>
   * <div id="response-area"></div>
   * ```
   */
  "--fetch:send": async (context: CommandContext) => {
    const { invoker, targetElement: form } = context;
    if (!(form instanceof HTMLFormElement)) {
      console.warn("Invokers: `--fetch:send` requires `commandfor` to point to a valid <form>.", invoker);
      return;
    }

    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector<HTMLElement>(responseSelector) : form;
    if (!responseTarget) {
      console.warn(`Invokers: Response target "${responseSelector}" not found for '--fetch:send'.`, invoker);
      return;
    }

    const url = form.action;
    const method = (form.method || "POST").toUpperCase();
    if (!url) {
      console.warn("Invokers: Target form for `--fetch:send` must have an `action` attribute.", form);
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    try {
      const response = await fetch(url, {
        method: method,
        body: new FormData(form),
        headers: getHeadersFromAttributes(invoker),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);

      const updateDOM = () => responseTarget.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));

      triggerFollowup(invoker, responseTarget);
    } catch (error) {
      console.error(`Invokers: \`--fetch:send\` (${method}) failed.`, error, invoker);
      showFeedbackState(invoker, responseTarget, "data-error-template");
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--navigate:to`: Navigates to a new URL specified in `data-url` using the History API,
   * enabling client-side routing without a full page reload.
   *
   * @example
   * ```html
   * <button type="button" command="--navigate:to" data-url="/about">Go to About Page</button>
   * ```
   */
  "--navigate:to": (context: CommandContext) => {
    const url = context.invoker.dataset.url;
    if (!url) {
      console.warn("Invokers: `--navigate:to` command requires a `data-url` attribute.", context.invoker);
      return;
    }

    if (window.history?.pushState) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else {
      window.location.href = url;
    }
  },
};

/**
 * Registers commands from this module with the global `Invoker` instance.
 * @param specificCommands An optional array of command names to register. If omitted, all commands are registered.
 * @example
 * registerAll(); // Registers all commands
 * registerAll(['--media:toggle', 'scroll:to']); // Registers specific commands
 */
export function registerAll(specificCommands?: string[]): void {
  if (!window.Invoker) {
    console.error("Invokers core library not found. Please ensure it is loaded before the commands module.");
    return;
  }
  const commandsToRegister = specificCommands || Object.keys(commands);
  for (const name of commandsToRegister) {
    const prefixedName = name.startsWith('--') ? name : `--${name}`;
    if (commands[prefixedName]) {
      window.Invoker.register(prefixedName, commands[prefixedName]);
    } else {
      console.warn(`Invokers: Command "${name}" not found in the commands module. Skipping registration.`);
    }
  }
}

// --- Private Helper Functions ---

function getSourceNode(invoker: HTMLButtonElement): DocumentFragment | null {
  const templateId = invoker.dataset.templateId;
  const cloneId = invoker.dataset.cloneId;
  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      console.error(`Invokers: Source with ID "${templateId}" not found or is not a <template>.`, invoker);
      return null;
    }
    return template.content; // Return content directly, clone at usage site
  }
  if (cloneId) {
    const cloneSource = document.getElementById(cloneId);
    if (!cloneSource) {
      console.error(`Invokers: Clone source with ID "${cloneId}" not found.`, invoker);
      return null;
    }
    const fragment = document.createDocumentFragment();
    fragment.appendChild(cloneSource.cloneNode(true));
    return fragment;
  }
  console.warn("Invokers: DOM command requires `data-template-id` or `data-clone-id`.", invoker);
  return null;
}

function setBusyState(invoker: HTMLButtonElement, isBusy: boolean): void {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}

function showFeedbackState(invoker: HTMLButtonElement, target: HTMLElement, templateAttr: "data-loading-template" | "data-error-template"): void {
  const templateId = invoker.dataset[templateAttr.substring(5)]; // e.g., 'loadingTemplate'
  if (!templateId || !target) return;

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    console.warn(`Invokers: Feedback template "#${templateId}" not found or is not a <template>.`, invoker);
    return;
  }

  target.replaceChildren(template.content.cloneNode(true));
}

function parseHTML(html: string): DocumentFragment {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}

function triggerFollowup(originalInvoker: HTMLButtonElement, primaryTarget: HTMLElement): void {
  const followupCommand = originalInvoker.dataset.thenCommand;
  if (!followupCommand || !primaryTarget.id) {
      if(followupCommand) console.warn("Invokers: Follow-up command requires the target to have an ID.", primaryTarget);
      return;
  }

  const syntheticInvoker = document.createElement("button");
  syntheticInvoker.setAttribute("type", "button");
  syntheticInvoker.setAttribute("command", followupCommand.startsWith('--') ? followupCommand : `--${followupCommand}`);
  syntheticInvoker.setAttribute("commandfor", primaryTarget.id);

  for (const attr in originalInvoker.dataset) {
    if (attr.startsWith("then") && attr !== "thenCommand") {
      const newAttrName = attr.charAt(4).toLowerCase() + attr.slice(5);
      syntheticInvoker.dataset[newAttrName] = originalInvoker.dataset[attr];
    }
  }
  
  // Appending and removing is a robust way to ensure it's in the DOM to be "clicked"
  // but this is an implementation detail that might be fragile. A direct click can work.
  syntheticInvoker.click();
}

function getHeadersFromAttributes(invoker: HTMLButtonElement): HeadersInit {
  const headers: Record<string, string> = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr.substring(6).replace(/([A-Z])/g, "-$1").toLowerCase();
      if (headerName) {
        headers[headerName] = invoker.dataset[attr]!;
      }
    }
  }
  return headers;
}
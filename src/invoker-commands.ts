/**
 * @file invoker-commands.ts
 * @summary An optional collection of powerful, reusable custom commands for the Invokers library.
 * @description
 * This module extends the core Invokers library with a suite of feature-rich commands
 * for common UI patterns like dynamic content fetching, DOM manipulation, media control, and more.
 *
 * To use these commands, import and run the `registerAll()` function after the core
 * Invokers library has been loaded.
 * @example
 * // In your main application script:
 * import 'invokers'; // Core library (loads polyfill and window.Invoker)
 * import { registerAll } from 'invokers/commands';
 *
 * // Make all extended commands available for use in your HTML.
 * registerAll();
 */

import type { CommandContext, CommandCallback } from "./index";
import { createInvokerError, ErrorSeverity, validateElement, sanitizeHTML } from "./index";

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
   * >
   *   Play Video
   * </button>
   * <video id="my-video" src="..."></video>
   * ```
   */
  "--media:toggle": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:toggle', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }

    const media = targetElement as HTMLMediaElement;
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
      throw createInvokerError('Failed to toggle media playback', ErrorSeverity.ERROR, {
        command: '--media:toggle', element: invoker, cause: error as Error,
        recovery: (error as Error).name === 'NotAllowedError'
          ? 'Media autoplay blocked by browser. User interaction may be required.'
          : 'Check that the media element has a valid source and is ready to play.'
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
  "--media:seek": ({ invoker, targetElement, params }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:seek', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }
    const media = targetElement as HTMLMediaElement;
    const seekTime = parseFloat(params[0]);

    if (isNaN(seekTime)) {
      throw createInvokerError('Media seek command requires a numeric value for seconds', ErrorSeverity.ERROR, {
        command: '--media:seek', element: invoker, context: { provided: params[0] }, recovery: 'Use format: --media:seek:10 (for 10s) or --media:seek:-5 (for -5s).'
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
  "--media:mute": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:mute', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }
    const media = targetElement as HTMLMediaElement;
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
  "--carousel:nav": ({ invoker, targetElement, params }: CommandContext) => {
    const [direction] = params;

    if (direction !== "next" && direction !== "prev") {
      throw createInvokerError('Carousel nav requires a direction parameter of "next" or "prev"', ErrorSeverity.ERROR, {
        command: '--carousel:nav', element: invoker, recovery: 'Use format: --carousel:nav:next or --carousel:nav:prev'
      });
    }

    const slides = Array.from(targetElement.children) as HTMLElement[];
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
  "--clipboard:copy": async ({ invoker, targetElement }: CommandContext) => {
    if (!navigator.clipboard) {
      throw createInvokerError("Clipboard API not available", ErrorSeverity.ERROR, {
        command: '--clipboard:copy', element: invoker, recovery: 'This feature requires a secure context (HTTPS).'
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
      throw createInvokerError('Failed to copy text to clipboard', ErrorSeverity.ERROR, {
        command: '--clipboard:copy', element: invoker, cause: err as Error
      });
    } finally {
      setTimeout(() => {
        invoker.textContent = originalText;
        invoker.removeAttribute("disabled");
      }, 2000);
    }
  },

  /**
   * `--form:reset`: Resets the target `<form>` element.
   * @example `<button command="--form:reset" commandfor="my-form">Reset</button>`
   */
  "--form:reset": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form reset failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--form:reset', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    (targetElement as HTMLFormElement).reset();
  },

  /**
   * `--form:submit`: Submits the target `<form>` element.
   * @example `<button command="--form:submit" commandfor="my-form">Submit</button>`
   */
  "--form:submit": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form submit failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--form:submit', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    (targetElement as HTMLFormElement).requestSubmit();
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
  "--input:step": ({ invoker, targetElement, params }: CommandContext) => {
    if (!(targetElement instanceof HTMLInputElement) || targetElement.type !== "number") {
      throw createInvokerError('Input step target must be an <input type="number">', ErrorSeverity.ERROR, {
        command: '--input:step', element: invoker
      });
    }

    const stepAmount = parseFloat(params[0] || "1");
    if (isNaN(stepAmount)) {
      throw createInvokerError('Input step requires a valid numeric parameter', ErrorSeverity.ERROR, {
        command: '--input:step', element: invoker, context: { provided: params[0] }, recovery: 'Use --input:step:1 or --input:step:-1'
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
  "--scroll:to": ({ targetElement }: CommandContext) => {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // --- DOM Manipulation Commands ---

  /**
   * `--dom:remove`: Removes the target element from the DOM.
   * @example `<button command="--dom:remove" commandfor="alert-1">&times;</button>`
   */
  "--dom:remove": ({ targetElement }: CommandContext) => {
    const updateDOM = () => targetElement.remove();
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:replace`: Replaces the target element with content from a `<template>`.
   * @example `<button command="--dom:replace" commandfor="placeholder" data-template-id="content">Load</button>`
   */
  "--dom:replace": ({ invoker, targetElement }: CommandContext) => {
    const sourceNode = getSourceNode(invoker, 'replace');
    const updateDOM = () => targetElement.replaceWith(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:swap`: Swaps the inner content of the target with content from a `<template>`.
   * @example `<button command="--dom:swap" commandfor="content-area" data-template-id="panel-2">Load Panel 2</button>`
   */
  "--dom:swap": ({ invoker, targetElement }: CommandContext) => {
    const sourceNode = getSourceNode(invoker, 'swap');
    const updateDOM = () => targetElement.replaceChildren(sourceNode.cloneNode(true));
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:append`: Appends content from a `<template>` to the target.
   * @example `<button command="--dom:append" commandfor="item-list" data-template-id="new-item">Add</button>`
   */
  "--dom:append": ({ invoker, targetElement }: CommandContext) => {
    const sourceNode = getSourceNode(invoker, 'append');
    targetElement.append(sourceNode.cloneNode(true));
  },

  /**
   * `--dom:prepend`: Prepends content from a `<template>` to the target.
   * @example `<button command="--dom:prepend" commandfor="log" data-template-id="new-log">Log</button>`
   */
  "--dom:prepend": ({ invoker, targetElement }: CommandContext) => {
    const sourceNode = getSourceNode(invoker, 'prepend');
    targetElement.prepend(sourceNode.cloneNode(true));
  },
  
  /**
   * `--text:copy`: Copies the `textContent` from one element to another.
   * The source element is specified via a CSS selector in `data-copy-from` on the invoker.
   * If `data-copy-from` is omitted, it copies the invoker's own `textContent`.
   */
  "--text:copy": (context: CommandContext) => {
      const { invoker, targetElement } = context;
      const sourceSelector = invoker.dataset.copyFrom;
      let sourceElement: HTMLElement | null = invoker;

      if (sourceSelector) {
          sourceElement = document.querySelector(sourceSelector);
          if (!sourceElement) {
              throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, ErrorSeverity.ERROR, {
                  command: '--text:copy', element: invoker
              });
          }
      }

      const textToCopy = (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement)
          ? sourceElement.value
          : sourceElement.textContent || '';

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
  "--fetch:get": async ({ invoker, targetElement }: CommandContext) => {
    const url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError('Fetch GET command requires a data-url attribute', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: "GET", headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) }, signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createInvokerError(`HTTP Error: ${response.status} ${response.statusText}`, ErrorSeverity.ERROR, {
          command: '--fetch:get', element: invoker, context: { url, status: response.status }
        });
      }

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => targetElement.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, targetElement, "data-error-template");
      // Re-throw the error (either the one we created or a new wrapped one)
      // to allow the core manager to handle it for conditional chaining.
      if (error instanceof Error && 'severity' in error) throw error;
      throw createInvokerError('Fetch GET failed', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, cause: error as Error, context: { url },
        recovery: 'Check the URL, network connection, and server response.'
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
  "--fetch:send": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Fetch send failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    const form = targetElement as HTMLFormElement;

    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector<HTMLElement>(responseSelector) : form;
    if (!responseTarget) {
      throw createInvokerError(`Response target "${responseSelector}" not found`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker
      });
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST", body: new FormData(form), headers: getHeadersFromAttributes(invoker),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => responseTarget.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, responseTarget, "data-error-template");
      throw createInvokerError('Fetch send failed', ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, cause: error as Error,
        recovery: 'Check the form action, network connection, and server response.'
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
  "--navigate:to": (context: CommandContext) => {
    const url = context.params.join(':'); // Rejoin params in case URL contains colons
    if (!url) {
      throw createInvokerError('Navigate command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--navigate:to', element: context.invoker, recovery: 'Use format: --navigate:to:/your/path'
      });
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
 * Registers all extended commands with the global `window.Invoker` instance.
 * @param specificCommands An optional array of command names to register. If omitted, all commands are registered.
 */
export function registerAll(specificCommands?: string[]): void {
  if (!window.Invoker) {
    console.error("Invokers: Core library not found. Ensure it is loaded before the commands module.");
    return;
  }
  const commandsToRegister = specificCommands || Object.keys(commands);
  for (const name of commandsToRegister) {
    const prefixedName = name.startsWith('--') ? name : `--${name}`;
    if (commands[prefixedName]) {
      window.Invoker.register(prefixedName, commands[prefixedName]);
    }
  }
}

// --- Private Helper Functions ---

function getSourceNode(invoker: HTMLButtonElement, commandName: string): DocumentFragment {
  const templateId = invoker.dataset.templateId;
  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      throw createInvokerError(`Source <template> with ID "${templateId}" not found`, ErrorSeverity.ERROR, {
        command: `--dom:${commandName}`, element: invoker
      });
    }
    return template.content;
  }
  throw createInvokerError(`DOM command --dom:${commandName} requires a data-template-id attribute`, ErrorSeverity.ERROR, {
    command: `--dom:${commandName}`, element: invoker
  });
}

function setBusyState(invoker: HTMLButtonElement, isBusy: boolean): void {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}

function showFeedbackState(invoker: HTMLButtonElement, target: HTMLElement, templateAttr: "data-loading-template" | "data-error-template"): void {
  const templateKey = templateAttr.replace('data-', '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const templateId = invoker.dataset[templateKey];

  if (!templateId || !target) return;

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    // This is a non-critical warning, so we log instead of throwing.
    const error = createInvokerError(`Feedback template "#${templateId}" not found or is not a <template>`, ErrorSeverity.WARNING, { element: invoker });
    console.error(error);
    return;
  }

  target.replaceChildren(template.content.cloneNode(true));
}

function parseHTML(html: string): DocumentFragment {
  const sanitizedHTML = sanitizeHTML(html);
  const doc = new DOMParser().parseFromString(sanitizedHTML, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}

function getHeadersFromAttributes(invoker: HTMLButtonElement): HeadersInit {
  const headers: Record<string, string> = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr.substring(6).replace(/([A-Z])/g, "-$1").toLowerCase();
      if (headerName) headers[headerName] = invoker.dataset[attr]!;
    }
  }
  return headers;
}
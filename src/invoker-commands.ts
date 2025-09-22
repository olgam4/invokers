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
import { createInvokerError, logInvokerError, ErrorSeverity, validateElement, sanitizeHTML } from "./index";

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
  "--media:toggle": async (context: CommandContext) => {
    const { invoker, targetElement } = context;
    
    // Validate target element
    const validationErrors = validateElement(targetElement, {
      tagName: ['video', 'audio']
    });
    
    if (validationErrors.length > 0) {
      throw createInvokerError(
        `Media toggle command failed: ${validationErrors.join(', ')}`,
        ErrorSeverity.ERROR,
        {
          command: '--media:toggle',
          element: invoker,
          context: { 
            targetTag: targetElement?.tagName,
            validationErrors 
          },
          recovery: 'Ensure commandfor points to a <video> or <audio> element'
        }
      );
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
      throw createInvokerError(
        'Failed to toggle media playback',
        ErrorSeverity.ERROR,
        {
          command: '--media:toggle',
          element: invoker,
          cause: error as Error,
          context: { 
            mediaSrc: media.src,
            mediaState: media.paused ? 'paused' : 'playing',
            mediaReadyState: media.readyState
          },
          recovery: error.name === 'NotAllowedError' 
            ? 'Media autoplay blocked by browser. User interaction may be required.'
            : 'Check that the media element has a valid source and is ready to play'
        }
      );
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
   * templates. Chaining is now handled by the core library via the `data-and-then` attribute.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:get"
   *   data-url="/api/content"
   *   commandfor="content-area"
   *   data-loading-template="spinner-template"
   *   data-error-template="error-template"
   *   data-and-then="--class:add:loaded"
   * >
   *   Load Content
   * </button>
   * <div id="content-area"></div>
   * ```
   */
  "--fetch:get": async (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const url = invoker.dataset.url;
    
    // Comprehensive input validation
    if (!url) {
      throw createInvokerError(
        'Fetch GET command requires a data-url attribute',
        ErrorSeverity.ERROR,
        {
          command: '--fetch:get',
          element: invoker,
          recovery: 'Add data-url="/your/endpoint" to the button element'
        }
      );
    }

    // Validate URL format
    try {
      new URL(url, window.location.href); // This will throw if URL is invalid
    } catch (urlError) {
      throw createInvokerError(
        `Invalid URL provided: "${url}"`,
        ErrorSeverity.ERROR,
        {
          command: '--fetch:get',
          element: invoker,
          cause: urlError as Error,
          context: { url },
          recovery: 'Provide a valid URL like "/api/content" or "https://example.com/data"'
        }
      );
    }

    // Validate target element
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError(
        'Target element for fetch command is missing or disconnected',
        ErrorSeverity.ERROR,
        {
          command: '--fetch:get',
          element: invoker,
          context: { targetId: targetElement?.id },
          recovery: 'Ensure the target element exists and is connected to the DOM'
        }
      );
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw createInvokerError(
          `HTTP Error: ${response.status} ${response.statusText}`,
          ErrorSeverity.ERROR,
          {
            command: '--fetch:get',
            element: invoker,
            context: { 
              url, 
              status: response.status, 
              statusText: response.statusText,
              duration 
            },
            recovery: response.status === 404 
              ? 'Check that the URL endpoint exists on your server'
              : response.status === 403 
              ? 'Check authentication and permissions for this endpoint'
              : response.status >= 500
              ? 'Server error - check your backend logs'
              : 'Check the server response and network conditions'
          }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        console.warn(`Invokers: Fetch response content-type is "${contentType}". Expected HTML content for DOM injection.`, invoker);
      }

      const html = await response.text();
      if (!html.trim()) {
        console.warn('Invokers: Fetch response is empty. Target element will be cleared.', invoker);
      }

      const newContent = parseHTML(html);
      const updateDOM = () => targetElement.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      
    } catch (error) {
      showFeedbackState(invoker, targetElement, "data-error-template");
      
      if (error.name === 'AbortError') {
        throw createInvokerError(
          'Fetch request timeout after 30 seconds',
          ErrorSeverity.ERROR,
          {
            command: '--fetch:get',
            element: invoker,
            context: { url },
            recovery: 'Check network connection and server response time'
          }
        );
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw createInvokerError(
          'Network error: Failed to fetch content',
          ErrorSeverity.ERROR,
          {
            command: '--fetch:get',
            element: invoker,
            cause: error as Error,
            context: { url },
            recovery: 'Check network connection and ensure the URL is reachable'
          }
        );
      }

      // Re-throw InvokerErrors as-is, wrap other errors
      if ('severity' in error) {
        throw error;
      } else {
        throw createInvokerError(
          `Fetch GET failed: ${error.message}`,
          ErrorSeverity.ERROR,
          {
            command: '--fetch:get',
            element: invoker,
            cause: error as Error,
            context: { url },
            recovery: 'Check the URL, network connection, and server response'
          }
        );
      }
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:send`: Submits the target `<form>` via a POST/PUT/DELETE request.
   * The response HTML is swapped into the element specified by `data-response-target`,
   * or the form itself if omitted. `commandfor` MUST point to the `<form>`.
   * Chaining is now handled by the core library via the `data-and-then` attribute.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post"><!-- ... --></form>
   * <button type="button"
   *   command="--fetch:send"
   *   commandfor="my-form"
   *   data-response-target="#response-area"
   *   data-and-then="--class:add:submitted"
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
/**
 * `--attr:set`: Sets an attribute on the target element. The attribute name and value
 * are specified in `data-attr-name` and `data-attr-value` on the invoker button.
 *
 * @example
 * ```html
 * <!-- This button will set `aria-disabled="true"` on the input field -->
 * <button type="button"
 *   command="--attr:set"
 *   commandfor="my-input"
 *   data-attr-name="aria-disabled"
 *   data-attr-value="true">
 *   Disable Input
 * </button>
 * <input id="my-input" type="text" placeholder="I can be disabled">
 * ```
 */
"--attr:set": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const { attrName, attrValue } = invoker.dataset;
    if (!attrName || typeof attrValue === 'undefined') {
        console.warn('Invokers: `--attr:set` requires `data-attr-name` and `data-attr-value` attributes on the invoker.', invoker);
        return;
    }
    targetElement.setAttribute(attrName, attrValue);
},

/**
 * `--attr:remove`: Removes an attribute from the target element. The attribute name
 * is specified in the `data-attr-name` attribute on the invoker button.
 *
 * @example
 * ```html
 * <!-- This button will remove the `disabled` attribute from the fieldset -->
 * <button type="button"
 *   command="--attr:remove"
 *   commandfor="user-fieldset"
 *   data-attr-name="disabled">
 *   Enable Fields
 * </button>
 * <fieldset id="user-fieldset" disabled>...</fieldset>
 * ```
 */
"--attr:remove": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const { attrName } = invoker.dataset;
    if (!attrName) {
        console.warn('Invokers: `--attr:remove` requires a `data-attr-name` attribute on the invoker.', invoker);
        return;
    }
    targetElement.removeAttribute(attrName);
},

/**
 * `--attr:toggle`: Toggles a boolean attribute on the target element. A boolean attribute
 * is one where its presence means `true`. The attribute name is specified in `data-attr-name`.
 *
 * @example
 * ```html
 * <!-- This button will toggle the `contenteditable` attribute on the paragraph -->
 * <button type="button"
 *   command="--attr:toggle"
 *   commandfor="editable-p"
 *   data-attr-name="contenteditable">
 *   Toggle Editing
 * </button>
 * <p id="editable-p">Click the button to make this text editable.</p>
 * ```
 */
"--attr:toggle": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const { attrName } = invoker.dataset;
    if (!attrName) {
        console.warn('Invokers: `--attr:toggle` requires a `data-attr-name` attribute on the invoker.', invoker);
        return;
    }
    // `toggleAttribute` returns true if the attribute is now present, false if removed.
    const isSet = targetElement.toggleAttribute(attrName);
    // For ARIA attributes that use "true"/"false" strings, we should also update them.
    if (attrName.startsWith('aria-')) {
        targetElement.setAttribute(attrName, String(isSet));
    }
},


// --- Text Content Manipulation Commands ---

/**
 * `--text:set`: Sets the `textContent` of the target element, replacing all its children
 * with a single text node. The text is specified in the `data-text-value` attribute on the invoker.
 * This is a safe way to update text as it does not parse HTML.
 *
 * @example
 * ```html
 * <button type="button"
 *   command="--text:set"
 *   commandfor="status-message"
 *   data-text-value="Profile saved successfully!">
 *   Show Success Message
 * </button>
 * <div id="status-message" role="status"></div>
 * ```
 */
"--text:set": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const { textValue } = invoker.dataset;
    if (typeof textValue === 'undefined') {
        console.warn('Invokers: `--text:set` requires a `data-text-value` attribute on the invoker.', invoker);
        return;
    }
    targetElement.textContent = textValue;
},

/**
 * `--text:copy`: Copies the `textContent` from one element to another.
 * The source element is specified via a CSS selector in `data-copy-from` on the invoker.
 * If `data-copy-from` is omitted, it copies the invoker's own `textContent`.
 *
 * @example
 * ```html
 * <!-- This button copies text from the #source-text element to the #destination element -->
 * <button type="button"
 *   command="--text:copy"
 *   commandfor="destination"
 *   data-copy-from="#source-text">
 *   Copy Quote
 * </button>
 *
 * <p id="source-text">This is the text to be copied.</p>
 * <p id="destination">...waiting for text...</p>
 * ```
 */
"--text:copy": (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement: HTMLElement | null = null;
    let textToCopy = '';

    if (sourceSelector) {
        sourceElement = document.querySelector(sourceSelector);
        if (!sourceElement) {
            console.warn('Invokers: `--text:copy` could not find a source element with the selector: "' + sourceSelector + '".', invoker);
            return;
        }
    } else {
        // If no source is specified, use the invoker button itself.
        sourceElement = invoker;
    }

    // Handle inputs and textareas which use .value, otherwise use .textContent
    if (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement) {
        textToCopy = sourceElement.value;
    } else {
        textToCopy = sourceElement.textContent || '';
    }

    targetElement.textContent = textToCopy;
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
  // Sanitize HTML before parsing
  const sanitizedHTML = sanitizeHTML(html);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHTML, "text/html");
  
  // Check for parsing errors
  const parserErrors = doc.querySelectorAll('parsererror');
  if (parserErrors.length > 0) {
    console.warn('Invokers: HTML parsing errors detected:', parserErrors);
  }
  
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
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
/**
 * @file invoker-commands.ts
 * @summary An optional collection of powerful, reusable commands for the Invokers library.
 * @description To use these commands, import this module and register them.
 * Note: Core functionality like class manipulation (`class:toggle:is-active`) is now
 * part of the main `invokers` library, so it is not duplicated here.
 * @example
 * import { registerAll } from 'invokers/commands';
 * registerAll();
 */

import type { CommandContext, CommandCallback } from "./index";

type CommandRegistry = Record<string, CommandCallback>;

/**
 * A collection of useful commands to enhance the Invokers library.
 * Each command is designed to be robust and handle common UI patterns.
 */
export const commands: CommandRegistry = {
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
  "media:toggle": (context: CommandContext) => {
    const media = context.getTargets()[0] as HTMLMediaElement | undefined;
    if (!media || typeof media.play !== "function") return;

    const { invoker } = context;
    const playText = invoker.dataset.playText || "Pause";
    const pauseText = invoker.dataset.pauseText || "Play";

    if (media.paused) {
      media
        .play()
        .then(() => {
          invoker.textContent = playText;
          invoker.setAttribute("aria-pressed", "true");
        })
        .catch((err) => console.error("Invokers: Media play failed.", err));
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
  "media:seek": (context: CommandContext) => {
    const media = context.getTargets()[0] as HTMLMediaElement | undefined;
    const seekTime = parseFloat(context.invoker.dataset.seek || "0");
    if (!media || !isFinite(seekTime)) return;

    media.currentTime = Math.max(
      0,
      Math.min(media.duration, media.currentTime + seekTime),
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
  "media:mute": (context: CommandContext) => {
    const media = context.getTargets()[0] as HTMLMediaElement | undefined;
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
  "carousel:nav": (context: CommandContext) => {
    const carousel = context.getTargets()[0];
    const direction = context.invoker.dataset.direction; // 'next' or 'prev'
    if (!carousel || (direction !== "next" && direction !== "prev")) return;

    const slides = Array.from(carousel.children) as HTMLElement[];
    if (slides.length < 2) return;

    const activeIndex = slides.findIndex(
      (slide) => !slide.hasAttribute("hidden"),
    );
    const currentIndex = activeIndex === -1 ? 0 : activeIndex; // Default to first slide if none are active

    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % slides.length
        : (currentIndex - 1 + slides.length) % slides.length;

    const updateDOM = () => {
      slides.forEach((slide, index) => {
        slide.toggleAttribute("hidden", index !== nextIndex);
      });
    };

    document.startViewTransition
      ? document.startViewTransition(updateDOM)
      : updateDOM();
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
  "clipboard:copy": async (context: CommandContext) => {
    const target = context.getTargets()[0];
    const { invoker } = context;
    if (!target) return;
    if (!navigator.clipboard) {
      console.warn(
        "Invokers: Clipboard API not available or not in a secure context.",
      );
      return;
    }

    const originalText = invoker.textContent || "";
    const feedbackText = invoker.dataset.feedbackText || "Copied!";
    const errorText = invoker.dataset.errorText || "Error!";
    const textToCopy =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA"
        ? (target as HTMLInputElement | HTMLTextAreaElement).value
        : target.textContent || "";

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
      }, 2000);
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
  "form:reset": (context: CommandContext) => {
    const form = context.getTargets()[0] as HTMLFormElement | undefined;
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
  "form:submit": (context: CommandContext) => {
    const form = context.getTargets()[0] as HTMLFormElement | undefined;
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
  "input:step": (context: CommandContext) => {
    const input = context.getTargets()[0] as HTMLInputElement | undefined;
    if (!(input instanceof HTMLInputElement) || input.type !== "number") return;

    const stepDirection = parseFloat(context.invoker.dataset.step || "0");
    if (!isFinite(stepDirection)) return;

    // Use built-in methods to correctly respect min/max/step attributes.
    if (stepDirection > 0) {
      input.stepUp(stepDirection);
    } else if (stepDirection < 0) {
      input.stepDown(Math.abs(stepDirection));
    }
    // Dispatch an input event so other JS can react to the change.
    input.dispatchEvent(
      new Event("input", { bubbles: true, cancelable: true }),
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
  "scroll:to": (context: CommandContext) => {
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
  "dom:remove": (context: CommandContext) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;

    const updateDOM = () => targets.forEach((target) => target.remove());

    document.startViewTransition
      ? document.startViewTransition(updateDOM)
      : updateDOM();
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
  "dom:replace": (context: CommandContext) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;

    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;

    const updateDOM = () => {
      // Replace each target with a clone of the source node.
      targets.forEach((target, index) => {
        const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
        target.replaceWith(content);
      });
    };

    document.startViewTransition
      ? document.startViewTransition(updateDOM)
      : updateDOM();
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
  "dom:swap": (context: CommandContext) => {
    const targets = context.getTargets();
    if (targets.length === 0) return;

    const sourceNode = getSourceNode(context.invoker);
    if (!sourceNode) return;

    const updateDOM = () => {
      targets.forEach((target, index) => {
        const content = index === 0 ? sourceNode : sourceNode.cloneNode(true);
        target.replaceChildren(content); // Modern, efficient replacement
      });
    };

    document.startViewTransition
      ? document.startViewTransition(updateDOM)
      : updateDOM();
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
  "dom:append": (context: CommandContext) => {
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
  "dom:prepend": (context: CommandContext) => {
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
  "fetch:get": async (context: CommandContext) => {
    const { invoker, getTargets } = context;
    const targets = getTargets();
    const url = invoker.dataset.url;

    if (!url) {
      console.warn(
        "Invokers: `fetch:get` requires a `data-url` attribute.",
        invoker,
      );
      return;
    }
    if (targets.length === 0) {
      console.warn(
        "Invokers: `fetch:get` requires `aria-controls` or `data-target`.",
        invoker,
      );
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targets, "data-loading-template");

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) },
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
      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));

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
  "fetch:send": async (context: CommandContext) => {
    const form = context.getTargets()[0] as HTMLFormElement | undefined;
    if (!(form instanceof HTMLFormElement)) {
      console.warn(
        "Invokers: `fetch:send` requires `aria-controls` to point to a valid <form>.",
        context.invoker,
      );
      return;
    }

    const responseSelector = context.invoker.dataset.responseTarget;
    const responseTargets = responseSelector
      ? (Array.from(
          document.querySelectorAll(responseSelector),
        ) as HTMLElement[])
      : [form];
    const url = form.action;
    const method = (form.method || "POST").toUpperCase();

    if (!url) {
      console.warn(
        "Invokers: Target form for `fetch:send` must have an `action` attribute.",
        form,
      );
      return;
    }

    setBusyState(context.invoker, true);
    showFeedbackState(
      context.invoker,
      responseTargets,
      "data-loading-template",
    );

    try {
      const response = await fetch(url, {
        method: method,
        body: new FormData(form),
        headers: getHeadersFromAttributes(context.invoker),
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
      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));

      triggerFollowup(context.invoker, responseTargets);
    } catch (error) {
      console.error(`Invokers: \`fetch:send\` (${method}) failed.`, error);
      showFeedbackState(
        context.invoker,
        responseTargets,
        "data-error-template",
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
  "navigate:to": (context: CommandContext) => {
    const url = context.invoker.dataset.url;
    if (!url) {
      console.warn(
        "Invokers: `navigate:to` command requires a `data-url` attribute.",
        context.invoker,
      );
      return;
    }

    if (window.history && typeof window.history.pushState === "function") {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else {
      window.location.href = url;
    }
  },
};

/**
 * Registers commands from this module with the global Invoker instance.
 * @param specificCommands An optional array of command names to register. If omitted, all commands are registered.
 * @example
 * ```js
 * // Register all commands
 * registerAll();
 * // Register only a few specific commands
 * registerAll(['media:toggle', 'scroll:to']);
 * ```
 */
export function registerAll(
  specificCommands?: (keyof typeof commands)[],
): void {
  if (!window.Invoker) {
    console.error(
      "Invokers core library not found. Please ensure it is loaded before the commands module.",
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

// --- Private Helper Functions ---

/**
 * Gets the source node for DOM manipulation commands, prioritizing `data-template-id`
 * and falling back to `data-clone-id`.
 * @private
 * @param invoker The button element that triggered the command.
 * @returns A DocumentFragment containing the content, or null if no valid source is found.
 */
function getSourceNode(invoker: HTMLButtonElement): DocumentFragment | null {
  const templateId = invoker.dataset.templateId;
  const cloneId = invoker.dataset.cloneId;

  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      console.error(
        `Invokers: Source with ID "${templateId}" not found or is not a <template>.`,
        invoker,
      );
      return null;
    }
    return template.content.cloneNode(true) as DocumentFragment;
  }

  if (cloneId) {
    const cloneSource = document.getElementById(cloneId);
    if (!cloneSource) {
      console.error(
        `Invokers: Clone source with ID "${cloneId}" not found.`,
        invoker,
      );
      return null;
    }
    const fragment = document.createDocumentFragment();
    fragment.appendChild(cloneSource.cloneNode(true));
    return fragment;
  }

  console.warn(
    "Invokers: DOM command requires `data-template-id` or `data-clone-id`.",
    invoker,
  );
  return null;
}

/**
 * Sets the busy state for an invoker. This provides crucial user feedback by
 * disabling the button and setting `aria-busy`, improving accessibility and
 * preventing duplicate submissions during async operations.
 * @private
 * @param invoker The button element to update.
 * @param isBusy True to set the busy state, false to clear it.
 */
function setBusyState(invoker: HTMLButtonElement, isBusy: boolean): void {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}

/**
 * Renders feedback (e.g., a loading spinner or error message) into target elements.
 * Content is sourced from a `<template>` specified by an attribute on the invoker.
 * @private
 * @param invoker The button that initiated the action.
 * @param targets The elements where feedback should be displayed.
 * @param templateAttr The data attribute on the invoker holding the template's ID.
 */
function showFeedbackState(
  invoker: HTMLButtonElement,
  targets: HTMLElement[],
  templateAttr: "data-loading-template" | "data-error-template",
): void {
  const templateId = invoker.getAttribute(templateAttr);
  if (!templateId || targets.length === 0) return;

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    console.warn(
      `Invokers: Feedback template "#${templateId}" not found or is not a <template>.`,
    );
    return;
  }

  const content = template.content.cloneNode(true);
  targets.forEach((target, i) => {
    const node = i === 0 ? content : content.cloneNode(true);
    target.replaceChildren(node);
  });
}

/**
 * Safely parses an HTML string into a `DocumentFragment`. Crucially, this prevents
 * script execution from fetched HTML content by using `DOMParser`, which does not
 * execute `<script>` tags.
 * @private
 * @param html The string of HTML to parse.
 * @returns A `DocumentFragment` containing the sanitized DOM nodes.
 */
function parseHTML(html: string): DocumentFragment {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}

/**
 * Triggers a follow-up command after a primary async command (like fetch) completes.
 * This enables chained declarative actions (e.g., fetch content, then show it).
 * It works by creating a "synthetic" invoker in memory, transferring `data-then-*`
 * attributes to it, and dispatching a new `command` event.
 * @private
 * @param originalInvoker The button that triggered the initial command.
 * @param primaryTargets The elements affected by the initial command.
 */
function triggerFollowup(
  originalInvoker: HTMLButtonElement,
  primaryTargets: HTMLElement[],
): void {
  const followupCommand = originalInvoker.dataset.thenCommand;
  if (!followupCommand || primaryTargets.length === 0) return;

  const syntheticInvoker = document.createElement("button");
  syntheticInvoker.setAttribute("command", followupCommand);

  // Transfer `data-then-*` attributes to standard `data-*` attributes.
  // e.g., `data-then-class="is-open"` becomes `data-class="is-open"`.
  for (const attr in originalInvoker.dataset) {
    if (attr.startsWith("then")) {
      const newAttrName = attr.charAt(4).toLowerCase() + attr.slice(5);
      syntheticInvoker.dataset[newAttrName] = originalInvoker.dataset[attr];
    }
  }

  // Set the targets for the follow-up command to the elements just updated.
  const targetIds = primaryTargets.map((t) => t.id).filter(Boolean);
  if (targetIds.length > 0) {
    syntheticInvoker.setAttribute("aria-controls", targetIds.join(" "));
  }

  // Dispatch a new `command` event from the first primary target.
  const eventTarget = primaryTargets[0];
  const commandEvent = new CustomEvent("command", {
    bubbles: true,
    cancelable: true,
    detail: { command: followupCommand, invokerElement: syntheticInvoker },
  }) as any;

  // Polyfill properties for environments where `detail` might not be sufficient.
  commandEvent.command = followupCommand;
  commandEvent.invokerElement = syntheticInvoker;

  eventTarget.dispatchEvent(commandEvent);
}

/**
 * Collects custom HTTP headers from `data-header-*` attributes on an invoker.
 * This allows for declarative header configuration directly in HTML.
 * @private
 * @param invoker The button element with header attributes.
 * @returns A key-value object of headers suitable for the `fetch` API.
 * @example
 * <!-- <button data-header-x-request-id="123" data-header-accept="application/json"> -->
 * // Returns: { 'x-request-id': '123', 'accept': 'application/json' }
 */
function getHeadersFromAttributes(invoker: HTMLButtonElement): HeadersInit {
  const headers: Record<string, string> = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr
        .substring(6)
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase();
      if (headerName) {
        headers[headerName] = invoker.dataset[attr]!;
      }
    }
  }
  return headers;
}

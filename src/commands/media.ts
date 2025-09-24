/**
 * @file media.ts
 * @summary Media & Animation Command Pack for the Invokers library.
 * @description
 * This module provides commands for controlling media elements (video/audio),
 * carousels, scrolling, and basic animations. These commands are designed for
 * rich media experiences and visual interactions.
 * 
 * @example
 * ```javascript
 * import { registerMediaCommands } from 'invokers/commands/media';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerMediaCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, validateElement } from '../index';

/**
 * Media and animation commands for rich multimedia experiences.
 * Includes media controls, carousel navigation, scrolling, and clipboard operations.
 */
const mediaCommands: Record<string, CommandCallback> = {

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

  // --- Scroll Commands ---

  /**
   * `--scroll:to`: Smoothly scrolls the viewport to bring the target element into view.
   * @example `<button command="--scroll:to" commandfor="section-2">Go to Section 2</button>`
   */
  "--scroll:to": ({ targetElement }: CommandContext) => {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // --- Clipboard Commands ---

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

    // Get text to copy (handle inputs differently)
    let textToCopy: string;
    if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
      textToCopy = targetElement.value;
    } else {
      textToCopy = targetElement.textContent || "";
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Show feedback
      invoker.textContent = feedbackText;
      
      // Reset text after a delay
      setTimeout(() => {
        invoker.textContent = originalText;
      }, 2000);
      
    } catch (error) {
      throw createInvokerError('Failed to copy to clipboard', ErrorSeverity.ERROR, {
        command: '--clipboard:copy', element: invoker, cause: error as Error
      });
    }
  }
};

/**
 * Registers all media and animation commands with the InvokerManager.
 * This includes media controls, carousel navigation, scrolling, and clipboard operations.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerMediaCommands } from 'invokers/commands/media';
 * import invokerManager from 'invokers';
 * 
 * registerMediaCommands(invokerManager);
 * ```
 */
export function registerMediaCommands(manager: InvokerManager): void {
  for (const name in mediaCommands) {
    if (mediaCommands.hasOwnProperty(name)) {
      manager.register(name, mediaCommands[name]);
    }
  }
}

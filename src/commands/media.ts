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
  },

  // --- Animation Commands ---

  /**
   * `--animate`: Triggers CSS animations on target elements with enhanced options.
   * Supports various animation types like fade, slide, bounce, etc., with customizable
   * duration, delay, easing, and iterations.
   *
   * @example
   * ```html
   * <!-- Basic usage -->
   * <button type="button" command="--animate:fade-in" commandfor="my-element">Fade In</button>
   *
   * <!-- With options -->
   * <button type="button" command="--animate:bounce:duration:1s:delay:0.5s" commandfor="my-element">Bounce</button>
   *
   * <!-- Using data attributes -->
   * <button type="button" command="--animate:slide-up" commandfor="my-element"
   *         data-animate-duration="2s" data-animate-easing="ease-out">Slide Up</button>
   *
   * <div id="my-element" class="animated-element">Content</div>
   * ```
   */
  "--animate": ({ invoker, getTargets, params }: CommandContext) => {
    const [animation, ...options] = params;
    const targets = getTargets();

    if (targets.length === 0) {
      throw createInvokerError(
        'No target elements found for --animate command',
        ErrorSeverity.WARNING,
        {
          command: '--animate',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element'
        }
      );
    }

    const validAnimations = [
      'fade-in', 'fade-out', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
      'bounce', 'shake', 'pulse', 'flip', 'rotate-in', 'zoom-in', 'zoom-out',
      'spin', 'wobble', 'jello', 'heartbeat', 'rubber-band'
    ];

    if (!validAnimations.includes(animation)) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Unknown animation "${animation}". Valid animations: ${validAnimations.join(', ')}`);
      }
      return; // Skip invalid animations instead of throwing
    }

    // Parse options: duration, delay, easing, iterations
    let duration = '0.5s';
    let delay = '0s';
    let easing = 'ease-in-out';
    let iterations = '1';

    // Options come in pairs: ['duration', '1s', 'delay', '0.5s', ...]
    for (let i = 0; i < options.length; i += 2) {
      const key = options[i];
      const value = options[i + 1];
      if (key === 'duration') {
        duration = value || '0.5s';
      } else if (key === 'delay') {
        delay = value || '0s';
      } else if (key === 'easing') {
        easing = value || 'ease-in-out';
      } else if (key === 'iterations') {
        iterations = value || '1';
      }
    }

    // Also check data attributes for options
    if (invoker?.dataset?.animateDuration) duration = invoker.dataset.animateDuration;
    if (invoker?.dataset?.animateDelay) delay = invoker.dataset.animateDelay;
    if (invoker?.dataset?.animateEasing) easing = invoker.dataset.animateEasing;
    if (invoker?.dataset?.animateIterations) iterations = invoker.dataset.animateIterations;

    try {
      targets.forEach(target => {
        if (!target.isConnected) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: Skipping disconnected target element', target);
          }
          return;
        }

        // Remove any existing animation classes and styles
        target.classList.forEach(className => {
          if (className.startsWith('invokers-animate-')) {
            target.classList.remove(className);
          }
        });

        // Clear any existing animation styles
        target.style.animation = '';

        // Force reflow to restart animation
        void target.offsetHeight;

        // Create custom animation style using the keyframe name
        const animationName = `invokers-${animation}`;
        const animationValue = `${animationName} ${duration} ${easing} ${delay} ${iterations}`;

        // Apply the animation
        target.style.animation = animationValue;

        // Handle animation end
        const handleAnimationEnd = (e: AnimationEvent) => {
          // Only remove if it's our animation
          if (e.animationName === animationName) {
            target.style.animation = '';
            target.removeEventListener('animationend', handleAnimationEnd);
          }
        };

        target.addEventListener('animationend', handleAnimationEnd);

        // Fallback timeout in case animationend doesn't fire
        setTimeout(() => {
          if (target.style.animation.includes(animationName)) {
            target.style.animation = '';
            target.removeEventListener('animationend', handleAnimationEnd);
          }
        }, parseFloat(duration) * 1000 + parseFloat(delay) * 1000 + 100); // Add 100ms buffer
      });
    } catch (error) {
      throw createInvokerError(
        'Failed to animate target elements',
        ErrorSeverity.ERROR,
        {
          command: '--animate',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure target elements support CSS animations and check animation parameters'
        }
      );
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

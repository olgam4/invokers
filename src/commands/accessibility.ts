/**
 * @file accessibility.ts
 * @summary Accessibility Command Pack for the Invokers library.
 * @description
 * This module provides commands for comprehensive accessibility helpers including
 * screen reader announcements, focus management, skip links, focus traps, and ARIA manipulation.
 * These commands ensure rich accessibility support for web applications.
 *
 * @example
 * ```javascript
 * import { registerAccessibilityCommands } from 'invokers/commands/accessibility';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerAccessibilityCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Accessibility commands for screen reader support and keyboard navigation.
 * Includes announcements, focus management, skip links, and ARIA manipulation.
 */
const accessibilityCommands: Record<string, CommandCallback> = {

  /**
   * `--a11y:announce`: Announces text to screen readers using aria-live regions.
   * @example `<button command="--a11y:announce:Item added to cart" data-announce-priority="assertive">Add to Cart</button>`
   */
  "--a11y:announce": ({ invoker, params }: CommandContext) => {
    const value = params.join(':');
    if (!value) {
      throw createInvokerError(
        'A11y announce requires text to announce',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:announce',
          element: invoker,
          recovery: 'Use --a11y:announce:Your announcement text'
        }
      );
    }

    // Determine announcement priority
    const priority = invoker?.dataset?.announcePriority || 'polite'; // polite or assertive

    // Create or find aria-live regions
    let liveRegion = document.getElementById(`invokers-a11y-announcer-${priority}`);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = `invokers-a11y-announcer-${priority}`;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    // Clear previous content and set new content
    liveRegion.textContent = '';
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => {
      liveRegion!.textContent = value;
    }, 100);
  },

  /**
   * `--a11y:focus`: Moves focus to target element with smooth scrolling.
   * @example `<button command="--a11y:focus" commandfor="#main-content">Skip to Main Content</button>`
   */
  "--a11y:focus": ({ invoker, getTargets }: CommandContext) => {
    const targets = getTargets();

    if (targets.length === 0) {
      throw createInvokerError(
        'A11y focus requires target elements',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:focus',
          element: invoker,
          recovery: 'Use commandfor to specify which element to focus'
        }
      );
    }

    const focusTarget = targets[0] as HTMLElement;
    if (focusTarget.focus) {
      // Scroll into view first if needed
      focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Small delay to ensure scrolling is complete
      setTimeout(() => {
        focusTarget.focus();

        // Announce focus for screen readers
        document.dispatchEvent(new CustomEvent('a11y:focus:changed', {
          detail: { element: focusTarget, label: focusTarget.textContent || focusTarget.getAttribute('aria-label') }
        }));
      }, 300);
    }
  },

  /**
   * `--a11y:skip-to`: Creates a skip link that focuses an element by ID.
   * @example `<button command="--a11y:skip-to:main-content">Skip to Main Content</button>`
   */
  "--a11y:skip-to": ({ invoker, params }: CommandContext) => {
    const value = params.join(':');
    if (!value) {
      throw createInvokerError(
        'A11y skip-to requires an element ID',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:skip-to',
          element: invoker,
          recovery: 'Use --a11y:skip-to:element-id'
        }
      );
    }

    const skipTarget = document.getElementById(value);
    if (skipTarget) {
      // Ensure the target is focusable
      if (!skipTarget.hasAttribute('tabindex') && !['button', 'input', 'select', 'textarea', 'a'].includes(skipTarget.tagName.toLowerCase())) {
        skipTarget.setAttribute('tabindex', '-1');
      }

      skipTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        (skipTarget as HTMLElement).focus();
      }, 300);
    } else {
      throw createInvokerError(
        `Element with id "${value}" not found`,
        ErrorSeverity.ERROR,
        {
          command: '--a11y:skip-to',
          element: invoker,
          recovery: 'Ensure the target element exists and has the correct ID'
        }
      );
    }
  },

  /**
   * `--a11y:focus-trap`: Enables or disables focus trapping within a container.
   * @example `<button command="--a11y:focus-trap:enable" commandfor="#modal">Enable Focus Trap</button>`
   * @example `<button command="--a11y:focus-trap:disable" commandfor="#modal">Disable Focus Trap</button>`
   */
  "--a11y:focus-trap": ({ invoker, params, getTargets }: CommandContext) => {
    const value = params[0];
    if (!value || !['enable', 'disable'].includes(value)) {
      throw createInvokerError(
        'A11y focus-trap requires "enable" or "disable"',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:focus-trap',
          element: invoker,
          recovery: 'Use --a11y:focus-trap:enable or --a11y:focus-trap:disable'
        }
      );
    }

    const targets = getTargets();

    if (value === 'enable' && targets.length > 0) {
      const container = targets[0] as HTMLElement;

      // Find all focusable elements within the container
      const getFocusableElements = () => {
        return container.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
      };

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        const currentFocusable = getFocusableElements();
        const currentFirst = currentFocusable[0] as HTMLElement;
        const currentLast = currentFocusable[currentFocusable.length - 1] as HTMLElement;

        if (e.key === 'Tab') {
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

        // Handle Escape key to exit focus trap
        if (e.key === 'Escape') {
          document.dispatchEvent(new CustomEvent('a11y:focus-trap:escape', {
            detail: { container }
          }));
        }
      };

      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (!container.contains(target)) {
          // Focus moved outside container, bring it back
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);
      document.addEventListener('focusin', handleFocusIn);

      // Store handlers for cleanup
      (container as any)._a11yFocusTrap = {
        tabHandler: handleTabKey,
        focusHandler: handleFocusIn
      };

      // Focus first element
      firstElement?.focus();

      // Announce focus trap activation
      document.dispatchEvent(new CustomEvent('a11y:focus-trap:enabled', {
        detail: { container }
      }));

    } else if (value === 'disable' && targets.length > 0) {
      const container = targets[0] as HTMLElement;
      const handlers = (container as any)._a11yFocusTrap;

      if (handlers) {
        container.removeEventListener('keydown', handlers.tabHandler);
        document.removeEventListener('focusin', handlers.focusHandler);
        delete (container as any)._a11yFocusTrap;
      }

      document.dispatchEvent(new CustomEvent('a11y:focus-trap:disabled', {
        detail: { container }
      }));
    }
  },

  /**
   * `--a11y:aria:set`: Sets ARIA attributes on target elements.
   * @example `<button command="--a11y:aria:set:label:Save Changes" commandfor="#save-btn">Update Label</button>`
   */
  "--a11y:aria:set": ({ invoker, params, getTargets }: CommandContext) => {
    const value = params.join(':');
    if (!value || !value.includes(':')) {
      throw createInvokerError(
        'A11y aria:set requires attribute:value format',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:aria:set',
          element: invoker,
          recovery: 'Use --a11y:aria:set:attribute:value'
        }
      );
    }

    const targets = getTargets();
    const [ariaAttr, ariaValue] = value.split(':', 2);
    if (targets.length > 0) {
      targets.forEach(target => {
        target.setAttribute(`aria-${ariaAttr}`, ariaValue);
      });
    }
  },

  /**
   * `--a11y:aria:remove`: Removes ARIA attributes from target elements.
   * @example `<button command="--a11y:aria:remove:label" commandfor="#save-btn">Remove Label</button>`
   */
  "--a11y:aria:remove": ({ invoker, params, getTargets }: CommandContext) => {
    const value = params.join(':');
    if (!value) {
      throw createInvokerError(
        'A11y aria:remove requires an attribute name',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:aria:remove',
          element: invoker,
          recovery: 'Use --a11y:aria:remove:attribute'
        }
      );
    }

    const targets = getTargets();
    if (targets.length > 0) {
      targets.forEach(target => {
        target.removeAttribute(`aria-${value}`);
      });
    }
  },

  /**
   * `--a11y:heading-level`: Changes heading level for accessibility.
   * @example `<button command="--a11y:heading-level:2" commandfor="h1">Change to H2</button>`
   */
  "--a11y:heading-level": ({ invoker, params, getTargets }: CommandContext) => {
    const value = params[0];
    if (!value || !['1', '2', '3', '4', '5', '6'].includes(value)) {
      throw createInvokerError(
        'A11y heading-level requires a level 1-6',
        ErrorSeverity.ERROR,
        {
          command: '--a11y:heading-level',
          element: invoker,
          recovery: 'Use --a11y:heading-level:1-6'
        }
      );
    }

    const targets = getTargets();
    if (targets.length > 0) {
      targets.forEach(target => {
        if (target.tagName.match(/^H[1-6]$/)) {
          // Change heading level by changing tag
          const newTag = `H${value}`;
          const newElement = document.createElement(newTag);
          Array.from(target.attributes).forEach(attr => {
            newElement.setAttribute(attr.name, attr.value);
          });
          newElement.innerHTML = target.innerHTML;
          target.parentNode?.replaceChild(newElement, target);
        } else {
          target.setAttribute('aria-level', value);
        }
      });
    }
  }
};

/**
 * Registers all accessibility commands with the InvokerManager.
 * This includes screen reader announcements, focus management, and ARIA manipulation.
 *
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerAccessibilityCommands } from 'invokers/commands/accessibility';
 * import invokerManager from 'invokers';
 *
 * registerAccessibilityCommands(invokerManager);
 * ```
 */
export function registerAccessibilityCommands(manager: InvokerManager): void {
  for (const name in accessibilityCommands) {
    if (accessibilityCommands.hasOwnProperty(name)) {
      manager.register(name, accessibilityCommands[name]);
    }
  }
}
// src/event-trigger-manager.ts

import { _dispatchCommandEvent } from '../index';
import { interpolateString } from './interpolation';
import { resolveTargets } from '../target-resolver';

// Event modifiers that have special handling
const MODIFIERS: Record<string, (e: Event) => void> = {
  'prevent': (e: Event) => e.preventDefault(),
  'stop': (e: Event) => e.stopPropagation(),
  'once': (_e: Event) => { /* handled in attachListeners */ },
  // Add other modifiers like `self`, `capture`, `passive`, `debounce.<ms>`, `throttle.<ms>` etc. as needed
};

// Key aliases for keyboard events
const KEY_ALIASES: Record<string, string> = {
  'enter': 'Enter',
  'escape': 'Escape',
  'tab': 'Tab',
  'space': ' ',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
};

// Handles any DOM event that triggers a command (from command-on or data-on-event)
function handleTrigger(this: HTMLElement, event: Event) {
   if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
     console.log('Invokers: handleTrigger called for event:', event.type, 'on element:', this);
   }
   const source = this;
   const commandAttribute = source.getAttribute('command') || source.dataset.onEventCommand;
   const commandforAttribute = source.getAttribute('commandfor') || source.dataset.onEventCommandfor;

  if (!commandAttribute || !commandforAttribute) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.warn("Invokers: Missing 'command' or 'commandfor' attribute on event triggered element:", source);
    }
    return;
  }

   // Handle modifiers like .prevent and .stop
   const triggerAttr = source.getAttribute('command-on') || source.dataset.onEvent || (source as any).originalTriggerAttr;
   const allModifiers = triggerAttr.split('.').slice(1);
    const modifiers = allModifiers.filter((m: string) => m !== 'window'); // Remove 'window' since it's handled in attach

     // Check key-specific modifiers for keyboard events
     if (event.type === 'keydown' || event.type === 'keyup') {
       const keyboardEvent = event as KeyboardEvent;
        const keyModifier = modifiers.find((mod: string) => {
          const unescaped = mod.replace(/\\(.)/g, '$1');
          return mod.startsWith('key-') || KEY_ALIASES[unescaped] || unescaped.length === 1;
        });
       if (keyModifier) {
         let expectedKey = KEY_ALIASES[keyModifier] || keyModifier.replace('key-', '');
         // Unescape backslash-escaped characters (e.g., \/ -> /)
         expectedKey = expectedKey.replace(/\\(.)/g, '$1');
         if (keyboardEvent.key !== expectedKey) {
           return; // Key doesn't match, don't trigger
         }
       }
     }

  // Apply other modifiers
  for (const mod of modifiers) {
    if (mod !== 'once' && MODIFIERS[mod]) {
      MODIFIERS[mod](event);
    }
  }

      // Resolve the target using the target resolver
      const targets = resolveTargets(commandforAttribute, source);
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log(`Invokers: Resolved targets for "${commandforAttribute}":`, targets);
      }
      if (targets.length === 0) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         console.warn(`Invokers: No target found for selector "${commandforAttribute}"`, source);
       }
        return;
      }

      // Use the first target (most commands expect a single target)
      const targetElement = targets[0];

      // Create interpolation context for this specific event trigger
      let sourceDataContext: Record<string, any> = {};
      if (source.dataset.context) {
        try {
          sourceDataContext = JSON.parse(source.dataset.context);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: Failed to parse data-context:', error);
          }
        }
      }

      let targetDataContext: Record<string, any> = {};
      const targetDataset = (targetElement as HTMLElement).dataset;
      if (targetDataset?.context) {
        try {
          targetDataContext = JSON.parse(targetDataset.context);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: Failed to parse data-context:', error);
          }
        }
      }

      const interpolationContext = {
        ...sourceDataContext, // Include data-context from source element
        ...targetDataContext, // Include data-context from target element
        event: event,
        this: source,
        target: targetElement,
        detail: (event as CustomEvent)?.detail,
      };

      // Interpolate the command string using the activated utility
      const interpolatedCommand = interpolateString(commandAttribute, interpolationContext);

   // Dispatch the CommandEvent to the core InvokerManager
   _dispatchCommandEvent(source, interpolatedCommand, targetElement as HTMLElement, event);

  // Handle 'once' modifier by removing the listener
  if (modifiers.includes('once')) {
    source.removeEventListener(event.type, handleTrigger);
  }
}

// --- Scanning and Observing DOM for Event Triggers ---

function attachListeners(element: HTMLElement) {
    // command-on (any DOM event)
    if (element.hasAttribute('command-on') && !element.dataset.commandOnAttached) {
     const triggerAttr = element.getAttribute('command-on')!;
     const parts = triggerAttr.split('.');
     const eventName = parts[0];
     const modifiers = parts.slice(1);
     const target = modifiers.includes('window') ? window : element;
     const listener = (event: Event) => handleTrigger.call(element, event);
     target.addEventListener(eventName, listener);
     element.dataset.commandOnAttached = 'true';
     (element as any).originalTriggerAttr = triggerAttr;
     (element as any).commandOnListener = listener;
   }

  // data-on-event (custom events)
  if (element.hasAttribute('data-on-event') && !element.dataset.onEventAttached) {
    const eventName = element.dataset.onEvent!;
    // For data-on-event, the `command` and `commandfor` attributes are implied
    // to be present on the same element, or can be specified as `data-on-event-command`
    // and `data-on-event-commandfor` to avoid conflicts.
    if (!element.hasAttribute('command') && !element.hasAttribute('data-on-event-command')) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'command' or 'data-on-event-command' attribute.`, element);
      }
      return;
    }
    if (!element.hasAttribute('commandfor') && !element.hasAttribute('data-on-event-commandfor')) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'commandfor' or 'data-on-event-commandfor' attribute.`, element);
      }
      return;
    }

    element.addEventListener(eventName, handleTrigger);
    element.dataset.onEventAttached = 'true';
  }
}

function disconnectListeners(element: HTMLElement) {
   if (element.dataset.commandOnAttached) {
     const triggerAttr = (element as any).originalTriggerAttr;
     if (triggerAttr) {
       const parts = triggerAttr.split('.');
       const eventName = parts[0];
       const modifiers = parts.slice(1);
       const target = modifiers.includes('window') ? window : element;
       const listener = (element as any).commandOnListener;
       if (listener) {
         target.removeEventListener(eventName, listener);
       }
     }
     delete element.dataset.commandOnAttached;
     delete (element as any).originalTriggerAttr;
     delete (element as any).commandOnListener;
   }
  if (element.dataset.onEventAttached) {
    const eventName = element.dataset.onEvent!;
    element.removeEventListener(eventName, handleTrigger);
    delete element.dataset.onEventAttached;
  }
}

// MutationObserver to attach/detach listeners for dynamically added/removed elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const element = node as HTMLElement;
          if (element.hasAttribute('command-on') || element.hasAttribute('data-on-event')) {
            attachListeners(element);
          }
          element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
        }
      });
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const element = node as HTMLElement;
          disconnectListeners(element);
          element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(disconnectListeners);
        }
      });
    } else if (mutation.type === 'attributes') {
      const element = mutation.target as HTMLElement;
      // If command-on or data-on-event attribute changes/is added/removed, re-evaluate
      if (
        (mutation.attributeName === 'command-on' && element.hasAttribute('command-on') && !element.dataset.commandOnAttached) ||
        (mutation.attributeName === 'data-on-event' && element.hasAttribute('data-on-event') && !element.dataset.onEventAttached)
      ) {
        attachListeners(element);
      } else if (
        (mutation.attributeName === 'command-on' && !element.hasAttribute('command-on') && element.dataset.commandOnAttached) ||
        (mutation.attributeName === 'data-on-event' && !element.hasAttribute('data-on-event') && element.dataset.onEventAttached)
      ) {
        disconnectListeners(element);
      }
    }
  }
});

export class EventTriggerManager {
  private static instance: EventTriggerManager;

  public static getInstance(): EventTriggerManager {
    if (!EventTriggerManager.instance) {
      EventTriggerManager.instance = new EventTriggerManager();
    }
    return EventTriggerManager.instance;
  }

  public initialize(root: Element = document.body) {
    // Scan existing DOM
    root.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
    // Observe future changes
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['command-on', 'data-on-event']
    });
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Invokers EventTriggerManager initialized.');
    }
  }

  public shutdown() {
    observer.disconnect();
    document.querySelectorAll<HTMLElement>('[command-on][data-command-on-attached], [data-on-event][data-on-event-attached]').forEach(disconnectListeners);
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Invokers EventTriggerManager shut down.');
    }
  }

  public rescanCommandOnElements(root: Element = document.body) {
    // Scan existing DOM for new elements
    root.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
  }
}
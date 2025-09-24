/**
 * @file browser.ts
 * @summary Browser API Command Pack for the Invokers library.
 * @description
 * This module provides commands for interacting with browser APIs including
 * cookies, storage, URL manipulation, history, and device capabilities.
 * These commands enable rich web platform integration.
 * 
 * @example
 * ```javascript
 * import { registerBrowserCommands } from 'invokers/commands/browser';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerBrowserCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Browser API commands for web platform integration.
 * Includes cookie management and other browser-specific functionality.
 */
const browserCommands: Record<string, CommandCallback> = {

  // --- URL Commands ---

  /**
   * `--url:params-get`: Gets a URL parameter value and sets it on the target element.
   * @example `<button command="--url:params-get:theme" commandfor="#theme-display">Show Theme</button>`
   */
  "--url:params-get": ({ targetElement, params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('URL params-get command requires a parameter name', ErrorSeverity.ERROR, {
        command: '--url:params-get', element: targetElement
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(key);
    targetElement.textContent = value || '';
  },

  /**
   * `--url:params-set`: Sets a URL parameter with name and value.
   * @example `<button command="--url:params-set:theme:dark" commandfor="#content">Set Theme</button>`
   */
  "--url:params-set": ({ invoker, params, getTargets }: CommandContext) => {
    let key = params[0];
    let value = params[1] || invoker.dataset.value || '';
    
    // Handle dynamic parameter names (e.g., from data attributes)
    if (!key && invoker.dataset.urlParamName) {
      key = invoker.dataset.urlParamName;
    }
    
    if (!key) {
      throw createInvokerError('URL params-set command requires a parameter name', ErrorSeverity.ERROR, {
        command: '--url:params-set', element: invoker
      });
    }

    // Interpolation is already handled in the core executeCustomCommand method

    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      // If no value provided, use target element's value or text content
      const targets = getTargets();
      if (targets.length > 0) {
        const targetEl = targets[0];
        const inputValue = (targetEl as HTMLInputElement).value || 
                         (targetEl as HTMLTextAreaElement).value || 
                         targetEl.textContent;
        url.searchParams.set(key, inputValue || '');
      }
    }
    
    window.history.replaceState(null, '', url.toString());
  },

  /**
   * `--url:params-delete`: Removes a URL parameter.
   * @example `<button command="--url:params-delete:theme">Clear Theme</button>`
   */
  "--url:params-delete": ({ params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('URL params-delete command requires a parameter name', ErrorSeverity.ERROR, {
        command: '--url:params-delete'
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState(null, '', url.toString());
  },

  /**
   * `--url:params-clear`: Clears all URL parameters.
   * @example `<button command="--url:params-clear">Clear All Parameters</button>`
   */
  "--url:params-clear": () => {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState(null, '', url.toString());
  },

  /**
   * `--url:params-all`: Gets all URL parameters as JSON and sets on target element.
   * @example `<button command="--url:params-all" commandfor="#params-display">Show All Params</button>`
   */
  "--url:params-all": ({ targetElement }: CommandContext) => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramsObj: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      paramsObj[key] = value;
    });
    targetElement.textContent = JSON.stringify(paramsObj);
  },

  // --- URL Hash Commands ---

  /**
   * `--url:hash-get`: Gets current hash and sets it on target element.
   * @example `<button command="--url:hash-get" commandfor="#hash-display">Show Hash</button>`
   */
  "--url:hash-get": ({ targetElement }: CommandContext) => {
    const hash = window.location.hash.replace('#', '');
    targetElement.textContent = hash;
  },

  /**
   * `--url:hash-set`: Sets the URL hash.
   * @example `<button command="--url:hash-set:section2">Go to Section 2</button>`
   */
  "--url:hash-set": ({ params, getTargets }: CommandContext) => {
    let hash = params[0];
    
    // Interpolation is already handled in the core executeCustomCommand method
    
    if (hash !== undefined && hash !== '') {
      window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
    } else {
      // Get value from target element
      const targets = getTargets();
      if (targets.length > 0) {
        const targetEl = targets[0];
        const inputValue = (targetEl as HTMLInputElement).value || 
                         (targetEl as HTMLTextAreaElement).value || 
                         targetEl.textContent;
        if (inputValue) {
          window.location.hash = inputValue.startsWith('#') ? inputValue : `#${inputValue}`;
        }
      }
    }
  },

  /**
   * `--url:hash-clear`: Clears the URL hash.
   * @example `<button command="--url:hash-clear">Clear Hash</button>`
   */
  "--url:hash-clear": () => {
    window.location.hash = '';
  },

  // --- URL Pathname Commands ---

  /**
   * `--url:pathname-get`: Gets current pathname and sets it on target element.
   * @example `<button command="--url:pathname-get" commandfor="#path-display">Show Path</button>`
   */
  "--url:pathname-get": ({ targetElement }: CommandContext) => {
    targetElement.textContent = window.location.pathname;
  },

  /**
   * `--url:pathname-set`: Sets the URL pathname.
   * @example `<button command="--url:pathname-set:/new-page">Go to New Page</button>`
   */
  "--url:pathname-set": ({ params, getTargets }: CommandContext) => {
    let pathname = params[0];
    
    // Interpolation is already handled in the core executeCustomCommand method
    
    if (pathname !== undefined && pathname !== '') {
      const url = new URL(window.location.href);
      url.pathname = pathname;
      window.history.replaceState(null, '', url.toString());
    } else {
      // Get value from target element
      const targets = getTargets();
      if (targets.length > 0) {
        const targetEl = targets[0];
        const inputValue = (targetEl as HTMLInputElement).value || 
                         (targetEl as HTMLTextAreaElement).value || 
                         targetEl.textContent;
        if (inputValue) {
          const url = new URL(window.location.href);
          url.pathname = inputValue;
          window.history.replaceState(null, '', url.toString());
        }
      }
    }
  },

  // --- URL Navigation Commands ---

  /**
   * `--url:navigate`: Navigates to a new URL using pushState.
   * @example `<button command="--url:navigate:/new-page">Go to New Page</button>`
   */
  "--url:navigate": ({ params }: CommandContext) => {
    const url = params[0];
    if (!url) {
      throw createInvokerError('URL navigate command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--url:navigate'
      });
    }

    window.history.pushState({}, '', url);
  },

  /**
   * `--url:replace`: Replaces current URL using replaceState.
   * @example `<button command="--url:replace:/replaced-page">Replace Current Page</button>`
   */
  "--url:replace": ({ params }: CommandContext) => {
    const url = params[0];
    if (!url) {
      throw createInvokerError('URL replace command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--url:replace'
      });
    }

    window.history.replaceState(null, '', url);
  },

  /**
   * `--url:reload`: Reloads the current page.
   * @example `<button command="--url:reload">Reload Page</button>`
   */
  "--url:reload": () => {
    window.location.reload();
  },

  // --- History Commands ---

  /**
   * `--history:push`: Pushes a new state to history.
   * @example `<button command="--history:push:/test-page">Push to History</button>`
   */
  "--history:push": ({ params, targetElement }: CommandContext) => {
    const url = params[0];
    if (!url) {
      throw createInvokerError('History push command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--history:push'
      });
    }

    window.history.pushState(null, '', url);
    if (targetElement) {
      targetElement.textContent = `Pushed ${url} to history`;
    }
  },

  /**
   * `--history:replace`: Replaces current history state.
   * @example `<button command="--history:replace:/replaced-page">Replace History</button>`
   */
  "--history:replace": ({ params, targetElement }: CommandContext) => {
    const url = params[0];
    if (!url) {
      throw createInvokerError('History replace command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--history:replace'
      });
    }

    window.history.replaceState(null, '', url);
    if (targetElement) {
      targetElement.textContent = `Replaced current URL with ${url}`;
    }
  },

  /**
   * `--history:back`: Goes back in history.
   * @example `<button command="--history:back">Go Back</button>`
   */
  "--history:back": ({ targetElement }: CommandContext) => {
    window.history.back();
    if (targetElement) {
      targetElement.textContent = 'Navigated back in history';
    }
  },

  /**
   * `--history:forward`: Goes forward in history.
   * @example `<button command="--history:forward">Go Forward</button>`
   */
  "--history:forward": ({ targetElement }: CommandContext) => {
    window.history.forward();
    if (targetElement) {
      targetElement.textContent = 'Navigated forward in history';
    }
  },

  /**
   * `--history:go`: Goes to specific position in history.
   * @example `<button command="--history:go:-2">Go Back 2 Pages</button>`
   */
  "--history:go": ({ params, targetElement }: CommandContext) => {
    const delta = parseInt(params[0], 10);
    if (isNaN(delta)) {
      throw createInvokerError('History go command requires a numeric delta parameter', ErrorSeverity.ERROR, {
        command: '--history:go'
      });
    }

    window.history.go(delta);
    if (targetElement) {
      const direction = delta > 0 ? 'forward' : 'back';
      targetElement.textContent = `Navigated ${direction} ${Math.abs(delta)} page(s) in history`;
    }
  },

  /**
   * `--history:state:get`: Gets current history state.
   * @example `<button command="--history:state:get" commandfor="#state-display">Show State</button>`
   */
  "--history:state:get": ({ targetElement }: CommandContext) => {
    const state = window.history.state;
    targetElement.textContent = state ? JSON.stringify(state) : 'null';
  },

  /**
   * `--history:state`: Alias for --history:state:get.
   * @example `<button command="--history:state" commandfor="#state-display">Show State</button>`
   */
  "--history:state": ({ targetElement }: CommandContext) => {
    const state = window.history.state;
    targetElement.textContent = state ? JSON.stringify(state) : 'null';
  },

  /**
   * `--history:state:set`: Sets history state.
   * @example `<button command="--history:state:set:{"test": "data"}">Set State</button>`
   */
  "--history:state:set": ({ params }: CommandContext) => {
    // Join all params back together in case JSON was split on colons
    const stateJson = params.join(':');
    
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('History state set params:', params, 'joined:', stateJson);
    }
    
    if (!stateJson) {
      throw createInvokerError('History state set command requires a state parameter', ErrorSeverity.ERROR, {
        command: '--history:state:set'
      });
    }

    try {
      const state = JSON.parse(stateJson);
      window.history.replaceState(state, '');
    } catch (e) {
      throw createInvokerError('History state set command requires valid JSON', ErrorSeverity.ERROR, {
        command: '--history:state:set',
        recovery: 'Provide a valid JSON string for the state parameter'
      });
    }
  },

  // --- Cookie Commands ---

  /**
   * `--cookie:set`: Sets a browser cookie.
   * @example `<button command="--cookie:set:theme:dark" data-cookie-expires="365">Set Dark Theme</button>`
   */
  "--cookie:set": ({ invoker, params }: CommandContext) => {
    const key = params[0];
    const value = params[1];
    if (!key) {
      throw createInvokerError('Cookie set command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--cookie:set', element: invoker
      });
    }

    let cookieString = `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`;
    const expires = invoker.dataset.cookieExpires;
    if (expires) {
      const days = parseInt(expires, 10);
      if (!isNaN(days)) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        cookieString += `; expires=${date.toUTCString()}`;
      }
    }
    cookieString += '; path=/';
    document.cookie = cookieString;
  },

  /**
   * `--cookie:get`: Gets a cookie value and sets it on the target element.
   * @example `<button command="--cookie:get:theme" commandfor="#theme-display">Show Theme</button>`
   */
  "--cookie:get": ({ targetElement, params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('Cookie get command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--cookie:get', element: targetElement
      });
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.trim().split('=');
      if (decodeURIComponent(cookieKey) === key) {
        targetElement.textContent = decodeURIComponent(cookieValue || '');
        return;
      }
    }
    targetElement.textContent = ''; // Not found
  },

  /**
   * `--cookie:remove`: Removes a browser cookie.
   * @example `<button command="--cookie:remove:theme">Clear Theme</button>`
   */
  "--cookie:remove": ({ params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('Cookie remove command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--cookie:remove'
      });
    }

    document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};

/**
 * Registers all browser API commands with the InvokerManager.
 * This includes cookie management and other browser-specific functionality.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerBrowserCommands } from 'invokers/commands/browser';
 * import invokerManager from 'invokers';
 * 
 * registerBrowserCommands(invokerManager);
 * ```
 */
export function registerBrowserCommands(manager: InvokerManager): void {
  for (const name in browserCommands) {
    if (browserCommands.hasOwnProperty(name)) {
      manager.register(name, browserCommands[name]);
    }
  }
}

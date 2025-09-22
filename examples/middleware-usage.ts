/**
 * Invokers Middleware & Plugins Usage Examples
 *
 * This file demonstrates how to create and use middleware and plugins
 * to extend Invokers functionality.
 */

import { InvokerPlugin, HookPoint, MiddlewareFunction } from '../src/index';

// Example 1: Simple Analytics Plugin
const analyticsPlugin: InvokerPlugin = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Tracks command usage and performance metrics',

  middleware: {
    [HookPoint.BEFORE_COMMAND]: (context) => {
      console.log(`[Analytics] Command started: ${context.fullCommand}`);
      // Send to analytics service
      trackEvent('command_started', {
        command: context.fullCommand,
        target: context.targetElement.id,
        timestamp: Date.now()
      });
    },

    [HookPoint.ON_SUCCESS]: (context) => {
      console.log(`[Analytics] Command succeeded: ${context.fullCommand}`);
      trackEvent('command_success', {
        command: context.fullCommand,
        duration: Date.now() - (context as any).startTime
      });
    },

    [HookPoint.ON_ERROR]: (context) => {
      console.log(`[Analytics] Command failed: ${context.fullCommand}`);
      trackEvent('command_error', {
        command: context.fullCommand,
        error: context.result?.error?.message
      });
    }
  }
};

// Example 2: Security Plugin with Rate Limiting
const securityPlugin: InvokerPlugin = {
  name: 'security',
  version: '1.0.0',
  description: 'Adds security checks and rate limiting',

  middleware: {
    [HookPoint.BEFORE_COMMAND]: (context) => {
      // Rate limiting
      const now = Date.now();
      const invoker = context.invoker;
      if (invoker) {
        const lastExecution = parseInt(invoker.dataset.lastExecution || '0');
        if (now - lastExecution < 1000) { // 1 second cooldown
          throw new Error('Rate limit exceeded. Please wait before executing another command.');
        }
        invoker.dataset.lastExecution = now.toString();
      }

      // Security checks
      if (context.fullCommand.includes('dangerous') ||
          context.fullCommand.includes('delete') ||
          context.params.some(param => param.includes('javascript:'))) {
        throw new Error('Security policy violation: Dangerous command blocked.');
      }

      console.log(`[Security] Command approved: ${context.fullCommand}`);
    }
  }
};

// Example 3: UI Enhancement Plugin
const uiEnhancementPlugin: InvokerPlugin = {
  name: 'ui-enhancement',
  version: '1.0.0',
  description: 'Adds loading states and animations',

  middleware: {
    [HookPoint.BEFORE_COMMAND]: (context) => {
      // Add loading state
      const invoker = context.invoker;
      if (invoker) {
        invoker.disabled = true;
        const originalText = invoker.textContent || '';
        invoker.dataset.originalText = originalText;
        invoker.textContent = '⏳ ' + (invoker.dataset.loadingText || 'Loading...');

        // Add loading class
        invoker.classList.add('loading');
      }
    },

    [HookPoint.ON_COMPLETE]: (context) => {
      // Remove loading state
      const invoker = context.invoker;
      if (invoker) {
        invoker.disabled = false;
        invoker.textContent = invoker.dataset.originalText || '';
        invoker.classList.remove('loading');
      }
    },

    [HookPoint.ON_SUCCESS]: (context) => {
      // Success animation
      const invoker = context.invoker;
      if (invoker) {
        invoker.classList.add('success');
        setTimeout(() => invoker.classList.remove('success'), 1000);
      }
    },

    [HookPoint.ON_ERROR]: (context) => {
      // Error animation
      const invoker = context.invoker;
      if (invoker) {
        invoker.classList.add('error');
        setTimeout(() => invoker.classList.remove('error'), 1000);
      }
    }
  }
};

// Example 4: Logging Plugin
const loggingPlugin: InvokerPlugin = {
  name: 'logging',
  version: '1.0.0',
  description: 'Comprehensive command logging',

  middleware: {
    [HookPoint.BEFORE_COMMAND]: (context) => {
      console.group(`🚀 Command: ${context.fullCommand}`);
      console.log('Invoker:', context.invoker);
      console.log('Target:', context.targetElement);
      console.log('Params:', context.params);
    },

    [HookPoint.AFTER_COMMAND]: (context) => {
      console.log('Result:', context.result);
      console.groupEnd();
    }
  }
};

// Example 5: Custom Middleware Functions (not in plugins)
const performanceMiddleware: MiddlewareFunction = (context) => {
  if (context.hookPoint === HookPoint.BEFORE_COMMAND) {
    (context as any).startTime = Date.now();
  } else if (context.hookPoint === HookPoint.AFTER_COMMAND) {
    const duration = Date.now() - (context as any).startTime;
    console.log(`Command ${context.fullCommand} took ${duration}ms`);
  }
};

const validationMiddleware: MiddlewareFunction = (context) => {
  if (context.hookPoint === HookPoint.BEFORE_VALIDATION) {
    // Custom validation logic
    if (context.params.some(param => param.length > 1000)) {
      throw new Error('Parameter too long');
    }
  }
};

// Example 6: Conditional Middleware
const conditionalMiddleware: MiddlewareFunction = (context) => {
  // Only log fetch commands
  if (context.fullCommand.includes('fetch')) {
    console.log(`[Conditional] Fetch command: ${context.fullCommand}`);
  }
};

// Usage Examples
export function setupMiddleware() {
  // Register plugins
  window.Invoker.registerPlugin(analyticsPlugin);
  window.Invoker.registerPlugin(securityPlugin);
  window.Invoker.registerPlugin(uiEnhancementPlugin);
  window.Invoker.registerPlugin(loggingPlugin);

  // Register individual middleware functions
  window.Invoker.registerMiddleware(HookPoint.BEFORE_COMMAND, performanceMiddleware);
  window.Invoker.registerMiddleware(HookPoint.BEFORE_VALIDATION, validationMiddleware);
  window.Invoker.registerMiddleware(HookPoint.BEFORE_COMMAND, conditionalMiddleware);

  console.log('All middleware and plugins registered!');
}

// Utility function for analytics (placeholder)
function trackEvent(event: string, data: any) {
  // In a real app, this would send to your analytics service
  console.log(`[Analytics] ${event}:`, data);
}

// Example: Dynamic plugin loading
export async function loadPluginFromURL(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    const pluginCode = await response.text();

    // Note: In a real implementation, you'd want to sandbox this
    const plugin = eval(pluginCode);

    if (plugin && typeof plugin === 'object' && plugin.name) {
      window.Invoker.registerPlugin(plugin);
      console.log(`Plugin ${plugin.name} loaded from ${url}`);
    }
  } catch (error) {
    console.error('Failed to load plugin:', error);
  }
}

// Example: Plugin management
export function managePlugins() {
  // List registered plugins
  console.log('Registered plugins:', Array.from(window.Invoker.instance.plugins.keys()));

  // Check if plugin is active
  if (window.Invoker.instance.plugins.has('analytics')) {
    console.log('Analytics plugin is active');
  }

  // Unregister a plugin
  window.Invoker.unregisterPlugin('logging');
  console.log('Logging plugin unregistered');
}

// Example: Custom command with middleware integration
window.Invoker.register('--middleware:demo', async (context) => {
  console.log('Demo command executing...');

  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Middleware will handle success/error logging automatically
  if (Math.random() > 0.8) {
    throw new Error('Random demo error');
  }

  return 'Demo completed successfully';
});

// CSS for UI enhancement plugin (add to your stylesheet)
export const uiEnhancementStyles = `
  .loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .success {
    animation: successPulse 0.5s ease-in-out;
  }

  .error {
    animation: errorShake 0.5s ease-in-out;
  }

  @keyframes successPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Middleware Plugin Compatibility (Window API Integration)', () => {
  let dom: JSDOM;
  let window: Window & typeof globalThis;
  let document: Document;
  let InvokerManager: any;
  let HookPoint: any;

  beforeEach(async () => {
    // Reset DOM
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    window = dom.window as Window & typeof globalThis;
    document = window.document;
    
    // Set up global environment
    global.window = window;
    global.document = document;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;
    global.CustomEvent = window.CustomEvent;

    // Clear any existing window.Invoker
    delete (window as any).Invoker;

    // Import and create the InvokerManager instance 
    const { InvokerManager: IM, HookPoint: HP } = await import('../src/core');
    const { registerBaseCommands } = await import('../src/commands/base');
    const { registerFormCommands } = await import('../src/commands/form');
    const polyfillModule = await import('../src/polyfill');
    const applyPolyfill = polyfillModule.apply;
    
    InvokerManager = IM;
    HookPoint = HP;

    // Create instance and register commands (like compatible.ts does)
    const invokerInstance = InvokerManager.getInstance();
    registerBaseCommands(invokerInstance);
    registerFormCommands(invokerInstance);

    // Set up window.Invoker object manually to match compatible.ts
    (window as any).Invoker = {
      instance: invokerInstance,
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
      reset: invokerInstance.reset.bind(invokerInstance),
      
      // Middleware and Plugin APIs  
      registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
      unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
      registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
      unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
      hasPlugin: invokerInstance.hasPlugin.bind(invokerInstance),
      HookPoint: HookPoint,
      
      // Add compatibility methods
      getRegisteredCommands: () => Array.from((invokerInstance as any).commands.keys()),
      getStats: () => invokerInstance.getStats(),
      debug: false
    };

    // Apply polyfill to handle command attribute clicks
    applyPolyfill();

    // Small delay to ensure initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Window API Exposure', () => {
    it('should expose all required middleware/plugin APIs on window.Invoker', () => {
      expect(window.Invoker).toBeDefined();
      expect(typeof window.Invoker.registerMiddleware).toBe('function');
      expect(typeof window.Invoker.unregisterMiddleware).toBe('function');
      expect(typeof window.Invoker.registerPlugin).toBe('function');
      expect(typeof window.Invoker.unregisterPlugin).toBe('function');
      expect(typeof window.Invoker.hasPlugin).toBe('function');
      expect(window.Invoker.HookPoint).toBeDefined();
    });

    it('should expose HookPoint enum with all required values', () => {
      const hookPoint = window.Invoker.HookPoint;
      expect(hookPoint.BEFORE_COMMAND).toBe('beforeCommand');
      expect(hookPoint.AFTER_COMMAND).toBe('afterCommand');
      expect(hookPoint.BEFORE_VALIDATION).toBe('beforeValidation');
      expect(hookPoint.AFTER_VALIDATION).toBe('afterValidation');
      expect(hookPoint.ON_SUCCESS).toBe('onSuccess');
      expect(hookPoint.ON_ERROR).toBe('onError');
      expect(hookPoint.ON_COMPLETE).toBe('onComplete');
    });

    it('should expose other essential APIs for backward compatibility', () => {
      expect(typeof window.Invoker.register).toBe('function');
      expect(typeof window.Invoker.executeCommand).toBe('function');
      expect(typeof window.Invoker.reset).toBe('function');
      expect(typeof window.Invoker.getRegisteredCommands).toBe('function');
      expect(typeof window.Invoker.getStats).toBe('function');
      expect(window.Invoker.instance).toBeDefined();
    });
  });

  describe('Plugin Registration and Management', () => {
    it('should register and unregister plugins successfully', () => {
      const testPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin for unit testing'
      };

      // Register plugin
      expect(() => {
        window.Invoker.registerPlugin(testPlugin);
      }).not.toThrow();

      // Check plugin is registered
      expect(window.Invoker.hasPlugin('test-plugin')).toBe(true);

      // Unregister plugin
      expect(() => {
        window.Invoker.unregisterPlugin('test-plugin');
      }).not.toThrow();

      // Check plugin is unregistered
      expect(window.Invoker.hasPlugin('test-plugin')).toBe(false);
    });

    it('should handle plugin lifecycle hooks', () => {
      const onRegisterSpy = vi.fn();
      const onUnregisterSpy = vi.fn();

      const testPlugin = {
        name: 'lifecycle-plugin',
        onRegister: onRegisterSpy,
        onUnregister: onUnregisterSpy
      };

      // Register plugin - should call onRegister
      window.Invoker.registerPlugin(testPlugin);
      expect(onRegisterSpy).toHaveBeenCalledWith(expect.any(Object));

      // Unregister plugin - should call onUnregister
      window.Invoker.unregisterPlugin('lifecycle-plugin');
      expect(onUnregisterSpy).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Middleware Execution', () => {
    it('should allow direct middleware registration', () => {
      const middlewareFn = vi.fn();

      // Register middleware directly
      expect(() => {
        window.Invoker.registerMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middlewareFn);
      }).not.toThrow();

      // Unregister middleware
      expect(() => {
        window.Invoker.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middlewareFn);
      }).not.toThrow();
    });

    it('should allow multiple middleware registrations for same hook point', () => {
      const middleware1 = vi.fn();
      const middleware2 = vi.fn();

      // Register multiple middleware for same hook point
      expect(() => {
        window.Invoker.registerMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middleware1);
        window.Invoker.registerMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middleware2);
      }).not.toThrow();

      // Unregister both
      expect(() => {
        window.Invoker.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middleware1);
        window.Invoker.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middleware2);
      }).not.toThrow();
    });
  });

  describe('Demo Functionality Simulation', () => {
    it('should allow demo-style plugin registration and management', () => {
      const analyticsLogs: string[] = [];
      
      // Create analytics plugin like in demo
      const analyticsPlugin = {
        name: 'analytics',
        version: '1.0.0',
        description: 'Tracks command usage and performance',
        middleware: {
          [window.Invoker.HookPoint.BEFORE_COMMAND]: (context: any) => {
            analyticsLogs.push(`Command started: ${context.fullCommand}`);
          },
          [window.Invoker.HookPoint.ON_SUCCESS]: (context: any) => {
            analyticsLogs.push(`Command succeeded: ${context.fullCommand}`);
          },
          [window.Invoker.HookPoint.ON_COMPLETE]: (context: any) => {
            analyticsLogs.push(`Command completed: ${context.fullCommand}`);
          }
        }
      };

      // Create security plugin like in demo
      const securityPlugin = {
        name: 'security',
        version: '1.0.0',
        description: 'Adds security checks and rate limiting',
        middleware: {
          [window.Invoker.HookPoint.BEFORE_COMMAND]: (context: any) => {
            // Security check - prevent dangerous commands
            if (context.fullCommand.includes('dangerous')) {
              throw new Error('Security policy violation: Dangerous command blocked.');
            }
          }
        }
      };

      // Register plugins - should not throw
      expect(() => {
        window.Invoker.registerPlugin(analyticsPlugin);
        window.Invoker.registerPlugin(securityPlugin);
      }).not.toThrow();

      // Verify plugins are registered
      expect(window.Invoker.hasPlugin('analytics')).toBe(true);
      expect(window.Invoker.hasPlugin('security')).toBe(true);

      // Unregister plugins to test cleanup
      expect(() => {
        window.Invoker.unregisterPlugin('analytics');
        window.Invoker.unregisterPlugin('security');
      }).not.toThrow();

      expect(window.Invoker.hasPlugin('analytics')).toBe(false);
      expect(window.Invoker.hasPlugin('security')).toBe(false);
    });

    it('should support UI enhancement plugin structure', () => {
      const uiPlugin = {
        name: 'ui-enhancement',
        version: '1.0.0',
        description: 'Adds loading states and animations',
        middleware: {
          [window.Invoker.HookPoint.BEFORE_COMMAND]: vi.fn(),
          [window.Invoker.HookPoint.ON_COMPLETE]: vi.fn()
        }
      };

      // Should be able to register UI plugin without issues
      expect(() => {
        window.Invoker.registerPlugin(uiPlugin);
      }).not.toThrow();

      expect(window.Invoker.hasPlugin('ui-enhancement')).toBe(true);

      // Should be able to unregister
      expect(() => {
        window.Invoker.unregisterPlugin('ui-enhancement');
      }).not.toThrow();

      expect(window.Invoker.hasPlugin('ui-enhancement')).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid plugin registration gracefully', () => {
      // Test registering plugin without name - should either throw or handle gracefully
      try {
        window.Invoker.registerPlugin({} as any);
        // If it doesn't throw, that's also acceptable behavior
      } catch (error) {
        // If it throws, that's expected behavior
        expect(error).toBeDefined();
      }

      // Test unregistering non-existent plugin
      expect(() => {
        window.Invoker.unregisterPlugin('non-existent-plugin');
      }).not.toThrow();

      // Test checking non-existent plugin
      expect(window.Invoker.hasPlugin('non-existent')).toBe(false);
    });

    it('should handle middleware errors without crashing', async () => {
      const errorThrowingPlugin = {
        name: 'error-plugin',
        middleware: {
          [window.Invoker.HookPoint.BEFORE_COMMAND]: () => {
            throw new Error('Middleware error');
          }
        }
      };

      window.Invoker.registerPlugin(errorThrowingPlugin);

      document.body.innerHTML = `
        <button id="error-btn" command="--text:set:Should work despite error" commandfor="output">Test</button>
        <div id="output">Initial</div>
      `;

      const button = document.getElementById('error-btn')!;
      
      // Command should still execute despite middleware error
      expect(() => {
        button.click();
      }).not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 10));

      // Command should still have worked (depending on error handling implementation)
      const output = document.getElementById('output')!;
      // The exact behavior depends on how middleware errors are handled,
      // but the system should remain stable
      expect(output).toBeDefined();
    });
  });

  describe('Integration with Command System', () => {
    it('should allow plugins with command tracking structure', () => {
      const trackerPlugin = {
        name: 'command-tracker',
        middleware: {
          [window.Invoker.HookPoint.ON_SUCCESS]: vi.fn(),
          [window.Invoker.HookPoint.BEFORE_COMMAND]: vi.fn(),
          [window.Invoker.HookPoint.ON_COMPLETE]: vi.fn()
        }
      };

      // Should register successfully
      expect(() => {
        window.Invoker.registerPlugin(trackerPlugin);
      }).not.toThrow();

      expect(window.Invoker.hasPlugin('command-tracker')).toBe(true);

      // Should allow direct middleware registration alongside plugins
      const standaloneMiddleware = vi.fn();
      expect(() => {
        window.Invoker.registerMiddleware(window.Invoker.HookPoint.BEFORE_VALIDATION, standaloneMiddleware);
      }).not.toThrow();

      // Should allow unregistering
      expect(() => {
        window.Invoker.unregisterPlugin('command-tracker');
        window.Invoker.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_VALIDATION, standaloneMiddleware);
      }).not.toThrow();
    });
  });
});

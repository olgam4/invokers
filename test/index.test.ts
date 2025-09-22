import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager, parseCommandString, createCommandString } from '../src/index';

// Mock DOM elements for testing
let mockButton: HTMLButtonElement;
let mockTarget: HTMLElement;

describe('Enhanced Attribute-Based Chaining', () => {
  let invokerManager: InvokerManager;

   beforeEach(() => {
     // Clean up any existing test elements
     const existingButton = document.getElementById('test-button');
     const existingTarget = document.getElementById('test-target');
     if (existingButton) existingButton.remove();
     if (existingTarget) existingTarget.remove();

     // Create mock DOM elements
     mockButton = document.createElement('button');
     mockButton.id = 'test-button';
     mockTarget = document.createElement('div');
     mockTarget.id = 'test-target';
     mockButton.setAttribute('commandfor', 'test-target');

     // Reset target content
     mockTarget.textContent = '';

     // Add elements to document first
     document.body.appendChild(mockButton);
     document.body.appendChild(mockTarget);

     // Create InvokerManager instance
     invokerManager = new InvokerManager();
   });

  describe('Universal Chaining (data-and-then)', () => {
    it('should execute chained command after primary command', async () => {
      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary executed';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained executed';
      });

      // Set up chaining using old attribute method
      mockButton.setAttribute('command', '--test-primary');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-and-then', '--test-chain');

      // Execute command by directly calling the method
      const mockCommandEvent = {
        command: '--test-primary',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      // Call the private handleCommand method (it's async)
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify both primary and chained commands executed
      expect(mockTarget.textContent).toBe('primary executed + chained executed');
    });
  });

  describe('Conditional Chaining', () => {
    it('should execute success commands on successful execution', async () => {
      // Register test commands
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'success';
      });

      invokerManager.register('--test-success-chain', ({ targetElement }) => {
        targetElement.textContent += ' + success chain';
      });

      // Set up conditional chaining using old attribute method
      mockButton.setAttribute('command', '--test-success');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-success', '--test-success-chain');

      // Execute command
      const mockCommandEvent = {
        command: '--test-success',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify success chain executed
      expect(mockTarget.textContent).toBe('success + success chain');
    });

    it('should execute error commands on failed execution', async () => {
      // Register test commands
      invokerManager.register('--test-error', () => {
        throw new Error('Test error');
      });

      invokerManager.register('--test-error-chain', ({ targetElement }) => {
        targetElement.textContent = 'error chain executed';
      });

      // Set up conditional chaining using old attribute method
      mockButton.setAttribute('command', '--test-error');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-error', '--test-error-chain');

      // Execute command
      const mockCommandEvent = {
        command: '--test-error',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify error chain executed
      expect(mockTarget.textContent).toBe('error chain executed');
    });

    it('should execute complete commands regardless of success/error', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-complete', ({ targetElement }) => {
        targetElement.textContent = 'complete';
      });

      invokerManager.register('--test-complete-chain', ({ targetElement }) => {
        targetElement.textContent += ' + always executed';
      });

      // Set up complete chaining using old attribute method
      testButton.setAttribute('command', '--test-complete');
      testButton.setAttribute('commandfor', 'test-target');
      testButton.setAttribute('data-after-complete', '--test-complete-chain');

      // Execute command
      const mockCommandEvent = {
        command: '--test-complete',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify complete chain executed
      expect(testTarget.textContent).toBe('complete + always executed');
    });
  });

  describe('Declarative <and-then> Elements', () => {
    it('should execute and-then element after primary command', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-chain');
      andThenElement.setAttribute('commandfor', 'test-target');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify both primary and chained commands executed
      expect(testTarget.textContent).toBe('primary + chained');
    });

    it('should execute and-then element with conditional success', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-success-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-condition', 'success');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'success';
      });

      invokerManager.register('--test-success-chain', ({ targetElement }) => {
        targetElement.textContent += ' + success chain';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-success');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-success',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify success chain executed
      expect(testTarget.textContent).toBe('success + success chain');
    });

    it('should execute and-then element with conditional error', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-error-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-condition', 'error');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-error', () => {
        throw new Error('Test error');
      });

      invokerManager.register('--test-error-chain', ({ targetElement }) => {
        targetElement.textContent = 'error chain executed';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-error');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-error',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify error chain executed
      expect(testTarget.textContent).toBe('error chain executed');
    });

    it('should handle nested and-then elements', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';

      // Create nested and-then elements
      const andThenElement1 = document.createElement('and-then');
      andThenElement1.setAttribute('command', '--test-chain-1');
      andThenElement1.setAttribute('commandfor', 'test-target');

      const andThenElement2 = document.createElement('and-then');
      andThenElement2.setAttribute('command', '--test-chain-2');
      andThenElement2.setAttribute('commandfor', 'test-target');

      // Nest the second and-then inside the first
      andThenElement1.appendChild(andThenElement2);
      testButton.appendChild(andThenElement1);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain-1', ({ targetElement }) => {
        targetElement.textContent += ' + chain1';
      });

      invokerManager.register('--test-chain-2', ({ targetElement }) => {
        targetElement.textContent += ' + chain2';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify sequential execution
      expect(testTarget.textContent).toBe('primary + chain1 + chain2');
    });

    it('should handle once state for and-then elements', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-once', 'true');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command first time
      const mockCommandEvent1 = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent1);

      // Verify and-then element was removed
      expect(testButton.querySelector('and-then')).toBeNull();
    });
  });

  describe('Command Lifecycle States', () => {
    it('should handle "once" state correctly', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      let executionCount = 0;
      invokerManager.register('--test-once', ({ targetElement }) => {
        executionCount++;
        targetElement.textContent = `executed ${executionCount}`;
      });

        // Set up once command
        testButton.setAttribute('command', '--test-once');
        testButton.setAttribute('commandfor', 'test-target');
        testButton.setAttribute('data-state', 'once');

      // Execute command first time
      const mockCommandEvent1 = {
        command: '--test-once',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent1);
      expect(executionCount).toBe(1);
      expect(testTarget.textContent).toBe('executed 1');

      // Execute command second time (should not execute due to once state)
      const mockCommandEvent2 = {
        command: '--test-once',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent2);
      expect(executionCount).toBe(1); // Should still be 1
    });

    it('should handle "disabled" state correctly', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      let executionCount = 0;
      invokerManager.register('--test-disabled', () => {
        executionCount++;
      });

        // Set up disabled command
        testButton.setAttribute('command', '--test-disabled');
        testButton.setAttribute('commandfor', 'test-target');
        testButton.setAttribute('data-state', 'disabled');

      // Execute command (should not execute due to disabled state)
      const mockCommandEvent = {
        command: '--test-disabled',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);
      expect(executionCount).toBe(0);
    });
  });

  describe('Target Override', () => {
    it('should allow overriding target for chained commands', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const secondaryTarget = document.createElement('div');
      secondaryTarget.id = 'secondary-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);
      document.body.appendChild(secondaryTarget);

      // Register test commands
      invokerManager.register('--test-primary', () => {
        testTarget.textContent = 'primary';
      });

      invokerManager.register('--test-chain', () => {
        const target = document.getElementById('secondary-target');
        if (target) target.textContent = 'chained';
      });

      // Set up target override
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');
      testButton.setAttribute('data-and-then', '--test-chain');
      testButton.setAttribute('data-then-target', 'secondary-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify primary command affected original target
      expect(testTarget.textContent).toBe('primary');
      // Verify chained command affected overridden target
      expect(secondaryTarget.textContent).toBe('chained');
    });
  });

  describe('Declarative <and-then> Elements', () => {
    it('should execute and-then element after primary command', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-chain');
      andThenElement.setAttribute('commandfor', 'test-target');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify both primary and chained commands executed
      expect(testTarget.textContent).toBe('primary + chained');
    });

    it('should execute and-then element with conditional success', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-success-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-condition', 'success');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'success';
      });

      invokerManager.register('--test-success-chain', ({ targetElement }) => {
        targetElement.textContent += ' + success chain';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-success');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-success',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify success chain executed
      expect(testTarget.textContent).toBe('success + success chain');
    });

    it('should execute and-then element with conditional error', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-error-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-condition', 'error');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-error', () => {
        throw new Error('Test error');
      });

      invokerManager.register('--test-error-chain', ({ targetElement }) => {
        targetElement.textContent = 'error chain executed';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-error');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-error',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify error chain executed
      expect(testTarget.textContent).toBe('error chain executed');
    });

    it('should handle nested and-then elements', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';

      // Create nested and-then elements
      const andThenElement1 = document.createElement('and-then');
      andThenElement1.setAttribute('command', '--test-chain-1');
      andThenElement1.setAttribute('commandfor', 'test-target');

      const andThenElement2 = document.createElement('and-then');
      andThenElement2.setAttribute('command', '--test-chain-2');
      andThenElement2.setAttribute('commandfor', 'test-target');

      // Nest the second and-then inside the first
      andThenElement1.appendChild(andThenElement2);
      testButton.appendChild(andThenElement1);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain-1', ({ targetElement }) => {
        targetElement.textContent += ' + chain1';
      });

      invokerManager.register('--test-chain-2', ({ targetElement }) => {
        targetElement.textContent += ' + chain2';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command
      const mockCommandEvent = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent);

      // Verify sequential execution
      expect(testTarget.textContent).toBe('primary + chain1 + chain2');
    });

    it('should handle once state for and-then elements', async () => {
      const invokerManager = new InvokerManager();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'test-target';
      const andThenElement = document.createElement('and-then');
      andThenElement.setAttribute('command', '--test-chain');
      andThenElement.setAttribute('commandfor', 'test-target');
      andThenElement.setAttribute('data-once', 'true');

      // Add and-then element to button
      testButton.appendChild(andThenElement);

      // Add elements to document
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained';
      });

      // Set up primary command
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'test-target');

      // Execute command first time
      const mockCommandEvent1 = {
        command: '--test-primary',
        source: testButton,
        target: testTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;
      await (invokerManager as any).handleCommand(mockCommandEvent1);

      // Verify and-then element was removed
      expect(testButton.querySelector('and-then')).toBeNull();
    });
  });
});

describe('Utility Functions', () => {
  describe('parseCommandString', () => {
    it('should parse command strings correctly', () => {
      expect(parseCommandString('--class:toggle:is-active')).toEqual(['--class', 'toggle', 'is-active']);
      expect(parseCommandString('--fetch:get\\:url')).toEqual(['--fetch', 'get:url']);
    });
  });

  describe('createCommandString', () => {
    it('should create command strings correctly', () => {
      expect(createCommandString('--class', 'toggle', 'is-active')).toBe('--class:toggle:is-active');
      expect(createCommandString('class', 'toggle', 'is-active')).toBe('--class:toggle:is-active');
    });
  });
});

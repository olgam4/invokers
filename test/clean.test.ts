import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Clean Enhanced Attribute-Based Chaining', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';

    // Get singleton InvokerManager instance
    invokerManager = InvokerManager.getInstance();
  });

  describe('Universal Chaining (data-and-then)', () => {
    it('should execute chained command after primary command', async () => {
      // Create fresh DOM elements
      const mockButton = document.createElement('button');
      mockButton.id = 'test-button';
      const mockTarget = document.createElement('div');
      mockTarget.id = 'test-target';
      
      document.body.appendChild(mockButton);
      document.body.appendChild(mockTarget);

      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary executed';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained executed';
      });

      // Set up chaining
      mockButton.setAttribute('command', '--test-primary');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-and-then', '--test-chain');

      // Execute command directly using executeCommand
      await invokerManager.executeCommand('--test-primary', 'test-target', mockButton);

      // Verify both primary and chained commands executed
      expect(mockTarget.textContent).toBe('primary executed + chained executed');
    });
  });

  describe('Conditional Chaining', () => {
    it('should execute success commands on successful execution', async () => {
      const mockButton = document.createElement('button');
      mockButton.id = 'test-button';
      const mockTarget = document.createElement('div');
      mockTarget.id = 'test-target';
      
      document.body.appendChild(mockButton);
      document.body.appendChild(mockTarget);

      // Register test commands
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'success';
      });

      invokerManager.register('--test-success-chain', ({ targetElement }) => {
        targetElement.textContent += ' + success chain';
      });

      // Set up conditional chaining
      mockButton.setAttribute('command', '--test-success');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-success', '--test-success-chain');

      await invokerManager.executeCommand('--test-success', 'test-target', mockButton);

      // Verify success chain executed
      expect(mockTarget.textContent).toBe('success + success chain');
    });

    it('should execute error commands on failed execution', async () => {
      const mockButton = document.createElement('button');
      mockButton.id = 'test-button';
      const mockTarget = document.createElement('div');
      mockTarget.id = 'test-target';
      
      document.body.appendChild(mockButton);
      document.body.appendChild(mockTarget);

      // Register test commands
      invokerManager.register('--test-error', () => {
        throw new Error('Test error');
      });

      invokerManager.register('--test-error-chain', ({ targetElement }) => {
        targetElement.textContent = 'error chain executed';
      });

      // Set up conditional chaining
      mockButton.setAttribute('command', '--test-error');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-error', '--test-error-chain');

      try {
        await invokerManager.executeCommand('--test-error', 'test-target', mockButton);
      } catch (e) {
        // Expected to throw
      }

      // Verify error chain executed
      expect(mockTarget.textContent).toBe('error chain executed');
    });
  });
});


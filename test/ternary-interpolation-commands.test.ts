import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokerManager } from '../src/index';
import { enableAdvancedEvents } from '../src/advanced-events';
import { EventTriggerManager } from '../src/event-trigger-manager';

describe('Class Ternary, Interpolation, and Built-in Commands', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
  });

  afterEach(() => {
    invokerManager.reset();
  });

  describe('--class:ternary', () => {
    it('should apply classIfTrue when condition "has-content" is true', async () => {
      // Create target element with content
      const target = document.createElement('div');
      target.id = 'ternary-target';
      target.textContent = 'Hello World';
      document.body.appendChild(target);

      // Create invoker
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:has-content:empty:has-content');
      invoker.setAttribute('commandfor', '#ternary-target');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:has-content:empty:has-content', '#ternary-target', invoker);

      // Check that has-content class is added, empty is removed
      expect(target.classList.contains('has-content')).toBe(true);
      expect(target.classList.contains('empty')).toBe(false);
    });

    it('should apply classIfFalse when condition "has-content" is false', async () => {
      // Create target element without content
      const target = document.createElement('div');
      target.id = 'ternary-target-empty';
      target.textContent = '';
      document.body.appendChild(target);

      // Create invoker
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:has-content:empty:has-content');
      invoker.setAttribute('commandfor', '#ternary-target-empty');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:has-content:empty:has-content', '#ternary-target-empty', invoker);

      // Check that empty class is added, has-content is removed
      expect(target.classList.contains('empty')).toBe(true);
      expect(target.classList.contains('has-content')).toBe(false);
    });

    it('should apply classIfTrue when condition "has-no-content" is false', async () => {
      // Create target element with content
      const target = document.createElement('div');
      target.id = 'ternary-target-no-content';
      target.textContent = 'Content';
      document.body.appendChild(target);

      // Create invoker
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:filled:blank:has-no-content');
      invoker.setAttribute('commandfor', '#ternary-target-no-content');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:filled:blank:has-no-content', '#ternary-target-no-content', invoker);

      // Since it has content, has-no-content is false, so apply classIfFalse
      expect(target.classList.contains('blank')).toBe(true);
      expect(target.classList.contains('filled')).toBe(false);
    });

    it('should handle whitespace-only content as no content', async () => {
      // Create target element with whitespace
      const target = document.createElement('div');
      target.id = 'ternary-target-whitespace';
      target.textContent = '   \n\t   ';
      document.body.appendChild(target);

      // Create invoker
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:has-content:empty:has-content');
      invoker.setAttribute('commandfor', '#ternary-target-whitespace');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:has-content:empty:has-content', '#ternary-target-whitespace', invoker);

      // Should be treated as empty
      expect(target.classList.contains('empty')).toBe(true);
      expect(target.classList.contains('has-content')).toBe(false);
    });

    it('should warn when missing required parameters', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create target element
      const target = document.createElement('div');
      target.id = 'ternary-target-invalid';
      document.body.appendChild(target);

      // Create invoker with invalid command
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:only-two-params');
      invoker.setAttribute('commandfor', '#ternary-target-invalid');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:only-two-params', '#ternary-target-invalid', invoker);

      // Check that warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invokers: `--class:ternary` requires class-if-true, class-if-false, and condition.',
        invoker
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Expressions and Interpolations', () => {
    beforeEach(() => {
      enableAdvancedEvents();
    });

    it('should interpolate {{...}} expressions in command attributes', async () => {
      // Create target element
      const target = document.createElement('div');
      target.id = 'interpolation-target';
      document.body.appendChild(target);

      // Create invoker with interpolated command
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--text:set:{{ "Hello " + "World" }}');
      invoker.setAttribute('commandfor', '#interpolation-target');
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--text:set:Hello World', '#interpolation-target', invoker);

      // Check that text was set
      expect(target.textContent).toBe('Hello World');
    });

    it('should interpolate data attributes in commands', async () => {
      // Create target element
      const target = document.createElement('div');
      target.id = 'data-interpolation-target';
      document.body.appendChild(target);

      // Create invoker with data interpolation
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--text:set:{{ data.message }}');
      invoker.setAttribute('commandfor', '#data-interpolation-target');
      invoker.dataset.message = 'Interpolated message';
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--text:set:Interpolated message', '#data-interpolation-target', invoker);

      // Check that text was set
      expect(target.textContent).toBe('Interpolated message');
    });

    it('should handle command-on with interpolation', async () => {
      // Create target element
      const target = document.createElement('div');
      target.id = 'interpolation-on-target';
      document.body.appendChild(target);

      // Create invoker with command-on and interpolation
      const invoker = document.createElement('input');
      invoker.setAttribute('command-on', 'input');
      invoker.setAttribute('command', '--text:set:{{ this.value }}');
      invoker.setAttribute('commandfor', '#interpolation-on-target');
      document.body.appendChild(invoker);

      // Rescan for command-on elements
      EventTriggerManager.getInstance().rescanCommandOnElements();

      // Simulate input event
      invoker.value = 'updated value';
      invoker.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that text was set
      expect(target.textContent).toBe('updated value');
    });
  });

  describe('Built-in Commands - Clear Operations', () => {
    it('should clear all CSS classes with --class:clear', async () => {
      // Create target element with classes
      const target = document.createElement('div');
      target.id = 'clear-classes-target';
      target.classList.add('class1', 'class2', 'class3');
      document.body.appendChild(target);

      // Execute command directly on the target
      await invokerManager.executeCommand('--class:clear', '#clear-classes-target', null);

      // Check that all classes are removed
      expect(target.className).toBe('');
      expect(target.classList.length).toBe(0);
    });

    it('should clear text content with --text:clear', async () => {
      // Create target element with text
      const target = document.createElement('div');
      target.id = 'clear-text-target';
      target.textContent = 'Some text content';
      document.body.appendChild(target);

      // Execute command directly on the target
      await invokerManager.executeCommand('--text:clear', '#clear-text-target', null);

      // Check that text is cleared
      expect(target.textContent).toBe('');
    });

    it('should clear input value with --value:clear', async () => {
      // Create input element with value
      const target = document.createElement('input');
      target.id = 'clear-value-target';
      target.value = 'Some value';
      document.body.appendChild(target);

      // Execute command directly on the target
      await invokerManager.executeCommand('--value:clear', '#clear-value-target', null);

      // Check that value is cleared
      expect(target.value).toBe('');
    });
  });

  describe('Complex Scenarios', () => {
    it('should combine ternary class application with interpolation', async () => {
      enableAdvancedEvents();

      // Create target element
      const target = document.createElement('div');
      target.id = 'complex-target';
      target.textContent = 'Initial content';
      document.body.appendChild(target);

      // Create invoker with interpolated ternary command
      const invoker = document.createElement('button');
      invoker.setAttribute('command', '--class:ternary:{{ data.trueClass }}:{{ data.falseClass }}:has-content');
      invoker.setAttribute('commandfor', '#complex-target');
      invoker.dataset.trueClass = 'active';
      invoker.dataset.falseClass = 'inactive';
      document.body.appendChild(invoker);

      // Execute command
      await invokerManager.executeCommand('--class:ternary:active:inactive:has-content', '#complex-target', invoker);

      // Check that active class is added (since it has content)
      expect(target.classList.contains('active')).toBe(true);
      expect(target.classList.contains('inactive')).toBe(false);
    });

    it('should chain clear commands with ternary', async () => {
      // Create target element with content
      const target = document.createElement('div');
      target.id = 'chain-target';
      target.textContent = 'Content';
      document.body.appendChild(target);

      // Execute clear command
      await invokerManager.executeCommand('--text:clear', '#chain-target', null);

      // Execute ternary command
      await invokerManager.executeCommand('--class:ternary:empty:has-content:has-no-content', '#chain-target', null);

      // Check that text is cleared and empty class is applied
      expect(target.textContent).toBe('');
      expect(target.classList.contains('empty')).toBe(true);
      expect(target.classList.contains('has-content')).toBe(false);
    });
  });
});
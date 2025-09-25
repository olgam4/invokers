import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerDataCommands } from '../src/commands/data';
import { enableAdvancedEvents } from '../src/advanced';

describe('Data Commands', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    registerDataCommands(invokerManager);
    enableAdvancedEvents(); // Enable interpolation for tests
  });

  describe('--data:set command', () => {
    it('should set data attribute on target element', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);
      expect(target.dataset.testKey).toBe('testValue');
    });

    it('should dispatch custom event when data is set', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:testKey', eventListener);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);

       expect(eventListener).toHaveBeenCalledWith(
         expect.objectContaining({
           type: 'data:testKey',
           detail: { value: 'testKey:testValue' }
         })
       );
    });

    it('should interpolate expressions in data values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.baseId = 'item';
      invoker.dataset.index = '42';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:combinedId:{{ this.dataset.baseId + "-" + this.dataset.index }}', 'target', invoker);
      expect(target.dataset.combinedId).toBe('item-42');
    });

    it('should interpolate with parent element data', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const parent = document.createElement('div');
      parent.dataset.itemId = '123';
      document.body.appendChild(parent);

      const invoker = document.createElement('button');
      parent.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:currentId:{{ this.parentElement.dataset.itemId }}', 'target', invoker);
      expect(target.dataset.currentId).toBe('123');
    });

    it('should handle data binding with data-bind-to and data-bind-as', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'data:boundValue';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:boundData', 'target', invoker);

      expect(target.dataset.testKey).toBe('boundData');
      expect(bindTarget.dataset.boundValue).toBe('boundData');
    });

    it('should dispatch events on bound elements', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'data:boundValue';
      document.body.appendChild(invoker);

      const bindEventListener = vi.fn();
      bindTarget.addEventListener('data:testKey', bindEventListener);

      await invokerManager.executeCommand('--data:set:testKey:boundData', 'target', invoker);

      expect(bindEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:testKey',
          detail: { value: 'testKey:boundData' }
        })
      );
    });

    it('should interpolate bindTo and bindAs attributes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target-456';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target-{{ this.dataset.targetId }}';
      invoker.dataset.bindAs = 'data:{{ this.dataset.propName }}';
      invoker.dataset.targetId = '456';
      invoker.dataset.propName = 'customProp';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:interpolatedData', 'target', invoker);

      expect(bindTarget.dataset.customProp).toBe('interpolatedData');
    });

    it('should handle different bindAs types', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('input');
      bindTarget.id = 'bind-input';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-input';
      invoker.dataset.bindAs = 'value';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:inputValue', 'target', invoker);

      expect(bindTarget.value).toBe('inputValue');
    });

    it('should handle attr: bindAs type', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'attr:data-custom';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:attrValue', 'target', invoker);

      expect(bindTarget.getAttribute('data-custom')).toBe('attrValue');
    });

    it('should handle text bindAs type', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'text';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:textContent', 'target', invoker);

      expect(bindTarget.textContent).toBe('textContent');
    });

    it('should work with complex selectors in bindTo', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const container = document.createElement('div');
      container.className = 'container';
      document.body.appendChild(container);

      const bindTarget = document.createElement('div');
      bindTarget.className = 'bind-target';
      container.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '.container .bind-target';
      invoker.dataset.bindAs = 'data:boundData';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:complexBound', 'target', invoker);

      expect(bindTarget.dataset.boundData).toBe('complexBound');
    });

    it('should handle missing bind targets gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#non-existent-target';
      invoker.dataset.bindAs = 'data:boundData';
      document.body.appendChild(invoker);

      // Should not throw, just skip binding
      await expect(invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker)).resolves.not.toThrow();
      expect(target.dataset.testKey).toBe('testValue');
    });

    it('should handle invalid bindAs gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'invalid:type';
      document.body.appendChild(invoker);

      // Should not throw, just skip setting
      await expect(invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker)).resolves.not.toThrow();
      expect(target.dataset.testKey).toBe('testValue');
      // bindTarget should not have any changes since bindAs is invalid
    });
  });

  describe('Event dispatching', () => {
    it('should dispatch events with correct detail format', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:userAction', eventListener);

      await invokerManager.executeCommand('--data:set:userAction:login', 'target', invoker);

       expect(eventListener).toHaveBeenCalledWith(
         expect.objectContaining({
           type: 'data:userAction',
           detail: { value: 'userAction:login' },
           bubbles: true
         })
       );
    });

    it('should dispatch events even when binding fails', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#non-existent';
      invoker.dataset.bindAs = 'data:test';
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:testKey', eventListener);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);

      expect(eventListener).toHaveBeenCalled();
      expect(target.dataset.testKey).toBe('testValue');
    });
  });
});
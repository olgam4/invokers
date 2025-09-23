import { InvokerManager } from '../src/index';
import { enableAdvancedEvents } from '../src/advanced-events';

describe('Attribute and Data Commands with Interpolation', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    enableAdvancedEvents(); // Enable interpolation
  });

  describe('Attribute Commands with Interpolation', () => {
    it('should interpolate expressions in attr:set values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.userId = '456';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--attr:set:data-user-id:{{ "user-" + this.dataset.userId }}', 'target', invoker);
      expect(target.getAttribute('data-user-id')).toBe('user-456');
    });

    it('should interpolate complex expressions in attr:set', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.count = '5';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--attr:set:data-result:{{ this.dataset.count * 2 + 10 }}', 'target', invoker);
      expect(target.getAttribute('data-result')).toBe('20');
    });

    it('should interpolate with this.dataset in attr:set', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.value = 'test-value';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--attr:set:data-attr:{{ this.dataset.value }}', 'target', invoker);
      expect(target.getAttribute('data-attr')).toBe('test-value');
    });

    it('should handle escaping in attr:set values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Test escaping colons in attribute values
      await invokerManager.executeCommand('--attr:set:data-time:{{ "12\\:30\\:45" }}', 'target');
      expect(target.getAttribute('data-time')).toBe('12:30:45');
    });

    it('should interpolate in attr:toggle values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.state = 'active';
      document.body.appendChild(invoker);

      // First toggle - should set
      await invokerManager.executeCommand('--attr:toggle:class:{{ this.dataset.state }}', 'target', invoker);
      expect(target.getAttribute('class')).toBe('active');

      // Second toggle - should remove
      await invokerManager.executeCommand('--attr:toggle:class:{{ this.dataset.state }}', 'target', invoker);
      expect(target.hasAttribute('class')).toBe(false);
    });

    it('should handle undefined interpolation gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:set:data-test:{{ undefinedValue }}', 'target');
      expect(target.getAttribute('data-test')).toBe('');
    });
  });

  describe('Data Commands with Interpolation', () => {
    it('should interpolate expressions in data:set values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.baseId = 'item';
      invoker.dataset.index = '7';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:itemId:{{ this.dataset.baseId + "-" + this.dataset.index }}', 'target', invoker);
      expect(target.dataset.itemId).toBe('item-7');
    });

    it('should interpolate with this properties in data:set', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      (invoker as any).value = 'input-value';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:inputValue:{{ this.value }}', 'target', invoker);
      expect(target.dataset.inputValue).toBe('input-value');
    });

    it('should handle array operations with interpolation', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.value = '{"name": "Test Item", "id": 123}';
      document.body.appendChild(invoker);

      // First set up an array
      target.dataset.items = '[]';

      await invokerManager.executeCommand('--data:set:array:push:items', 'target', invoker);
      const items = JSON.parse(target.dataset.items || '[]');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Test Item');
    });

    it('should interpolate in data:set:array:update', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.dataset.items = '[{"id": 1, "name": "Old Name"}]';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.value = '{"name": "Updated Name"}';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:array:update:items:0', 'target', invoker);
      const items = JSON.parse(target.dataset.items || '[]');
      expect(items[0].name).toBe('Updated Name');
    });
  });

  describe('Edge Cases and Escaping', () => {
    it('should handle colons in interpolated strings', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.time = '12:30';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--attr:set:data-schedule:{{ "Meeting at " + this.dataset.time }}', 'target', invoker);
      expect(target.getAttribute('data-schedule')).toBe('Meeting at 12:30');
    });

    it('should handle quotes in interpolated strings', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:set:title:{{ \'Button with "quotes"\' }}', 'target');
      expect(target.getAttribute('title')).toBe('Button with "quotes"');
    });

    it('should handle complex nested expressions', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.role = 'admin';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--attr:set:data-permission:{{ this.dataset.role + "-access" }}', 'target', invoker);
      expect(target.getAttribute('data-permission')).toBe('admin-access');
    });



    it('should handle empty interpolation results', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:set:data-empty:{{ null }}', 'target');
      expect(target.getAttribute('data-empty')).toBe('');
    });

    it('should handle interpolation with special characters', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:set:data-special:{{ "Special: chars & <>\\"" }}', 'target');
      expect(target.getAttribute('data-special')).toBe('Special: chars & <>"');
    });
  });

  describe('Integration with Command Chaining', () => {
    it('should work with data-and-then chaining', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.userId = '789';
      invoker.setAttribute('data-and-then', '--attr:set:data-processed:true');
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:userId:{{ this.dataset.userId }}', 'target', invoker);

      // Wait for chaining to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.dataset.userId).toBe('789');
      expect(target.getAttribute('data-processed')).toBe('true');
    });
  });
});
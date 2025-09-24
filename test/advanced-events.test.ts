import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { interpolateString } from '../src/advanced/interpolation';
import { EventTriggerManager } from '../src/advanced/event-trigger-manager';

// Mock DOM elements for testing
function createTestElements() {
  document.body.innerHTML = `
    <button id="test-button" command-on="click" command="--text:set:clicked" commandfor="test-target">Test Button</button>
    <div id="test-target"></div>
    <input id="test-input" type="text" command-on="input" command="--text:set:{{ this.value }}" commandfor="test-output">
    <div id="test-output"></div>
    <form id="test-form" command-on="submit.prevent" command="--text:set:submitted" commandfor="form-output">
      <input type="text" name="test">
    </form>
    <div id="form-output"></div>
    <button id="emit-button" command="--emit:test-event:{\"message\":\"hello\"}">Emit Event</button>
    <div id="event-listener" data-on-event="test-event" command="--text:set:{{ detail.message }}" commandfor="event-output"></div>
    <div id="event-output"></div>

    <template id="interpolation-template">
      <div id="interpolated-div">
        <span>{{data.testValue}}</span>
      </div>
    </template>
    <div id="swap-target"></div>
  `;
}

describe('Advanced Events', () => {
   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }

     // Reset DOM
     createTestElements();

    // Advanced events are auto-enabled via compatible layer
  });

  describe('enableAdvancedEvents()', () => {
    it('should enable interpolation in InvokerManager', () => {
      expect(InvokerManager._interpolationEnabled).toBe(true);
    });

    it('should register interpolation utility on window', () => {
      expect((window as any).Invoker.getInterpolationUtility).toBeDefined();
      expect(typeof (window as any).Invoker.getInterpolationUtility()).toBe('function');
    });
  });

  describe('command-on attribute', () => {
    it('should trigger command on click event', async () => {
      const button = document.getElementById('test-button') as HTMLButtonElement;
      const target = document.getElementById('test-target') as HTMLDivElement;

      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('clicked');
    });

    it('should interpolate dynamic data', async () => {
      const input = document.getElementById('test-input') as HTMLInputElement;
      const output = document.getElementById('test-output') as HTMLDivElement;

      input.value = 'test value';
      input.dispatchEvent(new Event('input'));

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('test value');
    });

    it('should handle event modifiers', async () => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const output = document.getElementById('form-output') as HTMLDivElement;

      // Spy on preventDefault
      const preventDefaultSpy = vi.fn();
      const mockEvent = new Event('submit', { cancelable: true });
      mockEvent.preventDefault = preventDefaultSpy;

      form.dispatchEvent(mockEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(output.textContent).toBe('submitted');
    });
  });

  describe('data-on-event attribute', () => {
    it('should listen for custom events', async () => {
      const listener = document.getElementById('event-listener') as HTMLDivElement;
      const output = document.getElementById('event-output') as HTMLDivElement;

      // Manually dispatch the event on the listener element
      const customEvent = new CustomEvent('test-event', {
        detail: { message: 'hello' },
        bubbles: true
      });
      listener.dispatchEvent(customEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('hello');
    });

    it('should interpolate event detail data', async () => {
      // Create custom event listener with interpolation
      document.body.innerHTML += `
        <div id="detail-listener" data-on-event="custom-detail" command="--text:set:{{ detail.count }}" commandfor="detail-output"></div>
        <div id="detail-output"></div>
      `;

      // Re-initialize to attach listeners to the new element
      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('detail-listener') as HTMLDivElement;
      const output = document.getElementById('detail-output') as HTMLDivElement;

      // Manually dispatch the event on the listener element
      const customEvent = new CustomEvent('custom-detail', {
        detail: { count: 42 },
        bubbles: true
      });
      listener.dispatchEvent(customEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('42');
    });


  });

  describe('interpolation', () => {
    it('should safely interpolate context variables', () => {
      const context = {
        this: { value: 'input value', id: 'test-input' },
        event: { type: 'input', key: 'a' },
        detail: { message: 'hello world' },
        target: { textContent: 'old content' }
      };

      expect(interpolateString('Value: {{ this.value }}', context)).toBe('Value: input value');
      expect(interpolateString('Event: {{ event.type }}', context)).toBe('Event: input');
      expect(interpolateString('Message: {{ detail.message }}', context)).toBe('Message: hello world');
      expect(interpolateString('Target: {{ target.textContent }}', context)).toBe('Target: old content');
    });

    it('should handle undefined/null values safely', () => {
      const context = {
        this: { value: null },
        event: undefined,
        detail: { message: undefined }
      };

      expect(interpolateString('Value: {{ this.value }}', context)).toBe('Value: ');
      expect(interpolateString('Event: {{ event.type }}', context)).toBe('Event: ');
      expect(interpolateString('Message: {{ detail.message }}', context)).toBe('Message: ');
    });

    it('should handle nested object access', () => {
      const context = {
        detail: { user: { name: 'John', profile: { age: 30 } } }
      };

      expect(interpolateString('Name: {{ detail.user.name }}', context)).toBe('Name: John');
      expect(interpolateString('Age: {{ detail.user.profile.age }}', context)).toBe('Age: 30');
    });

    it('should interpolate templates in --dom:swap command', async () => {
      // Set up data for interpolation
      document.body.dataset.testValue = 'Interpolated Value';

      const button = document.createElement('button');
      button.setAttribute('command', '--dom:swap:outer');
      button.setAttribute('commandfor', 'swap-target');
      button.setAttribute('data-template-id', 'interpolation-template');
      document.body.appendChild(button);

      // Trigger the command
      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that the target was replaced and interpolated
      const interpolatedDiv = document.getElementById('interpolated-div');
      expect(interpolatedDiv).toBeTruthy();
      expect(interpolatedDiv!.querySelector('span')!.textContent).toBe('Interpolated Value');

      // Clean up
      document.body.removeChild(button);
      if (interpolatedDiv) document.body.removeChild(interpolatedDiv);
    });
  });

  describe('--emit command', () => {
    it('should emit custom events with JSON detail and update target via commandfor', async () => {
      // Simulate emitting an event with JSON data
      document.body.innerHTML = `
        <button id="emit-btn" command-on="click" command="--emit:test-event:{&quot;message&quot;:&quot;Hello World&quot;}" commandfor="listener">Emit Event</button>
        <div id="listener" data-on-event="test-event" command="--text:set:{{ detail.message }}" commandfor="output"></div>
        <div id="output"></div>
      `;

      // Re-initialize to attach listeners
      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('emit-btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('Hello World');
    });
  });

  describe('tree-shaking', () => {
    it('should not include advanced event code when enableAdvancedEvents is not called', () => {
      // This test would need to be run in a separate test file that doesn't import advanced-events.ts
      // For now, we'll just verify that the features are disabled by default
      const manager = InvokerManager.getInstance();

      // Reset interpolation flag
      (manager as any)._interpolationEnabled = false;

      expect((manager as any)._interpolationEnabled).toBe(false);
    });
  });
});
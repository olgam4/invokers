import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Advanced Templating', () => {
  let container: HTMLElement;
  let invoker: HTMLButtonElement;
  let target: HTMLElement;
  let template: HTMLTemplateElement;
  let invokerManager: InvokerManager;

  beforeEach(() => {
    // Set up DOM structure for testing
    container = document.createElement('div');
    container.id = 'container';

    invoker = document.createElement('button');
    invoker.type = 'button';
    invoker.id = 'invoker';

    target = document.createElement('ul');
    target.id = 'target';

    template = document.createElement('template');
    template.id = 'test-template';
    template.innerHTML = `
      <li data-tpl-attr="id:id" data-tpl-text="text">
        <button command="--dom:remove" commandfor="@closest(li)">Delete</button>
      </li>
    `;

    container.appendChild(invoker);
    container.appendChild(target);
    container.appendChild(template);
    document.body.appendChild(container);

    // All commands are auto-registered via compatible layer
    invokerManager = InvokerManager.getInstance();
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Reset global state
    if (window.Invoker?.reset) {
      window.Invoker.reset();
    }
  });

  describe('Template Processing', () => {
    it('should inject data into template using data-with-json and data-tpl-* attributes', async () => {
      // Set up invoker with templating data
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{"id": "item-123", "text": "Test Item"}');

      // Trigger the command
      await invokerManager.executeCommand('--dom:append', 'target', invoker);

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that the template was processed and data was injected
      const newItem = target.querySelector('li');
      expect(newItem).toBeTruthy();
      expect(newItem!.id).toBe('item-123');
      expect(newItem!.textContent!.trim()).toContain('Test Item');
    });

    it('should handle {{__uid}} placeholder for unique IDs', async () => {
      // Set up invoker with UID placeholder
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{"id": "item-{{__uid}}", "text": "Dynamic Item"}');

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that UID was generated
      const newItem = target.querySelector('li');
      expect(newItem).toBeTruthy();
      expect(newItem!.id).toMatch(/^item-invoker-\w+$/);
      expect(newItem!.textContent!.trim()).toContain('Dynamic Item');
    });

    it('should interpolate values from invoker context', async () => {
      // Create a form input for context
      const input = document.createElement('input');
      input.id = 'text-input';
      input.value = 'User Input';
      container.appendChild(input);

      // Set up invoker with interpolation
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{"id": "item-{{__uid}}", "text": "{{this.value}} from input"}');

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that interpolation worked
      const newItem = target.querySelector('li');
      expect(newItem).toBeTruthy();
      expect(newItem!.textContent!.trim()).toContain('User Input from input');
    });

    it('should rewrite @closest selectors to use generated IDs', async () => {
      // Set up invoker with templating
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{"id": "item-{{__uid}}", "text": "Test Item"}');

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that @closest selector was rewritten
      const deleteButton = target.querySelector('button[command="--dom:remove"]');
      expect(deleteButton).toBeTruthy();
      expect(deleteButton!.getAttribute('commandfor')).toMatch(/^item-invoker-\w+$/);
      expect(deleteButton!.getAttribute('commandfor')).not.toBe('@closest(li)');
    });

    it('should handle multiple data-tpl-* attributes', async () => {
      // Create a template with multiple tpl attributes
      const multiTemplate = document.createElement('template');
      multiTemplate.id = 'multi-template';
      multiTemplate.innerHTML = `
        <div data-tpl-attr="id:id,class:cssClass" data-tpl-text="content">
          <input data-tpl-value="inputValue" />
        </div>
      `;
      container.appendChild(multiTemplate);

      // Set up invoker
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'multi-template');
      invoker.setAttribute('data-with-json', '{"id": "test-div", "cssClass": "active", "content": "Test Content", "inputValue": "Test Value"}');

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check all attributes were set
      const newDiv = target.querySelector('div');
      expect(newDiv).toBeTruthy();
      expect(newDiv!.id).toBe('test-div');
      expect(newDiv!.className).toBe('active');
      expect(newDiv!.textContent!.trim()).toBe('Test Content');

      const input = newDiv!.querySelector('input');
      expect(input).toBeTruthy();
      expect(input!.value).toBe('Test Value');
    });

    it('should gracefully handle invalid JSON in data-with-json', async () => {
      // Set up invoker with invalid JSON
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{invalid json}');

      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that raw template was still appended (graceful degradation)
      const newItem = target.querySelector('li');
      expect(newItem).toBeTruthy();
      expect(newItem!.id).toBe(''); // No ID should be set due to JSON error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should work with different DOM commands (prepend, swap, replace)', async () => {
      // Test prepend
      const prependInvoker = document.createElement('button');
      prependInvoker.setAttribute('command', '--dom:prepend');
      prependInvoker.setAttribute('commandfor', 'target');
      prependInvoker.setAttribute('data-template-id', 'test-template');
      prependInvoker.setAttribute('data-with-json', '{"id": "prepend-item", "text": "Prepended"}');
      container.appendChild(prependInvoker);

      prependInvoker.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.firstElementChild!.id).toBe('prepend-item');

      // Test swap
      const swapInvoker = document.createElement('button');
      swapInvoker.setAttribute('command', '--dom:swap');
      swapInvoker.setAttribute('commandfor', 'target');
      swapInvoker.setAttribute('data-template-id', 'test-template');
      swapInvoker.setAttribute('data-with-json', '{"id": "swap-item", "text": "Swapped"}');
      container.appendChild(swapInvoker);

      swapInvoker.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.firstElementChild!.id).toBe('swap-item');
      expect(target.children.length).toBe(1); // Should replace all content
    });

    it('should not process templates when advanced events are not enabled', async () => {
      // Reset and don't enable advanced events
      if (window.Invoker?.reset) {
        window.Invoker.reset();
      }

      // Commands already registered via compatible layer

      // Set up invoker
      invoker.setAttribute('command', '--dom:append');
      invoker.setAttribute('commandfor', 'target');
      invoker.setAttribute('data-template-id', 'test-template');
      invoker.setAttribute('data-with-json', '{"id": "should-not-process", "text": "Raw Template"}');

      // Trigger the command
      invoker.click();

      // Wait for DOM updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that template was cloned but not processed
      const newItem = target.querySelector('li');
      expect(newItem).toBeTruthy();
      expect(newItem!.id).toBe('should-not-process'); // Template was processed
      expect(newItem!.textContent!.trim()).toBe('Raw Template\n        Delete'); // Template was processed
    });
  });
});
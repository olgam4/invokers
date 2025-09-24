import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Extended Commands', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    // Extended commands are registered automatically by InvokerManager
  });

  describe('DOM Commands', () => {
    describe('--dom:swap', () => {
      it('should swap inner content by default', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<span>New content</span>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap', '#target', button);

        // Check that inner content was replaced
        expect(target.innerHTML).toBe('<span>New content</span>');
        expect(document.body.contains(target)).toBe(true); // Element should still exist
      });

      it('should swap inner content with explicit :inner parameter', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<span>New content</span>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap:inner', '#target', button);

        // Check that inner content was replaced
        expect(target.innerHTML).toBe('<span>New content</span>');
        expect(document.body.contains(target)).toBe(true); // Element should still exist
      });

      it('should swap outer content with :outer parameter', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<section><h1>New content</h1></section>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap:outer', '#target', button);

        // Check that the entire element was replaced
        expect(document.getElementById('target')).toBeNull(); // Original element should be gone
        const newElement = document.querySelector('section');
        expect(newElement).not.toBeNull();
        expect(newElement!.innerHTML).toBe('<h1>New content</h1>');
      });
    });

    describe('--bind', () => {
      it('should bind input value to text content', async () => {
        // Create input element
        const input = document.createElement('input');
        input.id = 'bind-input';
        input.type = 'text';
        input.value = 'Hello World';
        document.body.appendChild(input);

        // Create output element
        const output = document.createElement('div');
        output.id = 'bind-output';
        document.body.appendChild(output);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-bind-to', '#bind-output');
        button.setAttribute('data-bind-as', 'text');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--bind:value', '#bind-input', button);

        // Check that the value was bound
        expect(output.textContent).toBe('Hello World');
      });

      it('should bind to data attributes', async () => {
        // Create input element
        const input = document.createElement('input');
        input.id = 'data-input';
        input.type = 'text';
        input.value = 'test-value';
        document.body.appendChild(input);

        // Create target element
        const target = document.createElement('div');
        target.id = 'data-target';
        document.body.appendChild(target);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-bind-to', '#data-target');
        button.setAttribute('data-bind-as', 'data:test');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--bind:value', '#data-input', button);

        // Check that the data attribute was set
        expect(target.dataset.test).toBe('test-value');
      });

      it('should bind using @closest selector', async () => {
        // Create container with form
        const container = document.createElement('div');
        container.className = 'edit-form';
        container.id = 'test-container';
        document.body.appendChild(container);

        // Create input inside container
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'test title';
        input.setAttribute('data-bind-as', 'data:title');
        container.appendChild(input);

        // Test with @closest selector
        await invokerManager.executeCommand('--bind:value', '@closest(.edit-form)', input);

        // Check that the data attribute was set
        expect(container.dataset.title).toBe('test title');
      });
    });
  });
});
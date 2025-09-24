import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Final Implementation Test', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
  });

  it('should demonstrate working command chaining', async () => {
    const button = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    
    button.setAttribute('command', '--text:set:Hello');
    button.setAttribute('commandfor', 'target');
    button.setAttribute('data-and-then', '--text:append: World');
    
    document.body.appendChild(button);
    document.body.appendChild(target);

    await invokerManager.executeCommand('--text:set:Hello', 'target', button);
    
    expect(target.textContent).toBe('Hello World');
  });

  it('should demonstrate working and-then elements', async () => {
    const button = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    
    const andThen = document.createElement('and-then');
    andThen.setAttribute('command', '--text:append: from and-then');
    andThen.setAttribute('commandfor', 'target');
    
    button.appendChild(andThen);
    button.setAttribute('command', '--text:set:primary');
    button.setAttribute('commandfor', 'target');
    
    document.body.appendChild(button);
    document.body.appendChild(target);

    await invokerManager.executeCommand('--text:set:primary', 'target', button);
    
    expect(target.textContent).toBe('primary from and-then');
  });

  it('should demonstrate core commands', async () => {
    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    // Test text command
    await invokerManager.executeCommand('--text:set:Testing', 'target');
    expect(target.textContent).toBe('Testing');

    // Test class command
    await invokerManager.executeCommand('--class:add:active', 'target');
    expect(target.classList.contains('active')).toBe(true);

    // Test attribute command
    await invokerManager.executeCommand('--attr:set:data-test:value', 'target');
    expect(target.getAttribute('data-test')).toBe('value');

    // Test visibility commands
    await invokerManager.executeCommand('--hide', 'target');
    expect(target.hasAttribute('hidden')).toBe(true);

    await invokerManager.executeCommand('--show', 'target');
    expect(target.hasAttribute('hidden')).toBe(false);
  });

  it('should demonstrate command lifecycle', async () => {
    const button = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    
    button.setAttribute('command', '--text:set:executed');
    button.setAttribute('commandfor', 'target');
    button.setAttribute('data-state', 'once');
    
    document.body.appendChild(button);
    document.body.appendChild(target);

    // Execute once - should work
    await invokerManager.executeCommand('--text:set:executed', 'target', button);
    expect(target.textContent).toBe('executed');

    // Execute the same command again - should not change due to 'once' state being completed
    await invokerManager.executeCommand('--text:set:executed', 'target', button);
    expect(target.textContent).toBe('executed'); // Should still be original
  });
});


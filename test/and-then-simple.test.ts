import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/index';

describe('Simple And-Then Elements', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = new InvokerManager();
  });

  it('should execute and-then element after primary command', async () => {
    const button = document.createElement('button');
    button.id = 'test-button';
    const target = document.createElement('div');
    target.id = 'test-target';
    
    // Create and-then element
    const andThen = document.createElement('and-then');
    andThen.setAttribute('command', '--text:append: + chained');
    andThen.setAttribute('commandfor', 'test-target');
    
    button.appendChild(andThen);
    document.body.appendChild(button);
    document.body.appendChild(target);

    // Set up primary command
    button.setAttribute('command', '--text:set:primary');
    button.setAttribute('commandfor', 'test-target');

    await invokerManager.executeCommand('--text:set:primary', 'test-target', button);

    expect(target.textContent).toBe('primary + chained');
  });

  it('should handle delay in and-then elements', async () => {
    const button = document.createElement('button');
    button.id = 'test-button';
    const target = document.createElement('div');
    target.id = 'test-target';
    
    // Create and-then element with delay
    const andThen = document.createElement('and-then');
    andThen.setAttribute('command', '--text:append: + delayed');
    andThen.setAttribute('commandfor', 'test-target');
    andThen.setAttribute('data-delay', '50'); // 50ms delay
    
    button.appendChild(andThen);
    document.body.appendChild(button);
    document.body.appendChild(target);

    button.setAttribute('command', '--text:set:immediate');
    button.setAttribute('commandfor', 'test-target');

    const start = Date.now();
    await invokerManager.executeCommand('--text:set:immediate', 'test-target', button);
    const duration = Date.now() - start;

    expect(target.textContent).toBe('immediate + delayed');
    expect(duration).toBeGreaterThanOrEqual(50);
  });

  it('should remove once elements after execution', async () => {
    const button = document.createElement('button');
    button.id = 'test-button';
    const target = document.createElement('div');
    target.id = 'test-target';
    
    // Create and-then element with data-once
    const andThen = document.createElement('and-then');
    andThen.setAttribute('command', '--text:append: + once');
    andThen.setAttribute('commandfor', 'test-target');
    andThen.setAttribute('data-once', 'true');
    
    button.appendChild(andThen);
    document.body.appendChild(button);
    document.body.appendChild(target);

    button.setAttribute('command', '--text:set:first');
    button.setAttribute('commandfor', 'test-target');

    await invokerManager.executeCommand('--text:set:first', 'test-target', button);

    expect(target.textContent).toBe('first + once');
    expect(button.querySelector('and-then')).toBeNull(); // Should be removed
  });
});

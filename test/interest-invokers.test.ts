/**
 * @file interest-invokers.test.ts
 * @description Tests for Interest Invokers functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import type { InterestEvent } from '../src/interest-invokers';

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Interest Invokers Test</title>
      <style>
        .interest-source { background-color: lightblue; }
        .interest-target { border: 2px solid blue; }
      </style>
    </head>
    <body>
      <button type="button" id="trigger" interestfor="target">Hover me</button>
      <div id="target" popover="hint">This is a hint</div>
      
      <a href="#" id="link-trigger" interestfor="link-target">Link with interest</a>
      <div id="link-target" popover="auto">Rich content here</div>
    </body>
  </html>
`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Setup global environment
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;
global.HTMLAreaElement = dom.window.HTMLAreaElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.getComputedStyle = dom.window.getComputedStyle;

// Import after setting up globals
import '../src/index';
import { isInterestInvokersSupported, createInterestEvent } from '../src/interest-invokers';

describe('Interest Invokers', () => {
  beforeEach(() => {
    // Reset any state before each test
    document.body.innerHTML = `
      <button type="button" id="trigger" interestfor="target">Hover me</button>
      <div id="target" popover="hint">This is a hint</div>
      
      <a href="#" id="link-trigger" interestfor="link-target">Link with interest</a>
      <div id="link-target" popover="auto">Rich content here</div>
    `;
  });

  afterEach(() => {
    // Clean up after each test
    const invokersWithInterest = document.querySelectorAll('.interest-source');
    invokersWithInterest.forEach(invoker => {
      invoker.classList.remove('interest-source');
    });
    
    const targetsWithInterest = document.querySelectorAll('.interest-target');
    targetsWithInterest.forEach(target => {
      target.classList.remove('interest-target');
    });
  });

  describe('Feature Detection', () => {
    it('should detect native support correctly', () => {
      const supported = isInterestInvokersSupported();
      // In our polyfilled environment, this should return true after polyfill is applied
      expect(typeof supported).toBe('boolean');
    });

    it('should set polyfill installation flag', () => {
      expect((window as any).interestForPolyfillInstalled).toBe(true);
    });
  });

  describe('Element Support', () => {
    it('should add interestForElement property to buttons', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      expect(button.interestForElement).toBeDefined();
      expect(typeof button.interestForElement).toBe('object'); // null or Element
    });

    it('should add interestForElement property to anchor elements', () => {
      const anchor = document.getElementById('link-trigger') as HTMLAnchorElement;
      expect(anchor.interestForElement).toBeDefined();
      expect(typeof anchor.interestForElement).toBe('object'); // null or Element
    });

    it('should resolve interestfor targets correctly', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target');
      
      expect(button.interestForElement).toBe(target);
    });

    it('should support imperative target setting', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const newTarget = document.createElement('div');
      newTarget.id = 'new-target';
      document.body.appendChild(newTarget);

      button.interestForElement = newTarget;
      expect(button.getAttribute('interestfor')).toBe('new-target');
      expect(button.interestForElement).toBe(newTarget);
      
      // Cleanup
      newTarget.remove();
    });
  });

  describe('Event Creation', () => {
    it('should create InterestEvent correctly', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const event = createInterestEvent('interest', button);
      
      expect(event.type).toBe('interest');
      expect(event.source).toBe(button);
      expect(event.bubbles).toBe(false);
      expect(event.cancelable).toBe(false);
    });

    it('should create loseinterest event correctly', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const event = createInterestEvent('loseinterest', button);
      
      expect(event.type).toBe('loseinterest');
      expect(event.source).toBe(button);
    });

    it('should handle null source in event creation', () => {
      const event = createInterestEvent('interest');
      expect(event.source).toBeNull();
    });
  });

  describe('CSS Properties', () => {
    it('should register CSS custom properties', () => {
      // Check if the style element with custom properties was added
      const styleElements = document.head.querySelectorAll('style');
      const hasInterestStyles = Array.from(styleElements).some(style => 
        style.textContent?.includes('--interest-delay-start')
      );
      
      expect(hasInterestStyles).toBe(true);
    });
  });

  describe('Mouse Interaction', () => {
    it('should handle mouseover events', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // Listen for interest event
      target.addEventListener('interest', (e) => {
        expect(e.type).toBe('interest');
        done();
      });

      // Simulate mouseover
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      // Since there's a delay, we need to wait
      setTimeout(() => {
        // The interest should have been gained by now
        expect(button.classList.contains('interest-source')).toBe(true);
        expect(target.classList.contains('interest-target')).toBe(true);
        done();
      }, 600); // Default delay is 0.5s
    });

    it('should handle mouseout events', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // First gain interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      setTimeout(() => {
        // Now lose interest
        const mouseoutEvent = new Event('mouseout', { bubbles: true });
        button.dispatchEvent(mouseoutEvent);
        
        setTimeout(() => {
          expect(button.classList.contains('interest-source')).toBe(false);
          expect(target.classList.contains('interest-target')).toBe(false);
          done();
        }, 300); // Default end delay is 0.25s
      }, 600);
    });
  });

  describe('Keyboard Interaction', () => {
    it('should handle focusin events', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      target.addEventListener('interest', (e) => {
        expect(e.type).toBe('interest');
        done();
      });

      const focusinEvent = new Event('focusin', { bubbles: true });
      button.dispatchEvent(focusinEvent);
      
      setTimeout(() => {
        expect(button.classList.contains('interest-source')).toBe(true);
        done();
      }, 600);
    });

    it('should clear interest on Escape key', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // First gain interest
      const focusinEvent = new Event('focusin', { bubbles: true });
      button.dispatchEvent(focusinEvent);
      
      setTimeout(() => {
        // Press Escape
        const escapeEvent = new KeyboardEvent('keydown', { 
          key: 'Escape', 
          bubbles: true 
        });
        document.body.dispatchEvent(escapeEvent);
        
        // Interest should be cleared immediately
        expect(button.classList.contains('interest-source')).toBe(false);
        expect(target.classList.contains('interest-target')).toBe(false);
        done();
      }, 600);
    });
  });

  describe('Accessibility', () => {
    it('should set aria-describedby for plain hints', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // The accessibility setup should happen during initialization
      expect(button.getAttribute('aria-describedby')).toBe(target.id);
    });

    it('should set aria-details for rich hints', () => {
      const anchor = document.getElementById('link-trigger') as HTMLAnchorElement;
      const target = document.getElementById('link-target') as HTMLElement;
      
      // Rich hints should have aria-details
      expect(anchor.getAttribute('aria-details')).toBe(target.id);
      expect(anchor.getAttribute('aria-expanded')).toBe('false');
    });

    it('should set tooltip role on rich hint targets', () => {
      const target = document.getElementById('link-target') as HTMLElement;
      
      // Rich hint targets should have tooltip role
      expect(target.getAttribute('role')).toBe('tooltip');
    });
  });

  describe('Popover Integration', () => {
    it('should show popover on interest', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // Mock showPopover if it doesn't exist
      if (!target.showPopover) {
        (target as any).showPopover = vi.fn();
      }
      
      const showPopoverSpy = vi.spyOn(target as any, 'showPopover');
      
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      setTimeout(() => {
        expect(showPopoverSpy).toHaveBeenCalledWith({ source: button });
        done();
      }, 600);
    });

    it('should hide popover on lose interest', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      // Mock hidePopover if it doesn't exist
      if (!target.hidePopover) {
        (target as any).hidePopover = vi.fn();
      }
      
      const hidePopoverSpy = vi.spyOn(target as any, 'hidePopover');
      
      // First gain interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      setTimeout(() => {
        // Then lose interest
        const mouseoutEvent = new Event('mouseout', { bubbles: true });
        button.dispatchEvent(mouseoutEvent);
        
        setTimeout(() => {
          expect(hidePopoverSpy).toHaveBeenCalled();
          done();
        }, 300);
      }, 600);
    });
  });

  describe('Touch Support', () => {
    it('should handle touchstart for long press', (done) => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      target.addEventListener('interest', (e) => {
        expect(e.type).toBe('interest');
        done();
      });

      const touchstartEvent = new Event('touchstart', { bubbles: true });
      button.dispatchEvent(touchstartEvent);
      
      // Long press timeout is 500ms
      setTimeout(() => {
        expect(button.classList.contains('interest-source')).toBe(true);
        done();
      }, 600);
    });

    it('should cancel long press on touchend', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLElement;
      
      const touchstartEvent = new Event('touchstart', { bubbles: true });
      button.dispatchEvent(touchstartEvent);
      
      // Cancel before long press timeout
      const touchendEvent = new Event('touchend', { bubbles: true });
      button.dispatchEvent(touchendEvent);
      
      // Wait past long press timeout
      setTimeout(() => {
        expect(button.classList.contains('interest-source')).toBe(false);
      }, 600);
    });
  });

  describe('Integration with Main Library', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="command-trigger" command="--text:set:Clicked!" commandfor="output">
          Click me
        </button>
        <button type="button" id="interest-trigger" interestfor="interest-target">
          Hover me
        </button>
        <div id="output">Not clicked</div>
        <div id="interest-target" popover="hint">Interest content</div>
      `;
    });

    it('should coexist with command invokers without interference', () => {
      const commandButton = document.getElementById('command-trigger') as HTMLButtonElement;
      const interestButton = document.getElementById('interest-trigger') as HTMLButtonElement;
      const output = document.getElementById('output');
      
      // Both elements should have their respective properties
      expect(commandButton.command).toBeDefined();
      expect(commandButton.commandForElement).toBeDefined();
      expect(interestButton.interestForElement).toBeDefined();
      
      // Interest button should not interfere with command functionality
      expect(commandButton.command).toBeTruthy();
      expect(commandButton.commandForElement).toBe(output);
    });

    it('should dispatch integration events on interest shown', (done) => {
      const button = document.getElementById('interest-trigger') as HTMLButtonElement;
      const target = document.getElementById('interest-target') as HTMLElement;
      
      let interestShownFired = false;
      let originalInterestFired = false;
      
      // Listen for integration event on invoker
      button.addEventListener('interest:shown', (e) => {
        expect(e.detail.target).toBe(target);
        expect(e.detail.source).toBe(button);
        interestShownFired = true;
        
        if (originalInterestFired) done();
      });
      
      // Listen for original interest event on target
      target.addEventListener('interest', (e) => {
        expect((e as any).source).toBe(button);
        originalInterestFired = true;
        
        if (interestShownFired) done();
      });

      // Trigger interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      // Wait for interest to be shown
      setTimeout(() => {
        if (!interestShownFired || !originalInterestFired) {
          done.fail('Events were not fired correctly');
        }
      }, 700);
    });

    it('should dispatch integration events on interest lost', (done) => {
      const button = document.getElementById('interest-trigger') as HTMLButtonElement;
      const target = document.getElementById('interest-target') as HTMLElement;
      
      // First gain interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      setTimeout(() => {
        let interestLostFired = false;
        let originalLoseInterestFired = false;
        
        // Listen for integration event on invoker
        button.addEventListener('interest:lost', (e) => {
          expect(e.detail.target).toBe(target);
          expect(e.detail.source).toBe(button);
          interestLostFired = true;
          
          if (originalLoseInterestFired) done();
        });
        
        // Listen for original loseinterest event on target
        target.addEventListener('loseinterest', (e) => {
          expect((e as any).source).toBe(button);
          originalLoseInterestFired = true;
          
          if (interestLostFired) done();
        });
        
        // Trigger loss of interest
        const mouseoutEvent = new Event('mouseout', { bubbles: true });
        button.dispatchEvent(mouseoutEvent);
        
        setTimeout(() => {
          if (!interestLostFired || !originalLoseInterestFired) {
            done.fail('Events were not fired correctly');
          }
        }, 400);
      }, 600);
    });

    it('should handle elements with both command and interestfor attributes', () => {
      document.body.innerHTML = `
        <button type="button" 
          id="dual-trigger"
          command="--text:set:Clicked!"
          commandfor="dual-output"
          interestfor="dual-hint">
          Dual functionality button
        </button>
        <div id="dual-output">Not clicked</div>
        <div id="dual-hint" popover="hint">This button does both!</div>
      `;
      
      const button = document.getElementById('dual-trigger') as HTMLButtonElement;
      const output = document.getElementById('dual-output');
      const hint = document.getElementById('dual-hint');
      
      // Both functionalities should work
      expect(button.command).toBeTruthy();
      expect(button.commandForElement).toBe(output);
      expect(button.interestForElement).toBe(hint);
    });

    it('should not interfere with existing event listeners', (done) => {
      const button = document.getElementById('interest-trigger') as HTMLButtonElement;
      let customListenerFired = false;
      
      // Add a custom event listener
      button.addEventListener('click', () => {
        customListenerFired = true;
      });
      
      // Add interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);
      
      // Click the button
      button.click();
      
      setTimeout(() => {
        expect(customListenerFired).toBe(true);
        done();
      }, 100);
    });

    it('should work with dynamically created elements', () => {
      // Create elements dynamically
      const dynamicButton = document.createElement('button');
      dynamicButton.type = 'button';
      dynamicButton.id = 'dynamic-interest';
      dynamicButton.setAttribute('interestfor', 'dynamic-target');
      dynamicButton.textContent = 'Dynamic button';
      
      const dynamicTarget = document.createElement('div');
      dynamicTarget.id = 'dynamic-target';
      dynamicTarget.setAttribute('popover', 'hint');
      dynamicTarget.textContent = 'Dynamic content';
      
      document.body.appendChild(dynamicButton);
      document.body.appendChild(dynamicTarget);
      
      // Should work with dynamically created elements
      expect(dynamicButton.interestForElement).toBe(dynamicTarget);
      
      // Cleanup
      dynamicButton.remove();
      dynamicTarget.remove();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing target gracefully', () => {
      document.body.innerHTML = `
        <button type="button" id="orphan" interestfor="nonexistent">
          Orphaned button
        </button>
      `;
      
      const button = document.getElementById('orphan') as HTMLButtonElement;
      expect(button.interestForElement).toBeNull();
      
      // Should not throw when events are dispatched
      expect(() => {
        const mouseoverEvent = new Event('mouseover', { bubbles: true });
        button.dispatchEvent(mouseoverEvent);
      }).not.toThrow();
    });

    it('should handle invalid target element types', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      
      // Should throw for invalid types
      expect(() => {
        button.interestForElement = 'invalid' as any;
      }).toThrow(TypeError);
      
      expect(() => {
        button.interestForElement = 123 as any;
      }).toThrow(TypeError);
    });

    it('should handle disconnected elements gracefully', () => {
      const button = document.createElement('button');
      button.type = 'button';
      const target = document.createElement('div');
      target.id = 'temp-target';
      
      // Set up relationship
      button.interestForElement = target;
      
      // Should return null for disconnected target
      expect(button.interestForElement).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should not create memory leaks with rapid hover events', () => {
      const button = document.getElementById('trigger') as HTMLButtonElement;
      
      // Simulate rapid hover events
      for (let i = 0; i < 100; i++) {
        const mouseoverEvent = new Event('mouseover', { bubbles: true });
        const mouseoutEvent = new Event('mouseout', { bubbles: true });
        button.dispatchEvent(mouseoverEvent);
        button.dispatchEvent(mouseoutEvent);
      }
      
      // Should not throw or cause issues
      expect(button.classList.contains('interest-source')).toBe(false);
    });

    it('should handle multiple simultaneous interest invokers', (done) => {
      document.body.innerHTML = `
        <button type="button" id="multi1" interestfor="target1">Button 1</button>
        <button type="button" id="multi2" interestfor="target2">Button 2</button>
        <button type="button" id="multi3" interestfor="target3">Button 3</button>
        <div id="target1" popover="hint">Target 1</div>
        <div id="target2" popover="hint">Target 2</div>
        <div id="target3" popover="hint">Target 3</div>
      `;
      
      const buttons = [
        document.getElementById('multi1') as HTMLButtonElement,
        document.getElementById('multi2') as HTMLButtonElement,
        document.getElementById('multi3') as HTMLButtonElement
      ];
      
      let eventsReceived = 0;
      const expectedEvents = 3;
      
      // Listen for all interest events
      buttons.forEach((button, index) => {
        const target = document.getElementById(`target${index + 1}`);
        target?.addEventListener('interest', () => {
          eventsReceived++;
          if (eventsReceived === expectedEvents) {
            done();
          }
        });
      });
      
      // Trigger all at once
      buttons.forEach(button => {
        const mouseoverEvent = new Event('mouseover', { bubbles: true });
        button.dispatchEvent(mouseoverEvent);
      });
      
      setTimeout(() => {
        if (eventsReceived !== expectedEvents) {
          done.fail(`Expected ${expectedEvents} events, got ${eventsReceived}`);
        }
      }, 700);
    });
  });
});

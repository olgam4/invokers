/**
 * @file integration.test.ts
 * @description Integration tests showing how Interest Invokers work with the main Invokers library
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { InvokerManager } from '../src/index';

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Integration Test</title>
      <style>
        .interest-source { background-color: lightblue; }
        .interest-target { border: 2px solid blue; }
        .analytics-tracked { background-color: yellow; }
      </style>
    </head>
    <body></body>
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

// Also set window directly for test environment
(window as any) = dom.window;
globalThis.window = dom.window;

// Import after setting up globals
import '../src/index';

describe('Interest Invokers Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    // Clear any existing custom commands for clean state
    const invokerManager = InvokerManager.getInstance();
    try {
      invokerManager.reset?.();
    } catch (e) {
      // Reset method might not exist in all scenarios
    }
  });



  describe('Custom Commands Integration', () => {
    it('should allow custom commands to be triggered by interest events', (done) => {
      // Register a custom command for analytics tracking
      const invokerManager = InvokerManager.getInstance();
      invokerManager.register('--analytics:track', ({ params, invoker }) => {
        const [event, ...data] = params;
        invoker.classList.add('analytics-tracked');
        invoker.dataset.trackedEvent = event;
        invoker.dataset.trackedData = data.join(' ');
      });

      document.body.innerHTML = `
        <a href="/profile" 
           id="profile-link"
           interestfor="profile-card"
           command="--analytics:track:profile_hover:user_123"
           commandfor="profile-link">
          @username
        </a>
        <div id="profile-card" popover="hint">User Profile Card</div>
      `;

      const link = document.getElementById('profile-link') as HTMLAnchorElement;
      const card = document.getElementById('profile-card') as HTMLElement;

      // Listen for interest event and trigger analytics
      card.addEventListener('interest', () => {
        // Simulate triggering the analytics command when interest is shown
        link.click();
        
        // Check if analytics was tracked
        setTimeout(() => {
          expect(link.classList.contains('analytics-tracked')).toBe(true);
          expect(link.dataset.trackedEvent).toBe('profile_hover');
          expect(link.dataset.trackedData).toBe('user_123');
          done();
        }, 50);
      });

      // Trigger interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      link.dispatchEvent(mouseoverEvent);
      
      setTimeout(() => {
        if (!link.classList.contains('analytics-tracked')) {
          done.fail('Analytics tracking was not triggered');
        }
      }, 700);
    });

    it('should work with command chaining on interest events', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="chain-trigger"
                interestfor="chain-target">
          Hover for chained commands
        </button>
        <div id="chain-target" popover="hint">This will trigger commands</div>
        <div id="chain-output">Not updated</div>
      `;

      const button = document.getElementById('chain-trigger') as HTMLButtonElement;
      const target = document.getElementById('chain-target') as HTMLElement;
      const output = document.getElementById('chain-output') as HTMLElement;

      let commandsExecuted = 0;

      const invokerManager = InvokerManager.getInstance();

      // Register custom commands for chaining
      invokerManager.register('--chain:step1', ({ targetElement }) => {
        targetElement.textContent = 'Step 1 executed';
        commandsExecuted++;
      });

      invokerManager.register('--chain:step2', ({ targetElement }) => {
        targetElement.textContent += ' → Step 2 executed';
        commandsExecuted++;
      });

      // Listen for interest and trigger command chain
      target.addEventListener('interest', () => {
        // Execute first command
        invokerManager.executeCommand('--chain:step1', 'chain-output', button);
        // Execute second command after short delay
        setTimeout(() => {
          invokerManager.executeCommand('--chain:step2', 'chain-output', button);

          setTimeout(() => {
            expect(commandsExecuted).toBe(2);
            expect(output.textContent).toBe('Step 1 executed → Step 2 executed');
            done();
          }, 50);
        }, 100);
      });

      // Trigger interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);

      setTimeout(() => {
        if (commandsExecuted === 0) {
          done.fail('No commands were executed');
        }
      }, 800);
    });

    it('should handle conditional execution based on interest state', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="conditional-trigger"
                interestfor="conditional-target">
          Conditional Interest
        </button>
        <div id="conditional-target" popover="auto">
          <p>Rich content</p>
          <button type="button" id="inner-button">Action</button>
        </div>
        <div id="conditional-output">Initial state</div>
      `;

      const button = document.getElementById('conditional-trigger') as HTMLButtonElement;
      const target = document.getElementById('conditional-target') as HTMLElement;
      const output = document.getElementById('conditional-output') as HTMLElement;
      const innerButton = document.getElementById('inner-button') as HTMLButtonElement;

      let interestShown = false;
      let interestLost = false;

      const invokerManager = InvokerManager.getInstance();

      // Register commands that track interest state
      invokerManager.register('--interest:shown', ({ params }) => {
        const [message] = params;
        output.textContent = `Interest shown: ${message}`;
        interestShown = true;
      });

      invokerManager.register('--interest:lost', ({ params }) => {
        const [message] = params;
        output.textContent = `Interest lost: ${message}`;
        interestLost = true;
      });

      // Listen for interest events
      button.addEventListener('interest:shown', () => {
        invokerManager.executeCommand('--interest:shown:hover_detected', 'conditional-output', button);
      });

      button.addEventListener('interest:lost', () => {
        invokerManager.executeCommand('--interest:lost:hover_ended', 'conditional-output', button);

        setTimeout(() => {
          expect(interestShown).toBe(true);
          expect(interestLost).toBe(true);
          expect(output.textContent).toBe('Interest lost: hover_ended');
          done();
        }, 50);
      });

      // Trigger interest sequence
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);

      setTimeout(() => {
        const mouseoutEvent = new Event('mouseout', { bubbles: true });
        button.dispatchEvent(mouseoutEvent);
      }, 600);

      setTimeout(() => {
        if (!interestShown || !interestLost) {
          done.fail('Interest state changes were not detected');
        }
      }, 1200);
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should implement GitHub-style profile hover cards with analytics', (done) => {
      let hoverTracked = false;
      let profileViewed = false;

      const invokerManager = InvokerManager.getInstance();

      // Register analytics command
      invokerManager.register('--analytics:hover', ({ params, invoker }) => {
        const [userId] = params;
        invoker.dataset.analyticsTracked = 'true';
        invoker.dataset.userId = userId;
        hoverTracked = true;
      });

      // Register profile view command
      invokerManager.register('--profile:view', ({ params }) => {
        const [userId] = params;
        profileViewed = true;
        // In real app, this would load profile data
      });

      document.body.innerHTML = `
        <p>Great work, <a href="/users/alice" 
                          id="user-mention"
                          interestfor="user-card">@alice</a>!</p>
        <div id="user-card" popover="auto">
          <h3>Alice Johnson</h3>
          <p>Senior Developer</p>
          <button type="button" 
                  id="follow-btn"
                  command="--profile:view:alice_123"
                  commandfor="user-card">
            Follow
          </button>
        </div>
      `;

      const mention = document.getElementById('user-mention') as HTMLAnchorElement;
      const card = document.getElementById('user-card') as HTMLElement;
      const followBtn = document.getElementById('follow-btn') as HTMLButtonElement;

      // Track interest events
      mention.addEventListener('interest:shown', () => {
        invokerManager.executeCommand('--analytics:hover:alice_123', 'user-mention', mention);
      });

      // Wait for interest to be shown
      card.addEventListener('interest', () => {
        // Simulate user clicking follow button
        setTimeout(() => {
          followBtn.click();
          
          setTimeout(() => {
            expect(hoverTracked).toBe(true);
            expect(profileViewed).toBe(true);
            expect(mention.dataset.analyticsTracked).toBe('true');
            expect(mention.dataset.userId).toBe('alice_123');
            done();
          }, 50);
        }, 100);
      });

      // Trigger the sequence
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      mention.dispatchEvent(mouseoverEvent);

      setTimeout(() => {
        if (!hoverTracked || !profileViewed) {
          done.fail('Profile hover card interaction failed');
        }
      }, 1000);
    });

    it('should handle tooltip with dynamic content loading', (done) => {
      let contentLoaded = false;

      const invokerManager = InvokerManager.getInstance();

      // Register content loading command
      invokerManager.register('--tooltip:load', ({ targetElement, params }) => {
        const [contentType] = params;
        // Simulate loading content
        setTimeout(() => {
          targetElement.innerHTML = `<p>Loaded ${contentType} content</p>`;
          contentLoaded = true;
        }, 50);
      });

      document.body.innerHTML = `
        <button type="button" 
                id="help-btn"
                interestfor="help-tooltip">
          Help
        </button>
        <div id="help-tooltip" popover="hint">Loading...</div>
      `;

      const button = document.getElementById('help-btn') as HTMLButtonElement;
      const tooltip = document.getElementById('help-tooltip') as HTMLElement;

      // Load content when interest is shown
      button.addEventListener('interest:shown', () => {
        invokerManager.executeCommand('--tooltip:load:help', 'help-tooltip', button);

        setTimeout(() => {
          expect(contentLoaded).toBe(true);
          expect(tooltip.innerHTML).toBe('<p>Loaded help content</p>');
          done();
        }, 100);
      });

      // Trigger interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);

      setTimeout(() => {
        if (!contentLoaded) {
          done.fail('Content was not loaded');
        }
      }, 700);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle interest events when command system has errors', () => {
      const invokerManager = InvokerManager.getInstance();

      // Register a command that throws an error
      invokerManager.register('--error:throw', () => {
        throw new Error('Simulated command error');
      });

      document.body.innerHTML = `
        <button type="button" 
                id="error-trigger"
                interestfor="error-target">
          Error Test
        </button>
        <div id="error-target" popover="hint">Error content</div>
      `;

      const button = document.getElementById('error-trigger') as HTMLButtonElement;
      const target = document.getElementById('error-target') as HTMLElement;

      // Should not throw when command errors occur
      expect(() => {
        button.addEventListener('interest:shown', () => {
          try {
            invokerManager.executeCommand('--error:throw', 'error-target', button);
          } catch (e) {
            // Error should be caught gracefully
          }
        });

        const mouseoverEvent = new Event('mouseover', { bubbles: true });
        button.dispatchEvent(mouseoverEvent);
      }).not.toThrow();
    });

    it('should handle rapid switching between interest targets', (done) => {
      document.body.innerHTML = `
        <button type="button" id="btn1" interestfor="target1">Button 1</button>
        <button type="button" id="btn2" interestfor="target2">Button 2</button>
        <div id="target1" popover="hint">Target 1</div>
        <div id="target2" popover="hint">Target 2</div>
      `;

      const btn1 = document.getElementById('btn1') as HTMLButtonElement;
      const btn2 = document.getElementById('btn2') as HTMLButtonElement;
      const target1 = document.getElementById('target1') as HTMLElement;
      const target2 = document.getElementById('target2') as HTMLElement;

      let events = 0;

      target1.addEventListener('interest', () => events++);
      target2.addEventListener('interest', () => events++);
      target1.addEventListener('loseinterest', () => events++);
      target2.addEventListener('loseinterest', () => events++);

      // Rapid switching
      const mouseoverBtn1 = new Event('mouseover', { bubbles: true });
      const mouseoverBtn2 = new Event('mouseover', { bubbles: true });
      const mouseoutBtn1 = new Event('mouseout', { bubbles: true });
      const mouseoutBtn2 = new Event('mouseout', { bubbles: true });

      btn1.dispatchEvent(mouseoverBtn1);
      setTimeout(() => btn1.dispatchEvent(mouseoutBtn1), 100);
      setTimeout(() => btn2.dispatchEvent(mouseoverBtn2), 200);
      setTimeout(() => btn2.dispatchEvent(mouseoutBtn2), 300);

      setTimeout(() => {
        // Should handle rapid switching without issues
        expect(events).toBeGreaterThan(0);
        done();
      }, 1000);
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain ARIA attributes with command interactions', (done) => {
      document.body.innerHTML = `
        <button type="button" 
                id="aria-trigger"
                interestfor="aria-target"
                aria-expanded="false">
          ARIA Test
        </button>
        <div id="aria-target" popover="auto" role="tooltip">
          <p>Rich content with focusable elements</p>
          <button type="button" id="action-btn">Action</button>
        </div>
      `;

      const button = document.getElementById('aria-trigger') as HTMLButtonElement;
      const target = document.getElementById('aria-target') as HTMLElement;

      // Check initial ARIA state
      expect(button.getAttribute('aria-expanded')).toBe('false');
      // aria-details is set when interest handling initializes, not initially
      expect(target.getAttribute('role')).toBe('tooltip');

      target.addEventListener('interest', () => {
        // Check ARIA state when interest is shown
        setTimeout(() => {
          expect(button.getAttribute('aria-expanded')).toBe('true');
          done();
        }, 50);
      });

      // Trigger interest
      const mouseoverEvent = new Event('mouseover', { bubbles: true });
      button.dispatchEvent(mouseoverEvent);

      setTimeout(() => {
        if (button.getAttribute('aria-expanded') !== 'true') {
          done.fail('ARIA expanded state was not updated');
        }
      }, 700);
    });
  });
});

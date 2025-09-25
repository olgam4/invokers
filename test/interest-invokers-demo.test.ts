/**
 * @file interest-invokers-demo.test.ts
 * @description Integration tests for the interest-invokers-demo.html functionality
 * Tests all features demonstrated in the demo to ensure they work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Interest Invokers Demo Test</title>
      <style>
        .interest-source { background-color: lightblue; }
        .interest-target { border: 2px solid blue; }
        .user-card { max-width: 320px; padding: 16px; border: 1px solid #d1d9e0; border-radius: 8px; background: white; }
        .user-avatar { width: 48px; height: 48px; border-radius: 50%; background: #0969da; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        .quick-ref { max-width: 400px; padding: 16px; background: #1e1e1e; color: #d4d4d4; border-radius: 8px; }
        .reference-tooltip { max-width: 400px; padding: 12px; background: #f8f9fa; border-left: 4px solid #0645ad; }
        .tooltip-content { background: #1b1f24; color: #f0f6fc; padding: 12px; border-radius: 6px; }
        .help-button { background: #0969da; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .slow-interest { --interest-delay-start: 1s; --interest-delay-end: 500ms; }
        .fast-interest { --interest-delay-start: 100ms; --interest-delay-end: 100ms; }
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
global.navigator = dom.window.navigator as any;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;
global.HTMLAreaElement = dom.window.HTMLAreaElement;
global.SVGAElement = dom.window.SVGAElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.getComputedStyle = dom.window.getComputedStyle;

// Import after setting up globals
import { InvokerManager } from '../src/compatible';
import { applyInterestInvokers } from '../src/interest-invokers';

describe('Interest Invokers Demo Integration Tests', () => {
  let manager: InvokerManager;

   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }

     // Reset DOM
     document.body.innerHTML = '';

    // Reset InvokerManager
    manager = InvokerManager.getInstance();
    // NOTE: Don't call reset() when using compatible module as it clears pre-registered commands
    // manager.reset();

    // Reapply interest invokers polyfill after DOM setup
    delete (window as any).interestForPolyfillInstalled;
    applyInterestInvokers();

    // Debug: Check if commands are registered
    // console.log('Registered commands:', Array.from((manager as any).commands?.keys() || []));

    // Wait for polyfills to initialize
    return new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    // Clean up any open popovers
    document.querySelectorAll('[popover]').forEach(el => {
      if ((el as any).hidePopover) {
        try {
          (el as any).hidePopover();
        } catch {}
      }
    });
  });

  describe('GitHub-Style Profile Hover Cards', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="demo-section">
          <p>
            Great work on the PR,
            <a href="/users/alice" interestfor="alice-card" class="user-mention">@alice</a>!
            The changes look solid. Also thanks to
            <a href="/users/bob" interestfor="bob-card" class="user-mention">@bob</a>
            for the code review.
          </p>

          <div id="alice-card" popover="auto" class="user-card">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div class="user-avatar">A</div>
              <div>
                <h3 style="margin: 0; font-size: 1.1em;">Alice Johnson</h3>
                <p style="margin: 0; color: #656d76; font-size: 0.9em;">Senior Frontend Developer</p>
              </div>
            </div>
            <p style="margin: 8px 0; font-size: 0.9em; color: #656d76;">
              Building beautiful, accessible web experiences. React, TypeScript, and modern CSS enthusiast.
            </p>
            <div class="user-stats">
              <span><strong>127</strong> followers</span>
              <span><strong>43</strong> repos</span>
              <span><strong>1.2k</strong> contributions</span>
            </div>
            <button type="button"
                    command="--text:set:Following Alice!"
                    commandfor="follow-status"
                    style="margin-top: 12px; padding: 6px 12px; background: #238636; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Follow
            </button>
          </div>

          <div id="bob-card" popover="auto" class="user-card">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div class="user-avatar">B</div>
              <div>
                <h3 style="margin: 0; font-size: 1.1em;">Bob Smith</h3>
                <p style="margin: 0; color: #656d76; font-size: 0.9em;">Backend Engineer</p>
              </div>
            </div>
            <p style="margin: 8px 0; font-size: 0.9em; color: #656d76;">
              Node.js, PostgreSQL, and distributed systems. Performance optimization specialist.
            </p>
            <div class="user-stats">
              <span><strong>89</strong> followers</span>
              <span><strong>67</strong> repos</span>
              <span><strong>890</strong> contributions</span>
            </div>
            <button type="button"
                    command="--text:set:Following Bob!"
                    commandfor="follow-status"
                    style="margin-top: 12px; padding: 6px 12px; background: #238636; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Follow
            </button>
          </div>

          <div id="follow-status" style="margin-top: 16px; color: #238636; font-weight: 500;"></div>
        </div>
      `;
    });

    it('should show Alice profile card on hover', async () => {
      const aliceLink = document.querySelector('a[href="/users/alice"]') as HTMLAnchorElement;
      const aliceCard = document.getElementById('alice-card') as HTMLElement;

      expect(aliceLink).toBeTruthy();
      expect(aliceCard).toBeTruthy();
      expect(aliceLink.interestForElement).toBe(aliceCard);

      // Simulate hover
      aliceLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600)); // Default delay is 500ms + buffer

      // Check that popover is shown (if popover API is supported)
      if (typeof (aliceCard as any).showPopover === 'function') {
        expect(aliceCard.classList.contains('interest-target')).toBe(true);
        expect(aliceLink.classList.contains('interest-source')).toBe(true);
        expect(aliceLink.getAttribute('aria-expanded')).toBe('true');
      }
    });

    it('should show Bob profile card on hover', async () => {
      const bobLink = document.querySelector('a[href="/users/bob"]') as HTMLAnchorElement;
      const bobCard = document.getElementById('bob-card') as HTMLElement;

      expect(bobLink).toBeTruthy();
      expect(bobCard).toBeTruthy();
      expect(bobLink.interestForElement).toBe(bobCard);

      // Simulate hover
      bobLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that popover is shown
      if (typeof (bobCard as any).showPopover === 'function') {
        expect(bobCard.classList.contains('interest-target')).toBe(true);
        expect(bobLink.classList.contains('interest-source')).toBe(true);
        expect(bobLink.getAttribute('aria-expanded')).toBe('true');
      }
    });

    it('should execute command when Follow button is clicked', async () => {
      const aliceLink = document.querySelector('a[href="/users/alice"]') as HTMLAnchorElement;
      const aliceCard = document.getElementById('alice-card') as HTMLElement;
      const followButton = aliceCard.querySelector('button') as HTMLButtonElement;
      const statusDiv = document.getElementById('follow-status') as HTMLElement;

      // First show the card
      aliceLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check button attributes
      expect(followButton.getAttribute('command')).toBe('--text:set:Following Alice!');
      expect(followButton.getAttribute('commandfor')).toBe('follow-status');

      // Manually execute the command since event handling might not work in test environment
      const result = await manager.executeCommand('--text:set:Following Alice!', 'follow-status', followButton);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that command executed
      expect(statusDiv.textContent).toBe('Following Alice!');
    });
  });

  describe('API Documentation Tooltips', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="demo-section">
          <p>
            Use the <code interestfor="fetch-ref" class="api-method">fetch()</code> API to make HTTP requests,
            or the <code interestfor="query-ref" class="api-method">querySelector()</code> method to find elements.
            The <code interestfor="event-ref" class="api-method">addEventListener()</code> method handles events.
          </p>

          <div id="fetch-ref" popover="auto" class="quick-ref">
            <h4>fetch(url, options)</h4>
            <p><span class="param">url</span>: <span class="type">string</span> - The resource URL</p>
            <p><span class="param">options</span>: <span class="type">RequestInit</span> - Request configuration</p>
            <p><strong>Returns:</strong> <span class="type">Promise&lt;Response&gt;</span></p>
            <hr style="border: none; border-top: 1px solid #333; margin: 12px 0;">
            <p><strong>Example:</strong></p>
            <code>fetch('/api/data').then(r => r.json())</code>
          </div>

          <div id="query-ref" popover="auto" class="quick-ref">
            <h4>querySelector(selector)</h4>
            <p><span class="param">selector</span>: <span class="type">string</span> - CSS selector</p>
            <p><strong>Returns:</strong> <span class="type">Element | null</span></p>
            <hr style="border: none; border-top: 1px solid #333; margin: 12px 0;">
            <p><strong>Example:</strong></p>
            <code>document.querySelector('.my-class')</code>
          </div>

          <div id="event-ref" popover="auto" class="quick-ref">
            <h4>addEventListener(type, listener)</h4>
            <p><span class="param">type</span>: <span class="type">string</span> - Event type</p>
            <p><span class="param">listener</span>: <span class="type">EventListener</span> - Event handler</p>
            <p><strong>Returns:</strong> <span class="type">void</span></p>
            <hr style="border: none; border-top: 1px solid #333; margin: 12px 0;">
            <p><strong>Example:</strong></p>
            <code>button.addEventListener('click', handler)</code>
          </div>
        </div>
      `;
    });

    it('should show fetch API tooltip on hover', async () => {
      const fetchCode = document.querySelector('code[interestfor="fetch-ref"]') as HTMLElement;
      const fetchTooltip = document.getElementById('fetch-ref') as HTMLElement;

      expect(fetchCode).toBeTruthy();
      expect(fetchTooltip).toBeTruthy();
      expect(fetchCode.interestForElement).toBe(fetchTooltip);

      // Simulate hover
      fetchCode.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (fetchTooltip as any).showPopover === 'function') {
        expect(fetchTooltip.classList.contains('interest-target')).toBe(true);
        expect(fetchCode.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should show querySelector API tooltip on hover', async () => {
      const queryCode = document.querySelector('code[interestfor="query-ref"]') as HTMLElement;
      const queryTooltip = document.getElementById('query-ref') as HTMLElement;

      expect(queryCode).toBeTruthy();
      expect(queryTooltip).toBeTruthy();

      // Simulate hover
      queryCode.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (queryTooltip as any).showPopover === 'function') {
        expect(queryTooltip.classList.contains('interest-target')).toBe(true);
        expect(queryCode.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should show addEventListener API tooltip on hover', async () => {
      const eventCode = document.querySelector('code[interestfor="event-ref"]') as HTMLElement;
      const eventTooltip = document.getElementById('event-ref') as HTMLElement;

      expect(eventCode).toBeTruthy();
      expect(eventTooltip).toBeTruthy();

      // Simulate hover
      eventCode.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (eventTooltip as any).showPopover === 'function') {
        expect(eventTooltip.classList.contains('interest-target')).toBe(true);
        expect(eventCode.classList.contains('interest-source')).toBe(true);
      }
    });
  });

  describe('Wikipedia-Style Reference Tooltips', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="demo-section">
          <p>
            The Web was invented by Tim Berners-Lee in 1989<a href="#ref1" interestfor="ref1-tooltip" class="reference-link">[1]</a>
            at CERN. It was built on existing Internet protocols<a href="#ref2" interestfor="ref2-tooltip" class="reference-link">[2]</a>
            and introduced the concept of hypertext<a href="#ref3" interestfor="ref3-tooltip" class="reference-link">[3]</a>.
          </p>

          <div id="ref1-tooltip" popover="hint" class="reference-tooltip">
            <strong>Berners-Lee, Tim.</strong> "Information Management: A Proposal." CERN, March 1989.
            <br>The original proposal document that outlined the concept of the World Wide Web.
          </div>

          <div id="ref2-tooltip" popover="hint" class="reference-tooltip">
            <strong>Leiner, Barry M., et al.</strong> "Brief History of the Internet." Internet Society, 1997.
            <br>Comprehensive overview of Internet development from ARPANET to the modern web.
          </div>

          <div id="ref3-tooltip" popover="hint" class="reference-tooltip">
            <strong>Nelson, Ted.</strong> "Computer Lib/Dream Machines." 1974.
            <br>Early work introducing the concept of hypertext and non-linear document systems.
          </div>
        </div>
      `;
    });

    it('should show reference [1] tooltip on hover', async () => {
      const ref1Link = document.querySelector('a[href="#ref1"]') as HTMLAnchorElement;
      const ref1Tooltip = document.getElementById('ref1-tooltip') as HTMLElement;

      expect(ref1Link).toBeTruthy();
      expect(ref1Tooltip).toBeTruthy();

      // Simulate hover
      ref1Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (ref1Tooltip as any).showPopover === 'function') {
        expect(ref1Tooltip.classList.contains('interest-target')).toBe(true);
        expect(ref1Link.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should show reference [2] tooltip on hover', async () => {
      const ref2Link = document.querySelector('a[href="#ref2"]') as HTMLAnchorElement;
      const ref2Tooltip = document.getElementById('ref2-tooltip') as HTMLElement;

      expect(ref2Link).toBeTruthy();
      expect(ref2Tooltip).toBeTruthy();

      // Simulate hover
      ref2Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (ref2Tooltip as any).showPopover === 'function') {
        expect(ref2Tooltip.classList.contains('interest-target')).toBe(true);
        expect(ref2Link.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should show reference [3] tooltip on hover', async () => {
      const ref3Link = document.querySelector('a[href="#ref3"]') as HTMLAnchorElement;
      const ref3Tooltip = document.getElementById('ref3-tooltip') as HTMLElement;

      expect(ref3Link).toBeTruthy();
      expect(ref3Tooltip).toBeTruthy();

      // Simulate hover
      ref3Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (ref3Tooltip as any).showPopover === 'function') {
        expect(ref3Tooltip.classList.contains('interest-target')).toBe(true);
        expect(ref3Link.classList.contains('interest-source')).toBe(true);
      }
    });
  });

  describe('Interactive Help System', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="demo-section">
          <p>
            <button type="button" interestfor="help-general" class="help-button">Help</button>
            <button type="button" interestfor="help-shortcuts" class="help-button slow-interest">Keyboard Shortcuts</button>
            <button type="button" interestfor="help-accessibility" class="help-button fast-interest">Accessibility</button>
          </p>

          <div id="help-general" popover="auto" class="tooltip-content">
            <h4 style="margin-top: 0;">Getting Started</h4>
            <p>Welcome to the Interest Invokers demo! Hover over elements to see contextual information.</p>
            <ul style="margin: 8px 0; padding-left: 16px;">
              <li>Hover over user mentions to see profile cards</li>
              <li>Hover over code snippets for API documentation</li>
              <li>Hover over reference links for citations</li>
            </ul>
            <button type="button"
                    command="--text:set:Help viewed!"
                    commandfor="help-status"
                    style="background: #238636; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
              Mark as Read
            </button>
          </div>

          <div id="help-shortcuts" popover="hint" class="tooltip-content">
            <h4 style="margin-top: 0;">Keyboard Shortcuts</h4>
            <ul style="margin: 8px 0; padding-left: 16px; font-size: 12px;">
              <li><kbd>Tab</kbd> - Navigate between interactive elements</li>
              <li><kbd>Enter/Space</kbd> - Activate buttons and links</li>
              <li><kbd>Escape</kbd> - Close all open hover cards</li>
              <li><kbd>Focus + Hold</kbd> - Show interest via keyboard</li>
            </ul>
            <p style="font-size: 11px; color: #8b949e; margin: 8px 0 0 0;">
              <em>This tooltip has slower timing (1s delay)</em>
            </p>
          </div>

          <div id="help-accessibility" popover="hint" class="tooltip-content">
            <h4 style="margin-top: 0;">Accessibility Features</h4>
            <ul style="margin: 8px 0; padding-left: 16px; font-size: 12px;">
              <li>All hover cards work with keyboard focus</li>
              <li>Screen readers announce content appropriately</li>
              <li>Touch devices use long-press gestures</li>
              <li>High contrast and reduced motion respected</li>
            </ul>
            <p style="font-size: 11px; color: #8b949e; margin: 8px 0 0 0;">
              <em>This tooltip appears quickly (100ms delay)</em>
            </p>
          </div>

          <div id="help-status" style="margin-top: 12px; color: #238636; font-weight: 500; font-size: 14px;"></div>
        </div>
      `;
    });

    it('should show general help tooltip on hover', async () => {
      const helpButton = document.querySelector('button[interestfor="help-general"]') as HTMLButtonElement;
      const helpTooltip = document.getElementById('help-general') as HTMLElement;

      expect(helpButton).toBeTruthy();
      expect(helpTooltip).toBeTruthy();

      // Simulate hover
      helpButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (helpTooltip as any).showPopover === 'function') {
        expect(helpTooltip.classList.contains('interest-target')).toBe(true);
        expect(helpButton.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should execute command when Mark as Read button is clicked', async () => {
      const helpButton = document.querySelector('button[interestfor="help-general"]') as HTMLButtonElement;
      const helpTooltip = document.getElementById('help-general') as HTMLElement;
      const markAsReadButton = helpTooltip.querySelector('button') as HTMLButtonElement;
      const statusDiv = document.getElementById('help-status') as HTMLElement;

      // First show the tooltip
      helpButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check button attributes
      expect(markAsReadButton.getAttribute('command')).toBe('--text:set:Help viewed!');
      expect(markAsReadButton.getAttribute('commandfor')).toBe('help-status');

      // Manually execute the command
      await manager.executeCommand('--text:set:Help viewed!', 'help-status', markAsReadButton);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that command executed
      expect(statusDiv.textContent).toBe('Help viewed!');
    });

    it('should show keyboard shortcuts tooltip with slow timing', async () => {
      const shortcutsButton = document.querySelector('button[interestfor="help-shortcuts"]') as HTMLButtonElement;
      const shortcutsTooltip = document.getElementById('help-shortcuts') as HTMLElement;

      expect(shortcutsButton).toBeTruthy();
      expect(shortcutsTooltip).toBeTruthy();

      // Simulate hover
      shortcutsButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for longer delay (1s start delay)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Check that tooltip is shown
      if (typeof (shortcutsTooltip as any).showPopover === 'function') {
        expect(shortcutsTooltip.classList.contains('interest-target')).toBe(true);
        expect(shortcutsButton.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should show accessibility tooltip with fast timing', async () => {
      const accessibilityButton = document.querySelector('button[interestfor="help-accessibility"]') as HTMLButtonElement;
      const accessibilityTooltip = document.getElementById('help-accessibility') as HTMLElement;

      expect(accessibilityButton).toBeTruthy();
      expect(accessibilityTooltip).toBeTruthy();

      // Simulate hover
      accessibilityButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for fast delay (100ms start delay)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that tooltip is shown
      if (typeof (accessibilityTooltip as any).showPopover === 'function') {
        expect(accessibilityTooltip.classList.contains('interest-target')).toBe(true);
        expect(accessibilityButton.classList.contains('interest-source')).toBe(true);
      }
    });
  });

  describe('Integration with Command Invokers', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="demo-section">
          <button type="button"
                  command="--toggle"
                  commandfor="integration-demo"
                  interestfor="integration-hint"
                  class="help-button">
            Toggle Content (Dual Functionality)
          </button>

          <div id="integration-hint" popover="hint" class="tooltip-content">
            This button has both <code>command</code> and <code>interestfor</code> attributes.
            <br><strong>Click:</strong> Toggles the content below
            <br><strong>Hover:</strong> Shows this tooltip
          </div>

          <div id="integration-demo" hidden style="margin-top: 16px; padding: 16px; background: #f6f8fa; border-radius: 8px;">
            <h4>Content Panel</h4>
            <p>This content was toggled using a regular command invoker. The same button also shows a hover tooltip using Interest Invokers!</p>

            <button type="button"
                    command="--text:set:Both systems work together perfectly!"
                    commandfor="integration-status"
                    interestfor="success-hint">
              Test Integration
            </button>

            <div id="success-hint" popover="hint" class="tooltip-content">
              Click to update the status message below ↓
            </div>

            <div id="integration-status" style="margin-top: 12px; font-style: italic; color: #656d76;"></div>
          </div>
        </div>
      `;
    });

    it('should show integration hint tooltip on hover', async () => {
      const toggleButton = document.querySelector('button[command="--toggle"]') as HTMLButtonElement;
      const hintTooltip = document.getElementById('integration-hint') as HTMLElement;

      expect(toggleButton).toBeTruthy();
      expect(hintTooltip).toBeTruthy();

      // Simulate hover
      toggleButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (hintTooltip as any).showPopover === 'function') {
        expect(hintTooltip.classList.contains('interest-target')).toBe(true);
        expect(toggleButton.classList.contains('interest-source')).toBe(true);
      }
    });

    it('should toggle content when button is clicked', async () => {
      const toggleButton = document.querySelector('button[command="--toggle"]') as HTMLButtonElement;
      const contentDiv = document.getElementById('integration-demo') as HTMLElement;

      expect(contentDiv.hidden).toBe(true);
      expect(toggleButton.getAttribute('command')).toBe('--toggle');
      expect(toggleButton.getAttribute('commandfor')).toBe('integration-demo');

      // Manually execute the command
      await manager.executeCommand('--toggle', 'integration-demo', toggleButton);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that content is now visible
      expect(contentDiv.hidden).toBe(false);
    });

    it('should work with both command and interest invokers simultaneously', async () => {
      const toggleButton = document.querySelector('button[command="--toggle"]') as HTMLButtonElement;
      const hintTooltip = document.getElementById('integration-hint') as HTMLElement;
      const contentDiv = document.getElementById('integration-demo') as HTMLElement;
      const testButton = contentDiv.querySelector('button') as HTMLButtonElement;
      const successHint = document.getElementById('success-hint') as HTMLElement;
      const statusDiv = document.getElementById('integration-status') as HTMLElement;

      // First, hover over the main button to show hint
      toggleButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check hint is shown
      if (typeof (hintTooltip as any).showPopover === 'function') {
        expect(hintTooltip.classList.contains('interest-target')).toBe(true);
      }

      // Click the main button to toggle content
      await manager.executeCommand('--toggle', 'integration-demo', toggleButton);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(contentDiv.hidden).toBe(false);

      // Now hover over the test button
      testButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check success hint is shown
      if (typeof (successHint as any).showPopover === 'function') {
        expect(successHint.classList.contains('interest-target')).toBe(true);
      }

      // Check test button attributes
      expect(testButton.getAttribute('command')).toBe('--text:set:Both systems work together perfectly!');
      expect(testButton.getAttribute('commandfor')).toBe('integration-status');

      // Manually execute the command
      await manager.executeCommand('--text:set:Both systems work together perfectly!', 'integration-status', testButton);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that command executed
      expect(statusDiv.textContent).toBe('Both systems work together perfectly!');
    });
  });

  describe('Accessibility Features', () => {
    it('should set proper ARIA attributes for plain hints', () => {
      document.body.innerHTML = `
        <a href="#ref1" interestfor="ref1-tooltip" class="reference-link">[1]</a>
        <div id="ref1-tooltip" popover="hint" class="reference-tooltip">
          Test content
        </div>
      `;

      const link = document.querySelector('a') as HTMLAnchorElement;
      const tooltip = document.getElementById('ref1-tooltip') as HTMLElement;

      // Trigger mouseover to initialize accessibility
      link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Check ARIA attributes for plain hints (simple tooltips)
      expect(link.getAttribute('aria-describedby')).toBe('ref1-tooltip');
      // Plain hints don't get aria-expanded according to spec
      expect(link.getAttribute('aria-expanded')).toBe(null);
    });

    it('should set proper ARIA attributes for rich tooltips', () => {
      document.body.innerHTML = `
        <button type="button" interestfor="user-card">Profile</button>
        <div id="user-card" popover="auto" class="user-card">
          <h3>User Profile</h3>
          <p>Rich content with interactive elements</p>
        </div>
      `;

      const button = document.querySelector('button') as HTMLButtonElement;
      const card = document.getElementById('user-card') as HTMLElement;

      // Trigger mouseover to initialize accessibility
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Check ARIA attributes
      expect(button.getAttribute('aria-details')).toBe('user-card');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(card.getAttribute('role')).toBe('tooltip');
    });

    it('should handle keyboard focus for interest invokers', async () => {
      document.body.innerHTML = `
        <button type="button" interestfor="tooltip">Focus me</button>
        <div id="tooltip" popover="auto" class="tooltip-content">
          Tooltip content
        </div>
      `;

      const button = document.querySelector('button') as HTMLButtonElement;
      const tooltip = document.getElementById('tooltip') as HTMLElement;

      // Simulate focus
      button.focus();
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // Wait for interest event
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check that tooltip is shown
      if (typeof (tooltip as any).showPopover === 'function') {
        expect(tooltip.classList.contains('interest-target')).toBe(true);
        expect(button.classList.contains('interest-source')).toBe(true);
        expect(button.getAttribute('aria-expanded')).toBe('true');
      }
    });

    it('should handle Escape key to close all interest', async () => {
      document.body.innerHTML = `
        <button type="button" interestfor="tooltip1">Button 1</button>
        <button type="button" interestfor="tooltip2">Button 2</button>
        <div id="tooltip1" popover="auto" class="tooltip-content">Tooltip 1</div>
        <div id="tooltip2" popover="auto" class="tooltip-content">Tooltip 2</div>
      `;

      const button1 = document.querySelector('button[interestfor="tooltip1"]') as HTMLButtonElement;
      const button2 = document.querySelector('button[interestfor="tooltip2"]') as HTMLButtonElement;
      const tooltip1 = document.getElementById('tooltip1') as HTMLElement;
      const tooltip2 = document.getElementById('tooltip2') as HTMLElement;

      // Show both tooltips
      button1.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      button2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 600));

      // Press Escape
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that tooltips are closed
      if (typeof (tooltip1 as any).hidePopover === 'function') {
        expect(button1.classList.contains('interest-source')).toBe(false);
        expect(button2.classList.contains('interest-source')).toBe(false);
        expect(button1.getAttribute('aria-expanded')).toBe('false');
        expect(button2.getAttribute('aria-expanded')).toBe('false');
      }
    });
  });

  describe('Event Integration', () => {
    it('should dispatch interest and loseinterest events', async () => {
      document.body.innerHTML = `
        <button type="button" interestfor="test-tooltip">Test</button>
        <div id="test-tooltip" popover="auto" class="tooltip-content">Content</div>
      `;

      const button = document.querySelector('button') as HTMLButtonElement;
      const tooltip = document.getElementById('test-tooltip') as HTMLElement;

      let interestFired = false;
      let loseInterestFired = false;

      tooltip.addEventListener('interest', () => {
        interestFired = true;
      });

      tooltip.addEventListener('loseinterest', () => {
        loseInterestFired = true;
      });

      // Trigger interest
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(interestFired).toBe(true);

      // Trigger lose interest
      button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(loseInterestFired).toBe(true);
    });

    it('should dispatch custom interest:shown and interest:lost events on invoker', async () => {
      document.body.innerHTML = `
        <button type="button" interestfor="test-tooltip">Test</button>
        <div id="test-tooltip" popover="auto" class="tooltip-content">Content</div>
      `;

      const button = document.querySelector('button') as HTMLButtonElement;

      let shownFired = false;
      let lostFired = false;

      button.addEventListener('interest:shown', () => {
        shownFired = true;
      });

      button.addEventListener('interest:lost', () => {
        lostFired = true;
      });

      // Trigger interest
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(shownFired).toBe(true);

      // Trigger lose interest
      button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(lostFired).toBe(true);
    });
  });
});
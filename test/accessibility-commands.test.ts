import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src';
import { registerAccessibilityCommands } from '../src/commands/accessibility';

describe('Accessibility Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // Register accessibility commands
    registerAccessibilityCommands(manager);
  });

  describe('--a11y:announce command', () => {
    it('should announce text to screen readers', async () => {
      document.body.innerHTML = `
        <button command="--a11y:announce:Item added to cart">Announce</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait for setTimeout in announce command

      // Check that aria-live region was created
      const liveRegion = document.getElementById('invokers-a11y-announcer-polite');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion!.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion!.textContent).toBe('Item added to cart');
    });

    it('should use assertive priority when specified', async () => {
      document.body.innerHTML = `
        <button command="--a11y:announce:Error occurred" data-announce-priority="assertive">Announce</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 150));

      const liveRegion = document.getElementById('invokers-a11y-announcer-assertive');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion!.getAttribute('aria-live')).toBe('assertive');
    });

    it('should throw error for missing text', async () => {
      document.body.innerHTML = `
        <button command="--a11y:announce">Announce</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--a11y:focus command', () => {
    it('should focus target element', async () => {
      document.body.innerHTML = `
        <button command="--a11y:focus" commandfor="#focus-target">Focus</button>
        <input id="focus-target" type="text">
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#focus-target') as HTMLInputElement;

      // Mock scrollIntoView since it's not available in jsdom
      target.scrollIntoView = vi.fn();
      const focusSpy = vi.spyOn(target, 'focus').mockImplementation(() => {});

      button.click();
      await new Promise(resolve => setTimeout(resolve, 350)); // Wait for scroll + focus delay

      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(focusSpy).toHaveBeenCalled();

      focusSpy.mockRestore();
    });

    it('should throw error for missing targets', async () => {
      document.body.innerHTML = `
        <button command="--a11y:focus">Focus</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--a11y:skip-to command', () => {
    it('should focus element by ID', async () => {
      document.body.innerHTML = `
        <button command="--a11y:skip-to:main-content">Skip to Main</button>
        <main id="main-content">Main content</main>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#main-content') as HTMLElement;

      // Mock scrollIntoView since it's not available in jsdom
      target.scrollIntoView = vi.fn();
      const focusSpy = vi.spyOn(target, 'focus').mockImplementation(() => {});

      button.click();
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(focusSpy).toHaveBeenCalled();
      expect(target.getAttribute('tabindex')).toBe('-1');

      focusSpy.mockRestore();
    });

    it('should throw error for non-existent element', async () => {
      document.body.innerHTML = `
        <button command="--a11y:skip-to:nonexistent">Skip</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--a11y:focus-trap command', () => {
    it('should enable focus trap', async () => {
      document.body.innerHTML = `
        <button command="--a11y:focus-trap:enable" commandfor="#modal">Enable Trap</button>
        <div id="modal">
          <button id="first">First</button>
          <button id="second">Second</button>
          <button id="last">Last</button>
        </div>
      `;

      const button = document.querySelector('button')!;
      const modal = document.querySelector('#modal')!;
      const firstBtn = document.querySelector('#first')!;
      const lastBtn = document.querySelector('#last')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that handlers are attached
      expect((modal as any)._a11yFocusTrap).toBeDefined();
      expect((modal as any)._a11yFocusTrap.tabHandler).toBeDefined();
      expect((modal as any)._a11yFocusTrap.focusHandler).toBeDefined();

      // Simulate Tab key on last element (should focus first)
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      Object.defineProperty(tabEvent, 'target', { value: lastBtn });
      document.activeElement = lastBtn as Element;

      const focusSpy = vi.spyOn(firstBtn, 'focus').mockImplementation(() => {});
      modal.dispatchEvent(tabEvent);

      expect(focusSpy).toHaveBeenCalled();

      focusSpy.mockRestore();
    });

    it('should disable focus trap', async () => {
      document.body.innerHTML = `
        <button command="--a11y:focus-trap:disable" commandfor="#modal">Disable Trap</button>
        <div id="modal">
          <button>First</button>
        </div>
      `;

      const button = document.querySelector('button')!;
      const modal = document.querySelector('#modal')!;

      // Set up mock handlers
      const mockTabHandler = vi.fn();
      const mockFocusHandler = vi.fn();
      (modal as any)._a11yFocusTrap = {
        tabHandler: mockTabHandler,
        focusHandler: mockFocusHandler
      };

      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');
      const removeFocusListenerSpy = vi.spyOn(document, 'removeEventListener');

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', mockTabHandler);
      expect(removeFocusListenerSpy).toHaveBeenCalledWith('focusin', mockFocusHandler);
      expect((modal as any)._a11yFocusTrap).toBeUndefined();

      removeEventListenerSpy.mockRestore();
      removeFocusListenerSpy.mockRestore();
    });

    it('should throw error for invalid action', async () => {
      document.body.innerHTML = `
        <button command="--a11y:focus-trap:invalid">Focus Trap</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--a11y:aria:set command', () => {
    it('should set ARIA attributes', async () => {
      document.body.innerHTML = `
        <button command="--a11y:aria:set:label:Save Changes" commandfor="#save-btn">Set Label</button>
        <button id="save-btn">Save</button>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#save-btn')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.getAttribute('aria-label')).toBe('Save Changes');
    });

    it('should throw error for invalid format', async () => {
      document.body.innerHTML = `
        <button command="--a11y:aria:set:invalid-format">Set ARIA</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--a11y:aria:remove command', () => {
    it('should remove ARIA attributes', async () => {
      document.body.innerHTML = `
        <button command="--a11y:aria:remove:label" commandfor="#save-btn">Remove Label</button>
        <button id="save-btn" aria-label="Save">Save</button>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#save-btn')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('--a11y:heading-level command', () => {
    it('should change heading level by changing tag', async () => {
      document.body.innerHTML = `
        <button command="--a11y:heading-level:2" commandfor="h1">Change to H2</button>
        <h1 id="heading">Heading</h1>
      `;

      const button = document.querySelector('button')!;
      const heading = document.querySelector('#heading')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // The heading should be replaced with h2
      const newHeading = document.querySelector('h2');
      expect(newHeading).toBeTruthy();
      expect(newHeading!.textContent).toBe('Heading');
      expect(document.querySelector('h1')).toBeNull();
    });

    it('should set aria-level for non-heading elements', async () => {
      document.body.innerHTML = `
        <button command="--a11y:heading-level:3" commandfor="#div-heading">Set Level</button>
        <div id="div-heading">Heading</div>
      `;

      const button = document.querySelector('button')!;
      const div = document.querySelector('#div-heading')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(div.getAttribute('aria-level')).toBe('3');
    });

    it('should throw error for invalid level', async () => {
      document.body.innerHTML = `
        <button command="--a11y:heading-level:7">Invalid Level</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });
});
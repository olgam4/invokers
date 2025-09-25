import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { registerDemoCommands, demoCommands } from '../src/demo-commands';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    destroy: vi.fn(),
    data: { labels: [], datasets: [{ data: [] }] },
    options: {}
  }))
}));

describe('Comprehensive Demo Features', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeAll(() => {
    // Load the actual demo HTML
    const demoPath = path.join(__dirname, '../examples/comprehensive-demo.html');
    const demoHtml = fs.readFileSync(demoPath, 'utf-8');

    dom = new JSDOM(demoHtml, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously'
    });

    document = dom.window.document;
    window = dom.window as any;

    // Set up global objects
    global.document = document;
    global.window = window;
    global.navigator = {
      userAgent: 'test',
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    } as any;

    // Mock fetch globally
    global.fetch = vi.fn();

    // Mock console methods to avoid noise
    global.console = {
      ...console,
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // Register demo commands for testing
    // Note: In JSDOM, module scripts may not execute automatically,
    // so we register commands manually for testing
    if (window.Invoker) {
      Object.keys(demoCommands).forEach(commandName => {
        window.Invoker.register(commandName, demoCommands[commandName]);
      });
    }
  });

  beforeEach(() => {
    // Reset demo state
    document.body.dataset.sharedValue = '';
    document.body.dataset.counter = '0';
    document.body.dataset.debugMode = 'false';
  });

  describe('Event Handling & Interpolation', () => {
    it('should have input element with command binding', () => {
      const input = document.getElementById('event-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.hasAttribute('command-on')).toBe(true);
      expect(input.getAttribute('command-on')).toBe('input');
      expect(input.hasAttribute('command')).toBe(true);
      expect(input.getAttribute('command')).toBe('--demo:echo');
    });

    it('should have display element for interpolation', () => {
      const display = document.getElementById('event-display');
      expect(display).toBeTruthy();
      expect(display.textContent).toContain('Event data will appear here');
      expect(display.textContent).toContain('Last input: {{last-input}}');
    });

    it('should have counter button with proper attributes', () => {
      const button = document.querySelector('button[command="--demo:counter:increment"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.hasAttribute('data-max-count')).toBe(true);
      expect(button.getAttribute('data-max-count')).toBe('10');
    });

    it('should have counter display element', () => {
      const display = document.getElementById('counter-display');
      expect(display).toBeTruthy();
      expect(display.textContent?.trim()).toBe('0');
    });
  });

  describe('Async Operations', () => {
    it('should have API fetch button with proper attributes', () => {
      const button = document.querySelector('button[command="--demo:fetch:api"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.hasAttribute('data-url')).toBe(true);
      expect(button.getAttribute('data-url')).toBe('https://jsonplaceholder.typicode.com/posts/1');
    });

    it('should have error simulation button', () => {
      const button = document.querySelector('button[command="--demo:fetch:simulate-error"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Simulate Error');
    });

    it('should have promise chain button', () => {
      const button = document.querySelector('button[command="--demo:chain:start"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Start Async Chain');
    });

    it('should have API result display area', () => {
      const result = document.getElementById('api-result');
      expect(result).toBeTruthy();
      expect(result?.textContent).toContain('Click a button to fetch data');
    });
  });

  describe('Component Communication', () => {
    it('should have shared input with data binding', () => {
      const input = document.getElementById('shared-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.hasAttribute('command-on')).toBe(true);
      expect(input.hasAttribute('data-bind-to')).toBe(true);
      expect(input.hasAttribute('data-bind-as')).toBe(true);
    });

    it('should have multiple component displays', () => {
      const components = document.querySelectorAll('.result-display');
      expect(components.length).toBeGreaterThan(1);

      // Check that interpolation syntax is present
      const displays = Array.from(components);
      const hasInterpolation = displays.some(display =>
        display.textContent?.includes('{{shared-value}}')
      );
      expect(hasInterpolation).toBe(true);
    });

    it('should have event publishing button', () => {
      const button = document.querySelector('button[command="--demo:event:publish"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.hasAttribute('data-event-type')).toBe(true);
      expect(button.hasAttribute('data-event-data')).toBe(true);
    });
  });

  describe('Library Integration', () => {
    it('should have Chart.js integration elements', () => {
      const button = document.querySelector('button[command="--demo:chart:add-point"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.hasAttribute('data-value-from')).toBe(true);

      const chartCanvas = document.getElementById('demo-chart');
      expect(chartCanvas).toBeTruthy();
      expect(chartCanvas?.tagName.toLowerCase()).toBe('canvas');
    });

    it('should have GitHub API integration button', () => {
      const button = document.querySelector('button[command="--demo:api:github-user"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.hasAttribute('data-username')).toBe(true);
      expect(button.getAttribute('data-username')).toBe('octocat');
    });
  });

  describe('Advanced Templating', () => {
    it('should have template loading button', () => {
      const button = document.querySelector('button[command="--demo:template:load-list"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Load Template List');
    });

    it('should have conditional rendering select', () => {
      const select = document.getElementById('condition-select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.hasAttribute('command-on')).toBe(true);
      expect(select.getAttribute('command-on')).toBe('change');

      const options = select.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
      expect(Array.from(options).some(opt => opt.value === 'success')).toBe(true);
    });

    it('should have template elements defined', () => {
      const templates = document.querySelectorAll('template');
      expect(templates.length).toBeGreaterThan(0);

      const templateIds = ['notification-template', 'loading-template', 'error-template'];
      templateIds.forEach(id => {
        expect(document.getElementById(id)).toBeTruthy();
      });
    });
  });

  describe('Programmatic Triggering', () => {
    it('should have programmatic demo buttons', () => {
      const programmaticBtn = document.querySelector('button[onclick*="triggerProgrammaticDemo"]') as HTMLButtonElement;
      const delayedBtn = document.querySelector('button[onclick*="triggerWithDelay"]') as HTMLButtonElement;

      expect(programmaticBtn).toBeTruthy();
      expect(delayedBtn).toBeTruthy();
    });

    it('should have command queuing button', () => {
      const button = document.querySelector('button[command="--demo:queue:start"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Start Command Queue');
    });
  });

  describe('Error Handling', () => {
    it('should have error testing buttons', () => {
      const errorButtons = [
        'button[command="--demo:error:network"]',
        'button[command="--demo:error:validation"]',
        'button[command="--demo:error:timeout"]'
      ];

      errorButtons.forEach(selector => {
        const button = document.querySelector(selector) as HTMLButtonElement;
        expect(button).toBeTruthy();
      });
    });

    it('should have debug mode toggle', () => {
      const button = document.querySelector('button[command="--demo:debug:toggle"]') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Toggle Debug Mode');
    });
  });

  describe('DOM Integration', () => {
    it('should have all required DOM elements', () => {
      const requiredElements = [
        'event-input', 'event-display', 'shared-input', 'demo-chart',
        'api-result', 'chain-result', 'github-result', 'template-result',
        'condition-result', 'programmatic-result', 'queue-result',
        'error-result', 'debug-result'
      ];

      requiredElements.forEach(id => {
        expect(document.getElementById(id)).toBeTruthy();
      });
    });

    it('should have proper CSS styling', () => {
      const styleElement = document.querySelector('style');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toBeTruthy();
      expect(styleElement?.textContent?.length).toBeGreaterThan(1000);
    });

    it('should have Chart.js script loaded', () => {
      const chartScript = document.querySelector('script[src*="chart.js"]');
      expect(chartScript).toBeTruthy();
    });

    it('should have Invokers library loaded', () => {
      const invokerScript = document.querySelector('script[src*="dist/esm/development/compatible.js"]');
      expect(invokerScript).toBeTruthy();
    });
  });

  describe('Demo Structure & Features', () => {
    it('should have comprehensive feature sections', () => {
      const sections = document.querySelectorAll('.demo-container');
      expect(sections.length).toBeGreaterThan(5);

      const sectionTitles = Array.from(sections).map(section =>
        section.querySelector('.demo-header h2')?.textContent
      );

      expect(sectionTitles).toContain('🎯 Event Handling & Interpolation');
      expect(sectionTitles).toContain('⚡ Async Operations & Promises');
      expect(sectionTitles).toContain('🔄 Component Communication');
      expect(sectionTitles).toContain('📊 Library Integration');
      expect(sectionTitles).toContain('🎨 Advanced Templating');
      expect(sectionTitles).toContain('🎮 Programmatic Triggering');
      expect(sectionTitles).toContain('🛠️ Error Handling & Debugging');
    });

    it('should have interactive elements throughout', () => {
      const buttons = document.querySelectorAll('button');
      const inputs = document.querySelectorAll('input');
      const selects = document.querySelectorAll('select');

      expect(buttons.length).toBeGreaterThan(10);
      expect(inputs.length).toBeGreaterThan(2);
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should have proper accessibility attributes', () => {
      const buttons = document.querySelectorAll('button');
      const hasAccessibleButtons = Array.from(buttons).some(button =>
        button.hasAttribute('aria-label') || button.textContent?.trim()
      );
      expect(hasAccessibleButtons).toBe(true);
    });

    it('should demonstrate data flow concepts', () => {
      const dataFlowSection = document.querySelector('.data-flow');
      expect(dataFlowSection).toBeTruthy();

      const dataFlowItems = dataFlowSection?.querySelectorAll('.data-flow-item');
      expect(dataFlowItems?.length).toBe(4);
    });
  });

  describe('Functional Tests', () => {
    it('should be able to click demo command buttons without errors', async () => {
      // Wait a bit for commands to be registered
      await new Promise(resolve => setTimeout(resolve, 100));

      const clearButton = document.querySelector('button[command="--demo:clear"]') as HTMLButtonElement;
      expect(clearButton).toBeTruthy();

      // Just check that clicking doesn't throw an error
      expect(() => {
        clearButton?.click();
      }).not.toThrow();
    });
  });
});
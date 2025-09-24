/**
 * @file future-commands.test.ts
 * @description Tests for future native commands that are polyfilled
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Future Commands Test</title>
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
global.HTMLDetailsElement = dom.window.HTMLDetailsElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLVideoElement = dom.window.HTMLVideoElement;
global.HTMLAudioElement = dom.window.HTMLAudioElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Mock APIs that might not be available in test environment
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  share: vi.fn().mockResolvedValue(undefined)
} as any;

// Import after setting up globals - use compatibility layer for full functionality
import '../src/compatible';

describe('Future Commands', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    
    // Wait for polyfill to be applied to the JSDOM window
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Details Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="toggle-btn" command="toggle" commandfor="details-element">Toggle</button>
        <button type="button" id="open-btn" command="open" commandfor="details-element">Open</button>
        <button type="button" id="close-btn" command="close" commandfor="details-element">Close</button>
        <details id="details-element">
          <summary>Summary</summary>
          <p>Content goes here</p>
        </details>
      `;
    });

    it('should toggle details element', () => {
      const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
      const details = document.getElementById('details-element') as HTMLDetailsElement;

       expect(details.open).toBe(false);

       toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(true);

       toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(false);
    });

    it('should open closed details element', () => {
      const openBtn = document.getElementById('open-btn') as HTMLButtonElement;
      const details = document.getElementById('details-element') as HTMLDetailsElement;

       expect(details.open).toBe(false);

       openBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(true);

       // Should not change if already open
       openBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(true);
    });

    it('should close open details element', () => {
      const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
      const details = document.getElementById('details-element') as HTMLDetailsElement;

       // Open first
       details.open = true;
       expect(details.open).toBe(true);

       closeBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(false);

       // Should not change if already closed
       closeBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(details.open).toBe(false);
    });
  });

  describe('Media Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="play-pause-btn" command="play-pause" commandfor="test-video">Play/Pause</button>
        <button type="button" id="play-btn" command="play" commandfor="test-video">Play</button>
        <button type="button" id="pause-btn" command="pause" commandfor="test-video">Pause</button>
        <button type="button" id="mute-btn" command="toggle-muted" commandfor="test-video">Mute</button>
        <video id="test-video" src="test.mp4"></video>
      `;
    });

    it('should toggle play/pause state', () => {
      const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
      const video = document.getElementById('test-video') as HTMLVideoElement;

      // Mock video methods
      video.play = vi.fn().mockResolvedValue(undefined);
      video.pause = vi.fn();
      Object.defineProperty(video, 'paused', { value: true, writable: true });

       playPauseBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.play).toHaveBeenCalled();

       // Simulate playing state
       Object.defineProperty(video, 'paused', { value: false });
       playPauseBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.pause).toHaveBeenCalled();
    });

    it('should play paused video', () => {
      const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
      const video = document.getElementById('test-video') as HTMLVideoElement;

      video.play = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(video, 'paused', { value: true });

       playBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.play).toHaveBeenCalled();
    });

    it('should pause playing video', () => {
      const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
      const video = document.getElementById('test-video') as HTMLVideoElement;

      video.pause = vi.fn();
      Object.defineProperty(video, 'paused', { value: false });

       pauseBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.pause).toHaveBeenCalled();
    });

    it('should toggle mute state', () => {
      const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
      const video = document.getElementById('test-video') as HTMLVideoElement;

       expect(video.muted).toBe(false);

       muteBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.muted).toBe(true);

       muteBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(video.muted).toBe(false);
    });
  });

  describe('Picker Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="file-picker-btn" command="show-picker" commandfor="file-input">Browse</button>
        <input type="file" id="file-input">
        
        <button type="button" id="date-picker-btn" command="show-picker" commandfor="date-input">Date</button>
        <input type="date" id="date-input">
        
        <button type="button" id="select-picker-btn" command="show-picker" commandfor="select-input">Options</button>
        <select id="select-input">
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </select>
      `;
    });

    it('should call showPicker on input elements', () => {
      const filePickerBtn = document.getElementById('file-picker-btn') as HTMLButtonElement;
      const fileInput = document.getElementById('file-input') as HTMLInputElement;

      // Mock showPicker method and document focus
      fileInput.showPicker = vi.fn();
      document.hasFocus = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, 'hasFocus', { 
        value: vi.fn().mockReturnValue(true) 
      });

       filePickerBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(fileInput.showPicker).toHaveBeenCalled();
    });

    it('should call showPicker on select elements', () => {
      const selectPickerBtn = document.getElementById('select-picker-btn') as HTMLButtonElement;
      const selectInput = document.getElementById('select-input') as HTMLSelectElement;

      selectInput.showPicker = vi.fn();
      document.hasFocus = vi.fn().mockReturnValue(true);

       selectPickerBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(selectInput.showPicker).toHaveBeenCalled();
    });

    it('should handle showPicker errors gracefully', () => {
      const filePickerBtn = document.getElementById('file-picker-btn') as HTMLButtonElement;
      const fileInput = document.getElementById('file-input') as HTMLInputElement;

      fileInput.showPicker = vi.fn().mockImplementation(() => {
        throw new Error('Security error');
      });
      document.hasFocus = vi.fn().mockReturnValue(true);

       // Should not throw
       expect(() => {
         filePickerBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Number Input Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="step-up-btn" command="step-up" commandfor="number-input">+</button>
        <button type="button" id="step-down-btn" command="step-down" commandfor="number-input">-</button>
        <input type="number" id="number-input" value="5" min="1" max="10" step="1">
      `;
    });

    it('should step up number input', () => {
      const stepUpBtn = document.getElementById('step-up-btn') as HTMLButtonElement;
      const numberInput = document.getElementById('number-input') as HTMLInputElement;

      numberInput.stepUp = vi.fn();
      
       stepUpBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(numberInput.stepUp).toHaveBeenCalled();
    });

    it('should step down number input', () => {
      const stepDownBtn = document.getElementById('step-down-btn') as HTMLButtonElement;
      const numberInput = document.getElementById('number-input') as HTMLInputElement;

      numberInput.stepDown = vi.fn();
      
       stepDownBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(numberInput.stepDown).toHaveBeenCalled();
    });

    it('should handle step errors gracefully', () => {
      const stepUpBtn = document.getElementById('step-up-btn') as HTMLButtonElement;
      const numberInput = document.getElementById('number-input') as HTMLInputElement;

      numberInput.stepUp = vi.fn().mockImplementation(() => {
        throw new Error('Invalid state error');
      });

       // Should not throw
       expect(() => {
         stepUpBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Clipboard Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="copy-btn" command="copy-text" commandfor="text-content">Copy</button>
        <span id="text-content">Hello, World!</span>
        
        <button type="button" id="self-copy-btn" command="copy-text" commandfor="self-copy-btn" value="Button value">Copy Self</button>
      `;
    });

    it('should copy text content to clipboard', () => {
      const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
      const textContent = document.getElementById('text-content') as HTMLElement;

       copyBtn.dispatchEvent(new Event('click', { bubbles: true }));

       expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, World!');
    });

    it('should copy button value when self-referencing', () => {
      const selfCopyBtn = document.getElementById('self-copy-btn') as HTMLButtonElement;

       selfCopyBtn.dispatchEvent(new Event('click', { bubbles: true }));

       expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Button value');
    });

    it('should handle clipboard API errors gracefully', () => {
      const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;

      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard error'));

       // Should not throw
       expect(() => {
         copyBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Share Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="share-text-btn" command="share" commandfor="share-content">Share</button>
        <span id="share-content">Check out this awesome library!</span>
        
        <button type="button" id="share-url-btn" command="share" commandfor="url-content">Share URL</button>
        <span id="url-content">https://github.com/doeixd/invokers</span>
      `;
    });

    it('should share text content', () => {
      const shareBtn = document.getElementById('share-text-btn') as HTMLButtonElement;

       shareBtn.dispatchEvent(new Event('click', { bubbles: true }));

       expect(navigator.share).toHaveBeenCalledWith({
         text: 'Check out this awesome library!'
       });
    });

    it('should share URL content', () => {
      const shareBtn = document.getElementById('share-url-btn') as HTMLButtonElement;

       shareBtn.dispatchEvent(new Event('click', { bubbles: true }));

       expect(navigator.share).toHaveBeenCalledWith({
         url: 'https://github.com/doeixd/invokers'
       });
    });

    it('should handle share API errors gracefully', () => {
      const shareBtn = document.getElementById('share-text-btn') as HTMLButtonElement;

      (navigator.share as any).mockRejectedValue(new Error('Share error'));

       // Should not throw
       expect(() => {
         shareBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Fullscreen Commands', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button type="button" id="toggle-fullscreen-btn" command="toggle-fullscreen" commandfor="fullscreen-target">Toggle</button>
        <button type="button" id="request-fullscreen-btn" command="request-fullscreen" commandfor="fullscreen-target">Enter</button>
        <button type="button" id="exit-fullscreen-btn" command="exit-fullscreen" commandfor="fullscreen-target">Exit</button>
        <div id="fullscreen-target">Fullscreen content</div>
      `;

      // Mock fullscreen API
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true
      });
    });

    it('should request fullscreen when not in fullscreen', () => {
      const toggleBtn = document.getElementById('toggle-fullscreen-btn') as HTMLButtonElement;
      const target = document.getElementById('fullscreen-target') as HTMLElement;

      target.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      
       toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(target.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when in fullscreen', () => {
      const toggleBtn = document.getElementById('toggle-fullscreen-btn') as HTMLButtonElement;
      const target = document.getElementById('fullscreen-target') as HTMLElement;

      // Simulate being in fullscreen
      Object.defineProperty(document, 'fullscreenElement', { value: target });
      
       toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should handle fullscreen API errors gracefully', () => {
      const requestBtn = document.getElementById('request-fullscreen-btn') as HTMLButtonElement;
      const target = document.getElementById('fullscreen-target') as HTMLElement;

      target.requestFullscreen = vi.fn().mockRejectedValue(new Error('Fullscreen error'));
      
       // Should not throw
       expect(() => {
         requestBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Openable Elements', () => {
    it('should handle elements with openable methods', () => {
      document.body.innerHTML = `
        <button type="button" id="toggle-openable-btn" command="toggle-openable" commandfor="openable-element">Toggle</button>
        <div id="openable-element">Openable content</div>
      `;

      const toggleBtn = document.getElementById('toggle-openable-btn') as HTMLButtonElement;
      const openable = document.getElementById('openable-element') as HTMLElement;

      // Mock openable methods
      (openable as any).toggleOpenable = vi.fn();
      
       toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       expect((openable as any).toggleOpenable).toHaveBeenCalled();
    });

    it('should handle elements without openable methods gracefully', () => {
      document.body.innerHTML = `
        <button type="button" id="toggle-openable-btn" command="toggle-openable" commandfor="regular-element">Toggle</button>
        <div id="regular-element">Regular content</div>
      `;

      const toggleBtn = document.getElementById('toggle-openable-btn') as HTMLButtonElement;

       // Should not throw even if element doesn't have openable methods
       expect(() => {
         toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
       }).not.toThrow();
    });
  });

  describe('Command Event Dispatch', () => {
    it('should dispatch command events for future commands', () => {
      document.body.innerHTML = `
        <button type="button" id="test-btn" command="toggle" commandfor="test-details">Toggle</button>
        <details id="test-details">
          <summary>Test</summary>
          <p>Content</p>
        </details>
      `;

      const button = document.getElementById('test-btn') as HTMLButtonElement;
      const details = document.getElementById('test-details') as HTMLDetailsElement;
      let eventFired = false;

      details.addEventListener('command', (e) => {
        expect(e.type).toBe('command');
        expect((e as any).command).toBe('toggle');
        expect((e as any).source).toBe(button);
        eventFired = true;
      });

       button.dispatchEvent(new Event('click', { bubbles: true }));
       expect(eventFired).toBe(true);
    });

    it('should respect preventDefault on command events', () => {
      document.body.innerHTML = `
        <button type="button" id="test-btn" command="toggle" commandfor="test-details">Toggle</button>
        <details id="test-details">
          <summary>Test</summary>
          <p>Content</p>
        </details>
      `;

      const button = document.getElementById('test-btn') as HTMLButtonElement;
      const details = document.getElementById('test-details') as HTMLDetailsElement;

      details.addEventListener('command', (e) => {
        e.preventDefault();
      });

       const initialState = details.open;
       button.dispatchEvent(new Event('click', { bubbles: true }));

       // Should not change state if preventDefault was called
       expect(details.open).toBe(initialState);
    });
  });

  describe('Security and Permissions', () => {
    it('should respect focus requirements for show-picker', () => {
      document.body.innerHTML = `
        <button type="button" id="picker-btn" command="show-picker" commandfor="file-input">Browse</button>
        <input type="file" id="file-input">
      `;

      const pickerBtn = document.getElementById('picker-btn') as HTMLButtonElement;
      const fileInput = document.getElementById('file-input') as HTMLInputElement;

      fileInput.showPicker = vi.fn();
      
      // Mock document not having focus
      document.hasFocus = vi.fn().mockReturnValue(false);

      pickerBtn.click();
      
      // Should not call showPicker if document doesn't have focus
      expect(fileInput.showPicker).not.toHaveBeenCalled();
    });

    it('should handle missing Web APIs gracefully', () => {
      document.body.innerHTML = `
        <button type="button" id="share-btn" command="share" commandfor="share-content">Share</button>
        <span id="share-content">Test content</span>
      `;

      const shareBtn = document.getElementById('share-btn') as HTMLButtonElement;

      // Remove share API
      delete (navigator as any).share;

      // Should not throw even if API is not available
      expect(() => {
        shareBtn.click();
      }).not.toThrow();
    });
  });
});

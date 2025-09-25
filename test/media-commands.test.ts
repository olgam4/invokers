import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src';
import { registerMediaCommands } from '../src/commands/media';

describe('Media Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // Mock AnimationEvent for test environment
    if (typeof AnimationEvent === 'undefined') {
      global.AnimationEvent = class AnimationEvent extends Event {
        animationName: string;
        constructor(type: string, eventInitDict?: AnimationEventInit) {
          super(type, eventInitDict);
          this.animationName = eventInitDict?.animationName || '';
        }
      } as any;
    }

    registerMediaCommands(manager);
  });

  describe('--animate command', () => {
    it('should apply animation style to target element', async () => {
      document.body.innerHTML = `
        <button command="--animate:fade-in" commandfor="target">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.style.animation).toContain('invokers-fade-in');
      expect(target.style.animation).toContain('0.5s');
      expect(target.style.animation).toContain('ease-in-out');
    });

    it('should clear previous animation styles before applying new one', async () => {
      document.body.innerHTML = `
        <button command="--animate:bounce" commandfor="target">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      // Set an initial animation style
      target.style.animation = 'invokers-fade-in 0.5s ease-in-out 0s 1';

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.style.animation).toContain('invokers-bounce');
      expect(target.style.animation).not.toContain('invokers-fade-in');
    });

    it('should not apply animation for invalid animation type', async () => {
      document.body.innerHTML = `
        <button command="--animate:invalid-animation" commandfor="target">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Invalid animation should not apply any animation style
      expect(target.style.animation).toBe('');
    });

    it('should support custom duration, delay, easing, and iterations via parameters', async () => {
      document.body.innerHTML = `
        <button command="--animate:bounce:duration:1s:delay:0.5s:easing:ease-out:iterations:2" commandfor="target">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.style.animation).toBe('invokers-bounce 1s ease-out 0.5s 2');
    });

    it('should support data attributes for animation options', async () => {
      document.body.innerHTML = `
        <button command="--animate:fade-in" commandfor="target"
                data-animate-duration="2s"
                data-animate-delay="1s"
                data-animate-easing="linear"
                data-animate-iterations="3">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.style.animation).toBe('invokers-fade-in 2s linear 1s 3');
    });

    it('should support all valid animation types', async () => {
      const validAnimations = [
        'fade-in', 'fade-out', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
        'bounce', 'shake', 'pulse', 'flip', 'rotate-in', 'zoom-in', 'zoom-out',
        'spin', 'wobble', 'jello', 'heartbeat', 'rubber-band'
      ];

      for (const animation of validAnimations) {
        document.body.innerHTML = `
          <button command="--animate:${animation}" commandfor="target">Animate</button>
          <div id="target" class="animated-element">Content</div>
        `;

        const button = document.querySelector('button')!;
        const target = document.querySelector('#target')!;

        button.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(target.style.animation).toContain(`invokers-${animation}`);
        expect(target.style.animation).toContain('0.5s');
        expect(target.style.animation).toContain('ease-in-out');

        // Clean up for next iteration
        target.style.animation = '';
      }
    });

    it('should clean up animation style after timeout fallback', async () => {
      document.body.innerHTML = `
        <button command="--animate:fade-in" commandfor="target">Animate</button>
        <div id="target" class="animated-element">Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Initially should have animation
      expect(target.style.animation).toContain('invokers-fade-in');

      // Wait for the fallback timeout (duration 0.5s + 100ms buffer = 600ms)
      await new Promise(resolve => setTimeout(resolve, 650));

      // Should be cleaned up by the fallback timeout
      expect(target.style.animation).toBe('');
    });
  });
});
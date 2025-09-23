import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveTargets } from '../src/target-resolver';

describe('Target Resolver', () => {
  let container: HTMLElement;
  let invoker: HTMLElement;
  let target1: HTMLElement;
  let target2: HTMLElement;
  let nestedTarget: HTMLElement;

  beforeEach(() => {
    // Set up DOM structure for testing
    container = document.createElement('div');
    container.id = 'container';

    invoker = document.createElement('button');
    invoker.id = 'invoker';

    target1 = document.createElement('div');
    target1.id = 'target1';
    target1.className = 'target';

    target2 = document.createElement('div');
    target2.id = 'target2';
    target2.className = 'target';

    nestedTarget = document.createElement('span');
    nestedTarget.id = 'nested';
    nestedTarget.className = 'nested';

    // Build DOM structure: container > invoker, target1, target2 > nestedTarget
    container.appendChild(invoker);
    container.appendChild(target1);
    container.appendChild(target2);
    target1.appendChild(nestedTarget);

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('ID Selectors', () => {
    it('should resolve ID selectors with # prefix', () => {
      const result = resolveTargets('#target1', invoker);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(target1);
    });

    it('should return empty array for non-existent IDs', () => {
      const result = resolveTargets('#nonexistent', invoker);
      expect(result).toHaveLength(0);
    });
  });

  describe('Global CSS Selectors', () => {
    it('should resolve class selectors', () => {
      const result = resolveTargets('.target', invoker);
      expect(result).toHaveLength(2);
      expect(result).toContain(target1);
      expect(result).toContain(target2);
    });

    it('should resolve complex selectors', () => {
      const result = resolveTargets('#container .target', invoker);
      expect(result).toHaveLength(2);
      expect(result).toContain(target1);
      expect(result).toContain(target2);
    });

    it('should return empty array for invalid selectors', () => {
      const result = resolveTargets('[invalid', invoker);
      expect(result).toHaveLength(0);
    });
  });

  describe('Contextual Selectors', () => {
    describe('@closest()', () => {
      it('should find closest ancestor matching selector', () => {
        const result = resolveTargets('@closest(div)', nestedTarget);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(target1);
      });

      it('should return empty array if no matching ancestor found', () => {
        const result = resolveTargets('@closest(.nonexistent)', invoker);
        expect(result).toHaveLength(0);
      });
    });

    describe('@child()', () => {
      it('should find first child matching selector', () => {
        const result = resolveTargets('@child(.nested)', target1);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(nestedTarget);
      });

      it('should return empty array if no matching child found', () => {
        const result = resolveTargets('@child(.nonexistent)', invoker);
        expect(result).toHaveLength(0);
      });
    });

    describe('@children()', () => {
      it('should find all children matching selector', () => {
        // Add multiple nested elements
        const nested1 = document.createElement('span');
        nested1.className = 'nested';
        const nested2 = document.createElement('span');
        nested2.className = 'nested';

        target1.appendChild(nested1);
        target1.appendChild(nested2);

        const result = resolveTargets('@children(.nested)', target1);
        expect(result).toHaveLength(3); // nestedTarget + nested1 + nested2
        expect(result).toContain(nestedTarget);
        expect(result).toContain(nested1);
        expect(result).toContain(nested2);

        // Clean up
        target1.removeChild(nested1);
        target1.removeChild(nested2);
      });

      it('should return empty array if no matching children found', () => {
        const result = resolveTargets('@children(.nonexistent)', invoker);
        expect(result).toHaveLength(0);
      });
    });

    it('should return empty array for invalid @ syntax', () => {
      const result = resolveTargets('@invalid(selector)', invoker);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for malformed @ selectors', () => {
      const result = resolveTargets('@closest', invoker);
      expect(result).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selectors', () => {
      const result = resolveTargets('', invoker);
      expect(result).toHaveLength(0);
    });

    it('should handle whitespace-only selectors', () => {
      const result = resolveTargets('   ', invoker);
      expect(result).toHaveLength(0);
    });

    it('should handle selectors with special characters that are still valid IDs', () => {
      const specialTarget = document.createElement('div');
      specialTarget.id = 'target-1_special';
      container.appendChild(specialTarget);

      const result = resolveTargets('target-1_special', invoker);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(specialTarget);

      container.removeChild(specialTarget);
    });
  });
});
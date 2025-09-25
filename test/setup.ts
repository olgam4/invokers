// Test setup file - enables debug mode for all tests
import { beforeEach } from 'vitest';

// Enable debug mode globally
beforeEach(() => {
  // Setup window.Invoker.debug = true for debug logging
  if (typeof window !== 'undefined') {
    (window as any).Invoker = (window as any).Invoker || {};
    (window as any).Invoker.debug = true;
  }
});

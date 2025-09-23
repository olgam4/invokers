/**
 * Enables advanced event triggering (e.g., `command-on`, `data-on-event`)
 * and dynamic data interpolation (e.g., `{{this.value}}`) in Invokers.
 *
 * Call this function once in your application if you want to use these features.
 * If not called, the code for these features will be tree-shaken out of your bundle.
 */
export declare function enableAdvancedEvents(): void;
/**
 * Rescans the document for elements with command-on attributes and attaches event listeners.
 * Useful for dynamic content added after initial page load.
 */
export declare function rescanCommandOnElements(): void;
//# sourceMappingURL=advanced-events.d.ts.map
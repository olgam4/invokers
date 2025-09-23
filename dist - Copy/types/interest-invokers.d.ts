/**
 * @file interest-invokers.ts
 * @summary Interest Invokers polyfill and TypeScript support for the Invokers library
 * @description
 * This module provides comprehensive support for Interest Invokers as specified in:
 * https://open-ui.org/components/interest-invokers.explainer/
 *
 * Based on the official polyfill by Mason Freed with TypeScript adaptation
 * and integration with the existing Invokers library patterns.
 *
 * @author Mason Freed (original polyfill), Patrick Glenn (TypeScript adaptation)
 * @license MIT / BSD (compatible with original polyfill license)
 */
/**
 * Represents an InterestEvent as defined in the Interest Invokers specification
 */
export interface InterestEventInit extends EventInit {
    source?: Element;
}
export interface InterestEvent extends Event {
    readonly source: Element | null;
}
export interface InterestInvokerElement {
    interestForElement: Element | null;
}
declare global {
    interface InterestEventInit extends EventInit {
        source?: Element;
    }
    interface InterestEvent extends Event {
        readonly source: Element | null;
    }
    interface HTMLButtonElement extends InterestInvokerElement {
    }
    interface HTMLAnchorElement extends InterestInvokerElement {
    }
    interface HTMLAreaElement extends InterestInvokerElement {
    }
    interface SVGAElement extends InterestInvokerElement {
    }
    interface Window {
        interestForPolyfillInstalled?: boolean;
        interestForUsePolyfillAlways?: boolean;
    }
}
/**
 * Feature detection function to check if Interest Invokers are natively supported
 */
export declare function isInterestInvokersSupported(): boolean;
/**
 * Apply the Interest Invokers polyfill
 */
export declare function applyInterestInvokers(): void;
/**
 * Create an InterestEvent
 */
export declare function createInterestEvent(type: "interest" | "loseinterest", source?: Element): InterestEvent;
//# sourceMappingURL=interest-invokers.d.ts.map
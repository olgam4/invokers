/**
 * @file polyfill.ts
 * @summary A high-fidelity polyfill for the W3C/WHATWG HTML Invoker Buttons proposal.
 * @license MIT (Assumed from project context)
 * @author Keith Cirkel, Luke Warlow (original authors of explainer/polyfill)
 * @description This code implements the proposed `command` and `commandfor` attributes for HTMLButtonElement
 *              and the `CommandEvent` interface, allowing declarative UI interactions in browsers
 *              that do not yet natively support these features.
 *              It includes handling for popovers and dialogs, and a mechanism for custom commands.
 */
export declare function isSupported(): boolean;
/**
 * Represents a declarative `command` event dispatched from an invoker button to its target.
 * This class mirrors the proposed W3C/WHATWG `CommandEvent` interface.
 */
declare global {
    interface CommandEventInit extends EventInit {
        command?: string;
        source?: Element;
    }
    interface CommandEvent extends Event {
        readonly command: string;
        readonly source: HTMLButtonElement | null;
    }
}
declare global {
    interface HTMLElement {
        oncommand: EventListenerOrEventListenerObject | null;
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
    interface HTMLButtonElement {
        /**
         * Gets or sets the command string for the button.
         */
        command: string;
        /**
         * Gets or sets the element controlled by the button.
         */
        commandForElement: Element | null;
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
    interface HTMLInputElement {
        /**
         * Gets or sets the command string for the input.
         */
        command: string;
        /**
         * Gets or sets the element controlled by the input.
         */
        commandForElement: Element | null;
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
    interface HTMLTextAreaElement {
        /**
         * Gets or sets the command string for the textarea.
         */
        command: string;
        /**
         * Gets or sets the element controlled by the textarea.
         */
        commandForElement: Element | null;
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
    interface HTMLAnchorElement {
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
    interface HTMLAreaElement {
        /**
         * Gets or sets the element controlled by the interest invoker.
         */
        interestForElement: Element | null;
    }
}
/**
 * Applies the Invoker Buttons polyfill to the current environment.
 * This should be called once to enable the `command`/`commandfor` attributes and `CommandEvent`.
 */
export declare function apply(): void;
//# sourceMappingURL=polyfill.d.ts.map
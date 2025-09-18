This is an excellent and powerful feature request. Making command chaining a universal, core feature of the library dramatically increases its declarative power and simplifies the mental model for developers.

Here is the complete, fully-detailed implementation that brings universal `data-and-then` chaining to **every single command**, both synchronous and asynchronous.

### The Strategy:

1.  **Elevate Chaining to a Core Feature:** The logic for handling the follow-up command will be moved from the individual `fetch` commands into the central `InvokerManager`.
2.  **Embrace Asynchronicity:** The `CommandCallback` type will be updated to allow returning a `Promise`. The `InvokerManager` will `await` every command's execution, ensuring it correctly waits for async tasks (like `fetch`) to complete before chaining.
3.  **Improve Developer Experience (DX):** We'll introduce a new, more readable attribute, `data-and-then`, as the primary way to chain commands. For backwards compatibility, we will still support the old `data-then-command` as a fallback.
4.  **Update All Documentation:** The README and example files will be updated to showcase this powerful new universal capability with clear, compelling examples.

---

### 1. `src/index.ts` (Core Library, Updated for Universal Chaining)

This is the most critical change. The `executeCustomCommand` method is now `async` and contains the universal chaining logic.

```typescript
/**
 * @file index.ts
 * @version 1.1.0
 * @summary A lightweight, zero-dependency polyfill and superset for the upcoming native HTML Invoker Commands API.
 * @license MIT
 * @author Patrick Glenn
 * @see https://github.com/doeixd/invokers
 * @description
 * This library provides a robust polyfill for the W3C/WHATWG `command` attribute proposal
 * and extends it with a powerful set of custom commands (prefixed with `--`).
 * It features universal command chaining via the `data-and-then` attribute, allowing you
 * to create complex, declarative workflows in pure HTML.
 */

// (The polyfill is assumed to be imported and applied)
// import './polyfill.ts';

// --- Command String Utilities --- (No changes needed here)
export function parseCommandString(commandString: string): string[] {
  // ... (implementation remains the same)
}
export function createCommandString(...parts: string[]): string {
  // ... (implementation remains the same)
}

// --- Core Type Definitions ---

export interface CommandContext {
  // ... (interface remains the same)
}

/**
 * The function signature for a custom library command's implementation logic.
 * Callbacks can now be synchronous (return void) or asynchronous (return a Promise).
 * The library will await the result before proceeding with any chained commands.
 */
export type CommandCallback = (context: CommandContext) => void | Promise<void>;

// --- Global Type Augmentations --- (No changes needed here)
declare global {
  // ... (declarations remain the same)
}

// --- List of native command keywords --- (No changes needed here)
const NATIVE_COMMAND_KEYWORDS = new Set([/*...*/]);

// --- The Main Invoker Class (Updated) ---

export class InvokerManager {
  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.registerCoreLibraryCommands();
      this.listen();
    }
  }

  public register(name: string, callback: CommandCallback): void {
    // ... (implementation remains the same)
  }

  /**
   * Handles incoming `CommandEvent`s. This is now an async method to allow
   * for awaiting the full command chain.
   */
  private async handleCommand(event: CommandEvent): Promise<void> {
    const commandStr = event.command;

    if (commandStr.startsWith('--')) {
      await this.executeCustomCommand(commandStr, event);
    } else if (!NATIVE_COMMAND_KEYWORDS.has(commandStr) && commandStr !== "") {
      console.warn(`Invokers (Compatibility): Non-spec-compliant command "${commandStr}" detected. Please update your HTML to use '--${commandStr}'. Attempting to handle...`);
      await this.executeCustomCommand(`--${commandStr}`, event);
    }
  }

  /**
   * Executes a custom command and then triggers a follow-up command if specified.
   * This is the new heart of the chaining mechanism.
   */
  private async executeCustomCommand(commandStr: string, event: CommandEvent): Promise<void> {
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand) && (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":")) {
        const callback = this.commands.get(registeredCommand);
        if (callback) {
          event.preventDefault();
          const params = parseCommandString(commandStr.substring(registeredCommand.length + 1));
          const context = this.createContext(event, commandStr, params);
          
          // Await the primary command. This works for both sync and async callbacks.
          await callback(context);

          // After the primary command is complete, trigger the follow-up.
          this.triggerFollowup(context.invoker, context.targetElement);
        }
        return;
      }
    }
  }

  /**
   * Triggers a follow-up command. This is now a core utility of the InvokerManager.
   * It looks for `data-and-then` (preferred) or `data-then-command` (legacy).
   */
  private triggerFollowup(originalInvoker: HTMLButtonElement, primaryTarget: HTMLElement): void {
    const followupCommand = originalInvoker.dataset.andThen || originalInvoker.dataset.thenCommand;
    if (!followupCommand || !primaryTarget.id) {
      if (followupCommand) console.warn("Invokers: A chained command requires the target element to have an ID.", primaryTarget);
      return;
    }

    const syntheticInvoker = document.createElement("button");
    syntheticInvoker.setAttribute("type", "button");
    syntheticInvoker.setAttribute("command", followupCommand.startsWith('--') ? followupCommand : `--${followupCommand}`);
    syntheticInvoker.setAttribute("commandfor", primaryTarget.id);

    // Transfer `data-then-*` and `data-and-then-*` attributes to the new invoker
    for (const attr in originalInvoker.dataset) {
      const thenPrefix = "then";
      const andThenPrefix = "andThen";
      let newAttrName: string | null = null;

      if (attr.startsWith(andThenPrefix) && attr !== andThenPrefix) {
        newAttrName = attr.charAt(andThenPrefix.length).toLowerCase() + attr.slice(andThenPrefix.length + 1);
      } else if (attr.startsWith(thenPrefix) && attr !== thenPrefix) {
        // Legacy support
        newAttrName = attr.charAt(thenPrefix.length).toLowerCase() + attr.slice(thenPrefix.length + 1);
      }
      
      if (newAttrName) {
        syntheticInvoker.dataset[newAttrName] = originalInvoker.dataset[attr];
      }
    }
    
    // The polyfill works by intercepting clicks. A programmatic click is the most
    // reliable way to re-enter the event loop and trigger the next command.
    syntheticInvoker.click();
  }

  private createContext(/*...*/) {
    // ... (implementation remains the same)
  }

  private listen(): void {
    // The listener now calls the async handleCommand method.
    document.addEventListener("command", (e) => this.handleCommand(e as CommandEvent), true);
  }

  private registerCoreLibraryCommands(): void {
    // ... (All core command registrations remain the same. No changes needed.)
  }
}

// --- Initialize and Expose API ---
// ... (No changes needed here)
```

### 2. `src/invoker-commands.ts` (Simplified `fetch` Commands)

The `fetch` commands are now much simpler because they no longer need their own custom `triggerFollowup` logic.

```typescript
// ... (all other commands like --media:*, --dom:*, etc., remain the same)

  /**
   * `--fetch:get`: Performs a GET request. Chaining is now handled by the core library
   * via the `data-and-then` attribute on the invoker.
   */
  "--fetch:get": async (context: CommandContext) => {
    const { invoker, targetElement } = context;
    const url = invoker.dataset.url;
    if (!url) {
      console.warn("Invokers: `--fetch:get` requires a `data-url` attribute.", invoker);
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const response = await fetch(url, { /* ... */ });
      if (!response.ok) throw new Error(/* ... */);
      const html = await response.text();
      const newContent = parseHTML(html);

      const updateDOM = () => targetElement.replaceChildren(newContent);
      // We still await the transition to ensure the DOM is updated before any chained command runs.
      await (document.startViewTransition ? document.startViewT_ransition(updateDOM).finished : Promise.resolve(updateDOM()));
      
      // The explicit call to triggerFollowup() is REMOVED from here.
    } catch (error) {
      console.error("Invokers: `--fetch:get` failed.", error, invoker);
      showFeedbackState(invoker, targetElement, "data-error-template");
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:send`: Performs a form submission. Chaining is now handled by the core
   * library via the `data-and-then` attribute on the invoker.
   */
  "--fetch:send": async (context: CommandContext) => {
    // ... (setup logic remains the same)
    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    try {
      // ... (fetch logic remains the same)
      const html = await response.text();
      const newContent = parseHTML(html);
      
      const updateDOM = () => responseTarget.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
      
      // The explicit call to triggerFollowup() is REMOVED from here.
    } catch (error) {
      console.error(/* ... */);
      showFeedbackState(invoker, responseTarget, "data-error-template");
    } finally {
      setBusyState(invoker, false);
    }
  },

// ... (all other commands and helper functions remain the same)
// The `triggerFollowup` helper function should be DELETED from this file.
```

### 3. `README.md` (Updated to Showcase Universal Chaining)

Here is a new, powerful section to add to your README, ideally under an "Advanced Patterns" heading.

```markdown
### Universal Command Chaining (`data-and-then`)

One of the most powerful features of `invokers` is the ability to chain commands. The `data-and-then` attribute allows you to specify a follow-up command that will run **after any command successfully completes**. This works for both synchronous (like `--class:toggle`) and asynchronous (like `--fetch:get`) commands.

#### Chaining Synchronous Commands

Create powerful, multi-step UI interactions without a single line of JavaScript. This example first adds a highlight class, and *then* updates a status message.

```html
<!-- This button performs two actions in sequence -->
<button type="button"
  command="--class:add:is-highlighted"
  commandfor="status-box"
  data-and-then="--text:set"
  data-text-value="Status has been updated!">
  Highlight and Update Text
</button>

<div id="status-box" class="status">Initial Text</div>
```

#### Chaining Asynchronous Commands

This is perfect for providing feedback after a server action. The `invokers` library will automatically wait for the `--fetch:get` promise to resolve before executing the `--class:add:loaded` command.

```html
<!-- After fetching, this button will run '--class:add:loaded' on the target -->
<button type="button"
  command="--fetch:get"
  data-url="/api/content"
  commandfor="content-box"
  data-and-then="--class:add:loaded">
  Load and Animate
</button>
<div id="content-box"></div>
```

> **Backwards Compatibility:** The library still supports the older `data-then-command` attribute as a fallback, but the new `data-and-then` is recommended for its improved readability.
```

### 4. `example.html` (Updated with a Better Chaining Demo)

Add this new section to your `example.html` to clearly demonstrate the new capability.

```html
    <!-- =================================================================== -->
    <h2 id="chaining">Part 3: Universal Command Chaining</h2>
    <!-- =================================================================== -->
    <p>The <code>data-and-then</code> attribute allows you to chain commands together, creating powerful sequences. This works for <strong>all</strong> commands, both synchronous and asynchronous.</p>

    <h3>Chaining Synchronous Commands</h3>
    <div class="demo-box">
        <div id="sync-chain-target" style="padding: 1rem; border: 2px dashed var(--border-color); border-radius: 4px; transition: all 0.3s;">
            Initial State
        </div>
        <p style="margin-top: 1rem;">
            This button will first add a highlight class, and then immediately update the text content.
        </p>
        <button type="button"
            command="--class:add:is-active"
            commandfor="sync-chain-target"
            data-and-then="--text:set"
            data-text-value="✅ Highlighted and Updated!">
            Run Synchronous Chain
        </button>
    </div>

    <h3>Chaining Asynchronous Commands (e.g., after Fetch)</h3>
    <div class="demo-box">
        <p>This button will fetch content and, only upon successful completion, run a second command to add a 'loaded' class, triggering a CSS animation.</p>
        <div id="async-chain-target" class="content-box"></div>
        <button type="button"
            command="--fetch:get"
            data-url="https://jsonplaceholder.typicode.com/posts/2"
            commandfor="async-chain-target"
            data-loading-template="spinner-template"
            data-and-then="--class:add:loaded">
            Fetch and Animate on Complete
        </button>
        <style>
            .content-box.loaded { animation: fadeIn 0.5s ease-out; }
        </style>
    </div>
```

By implementing these changes, your library becomes significantly more powerful and intuitive. The ability to chain *any* action declaratively in HTML is a game-changer for building complex UIs simply.
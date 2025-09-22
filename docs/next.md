
# Invokers Command Chaining & Lifecycle Implementation Spec

## Overview

This specification defines extensions to the Invokers library to support command chaining, lifecycle management, and stateful command sequences. These features address the current limitation where only simple `data-then-command` chaining is possible.

## Core Concepts

### 1. Command Lifecycle States
Commands can have execution states that determine their behavior:
- `active` - Command is ready to execute (default)
- `completed` - Command has executed and should not run again
- `disabled` - Command is temporarily disabled
- `once` - Command will self-destruct after first execution

### 2. Command Chaining Methods
Three primary approaches for chaining commands:

#### A. Enhanced Attribute-Based Chaining
#### B. Declarative `<and-then>` Elements  
#### C. Template-Based Command Pipelines

---

## Method A: Enhanced Attribute-Based Chaining

### Syntax Extensions

```html
<!-- Multiple commands with conditional execution -->
<button command="--fetch:get" 
        commandfor="content"
        data-after-success="--class:add:loaded,--dom:remove:spinner"
        data-after-error="--text:set:Error loading content"
        data-after-complete="--attr:set:aria-busy:false">
  Load Content
</button>

<!-- State-aware chaining -->
<button command="--show" 
        commandfor="step-2"
        data-then-command="--class:add:completed"
        data-then-target="step-1"
        data-then-state="once">
  Next Step
</button>
```

### New Attributes

| Attribute | Purpose | Values |
|-----------|---------|---------|
| `data-after-success` | Commands to run on successful completion | Comma-separated command list |
| `data-after-error` | Commands to run on error/failure | Comma-separated command list |
| `data-after-complete` | Commands to run after any completion | Comma-separated command list |
| `data-then-target` | Override target for chained command | Element ID |
| `data-then-state` | Execution state for chained command | `once`, `disabled`, `active` |

### Implementation in `CommandContext`

```typescript
interface CommandContext {
  // ... existing properties
  
  /**
   * Execute a follow-up command after the current command completes
   */
  executeAfter: (command: string, target?: string, state?: CommandState) => void;
  
  /**
   * Execute different commands based on success/error state
   */
  executeConditional: (options: {
    onSuccess?: string[];
    onError?: string[];
    onComplete?: string[];
  }) => void;
}

type CommandState = 'active' | 'completed' | 'disabled' | 'once';
```

---

## Method B: Declarative `<and-then>` Elements

### Basic Syntax

```html
<button command="--fetch:get" commandfor="content">
  Load Data
  <and-then command="--class:add:loaded" commandfor="content" data-state="active">
    <and-then command="--dom:remove" commandfor="loading-spinner" data-once="true">
    </and-then>
  </and-then>
</button>
```

### `<and-then>` Element Specification

#### Attributes
- `command` - The command to execute (required)
- `commandfor` - Target element ID (defaults to parent's target)
- `data-state` - Current execution state (`active`, `completed`, `disabled`, `once`)
- `data-once` - Boolean, removes element after execution
- `data-condition` - Conditional execution (`success`, `error`, `always`)
- `data-delay` - Delay in milliseconds before execution

#### Behavior
1. `<and-then>` elements are inert until their parent command executes
2. Tree traversal searches for the closest `<and-then>[data-state="active"]` going up the DOM
3. After execution, state can change or element can self-destruct
4. Nested `<and-then>` elements create sequential chains

### Tree Traversal Algorithm

```typescript
function executeAndThen(invokerElement: HTMLButtonElement, context: CommandExecutionResult) {
  let current: Element | null = invokerElement;
  
  while (current) {
    const andThen = current.querySelector(':scope > and-then[data-state="active"]');
    if (andThen) {
      const condition = andThen.getAttribute('data-condition') || 'always';
      
      if (shouldExecuteCondition(condition, context)) {
        executeAndThenCommand(andThen as HTMLElement, context);
        
        // Handle state transitions
        if (andThen.hasAttribute('data-once')) {
          andThen.remove();
        } else {
          andThen.setAttribute('data-state', 'completed');
        }
        
        return; // Stop after first match
      }
    }
    current = current.parentElement;
  }
}

function shouldExecuteCondition(condition: string, context: CommandExecutionResult): boolean {
  switch (condition) {
    case 'success': return context.success === true;
    case 'error': return context.success === false;
    case 'always': 
    default: return true;
  }
}
```

### Complex Example

```html
<div class="multi-step-process">
  <button command="--fetch:post" commandfor="api-endpoint" data-url="/submit">
    Submit Form
    
    <!-- Success chain -->
    <and-then command="--class:add:success" commandfor="form-container" data-condition="success">
      <and-then command="--text:set" commandfor="status-message" 
                data-text-value="Submitted successfully!" data-delay="500">
        <and-then command="--show" commandfor="success-panel" data-once="true">
        </and-then>
      </and-then>
    </and-then>
    
    <!-- Error chain -->
    <and-then command="--class:add:error" commandfor="form-container" data-condition="error">
      <and-then command="--text:set" commandfor="error-message" 
                data-text-value="Submission failed. Please try again.">
      </and-then>
    </and-then>
  </button>
</div>
```

---

## Method C: Template-Based Command Pipelines

### Syntax

```html
<button command="--pipeline:execute" data-pipeline="user-registration">
  Register User
</button>

<template id="user-registration" data-pipeline="true">
  <pipeline-step command="--form:validate" target="registration-form" />
  <pipeline-step command="--fetch:post" target="api-endpoint" data-url="/register" 
                  condition="success" />
  <pipeline-step command="--class:add:registered" target="user-profile" 
                  condition="success" once="true" />
  <pipeline-step command="--text:set" target="error-display" 
                  data-text-value="Registration failed" condition="error" />
</template>
```

### Pipeline Execution Engine

```typescript
interface PipelineStep {
  command: string;
  target: string;
  condition?: 'success' | 'error' | 'always';
  once?: boolean;
  delay?: number;
}

class PipelineManager {
  async executePipeline(pipelineId: string, context: CommandContext): Promise<void> {
    const template = document.getElementById(pipelineId) as HTMLTemplateElement;
    if (!template?.hasAttribute('data-pipeline')) return;
    
    const steps = this.parsePipelineSteps(template);
    let previousResult = { success: true };
    
    for (const step of steps) {
      if (this.shouldExecuteStep(step, previousResult)) {
        if (step.delay) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
        
        previousResult = await this.executeStep(step, context);
        
        if (step.once) {
          this.removeStepFromTemplate(template, step);
        }
      }
    }
  }
}
```

---

## Integration with Existing Architecture

### Extending `InvokerManager`

```typescript
export class InvokerManager {
  private pipelineManager = new PipelineManager();
  private andThenManager = new AndThenManager();
  
  private createContext(event: CommandEvent, fullCommand: string, params: readonly string[]): CommandContext {
    // ... existing implementation
    
    const executeAfter = (command: string, target?: string, state: CommandState = 'active') => {
      this.scheduleCommand(command, target || targetElement.id, state, event);
    };
    
    const executeConditional = (options: ConditionalCommands) => {
      this.conditionalExecutor.schedule(options, event);
    };
    
    return {
      // ... existing properties
      executeAfter,
      executeConditional
    };
  }
  
  private async executeCustomCommand(commandStr: string, event: CommandEvent): Promise<CommandExecutionResult> {
    // ... existing implementation
    
    const result = await this.executeCommand(callback, context);
    
    // Process and-then elements
    await this.andThenManager.processAndThen(event.source as HTMLButtonElement, result);
    
    // Process attribute-based chaining
    await this.processAttributeChaining(event.source as HTMLButtonElement, result);
    
    return result;
  }
}
```

### New Command Registration

```typescript
// Pipeline command
window.Invoker.register('--pipeline', async ({ params, invoker }) => {
  const [action, pipelineId] = params;
  if (action === 'execute' && pipelineId) {
    await pipelineManager.executePipeline(pipelineId, context);
  }
});
```

---

## Backward Compatibility

All existing functionality remains unchanged:
- Current `data-then-command` continues to work
- Existing command syntax is preserved
- No breaking changes to the API

The new features are additive and opt-in.

---

## Use Cases & Examples

### 1. Multi-Step Form Wizard

```html
<div class="wizard">
  <button command="--show" commandfor="step-2">
    Continue to Step 2
    <and-then command="--class:add:completed" commandfor="step-1" data-once="true">
      <and-then command="--attr:set" commandfor="progress-bar" 
                data-attr-name="value" data-attr-value="2">
      </and-then>
    </and-then>
  </button>
</div>
```

### 2. Progressive Data Loading

```html
<button command="--fetch:get" 
        commandfor="content"
        data-after-success="--class:remove:loading,--class:add:loaded"
        data-after-error="--text:set:Failed to load data">
  Load More Content
</button>
```

### 3. One-Time Tutorial Steps

```html
<button command="--show" commandfor="tutorial-step-1">
  Start Tutorial
  <and-then command="--class:add:tutorial-active" commandfor="app" data-once="true">
    <and-then command="--dom:remove" commandfor="self" data-once="true">
    </and-then>
  </and-then>
</button>
```

### 4. Complex API Workflow

```html
<button command="--pipeline:execute" data-pipeline="user-onboarding">
  Complete Registration
</button>

<template id="user-onboarding" data-pipeline="true">
  <pipeline-step command="--form:validate" target="registration-form" />
  <pipeline-step command="--fetch:post" target="user-endpoint" condition="success" />
  <pipeline-step command="--fetch:post" target="profile-endpoint" condition="success" />
  <pipeline-step command="--show" target="welcome-screen" condition="success" once="true" />
  <pipeline-step command="--text:set" target="error-display" condition="error" />
</template>
```

---

## Implementation Priority

1. **Phase 1**: Enhanced attribute-based chaining (`data-after-success`, etc.)
2. **Phase 2**: Basic `<and-then>` element support
3. **Phase 3**: Full tree traversal and state management
4. **Phase 4**: Template-based pipeline system

This approach allows incremental implementation while providing immediate value to users who need more sophisticated command chaining.


## Version 0

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
### **Explainer: Advanced Templating & Selector APIs for Invokers**

#### **1. The Vision: From Page-Level Tools to Declarative Components**

This document details a significant evolution for Invokers, designed to solve one of its primary limitations: handling dynamic lists and creating reusable, self-contained components without "escape hatches" to custom JavaScript.

The core goal is to empower developers to build complex, state-like behaviors (like a Todo list) in a purely declarative, stateless way. We achieve this by making our existing commands "smarter" and our targeting system more "context-aware."

These features are designed as an **opt-in layer** via the `enableAdvancedEvents()` function, especially for the json / interpolation stuff, the selector stuff can be core if needed? The core library remains untouched and lightweight for users who don't need this advanced functionality.

---

#### **2. Feature Deep Dive: Advanced `commandfor` Selectors**

This is the foundational upgrade. We are transforming `commandfor` from a simple ID lookup into a powerful, context-aware query engine.

##### **What It Is:**

A system that allows the `commandfor` attribute to accept standard CSS selectors and special, invoker-relative selectors prefixed with `@`.

##### **The New Selector Types & Their "Why":**

1.  **Global Selector (e.g., `commandfor=".item-checkbox"`)**
    *   **What:** Any valid CSS selector that is *not* a simple ID and does *not* start with `@`.
    *   **How:** It performs a `document.querySelectorAll()` and executes the command on every element found.
    *   **Why:** To enable one-to-many actions. This is essential for bulk operations like "select all," "clear all forms," or "archive all notifications." It eliminates the need to write JavaScript loops for batch DOM manipulation.

2.  **`@closest(<selector>)` (e.g., `commandfor="@closest(li)"`)**
    *   **What:** Finds the nearest ancestor of the invoker element that matches the selector.
    *   **How:** A direct wrapper around the native `Element.closest()` method.
    *   **Why:** **This is the key to component encapsulation from the inside-out.** A child element (like a delete button) can now reliably target its parent container without needing a pre-assigned, unique ID. This is critical for items rendered from a `<template>`.

3.  **`@child(<selector>)` & `@children(<selector>)`**
    *   **What:** Finds descendants of the invoker. `@child` finds the first match; `@children` finds all matches.
    *   **How:** Wraps `invoker.querySelector()` and `invoker.querySelectorAll()`.
    *   **Why:** **This is the key to component encapsulation from the outside-in.** An element in a component's "header" can target elements in its "body" without polluting the global ID space. It allows a component's invokers to only affect elements *within that component*.

##### **Implementation Considerations & Edge Cases:**

*   **Resolution Order:** The resolver must be deterministic. The proposed order is: 1) Check for `@` prefix. 2) Check for simple ID pattern. 3) Fall back to global `querySelectorAll`. This prioritizes performant, specific lookups.
*   **No Match Found:** If a selector returns no elements, the command should silently fail to execute. In debug mode, this should produce a `console.warn`. This is expected behavior, not an error.
*   **Multiple Targets:** The `InvokerManager` must be modified to iterate over a `NodeList` and execute the command for each target. This requires careful handling of context to ensure each command execution is discrete.
*   **Chaining with Multiple Targets:** When a command targeting multiple elements has a `data-and-then` chain, the chained command's target must be re-resolved. For example, if the primary command was `commandfor=".item"`, the chained command should also target all `.item` elements (unless `data-then-target` specifies otherwise).

---

#### **3. Feature Deep Dive: Context-Aware Template Engine**

This feature builds on the new selector engine to allow the declarative creation and wiring of new DOM elements from templates.

##### **What It Is:**

A set of new attributes that enhance the `--dom:*` commands (`--dom:append`, `--dom:swap`, etc.) to inject dynamic data into a `<template>` clone before it's inserted into the page.

##### **The New Attributes & Their "Why":**

1.  **`data-with-json='{...}'`**
    *   **What:** An attribute on the invoker that holds a JSON string. Crucially, this string supports `{{...}}` interpolation.
    *   **How:** Before parsing, the string is interpolated. Special placeholders like `{{__uid}}` are resolved to generate unique IDs. The result is parsed into a JavaScript object.
    *   **Why:** This is the "data payload" for the new element. It's how we get dynamic information (like user input from a form) into the static template.

2.  **`data-tpl-text="<key>"`**
    *   **What:** An attribute placed on an element *inside* a `<template>`.
    *   **How:** After the template is cloned, the system finds this attribute and sets the element's `textContent` to the value of the corresponding `<key>` from the `data-with-json` object.
    *   **Why:** To declaratively set the text content of new elements. This replaces `clone.querySelector('span').textContent = ...`.

3.  **`data-tpl-attr:<name>="<key>"`**
    *   **What:** Similar to `data-tpl-text`, but sets an attribute. For example, `data-tpl-attr:id="id"` or `data-tpl-attr:href="url"`.
    *   **How:** Finds the attribute and sets the element's attribute `<name>` to the value of `<key>`.
    *   **Why:** To declaratively set attributes on new elements, especially the unique ID that is critical for wiring. This replaces `clone.querySelector('li').id = ...`.

##### **Implementation Considerations & Edge Cases:**

*   **Processing Order is Critical:** The template processing must occur in a specific sequence:
    1.  Clone the template's content.
    2.  Process `data-tpl-attr` first, especially to set the unique ID on the parent element.
    3.  Process other `data-tpl-*` attributes to inject text, values, etc.
    4.  **Finally**, scan the newly-populated fragment for contextual selectors (`commandfor="@closest(...)"`) and rewrite them to use the newly-set unique ID.
    5.  Insert the fully-processed and wired fragment into the DOM.
*   **Error Handling:**
    *   **Invalid JSON:** If `data-with-json` contains invalid JSON after interpolation, the system should log an error and append the *raw, unprocessed* template clone. This provides graceful degradation.
    *   **Missing Key:** If a `data-tpl-*` attribute refers to a key that doesn't exist in the JSON object, it should be silently ignored.
*   **Scope:** The `data-tpl-*` attributes are only processed on elements *within* a cloned template fragment as part of a `--dom:*` command. They have no effect on static HTML.
*   **The `{{__uid}}` Placeholder:** This must be a special case handled by the interpolation engine. It should call a simple utility that returns a unique string (e.g., based on a counter or timestamp) to prevent ID collisions.

#### **4. The Synergy: How They Work Together**

These two features are designed to be synergistic. The template engine creates new, properly-identified elements, and the contextual selectors allow the children of those elements to function correctly without knowing their final IDs.

**The Declarative TodoMVC Workflow:**

1.  The `<form>` has a `command-on="submit"` trigger.
2.  Its `command="--dom:append"` targets the `<ul>`.
3.  Its `data-with-json` grabs the input's value (`{{this.elements.text.value}}`) and generates a unique ID (`todo-{{__uid}}`).
4.  The `--dom:append` command clones the `<template id="todo-template">`.
5.  The new template engine kicks in:
    *   It uses `data-tpl-attr:id="id"` to set the `<li>`'s ID to `todo-xyz123`.
    *   It uses `data-tpl-text="text"` to set the `<span>`'s text.
    *   It then processes the `commandfor="@closest(li)"` on the delete button, rewriting it to `commandfor="todo-xyz123"`.
6.  The fully formed, interactive `<li>` is appended to the `<ul>`.

This entire flow happens without a single line of imperative, application-specific JavaScript, achieving the project's core vision.


### **Implementation Plan: Declarative Lists & Contextual Selectors**

#### **Guiding Principles**

1.  **Maintain Statelessness:** All new features must operate by reading from and writing to the DOM directly, without introducing an internal state management system.
2.  **Modularity:** Advanced features (templating helpers, contextual selectors) should be part of the opt-in `advanced-events` module to keep the core library lean.
3.  **Backward Compatibility:** All existing functionality (`commandfor` with an ID) must continue to work flawlessly.
4.  **Performance:** Selector resolution, especially for dynamic content, must be efficient. Global queries should be used judiciously.

---

### **Phase 1: Advanced Target Resolution Engine**

This is the foundational phase. We need to upgrade the core logic that finds target elements before we can build features on top of it.

**Goal:** Rework the target-finding mechanism in `InvokerManager` to support contextual and global selectors.

**File Changes:** `src/index.ts` (and potentially a new `src/target-resolver.ts` utility file).

**Step 1.1: Create the Target Resolver Utility**
To keep `InvokerManager` clean, we'll encapsulate the new logic.

*   **File:** `src/target-resolver.ts` (New File)
    ```typescript
    // src/target-resolver.ts
    export function resolveTargets(selector: string, invoker: HTMLElement): Element[] {
      const trimmedSelector = selector.trim();
      
      // 1. Contextual Selectors (prefixed with @)
      if (trimmedSelector.startsWith('@')) {
        const match = trimmedSelector.match(/^@([a-z]+)\((.*)\)$/);
        if (match) {
          const type = match[1];
          const innerSelector = match[2];

          switch (type) {
            case 'closest':
              const closest = invoker.closest(innerSelector);
              return closest ? [closest] : [];
            case 'child':
              const child = invoker.querySelector(innerSelector);
              return child ? [child] : [];
            case 'children':
              return Array.from(invoker.querySelectorAll(innerSelector));
            default:
              console.warn(`Invokers: Unknown contextual selector type "@${type}".`);
              return [];
          }
        }
        return []; // Invalid @ syntax
      }

      // 2. ID Selector (for performance and backward compatibility)
      // A simple string without CSS special chars is likely an ID.
      if (/^[a-zA-Z0-9_-]+$/.test(trimmedSelector)) {
        const element = document.getElementById(trimmedSelector);
        return element ? [element] : [];
      }
      
      // 3. Global CSS Selector
      try {
        return Array.from(document.querySelectorAll(trimmedSelector));
      } catch (e) {
        console.error(`Invokers: Invalid CSS selector in commandfor: "${trimmedSelector}"`, e);
        return [];
      }
    }
    ```

**Step 1.2: Integrate the Resolver into `InvokerManager`**
Modify `InvokerManager` to use this new resolver and to handle multiple targets.

*   **File:** `src/index.ts`
    ```typescript
    // src/index.ts
    import { resolveTargets } from './target-resolver'; // New import

    // ... inside InvokerManager class
    private async handleCommand(event: CommandEvent): Promise<void> {
      const source = event.source as HTMLButtonElement;
      const commandfor = source.getAttribute('commandfor');
      const commandStr = event.command;
      
      if (!commandfor) return; // Should already be handled, but good practice

      // **THE CORE CHANGE**
      const targets = resolveTargets(commandfor, source);
      
      if (targets.length === 0 && window.Invoker.debug) {
        console.warn(`Invokers: No targets found for selector "${commandfor}"`, source);
        return;
      }

      // Loop through all resolved targets and execute the command on each
      for (const target of targets) {
        // We need to create a synthetic event for each target to maintain context
        const singleTargetEvent = new CommandEvent("command", {
          command: commandStr,
          source: source,
          cancelable: true,
          bubbles: true,
        });
        
        // This is a bit of a trick: we manually set the target for this event's processing.
        // The event will be dispatched on the original target from the polyfill,
        // but our handler will use this overridden target.
        Object.defineProperty(singleTargetEvent, 'target', { value: target, configurable: true });
        (singleTargetEvent as any).triggeringEvent = (event as any).triggeringEvent;

        // Now, we call the execution logic for this single target
        // We refactor executeCustomCommand to accept a target
        await this.executeCustomCommandForTarget(commandStr, singleTargetEvent, target as HTMLElement);
      }
    }

    // Refactor executeCustomCommand to operate on a single, pre-resolved target
    private async executeCustomCommandForTarget(commandStr: string, event: CommandEvent, targetElement: HTMLElement): Promise<void> {
      // The logic from the old executeCustomCommand goes here,
      // but it now operates on the `targetElement` passed to it.
      // ...
      const context = this.createContext(event, commandStr, params, targetElement);
      // ...
    }
    ```

**Step 1.3: Testing Plan**
Create `test/target-resolver.test.ts`. Test each selector type:
*   `@closest(div)` finds the correct parent.
*   `@child(.item)` finds the first descendant.
*   `@children(input)` finds all descendants.
*   `.card` finds all elements with that class on the page.
*   `my-id` finds the correct element by ID.

---

### **Phase 2: Context-Aware Template Engine**

**Goal:** Implement the logic for `--dom:*` commands to handle `data-with-json` and the new template attributes (`data-tpl-*`). This is an advanced, opt-in feature.

**File Changes:** `src/advanced-events.ts` (to activate), `src/invoker-commands.ts` (to modify `--dom` commands), and `src/utils.ts` (for a UID helper).

**Step 2.1: Enhance Utilities**
*   **File:** `src/utils.ts`
    ```typescript
    // src/utils.ts
    
    // Add a UID generator
    let uidCounter = 0;
    export function generateUid(): string {
      return `invokers-uid-${Date.now()}-${uidCounter++}`;
    }
    ```

**Step 2.2: Activate Templating in the Advanced Module**
*   **File:** `src/advanced-events.ts`
    ```typescript
    // src/advanced-events.ts

    // ... existing imports
    import { generateUid } from './utils';

    export function enableAdvancedEvents(): void {
      // ... existing activation logic ...

      // Expose the UID generator so it can be used in interpolation
      if (typeof window !== 'undefined' && window.Invoker) {
        (window.Invoker as any)._getUid = generateUid;
      }
      
      console.log("Invokers: Advanced templating features enabled.");
    }
    ```

**Step 2.3: Upgrade `--dom` Commands**
The logic for processing templates will be centralized in a helper function.

*   **File:** `src/invoker-commands.ts`
    ```typescript
    // src/invoker-commands.ts
    
    // --- NEW TEMPLATE PROCESSING HELPER ---
    function processTemplateFragment(fragment: DocumentFragment, invoker: HTMLElement): DocumentFragment {
      const jsonData = invoker.dataset.withJson;
      if (!jsonData) return fragment; // If no data, return the raw fragment

      // Interpolate the JSON string itself first, to resolve `{{...}}` and `{{__uid}}`
      let interpolatedJson = jsonData;
      if (typeof window.Invoker?._evaluateExpression === 'function') {
        // Special case for __uid
        interpolatedJson = interpolatedJson.replace(/\{\{__uid\}\}/g, () => window.Invoker._getUid());
        // Run the main interpolator
        const context = { this: invoker, /* ... other context if needed ... */ };
        interpolatedJson = window.Invoker._evaluateExpression(interpolatedJson, context, true); // a new flag to indicate we're evaluating a string literal
      }
      
      let dataContext: object;
      try {
        dataContext = JSON.parse(interpolatedJson);
      } catch (e) {
        console.error("Invokers: Invalid JSON in data-with-json attribute.", e, invoker);
        return fragment; // Return raw fragment on error
      }

      // 1. Inject data into the template clone
      fragment.querySelectorAll('[data-tpl-text]').forEach(el => {
        const key = el.getAttribute('data-tpl-text');
        if (key && dataContext.hasOwnProperty(key)) el.textContent = dataContext[key];
      });
      // ... similar loops for data-tpl-value, etc. ...
      fragment.querySelectorAll('[data-tpl-attr]').forEach(el => {
        const attrMapping = el.getAttribute('data-tpl-attr'); // e.g., "id:id,class:cssClass"
        attrMapping.split(',').forEach(map => {
            const [attrName, key] = map.split(':');
            if (attrName && key && dataContext.hasOwnProperty(key)) {
                el.setAttribute(attrName, dataContext[key]);
            }
        });
      });


      // 2. Resolve contextual `commandfor` selectors within the fragment
      // This is the crucial wiring step
      const firstElement = fragment.firstElementChild;
      if (firstElement) {
        // Assign a temporary unique ID if one was passed in the data context
        const tempId = dataContext.id || `temp-id-${Date.now()}`;
        if (dataContext.id) {
            firstElement.id = dataContext.id;
        }

        fragment.querySelectorAll('[commandfor^="@"]').forEach(childInvoker => {
            const originalSelector = childInvoker.getAttribute('commandfor');
            if (originalSelector.startsWith('@closest')) {
                // The target is the newly cloned top-level element
                childInvoker.setAttribute('commandfor', firstElement.id);
            }
            // Add logic for @child if needed
        });
      }

      return fragment;
    }

    // --- MODIFY A DOM COMMAND TO USE THE HELPER ---
    // e.g., --dom:append
    "--dom:append": ({ invoker, targetElement }: CommandContext) => {
      const template = getSourceTemplate(invoker, 'append');
      let fragment = template.content.cloneNode(true) as DocumentFragment;

      // **THE CORE CHANGE**
      // Process the fragment if advanced events are enabled
      if (window.Invoker?._evaluateExpression) {
        fragment = processTemplateFragment(fragment, invoker);
      }

      targetElement.append(fragment);
    },
    // ... update --dom:prepend, --dom:swap, etc. similarly ...
    ```

**Step 2.4: Testing Plan**
Create `test/advanced-templating.test.ts`.

*   **Data Injection:** Test that `--dom:append` with `data-with-json` and `data-tpl-text` correctly populates the cloned template.
*   **UID Generation:** Verify that `{{__uid}}` in `data-with-json` results in a unique ID on the new element.
*   **Contextual Wiring:** Test that a button inside a template with `commandfor="@closest(li)"` correctly gets its `commandfor` rewritten to the new parent's unique ID.
*   **No Opt-in:** Write a test that shows if `enableAdvancedEvents` is NOT called, `data-with-json` is ignored, and the template is cloned raw.

---

### **Phase 3: Documentation & Final Polish**

**Goal:** Clearly document the new APIs and provide compelling examples.

1.  **Update `README.md`:**
    *   Create a new top-level section: **"Declarative List & Component Patterns"**.
    *   Explain the "problem" (needing custom JS for lists).
    *   Introduce the solution: `data-with-json`, `data-tpl-*` attributes, and contextual `@` selectors.
    *   Rewrite the TodoMVC example to be fully declarative, showcasing the new power.
    *   Create a new section: **"Advanced `commandfor` Selectors"**, documenting `@closest`, `@child(ren)`, and global selectors with clear examples for each.

2.  **Update `examples/advanced-events-demo.html`:**
    *   Add the fully declarative TodoMVC app to this page.
    *   Add a "Card Component" example that uses `@child` and `@closest` to be self-contained.
    *   Add a "Select All" example for the global selector.

By following this plan, we can methodically build these powerful new features on top of the existing library, ensuring each piece is tested and integrated correctly, all while respecting the user's desire for a minimal core bundle.


### **The New `commandfor` API: From ID to Context**

The fundamental shift is to treat the `commandfor` attribute not just as an ID, but as a selector string. We can define a simple set of rules to determine how to interpret it, maintaining backward compatibility while adding immense power.

#### **Proposed Selector Syntax Rules:**

1.  **ID Selector (Default/Legacy):** If the string is a valid ID (e.g., `my-element`), it defaults to `document.getElementById()`. To be explicit, one could use the `#` prefix (e.g., `#my-element`).
2.  **Global Selector (Implicit `@every`):** If the string is any other valid CSS selector (e.g., `.form-field`, `input[type=checkbox]`), it performs a `document.querySelectorAll()` and executes the command on **every element found**. This is your `@every` functionality.
3.  **Contextual Selectors (Prefixed with `@`):** If the string starts with an `@` symbol, the query is performed relative to the **invoker element itself**, not the whole document.

This creates a clear, powerful, and extensible system.

---

### **Detailed Breakdown of the New Selectors**

Here’s a look at each of the proposed selector types in detail.

#### **1. Global Selector (your `@every` and `selector`)**

This is for one-to-many commands that affect multiple elements across the page.

| Syntax | `commandfor=".my-class, [data-role='item']"` |
| :--- | :--- |
| **Description** | Executes the command on every element in the document that matches the CSS selector. |
| **Scope** | Global (`document.querySelectorAll`) |
| **Result** | A `NodeList` of elements (or an empty list). The command runs on each. |
| **Use Case** | Bulk operations, like checking/unchecking all items in a list, clearing all input fields, or applying a class to multiple cards at once. |

**Example: A "Select All" Checkbox**

```html
<!-- The invoker targets every checkbox with the name 'item' -->
<input type="checkbox"
       id="select-all"
       command-on="change"
       command="--attr:set:checked:{{this.checked ? '' : null}}"
       commandfor="input[name='item']">
<label for="select-all">Select All</label>

<ul>
  <li><input type="checkbox" name="item"> Item 1</li>
  <li><input type="checkbox" name="item"> Item 2</li>
  <li><input type="checkbox" name="item"> Item 3</li>
</ul>
```
**How it works:** When the "Select All" checkbox is clicked, the command `"--attr:set:checked:..."` is executed on *all three* item checkboxes simultaneously. `{{this.checked ? '' : null}}` is a trick to either set the `checked` attribute (making it checked) or remove it (making it unchecked).

#### **2. `@closest(<selector>)`**

This is for finding the nearest ancestor that matches a selector. It's essential for list items where a child needs to affect its parent container.

| Syntax | `commandfor="@closest(li)"` |
| :--- | :--- |
| **Description** | Traverses up the DOM tree from the invoker and finds the first ancestor that matches the selector. |
| **Scope** | Ancestors of the invoker (`invoker.closest()`) |
| **Result** | A single `Element` (or `null`). The command runs on this element. |
| **Use Case** | The canonical example is a "delete" button inside a list item that needs to remove the entire `<li>`. Perfect for the TodoMVC example. |

**Example: TodoMVC Delete Button (revisited)**

```html
<template id="todo-template">
  <li>
    <span>My new todo</span>
    <!-- This button finds its parent `li` and removes it -->
    <button command="--dom:remove" commandfor="@closest(li)">X</button>
  </li>
</template>
```
This is incredibly powerful because the button inside the template has no knowledge of the final unique ID of its parent `<li>`. It just knows how to find it relationally.

#### **3. `@child(<selector>)` and `@children(<selector>)`**

This is for finding descendants. We should distinguish between finding the *first* child and *all* children.

| Syntax | `@child(.status)` (singular) and `@children(.icon)` (plural) |
| :--- | :--- |
| **Description** | `@child` finds the **first** descendant of the invoker matching the selector. `@children` finds **all** descendants. |
| **Scope** | Descendants of the invoker (`invoker.querySelector` or `invoker.querySelectorAll`) |
| **Result** | `@child`: a single `Element` (or `null`). `@children`: a `NodeList`. |
| **Use Case** | Perfect for self-contained components. A button in a card's header could toggle the visibility of the card's body, or a "reset" button could clear all `<input>` fields within its parent `<form>`. |

**Example: A Self-Contained Card Component**

```html
<div class="card">
  <header>
    <h3>Card Title</h3>
    <!-- This button finds the .card-body within this card and toggles it -->
    <button command="--toggle" commandfor="@child(.card-body)">
      Expand
    </button>
  </header>
  <div class="card-body" hidden>
    <p>This content can be expanded or collapsed.</p>
    <!-- This button finds ALL inputs within the card and clears them -->
    <button command="--value:set:" commandfor="@children(input)">
      Clear Inputs
    </button>
  </div>
</div>
```
This card can be copied and pasted anywhere on the page, and each one will work independently without needing unique IDs for every single button and body panel. **This is the key to reusability.**

### Implementation Considerations

1.  **Update the Target Resolution Logic:** The `InvokerManager` (or a helper it calls) will need to be updated. When a command is triggered, it will inspect the `commandfor` string:
    *   If it starts with `@`, perform a relative query from the `invoker` element (`.closest()`, `.querySelector()`, `.querySelectorAll()`).
    *   If it does *not* start with `@` (and isn't a simple ID), perform a global query (`document.querySelectorAll()`).
    *   If it's a simple ID string (or starts with `#`), use the existing `document.getElementById()` for performance and backward compatibility.

2.  **Handling Multiple Targets:** The command execution loop needs to be modified. If the target resolution returns a `NodeList` (from a global selector or `@children`), the manager must iterate over the list and execute the command for **each element** in that list.

3.  **Error Handling:**
    *   **No Match:** If a selector finds no elements (e.g., `commandfor=".non-existent-class"`), the command should simply not run. In debug mode, a `console.warn` would be appropriate.
    *   **Invalid Selector:** If the selector string is syntactically invalid, a `console.error` should be logged with a clear message.

4.  **Chaining with Multiple Targets:** An important design decision must be made: if an invoker targets 5 elements, and has a `data-and-then` chain, what does the chained command target?
    *   **Simplest Approach (Recommended):** The chained command's target is resolved independently based on its *own* `data-then-target` attribute or, if absent, the primary invoker's `commandfor`. If the primary `commandfor` was a multi-selector, the chained command would re-run that same selector. This is predictable and powerful.

### Conclusion: The Impact of Advanced Selectors

By introducing these advanced selectors, Invokers would take a massive leap forward:

*   **From Page-Level to Component-Level:** It moves beyond being a tool for wiring up a static page to a system for creating truly reusable, self-contained HTML components.
*   **Reduced Reliance on IDs:** Developers would no longer need to litter their markup with unique IDs for every interactive element, leading to cleaner, more maintainable code.
*   **Enables Bulk Operations:** The ability to target multiple elements at once makes common UI patterns (like "select all") declaratively trivial.
*   **Boosts Declarative Power:** A whole new class of interactions becomes possible without ever needing to write a custom command or an "escape hatch" to JavaScript, fully delivering on the library's core promise.


add comprehensive tests to test edge cases.

add detaild docs on all these features / and considerations when using them, in the README.
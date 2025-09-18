[![N_PM version](https://img.shields.io/npm/v/invokers.svg?style=flat)](https://www.npmjs.com/package/invokers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/doeixd/invokers?style=social)](https://github.com/doeixd/invokers)

<p align="center">
  <img src="https://raw.githubusercontent.com/doeixd/invokers/main/assets/logo.png" width="150" alt="Invokers Logo: A cute, friendly HTML tag character with a green arrow, signifying action.">
</p>

# ✨ Invokers: Use the Future of HTML, Today.

**Invokers is a lightweight polyfill and powerful superset for the upcoming native HTML Invoker Commands API.** It empowers you to write modern, accessible, and highly interactive user interfaces using the declarative patterns that are becoming a web standard.

This library isn't just a collection of helpers; it's a bridge to the future of web development. It allows you to write clean, forward-compatible HTML that will work natively in browsers as they adopt the standard, all while providing a rich set of essential features—like data fetching and dynamic DOM manipulation—that the core spec doesn't cover.

-   ✅ **Standards-First:** Built on the W3C/WHATWG `command` attribute proposal. Learn a future-proof skill, not a framework-specific API.
-   🧩 **Polyfill & Superset:** Provides the standard API in all modern browsers and extends it with a rich set of custom commands.
-   ✍️ **Declarative & Readable:** Describe *what* you want to happen in your HTML, not *how* in JavaScript. Create UIs that are self-documenting.
-   ♿ **Accessible by Design:** Automatically manages `aria-*` attributes and focus behavior, guiding you to build inclusive interfaces.
-   🌐 **Server-Interactive:** Fetch content and update the DOM without a page reload using simple, declarative HTML attributes.
-   🚀 **Zero Dependencies & Tiny:** A featherlight addition to any project, framework-agnostic, and ready to use in seconds.
-   🎨 **View Transitions:** Built-in, automatic support for the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for beautiful, animated UI changes with zero JS configuration.

---

## The Vision: A More Declarative Web

For too long, creating interactive UIs has meant a disconnect between structure (HTML) and behavior (JavaScript). This leads to scattered code, accessibility oversights, and boilerplate that slows down development. The web platform is evolving to fix this.

**Invokers embraces this evolution, letting you build complex interactions with the simplicity and elegance of plain HTML.**

### Before: The Manual JavaScript Way

```html
<!-- The button is just a button. Its purpose is hidden in a script file. -->
<button id="menu-toggle">Menu</button>
<nav id="main-menu" hidden>...</nav>

<script>
  // Somewhere else in your project...
  document.getElementById('menu-toggle').addEventListener('click', (e) => {
    const menu = document.getElementById('main-menu');
    menu.hidden = !menu.hidden;
    // We have to remember to manually sync accessibility state.
    e.target.setAttribute('aria-expanded', !menu.hidden);
  });
</script>
```

### After: The Invokers Way (The Future Standard)

With Invokers, your HTML becomes the single source of truth. It's clean, readable, and requires no custom JavaScript for this common pattern.

```html
<!-- The button's purpose is clear just by reading the markup. -->
<button type="button" command="--toggle" commandfor="main-menu" aria-expanded="false">
  Menu
</button>
<nav id="main-menu" hidden>...</nav>

<!-- Add Invokers to your page, and you're done. -->
<script type="module" src="https://esm.sh/invokers"></script>
```

---

## 💡 Core Concepts

Invokers aligns with the three core building blocks of the W3C/WHATWG proposal:

1.  **The Invoker:** A `<button type="button">` that triggers an action.
2.  **The Target:** The element that *receives* the action, identified by its ID in the `commandfor` attribute.
3.  **The Command:** The specific action to perform, defined in the `command` attribute.

Commands come in two flavors, and `invokers` handles both seamlessly:

| Command Type | Prefix | Example | Handled By |
| :--- | :--- | :--- | :--- |
| **Native Commands** | (none) | `show-modal`, `close` | The browser (or the `invokers` polyfill) |
| **Library Commands** | `--` | `--toggle`, `--fetch:get` | The `invokers` library's superset engine |

This clear separation means you're always writing standards-compliant code.

## 🚀 Installation

Get up and running in seconds.

### 1. Quick Start via CDN

The easiest way to start. Place this at the end of your `<body>`. It includes the polyfill and enables all features automatically.

```html
<script type="module" src="https://esm.sh/invokers"></script>
```

### 2. Using npm/pnpm/yarn

For projects with a build step, install the package from the npm registry:

```bash
npm install invokers
```

Then, import it into your main JavaScript file. This single import sets up the polyfill and the custom command manager.

```javascript
import 'invokers';

// Your page now understands the Invoker Commands API and all of Invokers' custom commands.
```

---

## 📖 Usage Guide & Examples

### Part 1: Using Native Behaviors (Polyfilled)

Invokers ensures that standard commands for built-in HTML elements like `<dialog>` and `popover` work everywhere.

```html
<!-- This button will open the dialog modally. -->
<button type="button" command="show-modal" commandfor="my-dialog">
  Open Dialog
</button>

<dialog id="my-dialog">
  <p>Hello from a modal dialog!</p>
  <!-- This button will close its parent dialog. -->
  <button type="button" command="close" commandfor="my-dialog">Close</button>
</dialog>
```

### Part 2: Core Library Commands

These are the powerful custom commands (note the `--` prefix) included with the default import.

<details>
<summary><strong><code>--toggle</code></strong> (for accordions, disclosures)</summary>

Toggles the `hidden` attribute on the target element and automatically syncs `aria-expanded`.

```html
<h3>
  <button type="button" command="--toggle" commandfor="faq-1" aria-expanded="false">
    What is the purpose of the '--' prefix?
  </button>
</h3>
<div id="faq-1" class="panel" hidden>
  <p>The <code>--</code> prefix is part of the official spec to distinguish custom, author-defined commands from built-in browser commands. Invokers follows this standard.</p>
</div>
```
</details>

<details>
<summary><strong><code>--show</code></strong> (for tab panels)</summary>

Shows the target element while hiding its siblings. It intelligently manages the `aria-expanded` state for all buttons in the group.

```html
<div role="tablist">
  <button type="button" command="--show" commandfor="panel-1" aria-expanded="true">Tab 1</button>
  <button type="button" command="--show" commandfor="panel-2" aria-expanded="false">Tab 2</button>
</div>
<div>
  <div id="panel-1" role="tabpanel">Content for Panel 1.</div>
  <div id="panel-2" role="tabpanel" hidden>Content for Panel 2.</div>
</div>
```
</details>

<details>
<summary><strong><code>--class:&lt;action&gt;:&lt;className&gt;</code></strong> (for CSS manipulation)</summary>

A flexible, namespaced command to `add`, `remove`, or `toggle` a CSS class on the target.

```html
<!-- This button will toggle the 'is-active' class on the div -->
<button type="button" command="--class:toggle:is-active" commandfor="style-box">
  Toggle Style
</button>

<!-- This button adds a class to the <body> -->
<button type="button" command="--class:add:dark-mode" commandfor="body">
  Enable Dark Mode
</button>

<div id="style-box" class="box">This box will change.</div>
```
</details>

### Part 3: The Commands Module (The Power-Ups)

For even more functionality, the optional commands module provides advanced capabilities.

**To use them, you must import and register them:**
```javascript
import 'invokers';
import { registerAll } from 'invokers/commands';

registerAll(); // Activates all commands from the module
```

#### **`--fetch:get`**
Declaratively fetch HTML from a server and inject it into the page.

```html
<!-- This button fetches content and places it in the #content-area div -->
<button type="button"
  command="--fetch:get"
  data-url="/api/widgets"
  commandfor="content-area"
  data-loading-template="spinner-template">
  Load Widgets
</button>

<div id="content-area" class="content-box"></div>

<!-- Use a <template> for the loading state -->
<template id="spinner-template"><p>Loading...</p></template>
```

#### **`--dom:remove`**
Simply remove an element from the page. Perfect for dismissible alerts.

```html
<div id="toast-notification" class="toast">
  Item saved successfully!
  <button type="button" command="--dom:remove" commandfor="toast-notification">&times;</button>
</div>
```
> A full suite of commands for media (`--media:play`), forms (`--form:reset`), clipboard (`--clipboard:copy`), carousels, and more is included! Check the `src/invoker-commands.ts` file for the complete list.

---

### ✨ Advanced Patterns

#### Chaining Commands
Use `data-then-command` to run another command after an asynchronous operation like `--fetch:get` completes successfully.

```html
<!-- After fetching, this button will run '--class:add:loaded' on the target -->
<button type="button"
  command="--fetch:get"
  data-url="/api/content"
  commandfor="content-box"
  data-then-command="--class:add:loaded">
  Load and Animate
</button>
<div id="content-box"></div>
```

#### Automatic View Transitions
If the browser supports the View Transition API, `invokers` will **automatically** wrap DOM changes from commands like `--toggle`, `--show`, `--fetch:*`, and `--dom:*` in a transition. This lets you create beautiful, animated UI updates with only CSS.

```css
/* Animate an element fading in and sliding up */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
}

/* This applies the animation when a view transition is triggered */
::view-transition-new(root) {
  animation: 250ms cubic-bezier(0.4, 0, 0.2, 1) both fade-in-up;
}
```

---

### 🔧 Extending Invokers: Your Own Commands

The true power of `invokers` is its extensibility. Register your own custom commands to encapsulate your project's logic and keep your HTML clean.

```javascript
// in your main application script
if (window.Invoker) {
  /** @param {import('invokers').CommandContext} context */
  const customLogger = ({ invoker, params }) => {
    const level = params[0] || 'info';
    const message = params.slice(1).join(' ');
    console[level](`[Custom Logger]: ${message}`, { triggeredBy: invoker });
  };

  // Register your command. The library handles the '--' prefix.
  window.Invoker.register('log', customLogger);
}
```

Now you can use it anywhere in your HTML:
```html
<button type="button"
  command="--log:warn:User is deleting an important item"
  commandfor="app-container">
  Log a Warning
</button>
```

---

## 🛠️ Best Practices & FAQ

*   **Why must I use `<button type="button">`?**
    The spec limits invokers to `<button>` elements for accessibility. Setting `type="button"` is crucial to prevent buttons inside a `<form>` from accidentally submitting it.

*   **Why `commandfor` instead of the old `aria-controls`?**
    `commandfor` is the official attribute in the W3C/WHATWG proposal. `invokers` prioritizes it for forward-compatibility. The library still supports `aria-controls` as a fallback for legacy code or multi-target scenarios, but `commandfor` is the recommended approach.

*   **Why the `--` prefix for library commands?**
    This is the standard, future-proof way to create custom commands. It guarantees that your commands will never conflict with new commands added to the HTML specification in the future.

*   **My fetch command is failing with a 404 error.**
    The examples use placeholder URLs like `/api/widgets`. You need to replace these with actual endpoints on your server that return HTML content.

## 🤝 Contributing

Contributions are welcome! As we track the progress of the official spec, your help with bug reports, new command proposals, or documentation improvements is greatly appreciated. Please feel free to open an issue or submit a pull request on our [GitHub repository](https://github.com/doeixd/invokers).

## 📄 License

Invokers is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT).

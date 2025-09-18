[![NPM version](https://img.shields.io/npm/v/invokers.svg?style=flat)](https://www.npmjs.com/package/invokers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/doeixd/invokers?style=social)](https://github.com/doeixd/invokers)

# Invokers ✨

**Invokers is a tiny, modern JavaScript library that brings your HTML to life.** It empowers you to create rich, server-interactive user interfaces using the declarative power of standard HTML and ARIA attributes, with little to no custom JavaScript.

It listens for the native `command` attribute on `<button>` elements and uses semantic attributes like `aria-controls` to understand your intent. The result is clean, accessible, and maintainable HTML that just works.

- **Platform-First:** Leverages native HTML and ARIA attributes.
- **Server-Interactive:** Fetch content from the server without a page reload (with the [Commands Module](#commands-module-invokerscommands)).
- **Declarative:** Describe *what* you want to happen, not *how*.
- **Accessible by Design:** Guides you toward writing accessible markup.
- **Flexible Commands:** Powerful namespaced commands like `class:toggle:is-active`.
- **Zero Dependencies:** Tiny, dependency-free, and framework-agnostic.
- **Extensible:** A simple API to register your own custom commands.
- **View Transitions:** Built-in support for the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for beautiful, animated UI changes.

<br />

## 🚀 The Core Idea: HTML is Your UI Language

Imagine you want a button to show and hide a menu.

**Before Invokers**, you might write this:
```html
<!-- You have to remember to add an event listener in your JS -->
<button id="menu-toggle">Menu</button>
<nav id="main-menu" class="hidden">...</nav>

<script>
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('main-menu').classList.toggle('hidden');
  });
</script>
```

**With Invokers**, your HTML describes the entire interaction. No custom JavaScript needed.
```html
<!-- This just works. The HTML is self-explanatory. -->
<button command="toggle" aria-controls="main-menu" aria-expanded="false">
  Menu
</button>
<nav id="main-menu" hidden>
  <ul>...</ul>
</nav>

<!-- Add Invokers to your page -->
<script type="module" src="https://esm.sh/invokers"></script>
```

Notice the difference:
1.  **`command="toggle"`:** You declare the button's action.
2.  **`aria-controls="main-menu"`:** You link the button to the element it controls using a standard accessibility attribute.
3.  **`aria-expanded="false"`:** Invokers will automatically keep this accessibility attribute in sync for you!

This is the power of Invokers: it makes your semantic, accessible HTML *functional*.

## 📦 Installation

You have two simple options to get started.

### 1. Quick Start via CDN (Easiest)

For prototypes, CodePens, or simple projects, add this script tag to your page. The library will initialize itself.

```html
<!-- Place at the end of your <body> -->
<script type="module" src="https://esm.sh/invokers"></script>
```

### 2. Using npm/pnpm/yarn

For projects with a build step, install it from the npm registry:

```bash
npm install invokers
```

Then, import it into your main JavaScript file:

```javascript
import 'invokers';
// The library initializes itself automatically on import.
```

---

## ✨ Hands-On Examples

Explore the power of Invokers, from simple toggles to dynamic, server-rendered content.

### Accessible Accordion / Disclosure

A perfect use case for the core `toggle` command.

```html
<h3>
  <button command="toggle" aria-expanded="false" aria-controls="faq-1">
    How do I install it?
  </button>
</h3>
<div id="faq-1" hidden>
  <p>Just add the script tag to your page! It's that easy.</p>
</div>
```

### Manipulating CSS Classes

The `class` command is a powerful, namespaced command that lets you add, remove, or toggle classes on target elements directly from HTML.

```html
<!-- Toggle a class on the #alert-box element -->
<button command="class:toggle:is-visible" data-target="#alert-box">
  Toggle Alert
</button>

<!-- Add a class -->
<button command="class:add:dark-mode" data-target="body">
  Enable Dark Mode
</button>

<!-- The parser handles escaped colons for utilities like Tailwind CSS -->
<button command="class:toggle:md\\:grid" data-target="#container">
  Toggle Grid on Medium Screens
</button>

<div id="alert-box">...</div>
```

### Loading Content from the Server

Use the **Commands Module** (`invokers/commands`) to fetch HTML from your server and place it in the DOM, complete with loading and error states.

```html
<!-- This button fetches content and puts it in #content-area -->
<button
  command="fetch:get"
  data-url="/api/dashboard-widgets"
  aria-controls="content-area"
  data-loading-template="spinner-template"
  data-error-template="error-template"
>
  Load Dashboard
</button>

<div id="content-area" style="min-height: 50px;"></div>

<!-- Templates for user feedback -->
<template id="spinner-template"><div>Loading...</div></template>
<template id="error-template"><p>Sorry, an error occurred.</p></template>
```

---

## 📚 API Documentation

The primary way you interact with Invokers is through HTML attributes.

### Core Library (`invokers`)

These commands are available out of the box.

| `command` | Description | Key Attributes |
|---|---|---|
| `toggle` | Toggles the `hidden` attribute. Perfect for accordions and menus. | `aria-controls` or `data-target` |
| `show` | Shows the target and hides its siblings. Perfect for tabs. | `aria-controls` or `data-target` |
| `hide` | Hides the target. Useful for close buttons. | `aria-controls` or `data-target` |
| `class:<action>:<className>`| Adds, removes, or toggles a CSS class. | `aria-controls` or `data-target` |

The `class` command uses parameters directly in the command string:
-   `class:add:is-active`
-   `class:remove:is-active`
-   `class:toggle:is-active`

To use class names containing a colon (like `md:grid`), escape it with a backslash: `class:add:md\\:grid`.

### Commands Module (`invokers/commands`)

Unlock the full power of Invokers with the optional commands module.

**Installation:**
```html
<!-- Add the commands module script -->
<script type="module">
  import 'invokers';
  import { registerAll } from 'https://esm.sh/invokers/commands';

  // Make all extra commands available
  registerAll();
</script>
```
Or with npm: `import { registerAll } from 'invokers/commands';`

#### Fetch Commands
| `command` | Description | Key Attributes |
|---|---|---|
| `fetch:get` | GETs content from a URL and swaps it into the target. | `data-url`, `aria-controls` |
| `fetch:send`| Sends a `POST`/`PUT`/`DELETE` request using a `<form>`. | `aria-controls` (points to form) |

**Fetch Attributes:**
- `data-response-target`: (For `fetch:send`) CSS selector for where to place the response.
- `data-loading-template`: ID of `<template>` for loading state.
- `data-error-template`: ID of `<template>` for error state.
- `data-then-command`: A follow-up command to run on success (e.g., `show`).
- `data-header-*`: Adds a request header (e.g., `data-header-accept="application/json"`).

#### DOM Manipulation Commands
| `command` | Description | Key Attributes |
|---|---|---|
| `dom:replace` | Replaces the target element entirely. | `aria-controls`, `data-template-id` or `data-clone-id` |
| `dom:swap` | Swaps the *inner* content of the target. | `aria-controls`, `data-template-id` or `data-clone-id` |
| `dom:append` | Appends content to the end of the target. | `aria-controls`, `data-template-id` or `data-clone-id` |
| `dom:prepend` | Prepends content to the beginning of the target. | `aria-controls`, `data-template-id` or `data-clone-id` |
| `dom:remove` | Removes the target element from the DOM. | `aria-controls` |

#### Other Commands
A full suite of commands is available for media, forms, navigation, and more. Please see the (forthcoming) Commands Module Documentation for a complete list.

### Extending with Custom Commands

The real power of Invokers is how easy it is to create your own commands. The `window.Invoker.register` function allows you to add new behaviors that fit your project's needs.

The `context` object passed to your callback contains a `params` array with any parts of the command that came after your registered command name.

```javascript
if (window.Invoker) {
  /** @param {import('invokers').CommandContext} context */
  const customLogger = ({ invoker, params }) => {
    const level = params[0] || 'info'; // e.g., 'log', 'warn', 'error'
    const message = params[1] || 'Invoker was triggered!';

    console[level](message, { triggeredBy: invoker });
  };

  // This will handle `log`, `log:warn`, `log:info:Hello`, etc.
  window.Invoker.register('log', customLogger);
}
```

Now you can use it in your HTML:
```html
<button command="log:warn:User is about to delete something important!">
  Log Warning
</button>
```

## Contributing

Contributions are welcome! Whether it's reporting a bug, proposing a new command, or improving the documentation, your help is appreciated. Please feel free to open an issue or submit a pull request.

## License

Invokers is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT).

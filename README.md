[![N_PM version](https://img.shields.io/npm/v/invokers.svg?style=flat)](https://www.npmjs.com/package/invokers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/doeixd/invokers?style=social)](https://github.com/doeixd/invokers)

<p align="center">
  <img src="https://raw.githubusercontent.com/doeixd/invokers/main/assets/logo.png" width="150" alt="Invokers Logo: A cute, friendly HTML tag character with a green arrow, signifying action.">
</p>

# ✨ Invokers: Write Interactive HTML Without JavaScript

**Invokers lets you write future-proof HTML interactions without custom JavaScript.** It's a polyfill for the upcoming HTML Invoker Commands API and Interest Invokers (hover cards, tooltips), with a comprehensive set of extended commands automatically included for real-world needs like toggling, fetching, media controls, and complex workflow chaining. Think of it as **HTMX-lite**, but fully aligned with web standards.

Instead of writing event listeners and DOM manipulation code, you describe what should happen directly in your HTML. Your interfaces become self-documenting, accessible by default, and work without any build step.

-   ✅ **Standards-First:** Built on the W3C/WHATWG `command` attribute and Interest Invokers proposals. Learn future-proof skills, not framework-specific APIs.
-   🧩 **Polyfill & Superset:** Provides the standard APIs in all modern browsers and extends them with a rich set of custom commands.
-   ✍️ **Declarative & Readable:** Describe *what* you want to happen in your HTML, not *how* in JavaScript. Create UIs that are self-documenting.
-   🔗 **Universal Command Chaining:** Chain any command with any other using `data-and-then` attributes or declarative `<and-then>` elements for complex workflows.
-   🎯 **Conditional Execution:** Execute different command sequences based on success/error states with built-in conditional logic.
-   🔄 **Lifecycle Management:** Control command execution with states like `once`, `disabled`, and `completed` for sophisticated interaction patterns.
-   ♿ **Accessible by Design:** Automatically manages `aria-*` attributes and focus behavior, guiding you to build inclusive interfaces.
-   🌐 **Server-Interactive:** Fetch content and update the DOM without a page reload using simple, declarative HTML attributes.
-   💡 **Interest Invokers:** Create hover cards, tooltips, and rich hints that work across mouse, keyboard, and touch with the `interestfor` attribute.
-   🚀 **Zero Dependencies & Tiny:** A featherlight addition to any project, framework-agnostic, and ready to use in seconds.
-   🎨 **View Transitions:** Built-in, automatic support for the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for beautiful, animated UI changes with zero JS configuration.
-   🔧 **Singleton Architecture:** Optimized internal architecture ensures consistent behavior and prevents duplicate registrations.

## 🚀 Quick Demo (30 seconds)

See Invokers in action with this copy-paste example:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Add Invokers via CDN -->
  <script type="module" src="https://esm.sh/invokers"></script>
</head>
<body>
  <!-- Toggle a navigation menu with zero JavaScript -->
  <button type="button" command="--toggle" commandfor="nav-menu" aria-expanded="false">
    Menu
  </button>
  <nav id="nav-menu" hidden>
    <a href="/home">Home</a>
    <a href="/about">About</a>
    <!-- Dismiss button that hides itself -->
    <button type="button" command="--hide" commandfor="nav-menu">✕</button>
  </nav>

  <!-- Hover cards work automatically with Interest Invokers -->
  <a href="/profile" interestfor="profile-hint">
    @username
  </a>
  <div id="profile-hint" popover="hint">
    <strong>John Doe</strong><br>
    Software Developer<br>
    📍 San Francisco
  </div>
</body>
</html>
```

That's it! No event listeners, no DOM queries, no state management. The HTML describes the behavior, and Invokers makes it work.

## 🤔 How Does This Compare?

| Feature               | Vanilla JS | HTMX    | Alpine.js | **Invokers** |
| --------------------- | ---------- | ------- | --------- | ------------ |
| Declarative in HTML   | ❌          | ✅       | ✅         | ✅            |
| Standards-aligned     | ❌          | ❌       | ❌         | ✅            |
| Zero dependencies     | ✅          | ❌       | ❌         | ✅            |
| Extended commands     | ❌          | ❌       | ❌         | ✅ (Auto)     |
| Workflow chaining     | ❌          | Limited | Limited   | ✅            |
| Accessible by default | ❌          | ❌       | ❌         | ✅            |
| Future-proof          | ❌          | ❌       | ❌         | ✅            |

<br />

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

<br />

## 💡 Core Concepts

Invokers provides two complementary interaction models:

### Command Invokers
Uses three simple pieces that work together:

1.  **Invoker:** A `<button type="button">` that triggers an action
2.  **Target:** The element that receives the action (identified by `commandfor="target-id"`)  
3.  **Command:** What happens (like `--toggle` or `show-modal`)

```html
<!-- Invoker ↓        Command ↓       Target ↓ -->
<button type="button" command="--toggle" commandfor="my-menu">Menu</button>
<nav id="my-menu" hidden>...</nav>
```

### Interest Invokers
For hover cards, tooltips, and contextual information that appears on user interest:

1.  **Interest Source:** A `<button>`, `<a href>`, or `<area>` element that users can show interest in
2.  **Interest Target:** The element that appears (identified by `interestfor="target-id"`)
3.  **Interest Actions:** Automatic showing/hiding based on hover, focus, or long-press

```html
<!-- Interest Source ↓    Interest Target ↓ -->
<a href="/docs" interestfor="docs-preview">Documentation</a>
<div id="docs-preview" popover="hint">Quick reference guide...</div>
```

## 📋 Command Cheatsheet

### Core Commands (Available Now)
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--toggle`             | Show/hide + update ARIA           | `command="--toggle" commandfor="menu"`      |
| `--show`               | Show one, hide siblings           | `command="--show" commandfor="panel-1"`     |
| `--hide`               | Hide element                      | `command="--hide" commandfor="alert"`       |
| `--class:add:name`     | Add CSS class                     | `command="--class:add:active"`              |
| `--class:remove:name`  | Remove CSS class                  | `command="--class:remove:loading"`          |
| `--class:toggle:name`  | Toggle CSS class                  | `command="--class:toggle:dark-mode"`        |
| `--text:set:message`   | Replace text content              | `command="--text:set:Hello World"`          |
| `--text:append:text`   | Append to text content            | `command="--text:append: more text"`        |
| `--text:prepend:text`  | Prepend to text content           | `command="--text:prepend:Prefix "`          |
| `--text:clear`         | Clear text content                | `command="--text:clear"`                    |
| `--attr:set:name:val`  | Set attribute                     | `command="--attr:set:disabled:true"`        |
| `--attr:remove:name`   | Remove attribute                  | `command="--attr:remove:disabled"`          |
| `--attr:toggle:name`   | Toggle attribute presence         | `command="--attr:toggle:hidden"`            |
| `--value:set`          | Set input value                   | `command="--value:set:new-value"`           |
| `--focus`              | Focus element                     | `command="--focus" commandfor="input"`      |
| `--disabled:toggle`    | Toggle disabled state             | `command="--disabled:toggle"`               |
| `--scroll:into-view`   | Scroll element into view          | `command="--scroll:into-view"`              |
| `--scroll:top`         | Scroll to top of element          | `command="--scroll:top"`                    |
| `--scroll:bottom`      | Scroll to bottom of element       | `command="--scroll:bottom"`                 |
| `--scroll:center`      | Scroll to center of element       | `command="--scroll:center"`                 |

### Storage Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--storage:local:set:key:val` | Store in localStorage         | `command="--storage:local:set:user:name"`   |
| `--storage:session:set:key:val` | Store in sessionStorage     | `command="--storage:session:set:temp:data"` |
| `--storage:local:get:key` | Get from localStorage          | `command="--storage:local:get:user"`         |
| `--storage:local:remove:key` | Remove from localStorage     | `command="--storage:local:remove:user"`      |
| `--storage:local:clear` | Clear all localStorage          | `command="--storage:local:clear"`            |
| `--storage:local:keys` | Get all localStorage keys       | `command="--storage:local:keys"`             |
| `--storage:local:has:key` | Check if key exists           | `command="--storage:local:has:user"`         |
| `--storage:local:size` | Get localStorage size in bytes  | `command="--storage:local:size"`             |

### Animation Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--animate:fade-in`    | Fade element in                   | `command="--animate:fade-in"`                |
| `--animate:fade-out`   | Fade element out                  | `command="--animate:fade-out"`               |
| `--animate:slide-up`   | Slide up animation                | `command="--animate:slide-up"`               |
| `--animate:slide-down` | Slide down animation              | `command="--animate:slide-down"`             |
| `--animate:bounce`     | Bounce animation                  | `command="--animate:bounce"`                 |
| `--animate:spin`       | Spin animation                    | `command="--animate:spin"`                   |

### Event Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--emit:event-name`    | Dispatch custom event             | `command="--emit:my-event:detail-data"`     |

### URL Manipulation Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--url:params:get:key` | Get URL parameter                 | `command="--url:params:get:id"`              |
| `--url:params:set:key:val` | Set URL parameter             | `command="--url:params:set:page:2"`          |
| `--url:params:delete:key` | Delete URL parameter          | `command="--url:params:delete:id"`           |
| `--url:params:clear`   | Clear all URL parameters         | `command="--url:params:clear"`               |
| `--url:params:all`     | Get all URL parameters as JSON   | `command="--url:params:all"`                 |
| `--url:hash:get`       | Get URL hash                     | `command="--url:hash:get"`                   |
| `--url:hash:set:value` | Set URL hash                     | `command="--url:hash:set:section-1"`         |
| `--url:hash:clear`     | Clear URL hash                   | `command="--url:hash:clear"`                 |
| `--url:pathname:get`   | Get current pathname             | `command="--url:pathname:get"`               |
| `--url:pathname:set:path` | Set pathname                  | `command="--url:pathname:set:/new-page"`     |
| `--url:reload`         | Reload the page                  | `command="--url:reload"`                     |
| `--url:replace:url`    | Replace current URL              | `command="--url:replace:/new-page"`          |
| `--url:navigate:url`   | Navigate to URL                  | `command="--url:navigate:/new-page"`         |
| `--url:base`           | Get base URL (protocol+host)     | `command="--url:base"`                       |
| `--url:full`           | Get full current URL             | `command="--url:full"`                       |

### History Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--history:push:url`   | Push new history entry            | `command="--history:push:/new-page"`         |
| `--history:replace:url`| Replace current history entry     | `command="--history:replace:/new-page"`      |
| `--history:back`       | Go back in history                | `command="--history:back"`                   |
| `--history:forward`    | Go forward in history             | `command="--history:forward"`                |
| `--history:go:delta`   | Go to specific history position   | `command="--history:go:-2"`                  |
| `--history:state:get`  | Get current history state         | `command="--history:state:get"`              |
| `--history:state:set:data` | Set history state            | `command="--history:state:set:json-data"`    |
| `--history:length`     | Get history length                | `command="--history:length"`                 |
| `--history:clear`      | Clear history state               | `command="--history:clear"`                  |

### Device API Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--device:vibrate:pattern` | Vibrate device               | `command="--device:vibrate:200:100:200"`     |
| `--device:share:url:text:title` | Share content            | `command="--device:share:url:http://ex.com"` |
| `--device:geolocation:get` | Get device location         | `command="--device:geolocation:get"`         |
| `--device:battery:get` | Get battery status              | `command="--device:battery:get"`             |
| `--device:clipboard:read` | Read from clipboard          | `command="--device:clipboard:read"`          |
| `--device:clipboard:write:text` | Write to clipboard     | `command="--device:clipboard:write:hello"`   |
| `--device:wake-lock`   | Request wake lock                | `command="--device:wake-lock"`               |
| `--device:wake-lock:release` | Release wake lock         | `command="--device:wake-lock:release"`       |

### Accessibility Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--a11y:announce:text` | Announce to screen readers        | `command="--a11y:announce:Item saved"`       |
| `--a11y:focus`         | Focus element with announcement   | `command="--a11y:focus" commandfor="input"`  |
| `--a11y:skip-to:id`    | Skip navigation to element        | `command="--a11y:skip-to:main-content"`      |
| `--a11y:focus-trap:enable` | Enable focus trap            | `command="--a11y:focus-trap:enable"`         |
| `--a11y:aria:set:attr:val` | Set ARIA attribute          | `command="--a11y:aria:set:label:Save button"`|
| `--a11y:aria:remove:attr` | Remove ARIA attribute       | `command="--a11y:aria:remove:label"`         |
| `--a11y:heading-level:level` | Set heading level          | `command="--a11y:heading-level:2"`           |

### Extended Commands (Auto-Included)
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--media:toggle`       | Toggle play/pause                 | `command="--media:toggle" commandfor="video"`|
| `--media:seek:seconds` | Seek media by seconds             | `command="--media:seek:10"`                  |
| `--media:mute`         | Toggle media mute                 | `command="--media:mute"`                     |
| `--carousel:nav:next`  | Navigate carousel                 | `command="--carousel:nav:next"`              |
| `--clipboard:copy`     | Copy text to clipboard            | `command="--clipboard:copy"`                 |
| `--form:reset`         | Reset form                        | `command="--form:reset"`                     |
| `--form:submit`        | Submit form                       | `command="--form:submit"`                    |
| `--input:step:amount`  | Step number input                 | `command="--input:step:1"`                   |
| `--dom:remove`         | Remove element from DOM           | `command="--dom:remove"`                     |
| `--dom:replace`        | Replace with template content     | `command="--dom:replace" data-template-id="tpl"` |
| `--dom:swap`           | Swap inner content with template  | `command="--dom:swap" data-template-id="tpl"`|
| `--dom:append`         | Append template content           | `command="--dom:append" data-template-id="tpl"` |
| `--dom:prepend`        | Prepend template content          | `command="--dom:prepend" data-template-id="tpl"` |
| `--text:copy`          | Copy text between elements        | `command="--text:copy" data-copy-from="#source"` |
| `--fetch:get`          | Fetch HTML and update element     | `command="--fetch:get" data-url="/api/data"` |
| `--fetch:send`         | Send form data via fetch          | `command="--fetch:send"`                     |
| `--navigate:to:url`    | Navigate using History API        | `command="--navigate:to:/new-page"`          |

### Native/Polyfilled Commands (No -- Prefix)
| Command                | Target Element        | Purpose                                      |
| ---------------------- | -------------------- | -------------------------------------------- |
| `show-modal`           | `<dialog>`           | Open dialog modally                          |
| `close`                | `<dialog>`, `<popover>` | Close dialog/popover                      |
| `request-close`        | `<dialog>`           | Request dialog close (allows cancel)         |
| `toggle-popover`       | `<popover>`          | Toggle popover visibility                    |
| `show-popover`         | `<popover>`          | Show popover                                 |
| `hide-popover`         | `<popover>`          | Hide popover                                 |
| `toggle`               | `<details>`          | Toggle details open/closed                   |
| `open`                 | `<details>`          | Open details element                         |
| `show-picker`          | `<input>`, `<select>`| Show native picker (date, file, etc.)      |
| `play-pause`           | `<video>`, `<audio>` | Toggle media playback                        |
| `play`                 | `<video>`, `<audio>` | Start media playback                         |
| `pause`                | `<video>`, `<audio>` | Pause media playback                         |
| `toggle-muted`         | `<video>`, `<audio>` | Toggle media mute state                      |
| `toggle-fullscreen`    | Any element          | Toggle fullscreen mode                       |
| `request-fullscreen`   | Any element          | Enter fullscreen mode                        |
| `exit-fullscreen`      | Any element          | Exit fullscreen mode                         |
| `copy-text`            | Any element          | Copy element's text to clipboard             |
| `share`                | Any element          | Share element's text or URL                  |
| `step-up`              | `<input type=number>`| Increment number input                       |
| `step-down`            | `<input type=number>`| Decrement number input                       |
| `toggle-openable`      | Openable elements    | Toggle open/close state                      |
| `open-openable`        | Openable elements    | Open element                                 |
| `close-openable`       | Openable elements    | Close element                                |

### Pipeline Commands
| Command                | Purpose                                      | Example                                      |
| ---------------------- | -------------------------------------------- | -------------------------------------------- |
| `--pipeline:execute:id`| Execute template-based command pipeline     | `command="--pipeline:execute:user-flow"`    |

💡 **Tip:** Commands starting with `--` are Invokers extensions. Commands without prefixes are native/future browser commands.

## 🔧 Command Syntax Guide

### Parameter Syntax
Commands use colon (`:`) separated parameters:
```html
<!-- Basic parameter -->
<button command="--text:set:Hello World">Set Text</button>

<!-- Multiple parameters -->
<button command="--storage:local:set:user:John">Save User</button>

<!-- Numeric parameters -->
<button command="--media:seek:30">Skip 30s</button>
```

### Data Attributes for Enhanced Control
Many commands support additional configuration via `data-*` attributes:

#### Fetch Commands
```html
<button type="button"
  command="--fetch:get"
  data-url="/api/data"
  data-loading-template="spinner"
  data-error-template="error-msg"
  data-response-target="#result"
  commandfor="content-area">
  Load Data
</button>
```

#### Animation Commands
```html
<button type="button"
  command="--animate:fade-in"
  data-animate-duration="2s"
  data-animate-delay="500ms"
  data-animate-easing="ease-out"
  data-animate-iterations="3">
  Animate
</button>
```

#### Storage Commands
```html
<button type="button"
  command="--storage:local:set:settings"
  data-storage-json="true"
  data-storage-expires="3600">
  Save Settings (JSON, expires in 1 hour)
</button>
```

#### Device Commands
```html
<button type="button"
  command="--device:geolocation:get"
  data-geo-high-accuracy="true"
  data-geo-timeout="10000"
  data-geo-max-age="300000">
  Get Location
</button>
```

### Error Handling
Commands include comprehensive error handling with helpful messages:
- **Validation errors** for incorrect parameters
- **Permission errors** for device APIs requiring user consent
- **Network errors** for fetch operations
- **Browser support warnings** for unsupported features

Errors are logged to console with recovery suggestions. Use browser dev tools to see detailed error information.

### Command States
Control command execution behavior with `data-state`:
```html
<!-- Execute once, then disable -->
<button command="--show" commandfor="welcome" data-state="once">Show Welcome</button>

<!-- Currently disabled -->
<button command="--toggle" commandfor="menu" data-state="disabled">Menu</button>

<!-- Completed, won't execute again -->
<button command="--fetch:get" data-url="/api" data-state="completed">Load Data</button>
```

## 🚀 Installation

Get up and running in seconds.

### 1. Quick Start via CDN

The easiest way to start. Place this at the end of your `<body>`. It includes the polyfill, core commands, and all extended commands automatically.

```html
<script type="module" src="https://esm.sh/invokers"></script>
```

### 2. Using npm/pnpm/yarn

For projects with a build step, install the package from the npm registry:

```bash
npm install invokers
```

Then, import it into your main JavaScript file. This single import sets up the polyfill, core commands, and all extended commands automatically.

```javascript
import 'invokers';

// Your page now understands the Invoker Commands API and all of Invokers' custom commands.
```

<br />

## 📖 Progressive Learning Guide

Learn Invokers step by step, from basic interactions to complex workflows.

### 📚 Level 1: Basic Interactions

Start with these essential patterns you'll use every day.

#### Interest Invokers (Hover Cards & Tooltips)

Create accessible hover cards and tooltips that work across all input methods:

```html
<!-- Simple tooltip on hover/focus -->
<button type="button" interestfor="help-tip">Help</button>
<div id="help-tip" popover="hint">Click to toggle the sidebar</div>

<!-- Rich hover card with interactive content -->
<a href="/users/johndoe" interestfor="user-card">@johndoe</a>
<div id="user-card" popover="auto">
  <img src="/avatars/johndoe.jpg" alt="John's avatar">
  <h3>John Doe</h3>
  <p>Full-stack developer</p>
  <button type="button">Follow</button>
</div>

<!-- Link preview -->
<a href="https://example.com/article" interestfor="article-preview">
  Read the full article
</a>
<div id="article-preview" popover="hint">
  "Understanding Web Standards" - A deep dive into modern HTML APIs
</div>

<!-- Adjustable delay timing -->
<style>
  .slow-hint { --interest-delay: 1s 500ms; }
</style>
<button type="button" interestfor="slow-tip" class="slow-hint">Slow hint</button>
<div id="slow-tip" popover="hint">Takes longer to appear</div>
```

#### Native Commands (Work in All Browsers)

```html
<!-- Open/close modal dialogs -->
<button type="button" command="show-modal" commandfor="my-dialog">
  Open Dialog
</button>
<dialog id="my-dialog">
  <p>Hello from a modal dialog!</p>
  <button type="button" command="close" commandfor="my-dialog">Close</button>
</dialog>
```

#### Future Native Commands (Polyfilled)

```html
<!-- Details/summary expansion -->
<button type="button" command="toggle" commandfor="faq-1">Toggle FAQ</button>
<details id="faq-1">
  <summary>What is Invokers?</summary>
  <p>Invokers is a library for declarative HTML interactions...</p>
</details>

<!-- Media controls -->
<button type="button" command="play-pause" commandfor="my-video">⏯️</button>
<button type="button" command="toggle-muted" commandfor="my-video">🔊</button>
<button type="button" command="toggle-fullscreen" commandfor="my-video">⛶</button>
<video id="my-video" src="video.mp4"></video>

<!-- File picker and number inputs -->
<button type="button" command="show-picker" commandfor="file-input">Browse Files</button>
<input type="file" id="file-input" hidden>

<button type="button" command="step-up" commandfor="quantity">+</button>
<input type="number" id="quantity" value="1" min="1" max="10">
<button type="button" command="step-down" commandfor="quantity">-</button>

<!-- Clipboard and sharing -->
<button type="button" command="copy-text" commandfor="code-snippet">Copy</button>
<code id="code-snippet">npm install invokers</code>

<button type="button" command="share" commandfor="article-url">Share</button>
<span id="article-url">https://example.com/great-article</span>
```

#### Toggle Menus & Accordions

```html
<!-- Toggle navigation menu -->
<button type="button" command="--toggle" commandfor="nav-menu" aria-expanded="false">
  Menu
</button>
<nav id="nav-menu" hidden>
  <a href="/home">Home</a>
  <a href="/about">About</a>
</nav>
```

#### Show/Hide Content

```html
<!-- Dismissible alerts -->
<div id="alert-message" class="alert">
  <p>Form saved successfully!</p>
  <button type="button" command="--hide" commandfor="alert-message">×</button>
</div>
```

### 📚 Level 2: Dynamic Content

Now add interactivity with text, classes, and attributes.

#### Tab Panels (Accessible by Default)

```html
<div role="tablist">
  <button type="button" command="--show" commandfor="panel-1" aria-expanded="true">
    Home
  </button>
  <button type="button" command="--show" commandfor="panel-2" aria-expanded="false">
    About
  </button>
</div>
<div>
  <div id="panel-1" role="tabpanel">Welcome to our homepage!</div>
  <div id="panel-2" role="tabpanel" hidden>Learn more about us.</div>
</div>
```

#### Dynamic Text & Styling

```html
<!-- Change text and add visual feedback -->
<button type="button"
  command="--text:set:✅ Saved!"
  commandfor="status"
  data-and-then="--class:add:success">
  Save Document
</button>
<div id="status" class="status-message">Ready to save</div>

<!-- Toggle dark mode -->
<button type="button"
  command="--class:toggle:dark-theme"
  commandfor="body"
  data-and-then="--text:set:Theme toggled!">
  🌙 Toggle Theme
</button>

<!-- Animate elements with custom timing -->
<button type="button"
  command="--animate:bounce"
  data-animate-duration="1s"
  data-animate-delay="200ms"
  data-animate-iterations="2">
  Celebrate!
</button>

<!-- Store user preferences -->
<button type="button"
  command="--storage:local:set:theme:dark"
  data-storage-expires="86400"
  data-and-then="--text:set:Preference saved!">
  Save Dark Theme
</button>

<!-- Focus management -->
<button type="button" command="--a11y:focus" commandfor="search-input">Focus Search</button>
<input type="text" id="search-input" placeholder="Search...">

<!-- URL manipulation -->
<button type="button" command="--url:params:set:page:2">Go to Page 2</button>
<button type="button" command="--url:hash:set:section-about">Jump to About</button>
```

#### Server Content

```html
<!-- Fetch and display server content -->
<button type="button"
  command="--fetch:get"
  data-url="/api/latest-posts"
  commandfor="posts-container"
  data-loading-template="spinner">
  Load Latest Posts
</button>
<div id="posts-container">Posts will appear here...</div>

<template id="spinner">
  <p>Loading posts...</p>
</template>
```

#### Form Submission

```html
<!-- Submit form data and update content dynamically -->
<form id="contact-form" action="/api/contact" method="post">
  <input type="text" name="name" required>
  <button type="button"
    command="--fetch:send"
    commandfor="contact-form"
    data-response-target="#result-area"
    data-loading-template="spinner">
    Submit Form
  </button>
</form>
<div id="result-area">Response will appear here...</div>

<template id="spinner">
  <div>Loading...</div>
</template>
```

The `data-response-target` attribute specifies where to display the server response, while `data-loading-template` shows a loading indicator during submission.

### 📚 Level 3: Advanced Workflows

Chain multiple commands together for complex interactions.

#### Simple Command Chaining

```html
<!-- Chain two commands: change text, then add a class -->
<button type="button"
  command="--text:set:Processing complete!"
  commandfor="status"
  data-and-then="--class:add:success">
  Complete Process
</button>
<div id="status">Ready to process</div>
```

#### Conditional Workflows

```html
<!-- Different commands based on success/failure -->
<button type="button"
  command="--fetch:get"
  data-url="/api/user-data"
  commandfor="profile"
  data-after-success="--class:add:loaded,--text:set:Profile loaded!"
  data-after-error="--class:add:error,--text:set:Failed to load profile"
  data-after-complete="--attr:set:aria-busy:false">
  Load Profile
</button>
<div id="profile" aria-busy="false">Profile will load here...</div>
```

#### Complex Workflows with `<and-then>` Elements

```html
<!-- Multi-step workflow with branching logic -->
<button type="button" command="--text:set:Starting..." commandfor="workflow">
  Start Complex Workflow

  <!-- Success path -->
  <and-then command="--class:add:processing" commandfor="workflow" data-condition="success" data-delay="500">
    <and-then command="--text:append: → Step 2 complete" commandfor="workflow" data-delay="1000">
      <and-then command="--class:remove:processing" commandfor="workflow">
        <and-then command="--class:add:success" commandfor="workflow">
        </and-then>
      </and-then>
    </and-then>
  </and-then>
</button>
<div id="workflow">Ready to start</div>
```

#### Device Integration Workflows

```html
<!-- Location-based features -->
<button type="button"
  command="--device:geolocation:get"
  data-and-then="--storage:local:set:last-location"
  data-after-success="--text:set:Location saved!"
  data-after-error="--text:set:Location access denied">
  Save My Location
</button>

<!-- Vibration feedback -->
<button type="button"
  command="--device:vibrate:100:200:100"
  data-and-then="--text:set:Vibration sent!">
  Send Haptic Feedback
</button>

<!-- Battery-aware features -->
<button type="button" command="--device:battery:get" commandfor="battery-status">
  Check Battery
</button>
<div id="battery-status">Battery info will appear here</div>
```

#### Advanced URL and History Management

```html
<!-- URL parameter manipulation -->
<button type="button" command="--url:params:set:filter:active">Show Active Items</button>
<button type="button" command="--url:params:delete:filter">Clear Filter</button>

<!-- History navigation -->
<button type="button" command="--history:push:/settings">Go to Settings</button>
<button type="button" command="--history:back">Go Back</button>

<!-- Hash-based navigation -->
<button type="button" command="--url:hash:set:contact">Jump to Contact</button>
```

#### Accessibility-Enhanced Interactions

```html
<!-- Screen reader announcements -->
<button type="button"
  command="--fetch:get"
  data-url="/api/data"
  data-after-success="--a11y:announce:Data loaded successfully"
  data-after-error="--a11y:announce:Failed to load data">
  Load Data
</button>

<!-- Focus management -->
<button type="button" command="--a11y:focus-trap:enable" commandfor="modal">Open Modal</button>
<div id="modal" role="dialog">
  <p>Modal content</p>
  <button type="button" command="--a11y:focus-trap:disable">Close</button>
</div>
```

## 🔌 Plugin System

Invokers features a powerful plugin system that allows you to extend functionality through middleware hooks. Plugins can intercept command execution at various lifecycle points, enabling features like analytics, security checks, UI enhancements, and more.

### Plugin Architecture

Plugins are objects that implement the `InvokerPlugin` interface and can register middleware functions for specific hook points in the command execution lifecycle:

```typescript
interface InvokerPlugin {
  name: string;
  version?: string;
  description?: string;

  onRegister?(manager: InvokerManager): void;
  onUnregister?(manager: InvokerManager): void;

  middleware?: Partial<Record<HookPoint, MiddlewareFunction>>;
}

type MiddlewareFunction = (context: CommandContext & { result?: CommandExecutionResult }, hookPoint: HookPoint) => void | Promise<void>;
```

### Hook Points

Plugins can hook into these command execution lifecycle points:

- `HookPoint.BEFORE_COMMAND` - Before any command execution begins
- `HookPoint.AFTER_COMMAND` - After command execution completes (success or error)
- `HookPoint.BEFORE_VALIDATION` - Before command parameter validation
- `HookPoint.AFTER_VALIDATION` - After validation passes
- `HookPoint.ON_SUCCESS` - When a command executes successfully
- `HookPoint.ON_ERROR` - When a command fails
- `HookPoint.ON_COMPLETE` - Always executes after command completion

### Creating a Plugin

```javascript
// Analytics plugin example
const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Tracks command usage',

  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      console.log(`Command executed: ${context.fullCommand}`);
      // Track analytics here
    },
    [window.Invoker.HookPoint.ON_ERROR]: (context) => {
      console.error(`Command failed: ${context.fullCommand}`, context.result.error);
      // Report errors here
    }
  }
};

// Register the plugin
window.Invoker.instance.registerPlugin(analyticsPlugin);

// Later, unregister if needed
window.Invoker.instance.unregisterPlugin('analytics');
```

### Security Plugin Example

```javascript
const securityPlugin = {
  name: 'security',
  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      // Rate limiting
      const now = Date.now();
      const lastExecution = context.invoker?.dataset.lastExecution || 0;

      if (now - lastExecution < 1000) {
        throw new Error('Rate limit exceeded');
      }

      context.invoker.dataset.lastExecution = now;

      // Security checks
      if (context.fullCommand.includes('dangerous')) {
        throw new Error('Security policy violation');
      }
    }
  }
};
```

### UI Enhancement Plugin Example

```javascript
const uiPlugin = {
  name: 'ui-enhancement',
  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      // Add loading state
      if (context.invoker) {
        context.invoker.disabled = true;
        context.invoker.dataset.originalText = context.invoker.textContent;
        context.invoker.textContent = 'Loading...';
      }
    },
    [window.Invoker.HookPoint.ON_COMPLETE]: (context) => {
      // Remove loading state
      if (context.invoker) {
        context.invoker.disabled = false;
        context.invoker.textContent = context.invoker.dataset.originalText;
      }
    }
  }
};
```

### Global Middleware

You can also register middleware globally without creating a full plugin:

```javascript
// Register global middleware
window.Invoker.instance.registerMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, (context) => {
  console.log('All commands pass through here:', context.fullCommand);
});

// Unregister specific middleware
window.Invoker.instance.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middlewareFunction);
```

### Plugin Lifecycle

Plugins can implement `onRegister` and `onUnregister` methods for setup and cleanup:

```javascript
const myPlugin = {
  name: 'my-plugin',
  onRegister(manager) {
    console.log('Plugin registered, setting up...');
    // Initialize plugin resources
  },
  onUnregister(manager) {
    console.log('Plugin unregistered, cleaning up...');
    // Clean up resources
  }
};

// Register the plugin
window.Invoker.instance.registerPlugin(myPlugin);
```

## 🧰 Extended Commands

Invokers includes a comprehensive set of extended commands that are automatically available when you import the library. These provide advanced features for real-world applications:

### Automatically Included Commands:
- **Server Communication**: `--fetch:get`, `--fetch:send` - Load and send data to servers
- **Media Controls**: `--media:toggle`, `--media:seek`, `--media:mute` - Full media player controls
- **DOM Manipulation**: `--dom:remove`, `--dom:replace`, `--dom:swap`, `--dom:append`, `--dom:prepend` - Dynamic content updates
- **Form Handling**: `--form:reset`, `--form:submit` - Form interactions
- **Input Controls**: `--input:step`, `--value:set` - Control form input values and stepping
- **Focus Management**: `--focus` - Programmatically focus elements
- **State Management**: `--disabled:toggle` - Enable/disable form elements
- **Scroll Controls**: `--scroll:into-view`, `--scroll:to` - Smooth scrolling to elements
- **Storage**: `--storage:local:set`, `--storage:session:get` - Persist data in browser storage
- **Animation**: `--animate:fade-in`, `--animate:slide-up` - CSS animations and transitions
- **Event Emitting**: `--emit:custom-event` - Dispatch custom events
- **URL Manipulation**: `--url:params:get`, `--url:hash:set` - Work with URLs and browser history
- **History Navigation**: `--history:push`, `--history:back` - Browser history management
- **Device APIs**: `--device:vibrate`, `--device:geolocation:get` - Access device features
- **Accessibility**: `--a11y:announce`, `--a11y:focus-trap` - Screen reader and focus management
- **Clipboard**: `--clipboard:copy` - Copy text to clipboard
- **Navigation**: `--navigate:to` - Programmatic navigation
- **Text Operations**: `--text:copy` - Copy element text content
- **Carousel Controls**: `--carousel:nav` - Image carousel navigation

### Selective Command Registration (Advanced)

For applications that only need specific commands, you can selectively register them:

```javascript
import { registerAll } from 'https://esm.sh/invokers/commands';

// Register only media and fetch commands
registerAll(['--media:toggle', '--media:seek', '--fetch:get']);
```

This can help reduce bundle size in applications with strict performance requirements.

## 📚 Detailed Command Reference

### Storage Commands

The `--storage` commands provide comprehensive localStorage and sessionStorage management with advanced features like JSON support, expiration, and metadata.

#### Basic Storage Operations

```html
<!-- Store simple values -->
<button type="button" command="--storage:local:set:username:john">Save Username</button>
<button type="button" command="--storage:session:set:temp-data:123">Save Temp Data</button>

<!-- Retrieve values -->
<button type="button" command="--storage:local:get:username" commandfor="username-display">Load Username</button>
<div id="username-display">Username will appear here</div>

<!-- Remove specific keys -->
<button type="button" command="--storage:local:remove:username">Clear Username</button>

<!-- Clear all storage -->
<button type="button" command="--storage:local:clear">Clear All Local Data</button>
```

#### Advanced Features

```html
<!-- JSON storage with automatic serialization -->
<button type="button"
  command="--storage:local:set:user-settings"
  data-storage-json="true">
  Save Settings Object
</button>

<!-- Expiring data (in seconds) -->
<button type="button"
  command="--storage:local:set:session-token:abc123"
  data-storage-expires="3600">
  Save Token (expires in 1 hour)
</button>

<!-- Check if key exists -->
<button type="button" command="--storage:local:has:username" commandfor="status">Check Username</button>

<!-- Get storage size -->
<button type="button" command="--storage:local:size" commandfor="size-display">Show Storage Size</button>

<!-- List all keys -->
<button type="button" command="--storage:local:keys" commandfor="keys-list">List All Keys</button>
```

#### JavaScript Integration

```javascript
// Programmatic storage access
const settings = { theme: 'dark', lang: 'en' };
localStorage.setItem('user-prefs', JSON.stringify(settings));

// Then retrieve in HTML
<button command="--storage:local:get:user-prefs" commandfor="prefs-display">Load Preferences</button>
```

### Animation Commands

The `--animate` command provides CSS-based animations with customizable timing and effects.

#### Basic Animations

```html
<button type="button" command="--animate:fade-in">Fade In</button>
<button type="button" command="--animate:fade-out">Fade Out</button>
<button type="button" command="--animate:slide-up">Slide Up</button>
<button type="button" command="--animate:slide-down">Slide Down</button>
<button type="button" command="--animate:bounce">Bounce</button>
<button type="button" command="--animate:spin">Spin</button>
```

#### Custom Animation Properties

```html
<button type="button"
  command="--animate:fade-in"
  data-animate-duration="2s"
  data-animate-delay="500ms"
  data-animate-easing="ease-out"
  data-animate-iterations="3">
  Custom Fade In
</button>
```

#### Available Animations
- `fade-in`, `fade-out`
- `slide-up`, `slide-down`, `slide-left`, `slide-right`
- `bounce`, `shake`, `pulse`, `flip`
- `rotate-in`, `zoom-in`, `zoom-out`
- `spin`, `wobble`, `jello`, `heartbeat`, `rubber-band`

### Event Commands

The `--emit` command dispatches custom events with optional detail data and configurable event properties.

#### Basic Event Dispatch

```html
<!-- Dispatch simple custom event -->
<button command="--emit:my-event">Trigger Event</button>

<!-- Event with detail data -->
<button command="--emit:user-action:login">User Logged In</button>
<button command="--emit:data-updated:{\"id\":123,\"status\":\"saved\"}">Data Saved</button>
```

#### Event Configuration

```html
<!-- Configurable event properties -->
<button type="button"
  command="--emit:modal-opened:settings"
  data-emit-bubbles="true"
  data-emit-cancelable="true"
  data-emit-composed="true">
  Open Settings Modal
</button>
```

#### JavaScript Event Handling

```javascript
// Listen for custom events
document.addEventListener('my-event', (event) => {
  console.log('Event triggered!', event.detail);
});

// Handle emitted events
document.addEventListener('user-action', (event) => {
  console.log('Action:', event.detail); // "login"
});

document.addEventListener('data-updated', (event) => {
  console.log('Data:', event.detail); // {id: 123, status: "saved"}
});
```

#### Built-in Event Types

The command automatically handles built-in DOM events with appropriate event classes:

```html
<!-- Dispatches MouseEvent -->
<button command="--emit:click">Simulate Click</button>

<!-- Dispatches KeyboardEvent -->
<button command="--emit:keydown:Enter">Simulate Enter Key</button>

<!-- Dispatches InputEvent -->
<button command="--emit:input:new-value">Simulate Input</button>
```

### Pipeline Commands

The `--pipeline` command executes complex, template-based command sequences with conditional logic and error handling.

#### Basic Pipeline Execution

```html
<button type="button" command="--pipeline:execute:user-onboarding">
  Start User Onboarding
</button>

<template id="user-onboarding" data-pipeline="true">
  <pipeline-step command="--text:set:Welcome!" target="status" />
  <pipeline-step command="--class:add:welcome" target="app" delay="500" />
  <pipeline-step command="--show" target="tutorial-step-1" delay="1000" />
</template>
```

#### Conditional Pipeline Steps

```html
<template id="data-processing" data-pipeline="true">
  <!-- Always execute -->
  <pipeline-step command="--text:set:Processing..." target="status" />

  <!-- Only on success -->
  <pipeline-step command="--fetch:get" target="data-container"
                 data-url="/api/data" condition="success" />
  <pipeline-step command="--class:add:loaded" target="data-container"
                 condition="success" />

  <!-- Only on error -->
  <pipeline-step command="--text:set:Failed to load data" target="status"
                 condition="error" />
  <pipeline-step command="--class:add:error" target="status"
                 condition="error" />
</template>
```

#### Advanced Pipeline Features

```html
<template id="complex-workflow" data-pipeline="true">
  <!-- One-time initialization -->
  <pipeline-step command="--storage:local:set:initialized:true"
                 once="true" />

  <!-- Delayed execution -->
  <pipeline-step command="--animate:fade-in" target="content"
                 delay="2000" />

  <!-- Data passing -->
  <pipeline-step command="--fetch:get" target="user-data"
                 data-url="/api/user" data-response-target="#profile" />

  <!-- Cleanup (always runs) -->
  <pipeline-step command="--attr:set:aria-busy:false" target="app"
                 condition="always" />
</template>
```

#### Pipeline Step Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `command` | Command to execute | `command="--text:set:Done"` |
| `target` | Target element ID | `target="status"` |
| `condition` | When to execute: `success`, `error`, `always` | `condition="success"` |
| `delay` | Delay in milliseconds | `delay="1000"` |
| `once` | Execute only once, then remove from template | `once="true"` |
| `data-*` | Pass data attributes to command | `data-url="/api/data"` |

#### Error Handling in Pipelines

Pipelines automatically handle errors and can continue with error-specific steps:

```html
<template id="robust-operation" data-pipeline="true">
  <pipeline-step command="--fetch:get" target="content" data-url="/api/data" />

  <!-- Success path -->
  <pipeline-step command="--class:add:success" target="content"
                 condition="success" />

  <!-- Error recovery -->
  <pipeline-step command="--text:set:Using cached data" target="content"
                 condition="error" />
  <pipeline-step command="--storage:local:get:cached-data" target="content"
                 condition="error" />
</template>
```

### Media Commands

Control HTML5 video and audio elements with advanced playback features.

#### Basic Media Controls

```html
<!-- Toggle play/pause with visual feedback -->
<button type="button"
  command="--media:toggle"
  commandfor="my-video"
  data-play-text="Pause"
  data-pause-text="Play">
  Play
</button>

<video id="my-video" src="movie.mp4"></video>
```

#### Advanced Media Controls

```html
<!-- Seek forward/backward -->
<button command="--media:seek:10" commandfor="my-video">+10s</button>
<button command="--media:seek:-5" commandfor="my-video">-5s</button>

<!-- Mute/unmute -->
<button command="--media:mute" commandfor="my-video">Toggle Mute</button>
```

### Carousel Commands

Navigate image or content carousels with smooth transitions.

```html
<div id="image-carousel">
  <div>Image 1</div>
  <div hidden>Image 2</div>
  <div hidden>Image 3</div>
</div>

<button command="--carousel:nav:next" commandfor="image-carousel">Next</button>
<button command="--carousel:nav:prev" commandfor="image-carousel">Previous</button>
```

### DOM Manipulation Commands

Dynamically update page content with template-based operations.

#### Template-Based Content

```html
<!-- Templates for content -->
<template id="new-item-template">
  <div class="item">New Item Content</div>
</template>

<template id="loading-template">
  <div class="loading">Loading...</div>
</template>
```

#### DOM Operations

```html
<!-- Replace element content -->
<button command="--dom:replace" commandfor="old-content" data-template-id="new-item-template">
  Replace Content
</button>

<!-- Swap inner content -->
<button command="--dom:swap" commandfor="container" data-template-id="new-item-template">
  Swap Content
</button>

<!-- Add content -->
<button command="--dom:append" commandfor="list" data-template-id="new-item-template">
  Add Item
</button>

<button command="--dom:prepend" commandfor="list" data-template-id="new-item-template">
  Add to Top
</button>

<!-- Remove element -->
<button command="--dom:remove" commandfor="temp-element">Remove</button>
```

### Form Commands

Enhanced form interaction and validation.

```html
<form id="my-form">
  <input type="text" name="username" required>
  <input type="email" name="email" required>
</form>

<!-- Form actions -->
<button command="--form:reset" commandfor="my-form">Reset Form</button>
<button command="--form:submit" commandfor="my-form">Submit Form</button>
```

### Input Commands

Control number inputs and form values.

```html
<!-- Number input stepping -->
<button command="--input:step:1" commandfor="quantity">+</button>
<input type="number" id="quantity" value="1" min="1" max="10">
<button command="--input:step:-1" commandfor="quantity">-</button>

<!-- Set input values -->
<button command="--value:set:new-value" commandfor="text-input">Set Value</button>
```

### Text Commands

Advanced text manipulation and copying.

```html
<!-- Text operations -->
<button command="--text:set:Hello World" commandfor="message">Set Text</button>
<button command="--text:append: more text" commandfor="message">Append Text</button>
<button command="--text:prepend:Prefix: " commandfor="message">Prepend Text</button>
<button command="--text:clear" commandfor="message">Clear Text</button>

<!-- Copy text between elements -->
<div id="source">Text to copy</div>
<button command="--text:copy" data-copy-from="#source" commandfor="destination">Copy Text</button>
<div id="destination"></div>
```

### Clipboard Commands

Copy text content to clipboard with feedback.

```html
<code id="code-snippet">npm install invokers</code>

<button type="button"
  command="--clipboard:copy"
  commandfor="code-snippet"
  data-feedback-text="Copied!"
  data-error-text="Copy failed">
  Copy Code
</button>
```

### Fetch Commands

Load and send data to servers with loading states and error handling.

#### GET Requests

```html
<button type="button"
  command="--fetch:get"
  data-url="/api/latest-posts"
  commandfor="posts-container"
  data-loading-template="spinner"
  data-error-template="error-msg"
  data-response-target="#posts-container">
  Load Posts
</button>

<div id="posts-container">Posts will load here...</div>

<template id="spinner">
  <div>Loading posts...</div>
</template>

<template id="error-msg">
  <div>Failed to load posts</div>
</template>
```

#### POST Requests (Form Submission)

```html
<form id="contact-form" action="/api/contact" method="post">
  <input name="name" required>
  <input name="email" required>
  <textarea name="message"></textarea>
</form>

<button type="button"
  command="--fetch:send"
  commandfor="contact-form"
  data-response-target="#result"
  data-loading-template="sending">
  Send Message
</button>

<div id="result"></div>
```

### Navigation Commands

Programmatic navigation using the History API.

```html
<button command="--navigate:to:/about">Go to About</button>
<button command="--navigate:to:/products?category=electronics">Go to Products</button>
```

### Native/Polyfilled Commands

These commands work in all modern browsers through Invokers' polyfill. They implement upcoming web standards and provide fallbacks for older browsers.

#### Dialog and Modal Commands

```html
<!-- Modal dialogs -->
<button type="button" command="show-modal" commandfor="settings-dialog">
  Open Settings
</button>

<dialog id="settings-dialog">
  <h2>Settings</h2>
  <p>Settings content...</p>
  <button type="button" command="close" commandfor="settings-dialog">Close</button>
</dialog>

<!-- Request close (allows cancel) -->
<button type="button" command="request-close" commandfor="confirm-dialog">
  Cancel Action
</button>
```

#### Popover Commands

```html
<!-- Popover toggles -->
<button type="button" command="toggle-popover" commandfor="user-menu">
  User Menu
</button>

<div id="user-menu" popover>
  <a href="/profile">Profile</a>
  <a href="/settings">Settings</a>
  <a href="/logout">Logout</a>
</div>

<!-- Direct show/hide -->
<button type="button" command="show-popover" commandfor="tooltip">Show Help</button>
<button type="button" command="hide-popover" commandfor="tooltip">Hide Help</button>
```

#### Details/Summary Commands

```html
<!-- Expandable content -->
<button type="button" command="toggle" commandfor="faq-1">Toggle FAQ</button>
<details id="faq-1">
  <summary>What is Invokers?</summary>
  <p>Invokers is a library for declarative HTML interactions...</p>
</details>

<button type="button" command="open" commandfor="faq-2">Open FAQ</button>
<details id="faq-2">
  <summary>How does it work?</summary>
  <p>It uses HTML attributes to describe interactions...</p>
</details>
```

#### Media Element Commands

```html
<video id="main-video" src="demo.mp4" controls></video>

<!-- Playback controls -->
<button type="button" command="play-pause" commandfor="main-video">⏯️</button>
<button type="button" command="play" commandfor="main-video">▶️</button>
<button type="button" command="pause" commandfor="main-video">⏸️</button>
<button type="button" command="toggle-muted" commandfor="main-video">🔇</button>
```

#### Fullscreen Commands

```html
<div id="fullscreen-target">
  <h1>Fullscreen Content</h1>
  <p>This can go fullscreen</p>
</div>

<button type="button" command="toggle-fullscreen" commandfor="fullscreen-target">
  Toggle Fullscreen
</button>

<button type="button" command="request-fullscreen" commandfor="fullscreen-target">
  Enter Fullscreen
</button>

<button type="button" command="exit-fullscreen">
  Exit Fullscreen
</button>
```

#### Picker Commands

```html
<!-- File picker -->
<button type="button" command="show-picker" commandfor="file-input">Choose File</button>
<input type="file" id="file-input" hidden>

<!-- Date/time picker -->
<button type="button" command="show-picker" commandfor="date-input">Pick Date</button>
<input type="date" id="date-input">

<!-- Number stepper -->
<button type="button" command="step-up" commandfor="quantity">Increase</button>
<input type="number" id="quantity" value="1" min="1" max="10">
<button type="button" command="step-down" commandfor="quantity">Decrease</button>
```

#### Clipboard and Sharing Commands

```html
<!-- Copy text -->
<code id="install-cmd">npm install invokers</code>
<button type="button" command="copy-text" commandfor="install-cmd">Copy</button>

<!-- Share content -->
<span id="share-content">Check out Invokers: https://invokers.dev</span>
<button type="button" command="share" commandfor="share-content">Share</button>
```

#### Openable Elements Commands

```html
<!-- Custom openable elements -->
<div id="custom-panel" closed>
  <h3>Panel Content</h3>
  <p>This panel can be opened/closed</p>
</div>

<button type="button" command="toggle-openable" commandfor="custom-panel">Toggle Panel</button>
<button type="button" command="open-openable" commandfor="custom-panel">Open Panel</button>
<button type="button" command="close-openable" commandfor="custom-panel">Close Panel</button>
```

#### Browser Support Notes

- **Dialog commands**: Work in all modern browsers; polyfilled for older ones
- **Popover commands**: Native in Chrome/Edge; polyfilled in Firefox/Safari
- **Media commands**: Full support in all browsers with HTML5 media elements
- **Fullscreen commands**: Supported in all modern browsers
- **Picker commands**: Native support varies; Invokers provides fallbacks
- **Clipboard commands**: Requires secure context (HTTPS) in modern browsers

### URL Manipulation Commands

Control browser URL parameters, hash, and navigation programmatically.

#### URL Parameters

```html
<!-- Set URL parameters -->
<button command="--url:params:set:page:2">Go to Page 2</button>
<button command="--url:params:set:sort:name">Sort by Name</button>

<!-- Get parameter values -->
<button command="--url:params:get:id" commandfor="item-id">Get Item ID</button>

<!-- Delete parameters -->
<button command="--url:params:delete:filter">Clear Filter</button>
<button command="--url:params:clear">Clear All Params</button>

<!-- Get all parameters as JSON -->
<button command="--url:params:all" commandfor="params-display">Show All Params</button>
```

#### Hash Navigation

```html
<button command="--url:hash:set:section-about">Jump to About</button>
<button command="--url:hash:get" commandfor="current-hash">Get Current Hash</button>
<button command="--url:hash:clear">Clear Hash</button>
```

#### Navigation and History

```html
<button command="--url:reload">Reload Page</button>
<button command="--url:replace:/new-page">Replace URL</button>
<button command="--url:navigate:/new-page">Navigate to Page</button>
```

### History Commands

Manipulate browser history with state management.

```html
<!-- Push new history entries -->
<button command="--history:push:/settings">Go to Settings</button>
<button command="--history:push:/profile:John:admin">Go to Profile with State</button>

<!-- Navigate history -->
<button command="--history:back">Go Back</button>
<button command="--history:forward">Go Forward</button>
<button command="--history:go:-2">Go Back 2 Pages</button>

<!-- State management -->
<button command="--history:state:get" commandfor="state-display">Get Current State</button>
<button command="--history:state:set:{\"page\":1}">Set State</button>
```

### Device API Commands

Access device features like geolocation, vibration, and battery status.

#### Geolocation

```html
<button type="button"
  command="--device:geolocation:get"
  data-geo-high-accuracy="true"
  data-geo-timeout="10000"
  data-geo-max-age="300000">
  Get My Location
</button>
```

#### Vibration and Haptics

```html
<!-- Simple vibration -->
<button command="--device:vibrate:200">Vibrate 200ms</button>

<!-- Pattern vibration -->
<button command="--device:vibrate:100:200:100">Vibrate Pattern</button>
```

#### Battery Status

```html
<button command="--device:battery:get" commandfor="battery-info">Check Battery</button>
<div id="battery-info">Battery status will appear here</div>
```

#### Clipboard Operations

```html
<button command="--device:clipboard:read" commandfor="clipboard-content">Read Clipboard</button>
<button command="--device:clipboard:write:Hello World">Write to Clipboard</button>
```

#### Wake Lock

```html
<button command="--device:wake-lock">Keep Screen On</button>
<button command="--device:wake-lock:release">Allow Screen Off</button>
```

### Accessibility Commands

Enhance accessibility with screen reader support and focus management.

#### Screen Reader Announcements

```html
<button command="--a11y:announce:Item saved successfully">Save Item</button>
<button command="--a11y:announce:Error: Invalid input" data-announce-priority="assertive">Submit Form</button>
```

#### Focus Management

```html
<button command="--a11y:focus" commandfor="search-input">Focus Search</button>
<button command="--a11y:skip-to:main-content">Skip to Main Content</button>
```

#### Focus Trapping

```html
<button command="--a11y:focus-trap:enable" commandfor="modal">Open Modal</button>
<button command="--a11y:focus-trap:disable">Close Modal</button>
```

#### ARIA Attributes

```html
<button command="--a11y:aria:set:label:Save document">Set Label</button>
<button command="--a11y:aria:remove:label">Remove Label</button>
<button command="--a11y:heading-level:2" commandfor="heading">Make H2</button>
```

## 🐞 Debugging & Common Issues

### Quick Fixes for Common Problems

| Problem | Solution |
| ------- | -------- |
| **Button reloads the page** | Add `type="button"` to your `<button>` |
| **Nothing happens when clicked** | Check that `commandfor` points to a real `id` |
| **Fetch command fails** | Your endpoint must return HTML, not JSON |
| **ARIA not updating** | Use `aria-expanded="false"` on the button initially |
| **Command not found** | Commands need `--` prefix: `command="--toggle"` |

### Debugging Tips

```html
<!-- ✅ Good: All required attributes present -->
<button type="button" command="--toggle" commandfor="menu" aria-expanded="false">Menu</button>
<nav id="menu" hidden>...</nav>

<!-- ❌ Bad: Missing type="button" will submit forms -->
<button command="--toggle" commandfor="menu">Menu</button>

<!-- ❌ Bad: Missing commandfor breaks the connection -->
<button type="button" command="--toggle">Menu</button>

<!-- ❌ Bad: Target element needs an ID -->
<button type="button" command="--toggle" commandfor="menu">Menu</button>
<nav>...</nav>
```

💡 **Pro tip:** Open your browser's console to see helpful warnings from Invokers when things aren't set up correctly.

## 📖 Ready-to-Use Recipes

Copy these common patterns and adapt them to your needs.

### GitHub-Style Profile Hover Cards

```html
<style>
  .user-mention { 
    color: #0969da; 
    text-decoration: none; 
  }
  .user-mention:hover { text-decoration: underline; }
  
  .user-card {
    max-width: 300px;
    padding: 16px;
    border: 1px solid #d1d9e0;
    border-radius: 8px;
    background: white;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  
  .user-avatar { 
    width: 64px; 
    height: 64px; 
    border-radius: 50%; 
    margin-right: 12px;
  }
  
  .user-stats { 
    display: flex; 
    gap: 16px; 
    margin-top: 12px; 
    font-size: 0.875em;
    color: #656d76;
  }
</style>

<p>Great work on the PR, <a href="/users/alice" interestfor="alice-card" class="user-mention">@alice</a>!</p>

<div id="alice-card" popover="auto" class="user-card">
  <div style="display: flex; align-items: center;">
    <img src="/avatars/alice.jpg" alt="Alice's avatar" class="user-avatar">
    <div>
      <h3 style="margin: 0; font-size: 1.1em;">Alice Johnson</h3>
      <p style="margin: 0; color: #656d76;">Senior Frontend Developer</p>
    </div>
  </div>
  <div class="user-stats">
    <span><strong>127</strong> followers</span>
    <span><strong>43</strong> repos</span>
    <span><strong>1.2k</strong> contributions</span>
  </div>
  <button type="button" style="margin-top: 12px; padding: 8px 16px;">Follow</button>
</div>
```

### Wikipedia-Style Reference Tooltips

```html
<style>
  .reference-link { 
    color: #0645ad; 
    font-size: 0.8em; 
    vertical-align: super; 
    text-decoration: none;
  }
  .reference-tooltip {
    max-width: 400px;
    padding: 12px;
    font-size: 0.9em;
    line-height: 1.4;
    background: #f8f9fa;
    border-left: 4px solid #0645ad;
  }
</style>

<p>
  The Internet was first conceptualized in 1962<a href="#ref1" interestfor="ref1-tooltip" class="reference-link">[1]</a> 
  and has since transformed global communication<a href="#ref2" interestfor="ref2-tooltip" class="reference-link">[2]</a>.
</p>

<div id="ref1-tooltip" popover="hint" class="reference-tooltip">
  <strong>Licklider, J.C.R.</strong> "Memorandum for Members and Affiliates of the Intergalactic Computer Network" (1962). ARPANET archives.
</div>

<div id="ref2-tooltip" popover="hint" class="reference-tooltip">
  <strong>Berners-Lee, T.</strong> "Information Management: A Proposal" (1989). CERN. The original proposal for the World Wide Web.
</div>
```

### Documentation Quick Reference

```html
<style>
  .api-method { 
    font-family: monospace; 
    background: #f1f3f4; 
    padding: 2px 6px; 
    border-radius: 3px; 
  }
  .quick-ref {
    max-width: 350px;
    padding: 16px;
    font-family: monospace;
    font-size: 0.875em;
    background: #1e1e1e;
    color: #d4d4d4;
    border-radius: 8px;
  }
  .quick-ref h4 { color: #569cd6; margin-top: 0; }
  .quick-ref .param { color: #9cdcfe; }
  .quick-ref .type { color: #4ec9b0; }
</style>

<p>
  Use the <code interestfor="fetch-ref" class="api-method">fetch()</code> API to make HTTP requests
  or the <code interestfor="query-ref" class="api-method">querySelector()</code> method to find elements.
</p>

<div id="fetch-ref" popover="auto" class="quick-ref">
  <h4>fetch(url, options)</h4>
  <p><span class="param">url</span>: <span class="type">string</span> - The resource URL</p>
  <p><span class="param">options</span>: <span class="type">object</span> - Request configuration</p>
  <p><strong>Returns:</strong> <span class="type">Promise&lt;Response&gt;</span></p>
  <p>Example: <code>fetch('/api/data').then(r => r.json())</code></p>
</div>

<div id="query-ref" popover="auto" class="quick-ref">
  <h4>querySelector(selector)</h4>
  <p><span class="param">selector</span>: <span class="type">string</span> - CSS selector</p>
  <p><strong>Returns:</strong> <span class="type">Element | null</span></p>
  <p>Example: <code>document.querySelector('.button')</code></p>
</div>
```

### Accordion/FAQ

```html
<div class="faq">
  <button type="button" command="--toggle" commandfor="answer-1" aria-expanded="false">
    What is Invokers?
  </button>
  <div id="answer-1" hidden>
    <p>Invokers lets you write interactive HTML without JavaScript...</p>
  </div>
</div>
```

### Modal Dialog

```html
<button type="button" command="show-modal" commandfor="confirm-dialog">
  Delete Item
</button>
<dialog id="confirm-dialog">
  <p>Are you sure you want to delete this item?</p>
  <button type="button" command="close" commandfor="confirm-dialog">Cancel</button>
  <button type="button">Delete</button>
</dialog>
```

### Loading States with Fetch

```html
<button type="button" 
  command="--fetch:get" 
  data-url="/api/content"
  commandfor="content-area"
  data-loading-template="spinner"
  data-and-then="--class:add:loaded">
  Load Content
</button>

<div id="content-area">Content will appear here</div>

<template id="spinner">
  <div class="loading">Loading...</div>
</template>
```

### Dismissible Notifications

```html
<div id="notification" class="alert alert-success">
  <span>Changes saved successfully!</span>
  <button type="button" command="--hide" commandfor="notification">×</button>
</div>
```

### Dark Mode Toggle

```html
<button type="button" 
  command="--class:toggle:dark-theme" 
  commandfor="body"
  data-and-then="--text:set:Theme switched!"
  data-then-target="theme-status">
  🌙 Toggle Theme
</button>
<span id="theme-status">Click to switch theme</span>
```

### Video Player with Native Controls

```html
<div class="video-container">
  <video id="main-video" src="demo.mp4" poster="thumbnail.jpg"></video>
  
  <div class="video-controls">
    <button type="button" command="play-pause" commandfor="main-video">⏯️</button>
    <button type="button" command="toggle-muted" commandfor="main-video">🔊</button>
    <button type="button" command="toggle-fullscreen" commandfor="main-video">⛶</button>
  </div>
</div>
```

### Interactive FAQ with Details

```html
<div class="faq-section">
  <h3>
    <button type="button" command="toggle" commandfor="faq-details">
      What browsers support Interest Invokers?
    </button>
  </h3>
  <details id="faq-details">
    <summary>Click to expand</summary>
    <p>Interest Invokers work in all modern browsers through our polyfill...</p>
  </details>
  
  <button type="button" command="copy-text" commandfor="faq-details">
    Copy Answer
  </button>
</div>
```

### File Upload with Custom Picker

```html
<div class="upload-area">
  <button type="button" 
          command="show-picker" 
          commandfor="file-input"
          class="upload-button">
    📁 Choose Files
  </button>
  <input type="file" id="file-input" multiple hidden>
  
  <!-- Show selected files -->
  <div id="file-list"></div>
  
  <script>
    document.getElementById('file-input').addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      document.getElementById('file-list').innerHTML = 
        files.map(f => `<p>📄 ${f.name}</p>`).join('');
    });
  </script>
</div>
```

### Quantity Selector

```html
<div class="quantity-selector">
  <button type="button" command="step-down" commandfor="item-quantity">-</button>
  <input type="number" 
         id="item-quantity" 
         value="1" 
         min="1" 
         max="99"
         readonly>
  <button type="button" command="step-up" commandfor="item-quantity">+</button>
</div>

<style>
.quantity-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quantity-selector button {
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
}
</style>
```

## 🎯 Power User Features

For complex applications, Invokers provides sophisticated workflow orchestration capabilities.

### Enhanced Attribute-Based Chaining

The most powerful feature for building complex workflows is conditional command chaining based on execution results:

#### Conditional Execution Attributes

```html
<!-- Different commands based on success/failure -->
<button type="button"
  command="--fetch:get"
  data-url="/api/user-data"
  commandfor="profile"
  data-after-success="--class:add:loaded,--text:set:Profile loaded!"
  data-after-error="--class:add:error,--text:set:Failed to load profile"
  data-after-complete="--attr:set:aria-busy:false">
  Load Profile
</button>
<div id="profile" aria-busy="false">Profile will load here...</div>
```

#### Enhanced Chaining Attributes

| Attribute | When It Executes | Purpose |
| --------- | ---------------- | ------- |
| `data-after-success` | Command completed successfully | Commands for success scenarios |
| `data-after-error` | Command failed with error | Commands for error handling |
| `data-after-complete` | Command finished (success or error) | Cleanup commands that always run |
| `data-then-target` | For chained commands | Override target for followup commands |
| `data-then-state` | For chained commands | Set execution state (`once`, `disabled`, etc.) |

#### Universal `data-and-then` Chaining

Chain any command with any other command. Works for both synchronous and asynchronous operations:

```html
<!-- Synchronous chaining -->
<button type="button"
  command="--class:add:highlighted"
  commandfor="status-box"
  data-and-then="--text:set:Status updated!">
  Highlight and Update
</button>

<!-- Asynchronous chaining (waits for fetch to complete) -->
<button type="button"
  command="--fetch:get"
  data-url="/api/content"
  commandfor="content-area"
  data-and-then="--class:add:loaded">
  Load and Animate
</button>
```

### Template-Based Command Pipelines

For the most complex workflows, define reusable command sequences using templates:

```html
<button type="button" command="--pipeline:execute:user-registration">
  Complete Registration
</button>

<template id="user-registration" data-pipeline="true">
  <pipeline-step command="--form:validate" target="registration-form" />
  <pipeline-step command="--fetch:post" target="api-endpoint" 
                  data-url="/register" condition="success" />
  <pipeline-step command="--class:add:registered" target="user-profile" 
                  condition="success" once="true" />
  <pipeline-step command="--show" target="welcome-screen" 
                  condition="success" delay="500" />
  <pipeline-step command="--text:set:Registration failed" target="error-display" 
                  condition="error" />
</template>
```

#### Pipeline Step Attributes

| Attribute | Purpose | Example |
| --------- | ------- | ------- |
| `command` | Command to execute | `--fetch:get` |
| `target` | Target element ID | `user-profile` |
| `condition` | When to execute | `success`, `error`, `always` (default) |
| `delay` | Delay in milliseconds | `500` |
| `once` | Remove step after execution | `true` |
| `data-*` | Pass data to command | `data-url="/api/users"` |

#### Declarative `<and-then>` Elements

For more complex workflows, use declarative `<and-then>` elements nested inside your invoker buttons. These create visual, tree-structured command chains that are easy to read and maintain.

##### Basic Chaining

```html
<button type="button" command="--text:set:Step 1 complete" commandfor="output">
  Start Multi-Step Process
  <and-then command="--class:add:processing" commandfor="output">
    <and-then command="--text:append: → Step 2 complete" commandfor="output" data-delay="1000">
      <and-then command="--class:remove:processing" commandfor="output">
        <and-then command="--class:add:success" commandfor="output">
        </and-then>
      </and-then>
    </and-then>
  </and-then>
</button>

<div id="output" class="process-output">Ready to start...</div>
```

##### Conditional Execution

`<and-then>` elements support conditional execution based on the success or failure of the parent command:

```html
<button type="button" command="--fetch:get" data-url="/api/user" commandfor="profile">
  Load User Profile
  
  <!-- Only runs on successful fetch -->
  <and-then command="--class:add:loaded" commandfor="profile" data-condition="success">
    <and-then command="--text:set:Profile loaded successfully!" commandfor="status">
    </and-then>
  </and-then>
  
  <!-- Only runs on failed fetch -->
  <and-then command="--class:add:error" commandfor="profile" data-condition="error">
    <and-then command="--text:set:Failed to load profile" commandfor="status">
    </and-then>
  </and-then>
  
  <!-- Always runs regardless of success/failure -->
  <and-then command="--attr:set:aria-busy:false" commandfor="profile" data-condition="always">
  </and-then>
</button>

<div id="profile" aria-busy="false">Profile will load here...</div>
<div id="status" role="status"></div>
```

##### One-Time Execution

Use `data-once="true"` to automatically remove `<and-then>` elements after they execute, perfect for initialization sequences:

```html
<button type="button" command="--show" commandfor="tutorial-step-1">
  Start Tutorial
  <and-then command="--class:add:tutorial-active" commandfor="app" data-once="true">
    <and-then command="--text:set:Welcome to the tutorial!" commandfor="tutorial-message" data-once="true">
    </and-then>
  </and-then>
</button>
```

#### Enhanced Attribute-Based Chaining

For more sophisticated workflows, use conditional chaining attributes that execute based on command success or failure:

```html
<!-- Conditional chaining based on success/error -->
<button type="button"
  command="--fetch:get"
  data-url="/api/user-data"
  commandfor="user-profile"
  data-after-success="--class:add:success,--text:set:Data loaded!"
  data-after-error="--class:add:error,--text:set:Failed to load data"
  data-after-complete="--attr:set:aria-busy:false">
  Load User Profile
</button>

<!-- Multiple commands in success chain -->
<button type="button"
  command="--fetch:post"
  data-url="/api/submit"
  commandfor="form-container"
  data-after-success="--class:add:submitted,--show:success-message,--hide:form-container"
  data-after-error="--class:add:error,--text:set:Submission failed">
  Submit Form
</button>
```

#### Command Lifecycle States

Control command execution behavior with powerful lifecycle states that persist across multiple executions:

```html
<!-- One-time command that will never execute again after first use -->
<button type="button"
  command="--show"
  commandfor="welcome-modal"
  data-state="once">
  Show Welcome (Once Only)
</button>

<!-- Disabled command that won't execute at all -->
<button type="button"
  command="--toggle"
  commandfor="help-panel"
  data-state="disabled">
  Help (Currently Disabled)
</button>

<!-- Command that becomes disabled after completion -->
<button type="button"
  command="--fetch:get"
  data-url="/api/setup"
  commandfor="setup-content"
  data-after-complete="--attr:set:data-state:completed">
  Run Initial Setup
</button>

<!-- Override target for chained command -->
<button type="button"
  command="--fetch:get"
  data-url="/api/content"
  commandfor="content-area"
  data-and-then="--class:add:loaded"
  data-then-target="loading-spinner">
  Load Content
</button>
```

**Available States:**
- `active` (default): Command executes normally
- `once`: Command executes once then becomes `completed`
- `disabled`: Command never executes
- `completed`: Command has finished and won't execute again

> **Backwards Compatibility:** The library still supports the older `data-then-command` attribute as a fallback, but the new `data-and-then` is recommended for its improved readability.

#### Complete Workflow Example

Here's a comprehensive example showing how all the chaining features work together in a realistic user registration flow:

```html
<!-- Multi-step registration with comprehensive error handling -->
<button type="button" 
  command="--fetch:post" 
  data-url="/api/register"
  commandfor="registration-form"
  data-state="once"
  data-after-success="--class:add:success,--text:set:Registration successful!"
  data-after-error="--class:add:error"
  data-after-complete="--attr:set:aria-busy:false">
  
  Complete Registration
  
  <!-- Success flow -->
  <and-then command="--show" commandfor="welcome-screen" data-condition="success" data-delay="500">
    <and-then command="--hide" commandfor="registration-form" data-once="true">
      <and-then command="--text:set:Welcome! Check your email to verify your account." commandfor="welcome-message">
      </and-then>
    </and-then>
  </and-then>
  
  <!-- Error flow -->
  <and-then command="--text:set:Registration failed. Please try again." commandfor="error-message" data-condition="error">
    <and-then command="--show" commandfor="error-details" data-delay="300">
    </and-then>
  </and-then>
</button>

<form id="registration-form">
  <!-- form fields -->
  <div id="error-message" role="alert" class="error" hidden></div>
  <div id="error-details" hidden>Please check your information and try again.</div>
</form>

<div id="welcome-screen" hidden>
  <h2>Welcome!</h2>
  <p id="welcome-message"></p>
</div>
```

This example demonstrates:
- **One-time execution** with `data-state="once"`
- **Conditional attribute chaining** with multiple success/error commands
- **Nested declarative chains** with `<and-then>` elements
- **Conditional execution** based on success/error states
- **Delayed execution** with `data-delay`
- **Self-removing elements** with `data-once="true"`

#### Automatic View Transitions
If the browser supports the View Transition API, Invokers will **automatically** wrap DOM changes in beautiful transitions:

```css
/* Add smooth animations with just CSS */
::view-transition-new(root) {
  animation: 250ms ease-out both fade-in-up;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
}
```

## 🔧 Creating Custom Commands

Extend Invokers with your own project-specific commands:

```javascript
// Register a custom analytics command
window.Invoker.register('--analytics:track', ({ params, invoker }) => {
  const [event, ...data] = params;
  analytics.track(event, { data: data.join(' '), element: invoker.id });
});

// Register a notification command
window.Invoker.register('--notify', ({ params }) => {
  const message = params.join(' ');
  new Notification('App Notification', { body: message });
});
```

Use your custom commands in HTML:
```html
<!-- Track user interactions -->
<button type="button" 
  command="--analytics:track:button_click:header_cta"
  commandfor="signup-form"
  data-and-then="--notify:Thanks for your interest!">
  Sign Up Now
</button>
```

💡 **Best Practice:** Encapsulate complex logic in custom commands to keep your HTML clean and reusable.

<br />

## 🛠️ Frequently Asked Questions

### **How does Invokers compare to Alpine.js, HTMX, or React?**

| Framework | Best For | Learning Curve | Standards |
| --------- | -------- | -------------- | --------- |
| **Invokers** | Standard-compliant interactions | Low | Future web standards |
| **Alpine.js** | Vue-like reactivity in HTML | Medium | Custom syntax |
| **HTMX** | Server-driven applications | Medium | Custom attributes |
| **React** | Complex applications | High | Component-based |

Invokers is ideal when you want simple interactions without learning framework-specific syntax.

### **Is this production ready?**
Yes! Invokers is used in production applications. It's a polyfill for an upcoming web standard, so you're learning skills that will remain relevant as browsers implement native support.

### **What browsers are supported?**
Invokers works in all modern browsers (Chrome, Firefox, Safari, Edge). It requires ES modules support, which means IE11 is not supported.

### **Will this conflict with future HTML spec changes?**
No. Invokers implements the official W3C/WHATWG proposal. When browsers add native support, Invokers will step aside automatically. Your HTML remains the same.

### **Do I need to import anything extra for extended commands?**
No! All extended commands (fetch, media controls, DOM manipulation, etc.) are automatically included when you import Invokers. Just use them directly in your HTML.

### **Can I use JSON APIs with `--fetch` commands?**
No, `--fetch:get` expects HTML responses to inject into the page. For JSON APIs, you'll need to create a custom command or use the JSON data server-side to render HTML.

### **Why `<button type="button">`?**
The HTML spec requires invoker buttons to be `<button>` elements for accessibility. The `type="button"` prevents accidental form submissions when the button is inside a `<form>`.

### **Why the `--` prefix?**
This is part of the official spec to distinguish custom commands from native browser commands. It ensures your commands won't conflict with future HTML additions.

### **How do Interest Invokers work on touch devices?**
Interest Invokers automatically adapt to touch devices using long-press gestures (500ms hold). For buttons without existing context menus, long-press directly shows interest. For links and other elements with context menus, a "Show Details" option appears in the context menu.

### **What's the difference between `popover="hint"` and `popover="auto"`?**
- `popover="hint"` creates simple tooltips that are treated as plain text by screen readers
- `popover="auto"` creates rich hover cards that can contain interactive elements and are fully navigable by assistive technologies

### **Can I control the hover delay timing?**
Yes! Use CSS custom properties to adjust timing:
```css
.my-element {
  --interest-delay-start: 1s;    /* Time before showing */
  --interest-delay-end: 300ms;   /* Time before hiding */
  /* Or use the shorthand: */
  --interest-delay: 1s 300ms;
}
```

### **How do I debug when nothing happens?**
1. Check the browser console for warnings
2. Verify `commandfor` points to an element with that exact `id`
3. Ensure your button has `type="button"`
4. Make sure custom commands start with `--`
5. For Interest Invokers, verify `interestfor` points to a valid target with an `id`

## 🤝 Contributing

Contributions are welcome! As we track the progress of the official spec, your help with bug reports, new command proposals, or documentation improvements is greatly appreciated. Please feel free to open an issue or submit a pull request on our [GitHub repository](https://github.com/doeixd/invokers).

## 📄 License

Invokers is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT).

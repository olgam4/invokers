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
| `--text:set:message`   | Replace text content              | `command="--text:set:Hello World"`          |
| `--attr:set:name:val`  | Set attribute                     | `command="--attr:set:disabled:true"`        |
| `--fetch:get`          | Load HTML from server             | `command="--fetch:get" data-url="/api"`     |
| `--fetch:send`         | Send form data to server          | `command="--fetch:send" commandfor="form"`  |
| `show-modal`           | Open dialog modally               | `command="show-modal" commandfor="dialog"`  |
| `close`                | Close dialog/popover              | `command="close" commandfor="dialog"`       |

### Future Native Commands (Polyfilled)
| Command                | Target Element        | Purpose                                      |
| ---------------------- | -------------------- | -------------------------------------------- |
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

### Pipeline Commands
| Command                | Purpose                                      | Example                                      |
| ---------------------- | -------------------------------------------- | -------------------------------------------- |
| `--pipeline:execute:id`| Execute template-based command pipeline     | `command="--pipeline:execute:user-flow"`    |

💡 **Tip:** Commands starting with `--` are Invokers extensions. Commands without prefixes are native/future browser commands.

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

---

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

---

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

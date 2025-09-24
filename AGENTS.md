# Invokers Library Guide for AI Agents

This document provides comprehensive information for AI agents working with the modularized Invokers library. It covers the new architecture, usage patterns, testing setup, and development considerations after the v1.5 modularization.

## 🏗️ New Modular Architecture

**Invokers** is now a hyper-modular, four-tier architecture that allows developers to import exactly what they need, from a minimal 25.8 kB core to a full-featured application framework.

### Core Philosophy
- **Standards-First**: Built on emerging W3C/WHATWG proposals
- **Modular by Design**: Import only what you need
- **Progressive Enhancement**: Start minimal, add features incrementally
- **Future-Proof**: Aligned with web platform evolution

## 🎯 Four-Tier Architecture

### **Tier 0: Core Polyfill** (`invokers`) - 25.8 kB
The foundational layer providing standards compliance.

**Contents:**
- `polyfill.ts` - CommandEvent and attribute polyfills
- `InvokerManager` - Command execution engine (empty by design)
- Core utilities and types

**Usage:**
```javascript
import 'invokers';
// Standards-compliant command/commandfor now work
```

### **Tier 1: Essential Commands**
The first commands most developers will add.

#### Base Commands (`invokers/commands/base`) - 29.2 kB
```javascript
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokerManager);
```
**Commands**: `--toggle`, `--show`, `--hide`, `--class:*`, `--attr:*`

#### Form Commands (`invokers/commands/form`) - 30.5 kB  
```javascript
import { registerFormCommands } from 'invokers/commands/form';
registerFormCommands(invokerManager);
```
**Commands**: `--text:*`, `--value:*`, `--focus`, `--disabled:*`, `--form:*`, `--input:step`, `--text:copy`

### **Tier 2: Specialized Command Packs**

#### DOM Manipulation (`invokers/commands/dom`) - 47.1 kB
```javascript
import { registerDomCommands } from 'invokers/commands/dom';
registerDomCommands(invokerManager);
```
**Commands**: `--dom:*`, `--template:*`, data context management

#### Flow Control (`invokers/commands/flow`) - 45.3 kB
```javascript
import { registerFlowCommands } from 'invokers/commands/flow';
registerFlowCommands(invokerManager);
```
**Commands**: `--fetch:*`, `--command:*`, `--emit:*`, `--navigate:*`, `--on:*`, `--bind:*`

#### Media & Animation (`invokers/commands/media`) - 27.7 kB
```javascript
import { registerMediaCommands } from 'invokers/commands/media';
registerMediaCommands(invokerManager);
```
**Commands**: `--media:*`, `--carousel:*`, `--scroll:*`, `--clipboard:*`

#### Browser APIs (`invokers/commands/browser`) - 25.3 kB
```javascript
import { registerBrowserCommands } from 'invokers/commands/browser';
registerBrowserCommands(invokerManager);
```
**Commands**: `--cookie:*`

#### Data Management (`invokers/commands/data`) - 45.2 kB
```javascript
import { registerDataCommands } from 'invokers/commands/data';
registerDataCommands(invokerManager);
```
**Commands**: `--data:*`, array operations, reactive data binding

### **Tier 3: Advanced Reactive Engine**

#### Event Triggers (`invokers/advanced/events`) - 42.3 kB
```javascript
import { enableEventTriggers } from 'invokers/advanced/events';
enableEventTriggers();
```
**Features**: `command-on` attribute for any DOM event

#### Expression Engine (`invokers/advanced/expressions`) - 26.2 kB
```javascript
import { enableExpressionEngine } from 'invokers/advanced/expressions';
enableExpressionEngine();
```
**Features**: `{{expression}}` interpolation in commands

#### Complete Advanced (`invokers/advanced`) - 42.4 kB
```javascript
import { enableAdvancedEvents } from 'invokers/advanced';
enableAdvancedEvents();
```
**Features**: Both event triggers and expression engine

## 🧪 Testing Patterns

### Basic Test Setup (Recommended)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';

describe('Base Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();
    
    // IMPORTANT: Register the commands you need for testing
    registerBaseCommands(manager);
  });

  // ... tests
});
```

### Compatibility Layer Testing (For Existing Tests)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from 'invokers/compatible';

describe('All Commands Available', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    // All commands are pre-registered - no manual registration needed
  });

  it('should toggle element visibility', async () => {
    document.body.innerHTML = `
      <button command="--toggle" commandfor="target">Toggle</button>
      <div id="target" hidden>Content</div>
    `;

    const button = document.querySelector('button')!;
    const target = document.querySelector('#target')!;

    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.hasAttribute('hidden')).toBe(false);
  });
});
```

### Testing Multiple Command Packs
```typescript
import { InvokerManager } from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';
import { registerFlowCommands } from 'invokers/commands/flow';

beforeEach(() => {
  const manager = InvokerManager.getInstance();
  manager.reset();
  
  // Register all packs needed for your tests
  registerBaseCommands(manager);
  registerFormCommands(manager);
  registerFlowCommands(manager);
});
```

### Testing Advanced Features
```typescript
import { enableAdvancedEvents } from 'invokers/advanced';

beforeEach(() => {
  // Enable advanced features when needed
  enableAdvancedEvents();
});

it('should handle command-on events', async () => {
  document.body.innerHTML = `
    <form command-on="submit.prevent" command="--text:set:Submitted!" commandfor="output">
      <button type="submit">Submit</button>
    </form>
    <div id="output"></div>
  `;
  
  const form = document.querySelector('form')!;
  const output = document.querySelector('#output')!;
  
  form.dispatchEvent(new Event('submit'));
  await new Promise(resolve => setTimeout(resolve, 0));
  
  expect(output.textContent).toBe('Submitted!');
});
```

## 🎨 Usage Patterns

### Progressive Enhancement
```javascript
// 1. Start with core (25.8 kB)
import invokers from 'invokers';

// 2. Add essential commands (~30 kB each)
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';

registerBaseCommands(invokers);
registerFormCommands(invokers);

// 3. Add specialized features as needed
import { registerDomCommands } from 'invokers/commands/dom';
import { enableAdvancedEvents } from 'invokers/advanced';

registerDomCommands(invokers);
enableAdvancedEvents();
```

### Bundle Size Strategy
```javascript
// Minimalist approach (25.8 kB)
import 'invokers';

// Basic UI (25.8 + 29.2 kB = ~55 kB)
import invokers from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokers);

// Content-heavy app (55 + 30.5 + 47.1 kB = ~133 kB)
import { registerFormCommands } from 'invokers/commands/form';
import { registerDomCommands } from 'invokers/commands/dom';
registerFormCommands(invokers);
registerDomCommands(invokers);

// Full-featured app (~200+ kB)
import { registerFlowCommands } from 'invokers/commands/flow';
import { registerMediaCommands } from 'invokers/commands/media';
import { registerDataCommands } from 'invokers/commands/data';
import { enableAdvancedEvents } from 'invokers/advanced';

registerFlowCommands(invokers);
registerMediaCommands(invokers);
registerDataCommands(invokers);
enableAdvancedEvents();
```

## 🔧 Development Considerations

### Command Registration Patterns
All command packs follow the same registration pattern:

```typescript
// src/commands/example.ts
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

const exampleCommands: Record<string, CommandCallback> = {
  '--example:action': ({ invoker, targetElement, params }: CommandContext) => {
    // Command implementation
  }
};

export function registerExampleCommands(manager: InvokerManager): void {
  for (const name in exampleCommands) {
    if (exampleCommands.hasOwnProperty(name)) {
      manager.register(name, exampleCommands[name]);
    }
  }
}
```

### Error Handling
```typescript
import { createInvokerError, ErrorSeverity } from '../index';

// In command implementations
throw createInvokerError(
  'Command failed: specific reason',
  ErrorSeverity.ERROR,
  {
    command: '--example:action',
    element: invoker,
    context: { params },
    recovery: 'Suggested fix for the user'
  }
);
```

### Debug Mode
```typescript
// Enable debug mode for verbose logging
if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
  console.log('Debug information');
}

// Or set debug flag
window.Invoker = { debug: true };
```

## 📦 Build & Package Configuration

### Entry Points (pridepack.json)
```json
{
  "entrypoints": {
    ".": "./src/index.ts",
    "./commands/base": "./src/commands/base.ts",
    "./commands/form": "./src/commands/form.ts",
    "./commands/dom": "./src/commands/dom.ts",
    "./commands/flow": "./src/commands/flow.ts",
    "./commands/media": "./src/commands/media.ts",
    "./commands/browser": "./src/commands/browser.ts",
    "./commands/data": "./src/commands/data.ts",
    "./interest": "./src/interest-invokers.ts",
    "./advanced": "./src/advanced/index.ts",
    "./advanced/events": "./src/advanced/events.ts",
    "./advanced/expressions": "./src/advanced/expressions.ts"
  }
}
```

### Package Exports (package.json)
All command packs are properly exported for both development and production, with full TypeScript support.

## 🚨 Migration Notes

### Breaking Changes in v1.5
- **Core is empty by design**: `registerCoreLibraryCommands()` method is now empty
- **Explicit imports required**: Commands must be imported and registered
- **Advanced features opt-in**: `command-on` and `{{...}}` require explicit enabling

### Backward Compatibility
- Old monolithic `invoker-commands.ts` still exists for gradual migration
- Can mix old and new import styles during transition
- All existing HTML attributes and commands work the same way

### Migration Strategy
1. **Phase 1**: Install v1.5, add required imports for existing functionality
2. **Phase 2**: Gradually switch to modular imports
3. **Phase 3**: Remove unused command packs to optimize bundle size

## 🎯 Best Practices for AI Agents

1. **Always register needed commands** in tests and examples
2. **Start with core + base** for most use cases  
3. **Enable advanced features** only when using `command-on` or `{{...}}`
4. **Check bundle sizes** when adding new packs
5. **Use progressive enhancement** - start minimal, add features
6. **Test modular loading** to ensure proper registration
7. **Follow error handling patterns** for consistency

## 📊 Detailed Command Reference

### Core Commands (Always Available)
Native commands (no `--` prefix) that are polyfilled for cross-browser compatibility:
- `show-modal`, `close`, `toggle-popover` - Dialog and popover management
- `play-pause`, `toggle-muted` - Media element controls
- `show-picker` - Form input pickers

### Base Pack Commands (`invokers/commands/base`)
Essential UI manipulation commands:

#### Visibility & Display
- `--toggle` - Show/hide element with ARIA updates
- `--show` - Show element, hide siblings
- `--hide` - Hide element

#### CSS Classes
- `--class:add:name` - Add CSS class
- `--class:remove:name` - Remove CSS class
- `--class:toggle:name` - Toggle CSS class

#### Attributes
- `--attr:set:name:value` - Set attribute value
- `--attr:remove:name` - Remove attribute
- `--attr:toggle:name:value` - Toggle attribute presence

### Form Pack Commands (`invokers/commands/form`)
Form interaction and content manipulation:

#### Text Content
- `--text:set:text` - Set element text content
- `--text:append:text` - Append to text content
- `--text:prepend:text` - Prepend to text content
- `--text:clear` - Clear text content

#### Form Values
- `--value:set:value` - Set input value
- `--value:clear` - Clear input value

#### Form Controls
- `--focus` - Focus element
- `--disabled:toggle/enable/disable` - Control disabled state
- `--form:reset` - Reset form
- `--form:submit` - Submit form
- `--input:step:amount` - Step input value
- `--text:copy` - Copy text to clipboard

### DOM Pack Commands (`invokers/commands/dom`)
Advanced DOM manipulation:

#### Element Operations
- `--dom:remove` - Remove element
- `--dom:replace:content` - Replace element content
- `--dom:swap:selector` - Swap elements
- `--dom:append:content` - Append content
- `--dom:prepend:content` - Prepend content
- `--dom:wrap:tag` - Wrap element
- `--dom:unwrap` - Unwrap element

#### Templates & Data
- `--template:render:template-id` - Render template
- `--template:clone:template-id` - Clone template
- `--data:set:context` - Set data context
- `--data:update:context` - Update data context

### Flow Pack Commands (`invokers/commands/flow`)
Async operations and control flow:

#### Network
- `--fetch:get` - GET request with loading states
- `--fetch:send` - POST/PUT/DELETE requests

#### Control Flow
- `--command:trigger:command` - Trigger another command
- `--command:delay:ms` - Delay command execution

#### Navigation
- `--navigate:to:url` - Navigate to URL
- `--url:hash:set` - Set URL hash
- `--history:push/back` - History navigation

#### Events
- `--emit:event:detail` - Emit custom event
- `--bind:property` - Bind property to element

### Media Pack Commands (`invokers/commands/media`)
Media and animation controls:

#### Media Controls
- `--media:toggle` - Play/pause media
- `--media:play/pause/mute/seek:position` - Media control

#### UI Components
- `--carousel:nav:next/prev` - Carousel navigation
- `--scroll:to:position` - Scroll to position
- `--clipboard:copy` - Copy to clipboard

### Browser Pack Commands (`invokers/commands/browser`)
Browser API integration:
- `--cookie:set/get/remove:key:value` - Cookie management

### Data Pack Commands (`invokers/commands/data`)
Data manipulation and reactive binding:
- `--data:set/copy:key:value` - Data operations
- `--data:set:array:push/remove/update/sort/filter` - Array operations
- Various reactive data binding commands

## ⚠️ Edge Cases & Gotchas

### Command Execution
- Commands prefixed with `--` are custom; others are native/polyfilled
- Command strings use `:` as delimiter, escaped with `\`
- Empty command strings are ignored
- Invalid commands log warnings but don't throw

### Target Resolution
- `commandfor` attribute takes precedence over `aria-controls`
- Supports CSS selectors: `#id`, `.class`, `tag`, `[attr=value]`
- Contextual selectors: `@closest(.parent)`, `@child(.item)`
- Multiple targets execute commands on all matching elements

### Event Handling
- Advanced events require explicit `enableAdvancedEvents()` call
- `{{interpolation}}` only works when advanced events are enabled
- Expression evaluation is sandboxed (no global access, function calls)
- Invalid expressions return `undefined` and log errors

### State Management
- Command states: `active`, `completed`, `disabled`, `once`
- `once` commands execute once then become `completed`
- `disabled` commands are skipped entirely
- State is tracked per command-target combination

### Error Handling
- Commands validate inputs and provide helpful error messages
- Network errors in `--fetch` commands trigger `data-after-error` chains
- Invalid selectors or missing elements log warnings
- Graceful degradation attempts to maintain accessibility

## 🧪 Enhanced Testing Patterns

### Mocking & Fixtures
- Use jsdom for DOM manipulation
- Mock fetch requests with `global.fetch`
- Test command chaining with async/await
- Verify ARIA attribute updates
- Test error conditions and recovery
- Aim for integration tests over excessive mocking

### Testing Advanced Features
```typescript
import { enableAdvancedEvents } from 'invokers/advanced';

beforeEach(() => {
  // Enable advanced features when needed
  enableAdvancedEvents();
});

it('should handle command-on events', async () => {
  document.body.innerHTML = `
    <form command-on="submit.prevent" command="--text:set:Submitted!" commandfor="output">
      <button type="submit">Submit</button>
    </form>
    <div id="output"></div>
  `;

  const form = document.querySelector('form')!;
  const output = document.querySelector('#output')!;

  form.dispatchEvent(new Event('submit'));
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(output.textContent).toBe('Submitted!');
});
```

## 🔧 Development Considerations

### Build Process
- **Clean**: `npm run clean` or `pridepack clean`
- **Build**: `npm run build` or `pridepack build`
- **Watch**: `pridepack watch` for development
- **Type Check**: `pridepack check`
- **Publish**: `npm run prepublishOnly` (builds automatically)

### Code Style
- **TypeScript**: Strict mode enabled
- **Imports**: Use relative imports within src/
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Use `createInvokerError` for structured errors
- **Comments**: JSDoc for public APIs, inline for complex logic

### Performance
- Commands are cached and sorted by specificity
- Rate limiting prevents abuse (1000 executions/second)
- Expression evaluation uses LRU cache
- Singleton architecture prevents duplicate registrations

### Security
- Input sanitization for command parameters
- HTML sanitization for `--dom` commands
- URL validation for fetch operations
- No eval() or Function() constructors used

## 📁 File Locations & Organization

### Source Structure
```
src/
├── index.ts                    # Core entry point
├── core.ts                     # InvokerManager (empty of commands)
├── polyfill.ts                 # Standards polyfill
├── utils.ts                    # Utility functions
├── target-resolver.ts          # Element selection logic
├── commands/                   # Modular command packs
│   ├── base.ts                # Essential UI commands
│   ├── form.ts                # Form & content commands
│   ├── dom.ts                 # DOM manipulation
│   ├── flow.ts                # Async & flow control
│   ├── media.ts               # Media & animations
│   ├── browser.ts             # Browser APIs
│   └── data.ts                # Data management
├── advanced/                  # Reactive engine
│   ├── index.ts               # Complete advanced features
│   ├── events.ts              # Event triggers only
│   ├── expressions.ts         # Expression engine only
│   ├── event-trigger-manager.ts
│   ├── interpolation.ts
│   └── expression/            # Expression parser
│       ├── index.ts
│       ├── evaluator.ts
│       ├── lexer.ts
│       └── parser.ts
├── interest-invokers.ts       # Interest invokers (Tier 2)
└── demo-commands.ts           # Demo/example commands
```

### Build Outputs
```
dist/
├── esm/production/         # ESM production builds
├── esm/development/        # ESM dev builds with logging
├── cjs/production/         # CommonJS builds
├── cjs/development/        # CommonJS dev builds
└── types/                  # TypeScript declarations
```

### Examples & Documentation
```
examples/                   # Working HTML examples
├── comprehensive-demo.html # Full feature showcase
├── *-demo.html            # Specific feature demos
└── README.md              # Example documentation

docs/                      # Additional documentation
├── array.md               # Array manipulation docs
├── commands.js            # Command reference
├── expression.md          # Expression syntax
└── next.md                # Future features
```

## 📦 Pridepack Configuration

**pridepack.json** defines build targets:
```json
{
  "target": "es2018",
  "entrypoints": {
    ".": "./src/index.ts",
    "./commands/base": "./src/commands/base.ts",
    "./commands/form": "./src/commands/form.ts",
    "./commands/dom": "./src/commands/dom.ts",
    "./commands/flow": "./src/commands/flow.ts",
    "./commands/media": "./src/commands/media.ts",
    "./commands/browser": "./src/commands/browser.ts",
    "./commands/data": "./src/commands/data.ts",
    "./interest": "./src/interest-invokers.ts",
    "./advanced": "./src/advanced/index.ts",
    "./advanced/events": "./src/advanced/events.ts",
    "./advanced/expressions": "./src/advanced/expressions.ts"
  }
}
```

- **Target**: ES2018 for modern browser support
- **Entrypoints**: Multiple exports for selective importing
- **Outputs**: ESM, CJS, and type definitions

## 🌐 Example Requirements

### Content Security Policy (CSP)
Examples must include proper CSP meta tags:
```html
<meta http-equiv="Content-Security-Policy" content="default-src * 'self' blob: data: gap:; style-src * 'self' 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * 'self' 'unsafe-inline' blob: data: gap:; connect-src * 'self' 'unsafe-inline' blob: data: gap:; frame-src * 'self' blob: data: gap:;">
```

Without correct CSP, ES modules from esm.sh will be blocked.

### Import Strategy
Import from local `dist/` for examples

### HTML Structure
Examples should demonstrate:
- Semantic HTML with proper accessibility attributes
- Progressive enhancement (works without JS)
- Declarative patterns over imperative code
- Integration with existing frameworks

## 🌐 Web Standards Compatibility

### W3C/WHATWG Proposals
- **Invoker Commands API**: `command` and `commandfor` attributes
- **Interest Invokers**: `interestfor` attribute for hover cards
- **Popover API**: `popover` attribute integration
- **View Transitions**: Automatic support for smooth animations

### Browser Support
- **Modern Browsers**: Full feature support
- **Legacy Browsers**: Graceful degradation via polyfills
- **Mobile**: Touch and gesture support
- **Accessibility**: Screen reader and keyboard navigation

### Future Compatibility
- Designed to work with native browser implementations
- Polyfills automatically disable when native support arrives
- API designed to match future standards exactly

## 🔌 Plugin System

### Architecture
- Middleware hooks at command execution lifecycle points
- Plugin interface with `onRegister`/`onUnregister` callbacks
- Global and command-specific middleware

### Hook Points
- `BEFORE_COMMAND` - Pre-execution validation
- `AFTER_COMMAND` - Post-execution cleanup
- `ON_SUCCESS`/`ON_ERROR` - Conditional logic
- `BEFORE_VALIDATION`/`AFTER_VALIDATION` - Input processing

### Usage
```javascript
const myPlugin = {
  name: 'analytics',
  middleware: {
    BEFORE_COMMAND: (context) => {
      // Track command usage
    }
  }
};

InvokerManager.getInstance().registerPlugin(myPlugin);
```

## 🐛 Debugging & Troubleshooting

### Debug Mode
Enable with `window.Invoker.debug = true` for detailed logging.

### Common Issues
- **Commands not executing**: Check `commandfor` targets exist
- **Advanced events not working**: Ensure `enableAdvancedEvents()` called
- **Interpolation failing**: Verify advanced events enabled and syntax correct
- **CSP errors**: Add proper CSP headers for esm.sh

### Error Messages
- Structured error objects with severity levels
- Recovery suggestions included
- Element and command context provided
- Console logging with grouping for readability

## 🚀 Migration & Compatibility

### Version Changes
- v1.5.0: Plugin system added, modular architecture
- v1.4.0: Singleton pattern, enhanced fetch commands
- v1.3.0: Pipeline functionality
- v1.2.0: Interest Invokers and future commands

### Breaking Changes in v1.5
- **Core is empty by design**: `registerCoreLibraryCommands()` method is now empty
- **Explicit imports required**: Commands must be imported and registered
- **Advanced features opt-in**: `command-on` and `{{...}}` require explicit enabling

### Backward Compatibility
- Old monolithic `invoker-commands.ts` still exists for gradual migration
- Can mix old and new import styles during transition
- All existing HTML attributes and commands work the same way

### Migration Strategy
1. **Phase 1**: Install v1.5, add required imports for existing functionality
2. **Phase 2**: Gradually switch to modular imports
3. **Phase 3**: Remove unused command packs to optimize bundle size

---

**Debug Mode Notes**: This library has a debug mode. Keep that in mind when authoring code. Make sure to only log in debug mode, but in debug mode, make the logs verbose and helpful.

**Code Editing**: As you edit the code, remove any `console.log()`/`warn()` etc. that are not part of debug mode.

**Platform Support**: Make sure everything supports the latest platform features, view transitions, etc., and integrates seamlessly with the rest of the library.

**Environment**: We are on Windows, use PowerShell.

This guide should provide everything needed to effectively work with the modularized Invokers library. For specific implementation details, refer to the source code and the examples directory.

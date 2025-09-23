# Invokers Agent Guide

This document provides comprehensive information for AI agents working with the Invokers library. It covers everything an agent needs to know about the library's architecture, usage patterns, edge cases, testing setup, and development considerations.

## Library Overview

**Invokers** is a lightweight, zero-dependency JavaScript library that serves as a polyfill and superset for the upcoming W3C/WHATWG HTML Invoker Commands API and Interest Invokers proposals. It enables writing interactive HTML interfaces without custom JavaScript, promoting declarative UI patterns.

### Core Philosophy
- **Standards-First**: Built on emerging web standards
- **Declarative**: Describe *what* should happen in HTML, not *how* in JavaScript
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Accessible by Design**: Automatic ARIA attribute management
- **Future-Proof**: Aligned with web platform evolution

## Architecture & Key Components

### Main Entry Points
- `src/index.ts` - Core library with InvokerManager singleton
- `src/invoker-commands.ts` - Extended command implementations
- `src/advanced-events.ts` - Opt-in advanced event features
- `src/interest-invokers.ts` - Hover cards and tooltips
- `src/polyfill.ts` - Browser compatibility layer

### Build System
- **Builder**: Pridepack (custom build tool)
- **Language**: TypeScript with strict mode
- **Target**: ES2018
- **Output**: ESM, CJS, and UMD builds in `dist/`
- **Entry Points**: Multiple exports for tree-shaking

### Key Classes
- `InvokerManager` - Singleton managing command registration and execution
- `EventTriggerManager` - Handles advanced event binding
- `AndThenManager` - Manages command chaining
- `PipelineManager` - Executes template-based command sequences

## Usage Patterns

### Basic Command Invokers
```html
<button type="button" command="--toggle" commandfor="menu">
  Menu
</button>
<nav id="menu" hidden>...</nav>
```

### Interest Invokers
```html
<a href="/profile" interestfor="profile-card">@username</a>
<div id="profile-card" popover="hint">Profile content...</div>
```

### Advanced Events (Opt-in)
```javascript
import 'invokers';
import { enableAdvancedEvents } from 'invokers/advanced';

enableAdvancedEvents(); // Enables command-on, data-on-event, {{interpolation}}
```

### Command Chaining
```html
<button command="--fetch:get"
        data-url="/api/data"
        commandfor="content"
        data-and-then="--class:add:loaded">
  Load Data
</button>
```

## Command Reference

### Core Commands (Always Available)
- `--toggle` - Show/hide with ARIA updates
- `--show` - Show one, hide siblings
- `--hide` - Hide element
- `--class:add/remove/toggle:name` - CSS class manipulation
- `--text:set/append/prepend/clear` - Text content updates
- `--attr:set/remove/toggle:name:value` - Attribute manipulation

### Extended Commands (Auto-Included)
- **DOM**: `--dom:replace/append/prepend/swap/wrap/unwrap/remove`
- **Fetch**: `--fetch:get/send` with loading states and error handling
- **Media**: `--media:toggle/play/pause/mute/seek`
- **Forms**: `--form:reset/submit`
- **Storage**: `--storage:local/session:set/get/remove/clear`
- **Animation**: `--animate:fade-in/slide-up/bounce/spin` etc.
- **Device**: `--device:vibrate/geolocation/battery/clipboard/share`
- **Accessibility**: `--a11y:announce/focus/focus-trap/skip-to`
- **Navigation**: `--navigate:to`, `--url:hash/set`, `--history:push/back`

### Native Commands (Polyfilled)
- `show-modal`, `close`, `toggle-popover` (no `--` prefix)
- `play-pause`, `toggle-muted` for media elements
- `show-picker` for form inputs

## Edge Cases & Gotchas

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

## Testing Setup

### Test Framework
- **Runner**: Vitest
- **Environment**: jsdom (simulates browser DOM)
- **Configuration**: `vitest.config.ts`
- **Command**: `npm test` or `vitest --run`

### Test Structure
- Tests in `test/` directory with `.test.ts` extension
- Integration tests in `test/integration.test.ts`
- Command-specific tests in dedicated files
- Demo command tests separate from core functionality

### Testing Patterns
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/index';

// Test setup
beforeEach(() => {
  document.body.innerHTML = '';
  InvokerManager.getInstance().reset();
});

// Command testing
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
```

### Mocking & Fixtures
- Use jsdom for DOM manipulation
- Mock fetch requests with `global.fetch`
- Test command chaining with async/await
- Verify ARIA attribute updates
- Test error conditions and recovery
- Aim more fore integration tests than over mocking or small unit tests.

## Development Considerations

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

## File Locations & Organization

### Source Structure
```
src/
├── index.ts                 # Main entry point, InvokerManager
├── invoker-commands.ts      # Extended command implementations
├── advanced-events.ts       # Opt-in advanced features
├── interest-invokers.ts     # Hover cards/tooltips
├── polyfill.ts             # Browser compatibility
├── target-resolver.ts      # Element selection logic
├── event-trigger-manager.ts # Advanced event binding
├── interpolation.ts        # Template interpolation
├── expression-evaluator.ts # Expression parsing
├── utils.ts                # Utility functions
└── types/                  # Type definitions
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

## Pridepack Configuration

**pridepack.json** defines build targets:
```json
{
  "target": "es2018",
  "entrypoints": {
    ".": "./src/index.ts",
    "./commands": "./src/invoker-commands.ts",
    "./interest": "./src/interest-invokers.ts",
    "./advanced": "./src/advanced-events.ts"
  }
}
```

- **Target**: ES2018 for modern browser support
- **Entrypoints**: Multiple exports for selective importing
- **Outputs**: ESM, CJS, and type definitions

## Example Requirements

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

## Web Standards Compatibility

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

## Plugin System

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

## Debugging & Troubleshooting

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

## Migration & Compatibility

### Version Changes
- v1.5.0: Plugin system added
- v1.4.0: Singleton pattern, enhanced fetch commands
- v1.3.0: Pipeline functionality
- v1.2.0: Interest Invokers and future commands

### Breaking Changes
- Command prefix enforcement (`--` required for custom commands)
- Singleton architecture (use `InvokerManager.getInstance()`)
- Advanced events now opt-in

### Backward Compatibility
- Legacy non-prefixed commands still supported with warnings
- Graceful degradation for unsupported features
- Polyfills maintain functionality in older browsers

This guide should provide everything needed to effectively work with the Invokers library. For specific implementation details, refer to the source code and existing examples.
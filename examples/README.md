# Invokers Examples

This directory contains example implementations demonstrating the capabilities of the Invokers library, including Interest Invokers (hover cards, tooltips) and Command Invokers.

## Interest Invokers Demo

**File:** `interest-invokers-demo.html`

A comprehensive demonstration of Interest Invokers functionality including:

- **GitHub-style profile hover cards** with rich interactive content
- **API documentation quick reference** tooltips for code snippets  
- **Wikipedia-style reference citations** with expandable tooltips
- **Interactive help system** with customizable delay timings
- **Integration examples** showing Interest Invokers working alongside Command Invokers

### Features Demonstrated

1. **Multiple Input Methods**
   - Mouse hover with configurable delays
   - Keyboard focus navigation
   - Touch device long-press support
   - Escape key to dismiss all hover cards

2. **Accessibility**
   - Screen reader compatible tooltips and hover cards
   - Proper ARIA attribute management
   - Keyboard navigation support
   - Touch device accessibility

3. **Integration with Command Invokers**
   - Elements with both `command` and `interestfor` attributes
   - Command chaining triggered by interest events
   - Seamless coexistence of both systems

4. **Customization Options**
   - CSS custom properties for timing control
   - Different popover types (`hint` vs `auto`)
   - Custom styling and animations
   - Event-based integrations

### Running the Demo

1. Clone this repository
2. Open `examples/interest-invokers-demo.html` in a modern browser
3. Hover over various elements to see Interest Invokers in action
4. Try keyboard navigation (Tab to focus, Escape to dismiss)
5. On touch devices, use long-press gestures

### Technical Implementation

The demo showcases:
- Proper HTML structure with semantic markup
- CSS custom properties for delay timing
- Integration with the main Invokers library
- Debug logging to browser console
- Progressive enhancement principles

All functionality works without custom JavaScript - everything is declarative HTML with the Invokers library handling the interactions.

## Number Input Controls Demo

**File:** `number-input-demo.html`

A demonstration of native browser commands for number input controls, specifically the `step-up` and `step-down` commands that work without the `--` prefix.

### Features Demonstrated

1. **Native Commands**
   - `step-up` - Increment number input values
   - `step-down` - Decrement number input values
   - No `--` prefix required (unlike custom commands)

2. **Number Input Features**
   - Different step values (1, 0.25, 100)
   - Min/max constraints
   - Visual feedback and displays
   - Real-world examples (shopping cart, temperature control)

3. **Comparison with Custom Commands**
   - Native `step-up`/`step-down` vs custom `--input:step` commands
   - Performance and simplicity benefits of native commands

4. **Practical Applications**
   - Shopping cart quantity controls
   - Temperature/setting adjustments
   - Form input stepping with constraints

### Running the Demo

1. Clone this repository
2. Open `examples/number-input-demo.html` in a modern browser
3. Use the + and − buttons to step number inputs
4. Try different step values and constraints
5. Compare native vs custom command approaches

### Technical Implementation

The demo showcases:
- Native browser commands without `--` prefix
- Proper HTML number input attributes (`min`, `max`, `step`)
- Visual feedback with JavaScript event listeners
- Comparison between native and custom command approaches
- Real-world usage patterns

This demonstrates how Invokers extends native browser functionality while maintaining standards compliance.


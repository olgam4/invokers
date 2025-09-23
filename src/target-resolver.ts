// src/target-resolver.ts
export function resolveTargets(selector: string, invoker: HTMLElement): Element[] {
  const trimmedSelector = selector.trim();

  // 1. Contextual Selectors (prefixed with @)
  if (trimmedSelector.startsWith('@')) {
    const match = trimmedSelector.match(/^@([a-z]+)\((.*)\)$/);
    if (match) {
      const type = match[1];
      let innerSelector = match[2];
      // Unescape backslash-escaped parentheses
      innerSelector = innerSelector.replace(/\\([()])/g, '$1');

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

   // 2. ID Selector (for backward compatibility)
   // If selector starts with #, treat as ID
   if (trimmedSelector.startsWith('#')) {
     const element = document.querySelector(trimmedSelector) as HTMLElement;
     return element ? [element] : [];
   }

   // 3. Fallback to ID selector (for backward compatibility)
   const elementById = document.getElementById(trimmedSelector);
   if (elementById) {
     return [elementById];
   }

   // 4. Global CSS Selector
   try {
     return Array.from(document.querySelectorAll(trimmedSelector));
   } catch (e) {
     console.error(`Invokers: Invalid CSS selector in commandfor: "${trimmedSelector}"`, e);
     return [];
   }
}
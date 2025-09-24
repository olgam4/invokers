/**
 * @file expressions.ts
 * @summary Expression Engine Module for the Invokers library.
 * @description
 * This module enables template interpolation through the `{{expression}}` syntax.
 * When enabled, commands and templates can use dynamic expressions to access
 * data context, element properties, and event information.
 * This is part of the Tier 3 advanced reactive engine.
 * 
 * @example
 * ```javascript
 * import { enableExpressionEngine } from 'invokers/advanced/expressions';
 * 
 * enableExpressionEngine();
 * ```
 * 
 * @example
 * ```html
 * <!-- After enabling expression engine -->
 * <input id="name" value="John">
 * <button command="--text:set:Hello {{this.elements.name.value}}!" 
 *         command-on="click" 
 *         commandfor="#greeting">
 *   Greet
 * </button>
 * <div id="greeting"></div>
 * ```
 */

import { InvokerManager } from '../core';
import { interpolateString } from './interpolation';

/**
 * Enables the expression engine ({{...}} interpolation) for the Invokers library.
 * This allows commands and templates to use dynamic expressions to access data.
 * 
 * Once enabled, you can use {{expression}} syntax in commands and templates:
 * - `{{this.value}}` - Access invoker element's value
 * - `{{event.type}}` - Access triggering event properties
 * - `{{data.username}}` - Access data context
 * - `{{this.elements.name.value}}` - Access form element values
 * 
 * @example
 * ```javascript
 * import { enableExpressionEngine } from 'invokers/advanced/expressions';
 * 
 * enableExpressionEngine();
 * 
 * // Now you can use expressions in commands
 * // <button command="--text:set:Current time: {{new Date().toLocaleTimeString()}}" 
 * //         commandfor="#clock">Update Clock</button>
 * ```
 */
export function enableExpressionEngine(): void {
  const invokerInstance = InvokerManager.getInstance();
  
  // Enable interpolation on the core instance
  if (typeof invokerInstance._enableInterpolation === 'function') {
    invokerInstance._enableInterpolation();
  } else {
    // Fallback: Set a flag that other parts of the system can check
    (invokerInstance as any)._interpolationEnabled = true;
  }
  
  // Make interpolation utility available globally for advanced users
  if (typeof window !== 'undefined' && (window as any).Invoker) {
    (window as any).Invoker.getInterpolationUtility = () => interpolateString;
    (window as any).Invoker.interpolateString = interpolateString;
  }
  
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    console.log("Invokers: Expression Engine ({{...}}) enabled.");
  }
}

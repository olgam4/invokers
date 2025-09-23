// src/interpolation.ts

import { evaluateExpression } from './expression';
import { generateUid } from './utils';

/**
 * Safely accesses nested properties of an object using a dot-notation string.
 * @param obj The object to access
 * @param path The dot-notation path (e.g., "event.detail.message")
 * @returns The value at the path, or undefined if not found
 */
export function getDeepValue(obj: any, path: string): any {
  if (typeof obj !== 'object' || obj === null || !path) return undefined;

  return path.split('.').reduce((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return acc[part];
  }, obj);
}

/**
 * Interpolates a string with placeholders like {{expression}}
 * @param template The template string containing {{...}} placeholders
 * @param context The context object containing values for interpolation
 * @returns The interpolated string with placeholders replaced
 */
export function interpolateString(template: string, context: Record<string, any>): string {
  if (typeof template !== 'string') {
    return '';
  }

  // Limit template size to prevent DoS
  if (template.length > 10000) {
    console.warn('Invokers: Template too large, truncating');
    template = template.substring(0, 10000);
  }

  let result = template;
  let replacements = 0;

  result = result.replace(/\{\{(.*?)\}\}/g, (_, expression) => {
    replacements++;
    if (replacements > 50) {
      console.warn('Invokers: Too many interpolations in template, stopping');
      return '';
    }

    try {
      // Special handling for __uid placeholder
      if (expression.trim() === '__uid') {
        return generateUid();
      }

      const value = evaluateExpression(expression.trim(), context);
      return value !== undefined && value !== null ? String(value) : '';
    } catch (error) {
      console.warn(`Invokers: Expression evaluation failed in interpolation: ${expression}`, error);
      return '';
    }
  });

  return result;
}
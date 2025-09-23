// src/utils.ts
// Utility functions for the Invokers library

/**
 * Generates a unique identifier string.
 * Uses crypto.getRandomValues() for better randomness when available,
 * falls back to Math.random() for compatibility.
 *
 * @param prefix Optional prefix for the generated ID
 * @param length Length of the random part (default: 8)
 * @returns A unique identifier string
 */
export function generateUid(prefix = 'invoker', length = 8): string {
  let randomPart = '';

  // Use crypto.getRandomValues if available (secure contexts)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // Convert to base36 for shorter, URL-safe strings
    randomPart = Array.from(array, byte => byte.toString(36)).join('').slice(0, length);
  } else {
    // Fallback to Math.random
    randomPart = Math.random().toString(36).substring(2, 2 + length);
  }

  return `${prefix}-${randomPart}`;
}

/**
 * Sanitizes a string for use as an HTML ID attribute.
 * Removes invalid characters and ensures it starts with a letter.
 *
 * @param str The string to sanitize
 * @returns A valid HTML ID string
 */
export function sanitizeHtmlId(str: string): string {
  if (!str) return generateUid('id', 6);

  // Remove invalid characters, keep only letters, numbers, hyphens, underscores
  let sanitized = str.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Ensure it starts with a letter (HTML ID requirement)
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'id-' + sanitized;
  }

  // Remove multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Ensure minimum length
  if (sanitized.length < 1) {
    return generateUid('id', 6);
  }

  return sanitized;
}

/**
 * Deep clones an object using JSON serialization.
 * Note: This doesn't handle functions, undefined values, or circular references.
 *
 * @param obj The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely gets a nested property from an object using dot notation.
 *
 * @param obj The object to traverse
 * @param path The property path (e.g., 'user.profile.name')
 * @param defaultValue Default value if path doesn't exist
 * @returns The property value or default value
 */
export function getNestedProperty(obj: any, path: string, defaultValue: any = undefined): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Sets a nested property on an object using dot notation.
 * Creates intermediate objects if they don't exist.
 *
 * @param obj The object to modify
 * @param path The property path (e.g., 'user.profile.name')
 * @param value The value to set
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
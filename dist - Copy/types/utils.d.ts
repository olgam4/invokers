/**
 * Generates a unique identifier string.
 * Uses crypto.getRandomValues() for better randomness when available,
 * falls back to Math.random() for compatibility.
 *
 * @param prefix Optional prefix for the generated ID
 * @param length Length of the random part (default: 8)
 * @returns A unique identifier string
 */
export declare function generateUid(prefix?: string, length?: number): string;
/**
 * Sanitizes a string for use as an HTML ID attribute.
 * Removes invalid characters and ensures it starts with a letter.
 *
 * @param str The string to sanitize
 * @returns A valid HTML ID string
 */
export declare function sanitizeHtmlId(str: string): string;
/**
 * Deep clones an object using JSON serialization.
 * Note: This doesn't handle functions, undefined values, or circular references.
 *
 * @param obj The object to clone
 * @returns A deep clone of the object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Safely gets a nested property from an object using dot notation.
 *
 * @param obj The object to traverse
 * @param path The property path (e.g., 'user.profile.name')
 * @param defaultValue Default value if path doesn't exist
 * @returns The property value or default value
 */
export declare function getNestedProperty(obj: any, path: string, defaultValue?: any): any;
/**
 * Sets a nested property on an object using dot notation.
 * Creates intermediate objects if they don't exist.
 *
 * @param obj The object to modify
 * @param path The property path (e.g., 'user.profile.name')
 * @param value The value to set
 */
export declare function setNestedProperty(obj: any, path: string, value: any): void;
//# sourceMappingURL=utils.d.ts.map
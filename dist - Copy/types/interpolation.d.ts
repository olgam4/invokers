/**
 * Safely accesses nested properties of an object using a dot-notation string.
 * @param obj The object to access
 * @param path The dot-notation path (e.g., "event.detail.message")
 * @returns The value at the path, or undefined if not found
 */
export declare function getDeepValue(obj: any, path: string): any;
/**
 * Interpolates a string with placeholders like {{expression}}
 * @param template The template string containing {{...}} placeholders
 * @param context The context object containing values for interpolation
 * @returns The interpolated string with placeholders replaced
 */
export declare function interpolateString(template: string, context: Record<string, any>): string;
//# sourceMappingURL=interpolation.d.ts.map
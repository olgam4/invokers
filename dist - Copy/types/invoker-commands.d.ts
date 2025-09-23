/**
 * @file invoker-commands.ts
 * @summary An optional collection of powerful, reusable custom commands for the Invokers library.
 * @description
 * This module extends the core Invokers library with a suite of feature-rich commands
 * for common UI patterns like dynamic content fetching, DOM manipulation, media control, and more.
 *
 * To use these commands, import and run the `registerAll()` function after the core
 * Invokers library has been loaded.
 * @example
 * // In your main application script:
 * import 'invokers'; // Core library (loads polyfill and window.Invoker)
 * import { registerAll } from 'invokers/commands';
 *
 * // Make all extended commands available for use in your HTML.
 * registerAll();
 */
import type { CommandCallback } from "./index";
type CommandRegistry = Record<string, CommandCallback>;
/**
 * A collection of useful custom commands to enhance the Invokers library.
 * Each command is designed to be robust, handle common edge cases, and provide
 * excellent developer experience through clear error messaging.
 */
export declare const commands: CommandRegistry;
/**
 * Registers commands from this module with the global `Invoker` instance.
 * This function is now simpler and more robust, ensuring all commands are found.
 *
 * @param specificCommands An optional array of command names to register. If omitted, all commands are registered.
 * @example
 * registerAll(); // Registers all commands
 * registerAll(['--media:toggle', '--scroll:to']); // Registers specific commands
 */
export declare function registerAll(specificCommands?: string[]): void;
export {};
//# sourceMappingURL=invoker-commands.d.ts.map
/**
 * @file demo-commands.ts
 * @summary Demo commands for the Invokers comprehensive demo.
 * @description
 * This module contains demo-specific commands used only for testing and demonstration
 * purposes in the comprehensive demo. These commands are not included in the main
 * Invokers library and should be imported separately when needed.
 *
 * To use these commands, import and run the `registerDemoCommands()` function
 * after the core Invokers library has been loaded.
 * @example
 * // In your demo page:
 * import 'invokers'; // Core library (loads polyfill and window.Invoker)
 * import { registerDemoCommands } from './demo-commands';
 *
 * // Make demo commands available for testing
 * registerDemoCommands();
 */
import type { CommandContext } from "./index";
type CommandRegistry = Record<string, (context: CommandContext) => void | Promise<void>>;
/**
 * Demo-specific commands for testing and demonstration purposes.
 * These commands are not part of the core Invokers library.
 */
export declare const demoCommands: CommandRegistry;
/**
 * Registers demo commands with the global `Invoker` instance.
 * These commands are only for testing and demonstration purposes.
 *
 * @param specificCommands An optional array of command names to register. If omitted, all demo commands are registered.
 * @example
 * registerDemoCommands(); // Registers all demo commands
 * registerDemoCommands(['--demo:echo', '--demo:counter:increment']); // Registers specific demo commands
 */
export declare function registerDemoCommands(specificCommands?: string[]): void;
export {};
//# sourceMappingURL=demo-commands.d.ts.map
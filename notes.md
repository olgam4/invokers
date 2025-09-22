# Development Notes

## Changes Made

### 2025-09-22
- **Fixed text command parameter parsing**: Removed `.trim()` from `sanitizeParams` function to preserve leading/trailing spaces in command parameters, which was breaking text commands that include spaces (e.g., `--text:append: World`).
- **Fixed text command value joining**: Changed `valueParts.join(':')` to `valueParts.join(' ')` in the `--text` command implementation to properly reconstruct text with spaces.
- **Updated tests to use singleton**: Changed all test files from `new InvokerManager()` to `InvokerManager.getInstance()` to work with the singleton pattern.
- **Updated pipeline test**: Modified pipeline test to use `InvokerManager.getInstance()` instead of `window.Invoker` to fix undefined register errors.
- **Test results**: Core functionality tests are now passing. Major improvements in test suite with core-commands, final, clean, and and-then-simple tests all passing. Pipeline tests mostly working. Some remaining issues with extended commands in test environments and window.Invoker usage in some tests.
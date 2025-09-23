/**
 * Evaluates a safe expression within a given context.
 * Supports arithmetic, comparisons, logical operations, and property access.
 * @param expression The expression string to evaluate (e.g., "this.value.length > 10 ? 'Too long' : 'OK'")
 * @param context The context object containing values for the expression
 * @returns The result of evaluating the expression
 */
export interface ExpressionResult<T = any> {
    success: boolean;
    value?: T;
    error?: string;
}
export declare function evaluateExpression(expression: string, context: Record<string, any>): any;
/**
 * Evaluates a safe expression and returns a Result object for better error handling.
 * @param expression The expression string to evaluate
 * @param context The context object containing values for the expression
 * @returns A Result object with success/value or error information
 */
export declare function evaluateExpressionSafe<T = any>(expression: string, context: Record<string, any>): ExpressionResult<T>;
//# sourceMappingURL=expression.d.ts.map
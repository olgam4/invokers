// src/expression.ts

import { Lexer } from './expression-lexer';
import { ExpressionParser } from './expression-parser';
import { ExpressionEvaluator } from './expression-evaluator';
import { ASTNode } from './expression-parser';

// Simple LRU cache for parsed expressions
class ExpressionCache {
  private cache = new Map<string, ASTNode>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): ASTNode | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: ASTNode): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const expressionCache = new ExpressionCache();

// Rate limiting for expression evaluation
class ExpressionRateLimiter {
  private static readonly MAX_EVALUATIONS_PER_SECOND = 1000;
  private static readonly WINDOW_SIZE_MS = 1000;
  private evaluations: number[] = [];

  canEvaluate(): boolean {
    const now = Date.now();
    // Remove old evaluations outside the window
    this.evaluations = this.evaluations.filter(time => now - time < ExpressionRateLimiter.WINDOW_SIZE_MS);

    if (this.evaluations.length >= ExpressionRateLimiter.MAX_EVALUATIONS_PER_SECOND) {
      return false;
    }

    this.evaluations.push(now);
    return true;
  }
}

const rateLimiter = new ExpressionRateLimiter();

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

export function evaluateExpression(expression: string, context: Record<string, any>): any {
  // Rate limiting check
  if (!rateLimiter.canEvaluate()) {
    console.warn('Invokers: Expression evaluation rate limit exceeded');
    return undefined;
  }

  try {
    // Check cache first
    let ast = expressionCache.get(expression);
    if (!ast) {
      // Parse and cache the expression
      const lexer = new Lexer();
      const tokens = lexer.tokenize(expression);
      const parser = new ExpressionParser(tokens);
      ast = parser.parse();
      expressionCache.set(expression, ast);
    }

    const evaluator = new ExpressionEvaluator(context);
    return evaluator.evaluate(ast);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Re-throw security-related and structural errors
    if (errorMessage.includes('not allowed') ||
        errorMessage.includes('potentially unsafe') ||
        errorMessage.includes('invalid characters') ||
        errorMessage.includes('Maximum recursion depth') ||
        errorMessage.includes('Expression too')) {
      throw error;
    }
    if (errorMessage.includes('Maximum call stack')) {
      throw new Error('Invokers Expression Error: Maximum recursion depth exceeded');
    }
    console.error(`Invokers Expression Error in "${expression}": ${errorMessage}`);
    return undefined;
  }
}

/**
 * Evaluates a safe expression and returns a Result object for better error handling.
 * @param expression The expression string to evaluate
 * @param context The context object containing values for the expression
 * @returns A Result object with success/value or error information
 */
export function evaluateExpressionSafe<T = any>(expression: string, context: Record<string, any>): ExpressionResult<T> {
  try {
    const result = evaluateExpression(expression, context);
    return { success: true, value: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
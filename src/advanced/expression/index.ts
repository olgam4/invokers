// src/expression.ts

import { Lexer } from './lexer';
import { ExpressionParser, ASTNode } from './parser';
import { ExpressionEvaluator } from './evaluator';

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

    // Include helper functions in context
    const enhancedContext = {
      ...expressionHelpers,
      ...context
    };

    const evaluator = new ExpressionEvaluator(enhancedContext);
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

// --- Expression Helper Functions ---

/**
 * Built-in helper functions available in expressions
 */
export const expressionHelpers = {
  // String helpers
  capitalize: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str: string, length: number): string => {
    if (typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  },

  pluralize: (count: number, singular: string, plural?: string): string => {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
  },

  // Array helpers
  join: (arr: any[], separator = ', '): string => {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator);
  },

  filter: (arr: any[], predicate: string | ((item: any) => boolean)): any[] => {
    if (!Array.isArray(arr)) return [];
    if (typeof predicate === 'string') {
      // Simple property filter like 'active'
      return arr.filter(item => item && item[predicate]);
    }
    if (typeof predicate === 'function') {
      return arr.filter(predicate);
    }
    return arr;
  },

  sort: (arr: any[], property?: string): any[] => {
    if (!Array.isArray(arr)) return [];
    if (!property) return [...arr].sort();
    return [...arr].sort((a, b) => {
      const aVal = a?.[property];
      const bVal = b?.[property];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  },

  // Date/time helpers
  formatDate: (date: Date | string | number, format = 'MM/dd/yyyy'): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return format
        .replace('yyyy', String(year))
        .replace('MM', month)
        .replace('dd', day);
    } catch {
      return '';
    }
  },

  timeAgo: (date: Date | string | number): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  },

  // Number helpers
  formatNumber: (num: number, options?: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';

    const { locale = 'en-US', minimumFractionDigits = 0, maximumFractionDigits = 2 } = options || {};
    try {
      return num.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits });
    } catch {
      return num.toString();
    }
  },

  formatCurrency: (amount: number, currency = 'USD', locale = 'en-US'): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';

    try {
      return amount.toLocaleString(locale, {
        style: 'currency',
        currency: currency.toUpperCase()
      });
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  },

  // Utility helpers
  isEmpty: (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  isNotEmpty: (value: any): boolean => {
    return !expressionHelpers.isEmpty(value);
  }
};

/**
 * Enhanced evaluateExpression that includes helper functions in context
 */
export function evaluateExpressionWithHelpers(expression: string, context: Record<string, any>): any {
  const enhancedContext = {
    ...expressionHelpers,
    ...context
  };
  return evaluateExpression(expression, enhancedContext);
}
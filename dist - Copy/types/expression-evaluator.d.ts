import { ASTNode } from './expression-parser';
export declare class ExpressionEvaluator {
    private context;
    private static readonly MAX_RECURSION_DEPTH;
    private recursionDepth;
    constructor(context: Record<string, any>);
    private sanitizeContext;
    private sanitizeValue;
    private sanitizeObject;
    private isSafeProperty;
    private createSafeDOMObject;
    evaluate(node: ASTNode): any;
    private evaluateBinaryOp;
    private evaluateUnaryOp;
    private evaluateMemberAccess;
    private evaluateArrayAccess;
    private resolveIdentifier;
    private evaluateConditional;
}
//# sourceMappingURL=expression-evaluator.d.ts.map
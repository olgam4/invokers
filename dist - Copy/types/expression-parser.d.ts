import { Token } from './expression-lexer';
export declare enum ASTNodeType {
    LITERAL = "LITERAL",
    IDENTIFIER = "IDENTIFIER",
    BINARY_OP = "BINARY_OP",
    UNARY_OP = "UNARY_OP",
    MEMBER_ACCESS = "MEMBER_ACCESS",
    ARRAY_ACCESS = "ARRAY_ACCESS",
    CONDITIONAL = "CONDITIONAL"
}
export interface ASTNode {
    type: ASTNodeType;
    value?: any;
    left?: ASTNode;
    right?: ASTNode;
    operator?: string;
    object?: ASTNode;
    property?: string;
    index?: ASTNode;
    test?: ASTNode;
    consequent?: ASTNode;
    alternate?: ASTNode;
}
export declare class ExpressionParser {
    private tokens;
    private current;
    constructor(tokens: Token[]);
    parse(): ASTNode;
    private expression;
    private conditional;
    private logicalOr;
    private logicalAnd;
    private equality;
    private comparison;
    private term;
    private factor;
    private unary;
    private memberAccess;
    private primary;
    private match;
    private consume;
    private check;
    private advance;
    private isAtEnd;
    private peek;
    private previous;
}
//# sourceMappingURL=expression-parser.d.ts.map
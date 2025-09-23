export declare enum TokenType {
    IDENTIFIER = 0,// e.g., this, value, length, detail
    NUMBER = 1,// e.g., 100, 3.14
    STRING = 2,// e.g., 'hello', "world"
    OPERATOR = 3,// e.g., +, -, ===, &&, ?
    DOT = 4,// . (for property access)
    BOOLEAN = 5,// true, false
    NULL = 6,// null
    LPAREN = 7,// (
    RPAREN = 8,// )
    LBRACKET = 9,// [
    RBRACKET = 10,// ]
    COLON = 11,// : (for ternary operator)
    EOF = 12
}
export interface Token {
    type: TokenType;
    value: string;
    position: number;
}
export declare class Lexer {
    private static readonly MAX_EXPRESSION_LENGTH;
    private static readonly MAX_TOKEN_COUNT;
    tokenize(input: string): Token[];
    private isDangerousIdentifier;
}
//# sourceMappingURL=expression-lexer.d.ts.map
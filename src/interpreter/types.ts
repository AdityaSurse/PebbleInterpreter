export enum TokenType {
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  PRINT = 'PRINT',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  MODULO = 'MODULO',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  BANG_EQUAL = 'BANG_EQUAL',
  LESS = 'LESS',
  GREATER = 'GREATER',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  AND = 'AND',
  OR = 'OR',
  BANG = 'BANG',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  SEMICOLON = 'SEMICOLON',
  EOF = 'EOF',
  ILLEGAL = 'ILLEGAL',
  STRING = 'STRING',
  INPUT = 'INPUT',
}

export interface Token {
  type: TokenType;
  literal: string;
  line: number;
}

export type ASTNode = Statement | Expression;

export interface Program {
  type: 'Program';
  statements: Statement[];
}

export interface BlockStatement {
  type: 'BlockStatement';
  statements: Statement[];
}

export interface LetStatement {
  type: 'LetStatement';
  name: IdentifierExpression;
  value: Expression;
  line: number;
}

export interface AssignmentStatement {
  type: 'AssignmentStatement';
  name: IdentifierExpression;
  value: Expression;
  line: number;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: Expression;
  line: number;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: Expression;
  consequence: BlockStatement;
  alternative?: BlockStatement;
  line: number;
}

export interface WhileStatement {
  type: 'WhileStatement';
  condition: Expression;
  body: BlockStatement;
  line: number;
}

export interface PrintStatement {
  type: 'PrintStatement';
  expression: Expression;
  line: number;
}

export type Statement =
  | Program
  | BlockStatement
  | LetStatement
  | AssignmentStatement
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | PrintStatement;

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
  line: number;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  right: Expression;
  line: number;
}

export interface LiteralExpression {
  type: 'LiteralExpression';
  value: number | boolean | string;
  line: number;
}

export interface InputExpression {
  type: 'InputExpression';
  prompt?: Expression;
  line: number;
}

export interface IdentifierExpression {
  type: 'IdentifierExpression';
  value: string;
  line: number;
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | LiteralExpression
  | IdentifierExpression
  | InputExpression;

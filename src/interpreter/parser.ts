import { Lexer } from './lexer';
import {
  Token,
  TokenType,
  Program,
  Statement,
  Expression,
  LetStatement,
  AssignmentStatement,
  ExpressionStatement,
  IdentifierExpression,
  BlockStatement,
  IfStatement,
  WhileStatement,
  PrintStatement,
} from './types';

enum Precedence {
  LOWEST = 1,
  OR,
  AND,
  EQUALS,      // ==
  LESSGREATER, // > or <
  SUM,         // +
  PRODUCT,     // *
  PREFIX,      // -X or !X
  CALL,        // myFunction(X)
}

const PRECEDENCES: Record<TokenType, Precedence> = {
  [TokenType.OR]: Precedence.OR,
  [TokenType.AND]: Precedence.AND,
  [TokenType.EQUAL_EQUAL]: Precedence.EQUALS,
  [TokenType.BANG_EQUAL]: Precedence.EQUALS,
  [TokenType.LESS]: Precedence.LESSGREATER,
  [TokenType.GREATER]: Precedence.LESSGREATER,
  [TokenType.LESS_EQUAL]: Precedence.LESSGREATER,
  [TokenType.GREATER_EQUAL]: Precedence.LESSGREATER,
  [TokenType.PLUS]: Precedence.SUM,
  [TokenType.MINUS]: Precedence.SUM,
  [TokenType.STAR]: Precedence.PRODUCT,
  [TokenType.SLASH]: Precedence.PRODUCT,
  [TokenType.MODULO]: Precedence.PRODUCT,
} as Record<TokenType, Precedence>;

export class Parser {
  private lexer: Lexer;
  private currentToken!: Token;
  private peekToken!: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.nextToken();
    this.nextToken();
  }

  private nextToken() {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }

  private currentPrecedence(): Precedence {
    return PRECEDENCES[this.currentToken.type] || Precedence.LOWEST;
  }

  private peekPrecedence(): Precedence {
    return PRECEDENCES[this.peekToken.type] || Precedence.LOWEST;
  }

  public parseProgram(): Program {
    const program: Program = { type: 'Program', statements: [] };

    while (this.currentToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) {
        program.statements.push(stmt);
      }
      this.nextToken();
    }

    return program;
  }

  private parseStatement(): Statement | null {
    switch (this.currentToken.type) {
      case TokenType.LET:
        return this.parseLetStatement();
      case TokenType.IF:
        return this.parseIfStatement();
      case TokenType.WHILE:
        return this.parseWhileStatement();
      case TokenType.PRINT:
        return this.parsePrintStatement();
      case TokenType.IDENTIFIER:
        if (this.peekToken.type === TokenType.EQUAL) {
          return this.parseAssignmentStatement();
        }
        return this.parseExpressionStatement();
      default:
        return this.parseExpressionStatement();
    }
  }

  private parseLetStatement(): LetStatement {
    const line = this.currentToken.line;
    if (!this.expectPeek(TokenType.IDENTIFIER)) {
      throw new Error(`Line ${line}: Expected identifier after 'let'`);
    }

    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };

    if (!this.expectPeek(TokenType.EQUAL)) {
      throw new Error(`Line ${line}: Expected '=' after identifier`);
    }

    this.nextToken();
    const value = this.parseExpression(Precedence.LOWEST);

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'LetStatement', name, value, line };
  }

  private parseAssignmentStatement(): AssignmentStatement {
    const line = this.currentToken.line;
    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };

    this.nextToken(); // consume identifier
    this.nextToken(); // consume '='

    const value = this.parseExpression(Precedence.LOWEST);

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'AssignmentStatement', name, value, line };
  }

  private parsePrintStatement(): PrintStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'print'

    if (this.currentToken.type !== TokenType.LPAREN) {
       throw new Error(`Line ${line}: Expected '(' after 'print'`);
    }
    this.nextToken(); // consume '('

    const expression = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after print expression`);
    }

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'PrintStatement', expression, line };
  }

  private parseIfStatement(): IfStatement {
    const line = this.currentToken.line;
    this.nextToken();

    if (this.currentToken.type !== TokenType.LPAREN) {
      throw new Error(`Line ${line}: Expected '(' after 'if'`);
    }
    this.nextToken();
    const condition = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after if condition`);
    }

    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(`Line ${line}: Expected '{' after if condition`);
    }

    const consequence = this.parseBlockStatement();
    let alternative: BlockStatement | undefined;

    if (this.peekToken.type === TokenType.ELSE) {
      this.nextToken();
      if (!this.expectPeek(TokenType.LBRACE)) {
        throw new Error(`Line ${line}: Expected '{' after 'else'`);
      }
      alternative = this.parseBlockStatement();
    }

    return { type: 'IfStatement', condition, consequence, alternative, line };
  }

  private parseWhileStatement(): WhileStatement {
    const line = this.currentToken.line;
    this.nextToken();

    if (this.currentToken.type !== TokenType.LPAREN) {
      throw new Error(`Line ${line}: Expected '(' after 'while'`);
    }
    this.nextToken();
    const condition = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after while condition`);
    }

    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(`Line ${line}: Expected '{' after while condition`);
    }

    const body = this.parseBlockStatement();

    return { type: 'WhileStatement', condition, body, line };
  }

  private parseBlockStatement(): BlockStatement {
    const statements: Statement[] = [];
    this.nextToken();

    while (this.currentToken.type !== TokenType.RBRACE && this.currentToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      this.nextToken();
    }

    return { type: 'BlockStatement', statements };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const line = this.currentToken.line;
    const expression = this.parseExpression(Precedence.LOWEST);

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'ExpressionStatement', expression, line };
  }

  private parseExpression(precedence: Precedence): Expression {
    let leftExp = this.parsePrefix();

    while (this.peekToken.type !== TokenType.SEMICOLON && precedence < this.peekPrecedence()) {
      this.nextToken();
      leftExp = this.parseInfix(leftExp);
    }

    return leftExp;
  }

  private parsePrefix(): Expression {
    switch (this.currentToken.type) {
      case TokenType.IDENTIFIER:
        return { type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line };
      case TokenType.NUMBER:
        return { type: 'LiteralExpression', value: parseFloat(this.currentToken.literal), line: this.currentToken.line };
      case TokenType.TRUE:
      case TokenType.FALSE:
        return { type: 'LiteralExpression', value: this.currentToken.type === TokenType.TRUE, line: this.currentToken.line };
      case TokenType.BANG:
      case TokenType.MINUS:
        const line = this.currentToken.line;
        const operator = this.currentToken.literal;
        this.nextToken();
        const right = this.parseExpression(Precedence.PREFIX);
        return { type: 'UnaryExpression', operator, right, line };
      case TokenType.LPAREN:
        return this.parseGroupedExpression();
      default:
        throw new Error(`Line ${this.currentToken.line}: Unexpected token '${this.currentToken.literal}'`);
    }
  }

  private parseGroupedExpression(): Expression {
    this.nextToken();
    const exp = this.parseExpression(Precedence.LOWEST);
    if (!this.expectPeek(TokenType.RPAREN)) {
       throw new Error(`Line ${this.currentToken.line}: Expected ')'`);
    }
    return exp;
  }

  private parseInfix(left: Expression): Expression {
    const line = this.currentToken.line;
    const operator = this.currentToken.literal;
    const precedence = this.currentPrecedence();
    this.nextToken();
    const right = this.parseExpression(precedence);
    return { type: 'BinaryExpression', operator, left, right, line };
  }

  private expectPeek(type: TokenType): boolean {
    if (this.peekToken.type === type) {
      this.nextToken();
      return true;
    }
    return false;
  }
}

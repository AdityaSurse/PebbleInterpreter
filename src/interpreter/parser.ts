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
  ForStatement,
  PrintStatement,
  InputExpression,
  ArrayExpression,
  IndexExpression,
  CallExpression,
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
  INDEX,       // array[index]
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
  [TokenType.LPAREN]: Precedence.CALL,
  [TokenType.LBRACKET]: Precedence.INDEX,
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
      case TokenType.FOR:
        return this.parseForStatement();
      case TokenType.PRINT:
        return this.parsePrintStatement();
      default:
        // Try parsing as expression statement, which could also be an assignment
        const line = this.currentToken.line;
        const expr = this.parseExpression(Precedence.LOWEST);
        
        if (this.peekToken.type === TokenType.EQUAL) {
          this.nextToken(); // consume to '='
          this.nextToken(); // consume '='
          
          const value = this.parseExpression(Precedence.LOWEST);
          
          if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
            this.nextToken();
          }
          
          if (expr.type === 'IdentifierExpression' || expr.type === 'IndexExpression') {
            return { type: 'AssignmentStatement', name: expr, value, line };
          } else {
            throw new Error(`Line ${line}: Invalid left-hand side in assignment`);
          }
        }
        
        if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
          this.nextToken();
        }
        
        return { type: 'ExpressionStatement', expression: expr, line };
    }
  }

  private parseForStatement(): ForStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'for'
    
    if (!this.expectPeek(TokenType.LPAREN)) {
      throw new Error(`Line ${line}: Expected '(' after 'for'`);
    }
    
    this.nextToken(); // consume '('
    
    let init: Statement | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      if (this.currentToken.type === TokenType.LET) {
        init = this.parseLetStatement();
      } else {
        init = this.parseStatement() || undefined;
      }
    } else {
      this.nextToken(); // consume ';'
    }
    
    let condition: Expression | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      condition = this.parseExpression(Precedence.LOWEST);
      this.nextToken(); // consume condition
      if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
         throw new Error(`Line ${line}: Expected ';' after for condition`);
      }
      this.nextToken(); // consume ';'
    } else {
      this.nextToken(); // consume ';'
    }
    
    let update: Statement | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.RPAREN) {
       const updateLine = this.currentToken.line;
       const updateExpr = this.parseExpression(Precedence.LOWEST);
       if (this.peekToken.type === TokenType.EQUAL) {
         this.nextToken();
         this.nextToken();
         const updateVal = this.parseExpression(Precedence.LOWEST);
         if (updateExpr.type === 'IdentifierExpression' || updateExpr.type === 'IndexExpression') {
           update = { type: 'AssignmentStatement', name: updateExpr, value: updateVal, line: updateLine };
         } else {
           throw new Error(`Line ${updateLine}: Invalid LHS in for update`);
         }
       } else {
         update = { type: 'ExpressionStatement', expression: updateExpr, line: updateLine };
       }
       if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
           this.nextToken();
       }
    }
    
    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after 'for' clauses`);
    }
    
    this.nextToken(); // consume ')'
    
    if ((this.currentToken.type as TokenType) !== TokenType.LBRACE) {
       throw new Error(`Line ${line}: Expected '{' for for body`);
    }
    const body = this.parseBlockStatement();
    
    return { type: 'ForStatement', init, condition, update, body, line };
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
      case TokenType.STRING:
        return { type: 'LiteralExpression', value: this.currentToken.literal, line: this.currentToken.line };
      case TokenType.TRUE:
      case TokenType.FALSE:
        return { type: 'LiteralExpression', value: this.currentToken.type === TokenType.TRUE, line: this.currentToken.line };
      case TokenType.INPUT:
        const inputLine = this.currentToken.line;
        let prompt: Expression | undefined;
        if (this.peekToken.type === TokenType.LPAREN) {
          this.nextToken(); // consume 'input'
          this.nextToken(); // consume '('
          if ((this.currentToken.type as TokenType) !== TokenType.RPAREN) {
            prompt = this.parseExpression(Precedence.LOWEST);
            if (!this.expectPeek(TokenType.RPAREN)) {
              throw new Error(`Line ${inputLine}: Expected ')' after input prompt`);
            }
          } else {
             // empty parens
          }
        }
        return { type: 'InputExpression', prompt, line: inputLine };
      case TokenType.BANG:
      case TokenType.MINUS:
        const line = this.currentToken.line;
        const operator = this.currentToken.literal;
        this.nextToken();
        const right = this.parseExpression(Precedence.PREFIX);
        return { type: 'UnaryExpression', operator, right, line };
      case TokenType.LPAREN:
        return this.parseGroupedExpression();
      case TokenType.LBRACKET:
        return this.parseArrayExpression();
      default:
        throw new Error(`Line ${this.currentToken.line}: Unexpected token '${this.currentToken.literal}'`);
    }
  }

  private parseArrayExpression(): ArrayExpression {
    const line = this.currentToken.line;
    const elements: Expression[] = [];
    if (this.peekToken.type === TokenType.RBRACKET) {
      this.nextToken();
      return { type: 'ArrayExpression', elements, line };
    }
    this.nextToken();
    elements.push(this.parseExpression(Precedence.LOWEST));
    while (this.peekToken.type === TokenType.COMMA) {
      this.nextToken();
      this.nextToken();
      elements.push(this.parseExpression(Precedence.LOWEST));
    }
    if (!this.expectPeek(TokenType.RBRACKET)) {
       throw new Error(`Line ${line}: Expected ']' after array elements`);
    }
    return { type: 'ArrayExpression', elements, line };
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
    if (this.currentToken.type === TokenType.LBRACKET) {
      return this.parseIndexExpression(left);
    }
    if (this.currentToken.type === TokenType.LPAREN) {
      return this.parseCallExpression(left);
    }
    const line = this.currentToken.line;
    const operator = this.currentToken.literal;
    const precedence = this.currentPrecedence();
    this.nextToken();
    const right = this.parseExpression(precedence);
    return { type: 'BinaryExpression', operator, left, right, line };
  }

  private parseIndexExpression(left: Expression): IndexExpression {
    const line = this.currentToken.line;
    this.nextToken();
    const index = this.parseExpression(Precedence.LOWEST);
    if (!this.expectPeek(TokenType.RBRACKET)) {
      throw new Error(`Line ${line}: Expected ']' after index`);
    }
    return { type: 'IndexExpression', left, index, line };
  }

  private parseCallExpression(left: Expression): CallExpression {
    const line = this.currentToken.line;
    const args: Expression[] = [];
    if (this.peekToken.type === TokenType.RPAREN) {
      this.nextToken();
      return { type: 'CallExpression', callee: left, arguments: args, line };
    }
    this.nextToken();
    args.push(this.parseExpression(Precedence.LOWEST));
    while (this.peekToken.type === TokenType.COMMA) {
      this.nextToken();
      this.nextToken();
      args.push(this.parseExpression(Precedence.LOWEST));
    }
    if (!this.expectPeek(TokenType.RPAREN)) {
       throw new Error(`Line ${line}: Expected ')' after call arguments`);
    }
    return { type: 'CallExpression', callee: left, arguments: args, line };
  }

  private expectPeek(type: TokenType): boolean {
    if (this.peekToken.type === type) {
      this.nextToken();
      return true;
    }
    return false;
  }
}

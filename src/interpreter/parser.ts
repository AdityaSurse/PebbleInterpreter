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

  FunctionStatement,
  ReturnStatement,
  ClassStatement,
  ObjectExpression,
  NewExpression,
  PropertyAccessExpression,
  ThisExpression,

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
  CALL,
  DOT,        // myFunction(X)
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

    while ((this.currentToken.type as TokenType) !== TokenType.EOF) {
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

      case TokenType.DEF:
        return this.parseFunctionStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      case TokenType.CLASS:
        return this.parseClassStatement();

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
        
        if ((this.peekToken.type as TokenType) === TokenType.EQUAL) {
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
    
    if ((this.currentToken.type as TokenType) !== TokenType.LPAREN) {
      throw new Error(`Line ${line}: Expected '(' after 'for'`);
    }
    
    this.nextToken(); // consume '('
    
    // Parse init
    let init: Statement | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      if ((this.currentToken.type as TokenType) === TokenType.LET) {
        init = this.parseLetStatement();
      } else {
        init = this.parseStatement() || undefined;
      }
    }
    
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      throw new Error(`Line ${line}: Expected ';' after for init`);
    }
    this.nextToken(); // consume ';'
    
    // Parse condition
    let condition: Expression | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      condition = this.parseExpression(Precedence.LOWEST);
      if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
         this.nextToken();
      }
    }
    
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      throw new Error(`Line ${line}: Expected ';' after for condition`);
    }
    this.nextToken(); // consume ';'
    
    // Parse update
    let update: Statement | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.RPAREN) {
       const updateLine = this.currentToken.line;
       const updateExpr = this.parseExpression(Precedence.LOWEST);
       if ((this.peekToken.type as TokenType) === TokenType.EQUAL) {
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
    }
    
    if ((this.peekToken.type as TokenType) === TokenType.RPAREN) {
       this.nextToken();
    }
    
    if ((this.currentToken.type as TokenType) !== TokenType.RPAREN) {
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

    if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'LetStatement', name, value, line };
  }

  
  private parseFunctionStatement(): FunctionStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'def'
    if (!this.expectPeek(TokenType.IDENTIFIER)) {
      throw new Error(`Line ${line}: Expected function name`);
    }
    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };
    if (!this.expectPeek(TokenType.LPAREN)) {
      throw new Error(`Line ${line}: Expected '(' after function name`);
    }
    const parameters: IdentifierExpression[] = [];
    if ((this.peekToken.type as TokenType) !== TokenType.RPAREN) {
      this.nextToken();
      parameters.push({ type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line });
      while ((this.peekToken.type as TokenType) === TokenType.COMMA) {
        this.nextToken();
        this.nextToken();
        parameters.push({ type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line });
      }
    }
    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after parameters`);
    }
    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(`Line ${line}: Expected '{' before function body`);
    }
    const body = this.parseBlockStatement();
    return { type: 'FunctionStatement', name, parameters, body, line };
  }

  private parseReturnStatement(): ReturnStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'return'
    let returnValue: Expression | undefined;
    if ((this.currentToken.type as TokenType) !== TokenType.SEMICOLON) {
      returnValue = this.parseExpression(Precedence.LOWEST);
    }
    if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
      this.nextToken();
    }
    return { type: 'ReturnStatement', returnValue, line };
  }

  private parseClassStatement(): ClassStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'class'
    if (!this.expectPeek(TokenType.IDENTIFIER)) {
      throw new Error(`Line ${line}: Expected class name`);
    }
    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };
    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(`Line ${line}: Expected '{' before class body`);
    }
    this.nextToken();
    const methods: FunctionStatement[] = [];
    while ((this.currentToken.type as TokenType) !== TokenType.RBRACE && (this.currentToken.type as TokenType) !== TokenType.EOF) {
      if ((this.currentToken.type as TokenType) === TokenType.DEF) {
        methods.push(this.parseFunctionStatement());
      } else {
        throw new Error(`Line ${this.currentToken.line}: Only methods are allowed inside class body`);
      }
      this.nextToken();
    }
    return { type: 'ClassStatement', name, methods, line };
  }

  private parseObjectExpression(): ObjectExpression {
    const line = this.currentToken.line;
    const properties: { key: string; value: Expression }[] = [];
    if ((this.peekToken.type as TokenType) === TokenType.RBRACE) {
      this.nextToken();
      return { type: 'ObjectExpression', properties, line };
    }
    this.nextToken();
    while ((this.currentToken.type as TokenType) !== TokenType.RBRACE && (this.currentToken.type as TokenType) !== TokenType.EOF) {
      let key = '';
      if ((this.currentToken.type as TokenType) === TokenType.IDENTIFIER || (this.currentToken.type as TokenType) === TokenType.STRING) {
        key = this.currentToken.literal;
      } else {
        throw new Error(`Line ${line}: Expected identifier or string for object key`);
      }
      if (!this.expectPeek(TokenType.COLON)) {
        throw new Error(`Line ${line}: Expected ':' after object key`);
      }
      this.nextToken();
      const value = this.parseExpression(Precedence.LOWEST);
      properties.push({ key, value });
      if ((this.peekToken.type as TokenType) === TokenType.COMMA) {
        this.nextToken();
        this.nextToken();
      } else if ((this.peekToken.type as TokenType) !== TokenType.RBRACE) {
        throw new Error(`Line ${line}: Expected ',' or '}' after object property`);
      }
    }
    if ((this.currentToken.type as TokenType) !== TokenType.RBRACE) {
      throw new Error(`Line ${line}: Expected '}' after object properties`);
    }
    return { type: 'ObjectExpression', properties, line };
  }

  private parsePrintStatement(): PrintStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'print'

    if ((this.currentToken.type as TokenType) !== TokenType.LPAREN) {
       throw new Error(`Line ${line}: Expected '(' after 'print'`);
    }
    this.nextToken(); // consume '('

    const expression = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(`Line ${line}: Expected ')' after print expression`);
    }

    if ((this.peekToken.type as TokenType) === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return { type: 'PrintStatement', expression, line };
  }

  private parseIfStatement(): IfStatement {
    const line = this.currentToken.line;
    this.nextToken();

    if ((this.currentToken.type as TokenType) !== TokenType.LPAREN) {
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

    if ((this.peekToken.type as TokenType) === TokenType.ELSE) {
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

    if ((this.currentToken.type as TokenType) !== TokenType.LPAREN) {
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

    while ((this.currentToken.type as TokenType) !== TokenType.RBRACE && (this.currentToken.type as TokenType) !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      this.nextToken();
    }

    return { type: 'BlockStatement', statements };
  }

  private parseExpression(precedence: Precedence): Expression {
    let leftExp = this.parsePrefix();

    while ((this.peekToken.type as TokenType) !== TokenType.SEMICOLON && precedence < this.peekPrecedence()) {
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
        return { type: 'LiteralExpression', value: (this.currentToken.type as TokenType) === TokenType.TRUE, line: this.currentToken.line };
      case TokenType.INPUT:
        const inputLine = this.currentToken.line;
        let prompt: Expression | undefined;
        if ((this.peekToken.type as TokenType) === TokenType.LPAREN) {
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
      
      case TokenType.LBRACE:
        return this.parseObjectExpression();
      case TokenType.THIS:
        return { type: 'ThisExpression', line: this.currentToken.line };
      case TokenType.NEW:
        const newLine = this.currentToken.line;
        this.nextToken();
        const callee = this.parseExpression(Precedence.CALL);
        // Assuming the callee will actually parse the call expression if it has parens, wait... 
        // We will parse 'new ClassName()'. It's easier if we parse callee as a normal CallExpression, 
        // but 'new' applies to it. So parseExpression handles 'ClassName()'.
        // Wait, if it parses 'ClassName()', it returns CallExpression. We can wrap it.
        if (callee.type !== 'CallExpression') {
           throw new Error(`Line ${newLine}: Expected function call after 'new'`);
        }
        return { type: 'NewExpression', callee: (callee as any).callee, arguments: (callee as any).arguments, line: newLine };

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
    if ((this.peekToken.type as TokenType) === TokenType.RBRACKET) {
      this.nextToken();
      return { type: 'ArrayExpression', elements, line };
    }
    this.nextToken();
    elements.push(this.parseExpression(Precedence.LOWEST));
    while ((this.peekToken.type as TokenType) === TokenType.COMMA) {
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
    
    if ((this.currentToken.type as TokenType) === TokenType.DOT) {
      const line = this.currentToken.line;
      this.nextToken();
      if ((this.currentToken.type as TokenType) !== TokenType.IDENTIFIER) {
        throw new Error(`Line ${line}: Expected property name after '.'`);
      }
      const property = { type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line };
      return { type: 'PropertyAccessExpression', left, property: property as any, line };
    }

    if ((this.currentToken.type as TokenType) === TokenType.LBRACKET) {
      return this.parseIndexExpression(left);
    }
    if ((this.currentToken.type as TokenType) === TokenType.LPAREN) {
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
    if ((this.peekToken.type as TokenType) === TokenType.RPAREN) {
      this.nextToken();
      return { type: 'CallExpression', callee: left, arguments: args, line };
    }
    this.nextToken();
    args.push(this.parseExpression(Precedence.LOWEST));
    while ((this.peekToken.type as TokenType) === TokenType.COMMA) {
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
    if ((this.peekToken.type as TokenType) === type) {
      this.nextToken();
      return true;
    }
    return false;
  }
}

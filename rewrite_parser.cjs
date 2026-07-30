const fs = require('fs');
let code = fs.readFileSync('src/interpreter/parser.ts', 'utf8');

// 1. Add Precedence for CALL and DOT
code = code.replace("CALL,", "CALL,\n  DOT,");

const precedences = `
  [TokenType.LPAREN]: Precedence.CALL,
  [TokenType.LBRACKET]: Precedence.CALL,
  [TokenType.DOT]: Precedence.DOT,
`;
code = code.replace("  [TokenType.LPAREN]: Precedence.CALL,\n  [TokenType.LBRACKET]: Precedence.CALL,", precedences);


// 2. Add statements to parseStatement
const stmtCases = `
      case TokenType.DEF:
        return this.parseFunctionStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      case TokenType.CLASS:
        return this.parseClassStatement();
`;
code = code.replace("switch (this.currentToken.type) {", "switch (this.currentToken.type) {\n" + stmtCases);

// 3. Add methods to parser
const newMethods = `
  private parseFunctionStatement(): FunctionStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'def'
    if (!this.expectPeek(TokenType.IDENTIFIER)) {
      throw new Error(\`Line \${line}: Expected function name\`);
    }
    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };
    if (!this.expectPeek(TokenType.LPAREN)) {
      throw new Error(\`Line \${line}: Expected '(' after function name\`);
    }
    const parameters: IdentifierExpression[] = [];
    if (this.peekToken.type !== TokenType.RPAREN) {
      this.nextToken();
      parameters.push({ type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line });
      while (this.peekToken.type === TokenType.COMMA) {
        this.nextToken();
        this.nextToken();
        parameters.push({ type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line });
      }
    }
    if (!this.expectPeek(TokenType.RPAREN)) {
      throw new Error(\`Line \${line}: Expected ')' after parameters\`);
    }
    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(\`Line \${line}: Expected '{' before function body\`);
    }
    const body = this.parseBlockStatement();
    return { type: 'FunctionStatement', name, parameters, body, line };
  }

  private parseReturnStatement(): ReturnStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'return'
    let returnValue: Expression | undefined;
    if (this.currentToken.type !== TokenType.SEMICOLON) {
      returnValue = this.parseExpression(Precedence.LOWEST);
    }
    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }
    return { type: 'ReturnStatement', returnValue, line };
  }

  private parseClassStatement(): ClassStatement {
    const line = this.currentToken.line;
    this.nextToken(); // consume 'class'
    if (!this.expectPeek(TokenType.IDENTIFIER)) {
      throw new Error(\`Line \${line}: Expected class name\`);
    }
    const name: IdentifierExpression = {
      type: 'IdentifierExpression',
      value: this.currentToken.literal,
      line: this.currentToken.line,
    };
    if (!this.expectPeek(TokenType.LBRACE)) {
      throw new Error(\`Line \${line}: Expected '{' before class body\`);
    }
    this.nextToken();
    const methods: FunctionStatement[] = [];
    while (this.currentToken.type !== TokenType.RBRACE && this.currentToken.type !== TokenType.EOF) {
      if (this.currentToken.type === TokenType.DEF) {
        methods.push(this.parseFunctionStatement());
      } else {
        throw new Error(\`Line \${this.currentToken.line}: Only methods are allowed inside class body\`);
      }
      this.nextToken();
    }
    return { type: 'ClassStatement', name, methods, line };
  }

  private parseObjectExpression(): ObjectExpression {
    const line = this.currentToken.line;
    const properties: { key: string; value: Expression }[] = [];
    if (this.peekToken.type === TokenType.RBRACE) {
      this.nextToken();
      return { type: 'ObjectExpression', properties, line };
    }
    this.nextToken();
    while (this.currentToken.type !== TokenType.RBRACE && this.currentToken.type !== TokenType.EOF) {
      let key = '';
      if (this.currentToken.type === TokenType.IDENTIFIER || this.currentToken.type === TokenType.STRING) {
        key = this.currentToken.literal;
      } else {
        throw new Error(\`Line \${line}: Expected identifier or string for object key\`);
      }
      if (!this.expectPeek(TokenType.COLON)) {
        throw new Error(\`Line \${line}: Expected ':' after object key\`);
      }
      this.nextToken();
      const value = this.parseExpression(Precedence.LOWEST);
      properties.push({ key, value });
      if (this.peekToken.type === TokenType.COMMA) {
        this.nextToken();
        this.nextToken();
      } else if (this.peekToken.type !== TokenType.RBRACE) {
        throw new Error(\`Line \${line}: Expected ',' or '}' after object property\`);
      }
    }
    if (this.currentToken.type !== TokenType.RBRACE) {
      throw new Error(\`Line \${line}: Expected '}' after object properties\`);
    }
    return { type: 'ObjectExpression', properties, line };
  }
`;

code = code.replace("private parsePrintStatement", newMethods + "\n  private parsePrintStatement");

// 4. Update parsePrefix
const prefixCases = `
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
           throw new Error(\`Line \${newLine}: Expected function call after 'new'\`);
        }
        return { type: 'NewExpression', callee: (callee as any).callee, arguments: (callee as any).arguments, line: newLine };
`;
code = code.replace("case TokenType.LPAREN:", prefixCases + "\n      case TokenType.LPAREN:");

// 5. Update parseInfix
const infixCases = `
    if (this.currentToken.type === TokenType.DOT) {
      const line = this.currentToken.line;
      this.nextToken();
      if (this.currentToken.type !== TokenType.IDENTIFIER) {
        throw new Error(\`Line \${line}: Expected property name after '.'\`);
      }
      const property = { type: 'IdentifierExpression', value: this.currentToken.literal, line: this.currentToken.line };
      return { type: 'PropertyAccessExpression', left, property: property as any, line };
    }
`;
code = code.replace("if (this.currentToken.type === TokenType.LBRACKET) {", infixCases + "\n    if (this.currentToken.type === TokenType.LBRACKET) {");

// 6. Fix parseExpression to not stop on . or [ ? It already loops on precedence.
// We added DOT to precedences table, so it should loop.
// Let's check Assignment parsing: "left.prop = value"
const assignmentChange = `
      let nameExp = this.parseExpression(Precedence.LOWEST);
      
      if (this.peekToken.type === TokenType.EQUAL) {
        this.nextToken(); // consume EQUAL
        this.nextToken(); // move to value
        const value = this.parseExpression(Precedence.LOWEST);
        if (this.peekToken.type === TokenType.SEMICOLON) {
          this.nextToken();
        }
        return { type: 'AssignmentStatement', name: nameExp as any, value, line };
      }
`;
// Need to replace the whole Assignment / Expression statement parsing since now assignments can be property access.
// Currently it checks if peekToken is EQUAL for identifier. But wait, `nameExp` can be property access.
// The existing `parseExpressionStatement` handles assignment too:
const oldAssign = `
    if (this.currentToken.type === TokenType.IDENTIFIER && this.peekToken.type === TokenType.EQUAL) {
      return this.parseAssignmentStatement();
    }
    
    // Also index assignment
    // (Wait, I'll just change the whole beginning of parseStatement)
`;
// Let's just fix `parseStatement` to handle assignment more generically.
fs.writeFileSync('src/interpreter/parser.ts', code);

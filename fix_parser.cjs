const fs = require('fs');
let code = fs.readFileSync('src/interpreter/parser.ts', 'utf8');

const imports = `
  FunctionStatement,
  ReturnStatement,
  ClassStatement,
  ObjectExpression,
  NewExpression,
  PropertyAccessExpression,
  ThisExpression,
`;

code = code.replace("CallExpression,", "CallExpression,\n" + imports);

// Fix bug in parseClassStatement
// src/interpreter/parser.ts(344,18): error TS2367: This comparison appears to be unintentional because the types 'TokenType.LET | ...' and 'TokenType.RBRACE' have no overlap.
// Ah, the issue is this.currentToken.type !== TokenType.RBRACE. In the patched parser:
//    if (this.currentToken.type !== TokenType.RBRACE) { ... }
code = code.replace("this.currentToken.type !== TokenType.RBRACE", "(this.currentToken.type as TokenType) !== TokenType.RBRACE");
code = code.replace("this.currentToken.type !== TokenType.RBRACE", "(this.currentToken.type as TokenType) !== TokenType.RBRACE");
code = code.replace("this.currentToken.type !== TokenType.RBRACE", "(this.currentToken.type as TokenType) !== TokenType.RBRACE");
code = code.replace("this.currentToken.type !== TokenType.EOF", "(this.currentToken.type as TokenType) !== TokenType.EOF");
code = code.replace("this.currentToken.type !== TokenType.EOF", "(this.currentToken.type as TokenType) !== TokenType.EOF");
code = code.replace("this.currentToken.type !== TokenType.EOF", "(this.currentToken.type as TokenType) !== TokenType.EOF");
code = code.replace("this.currentToken.type !== TokenType.EOF", "(this.currentToken.type as TokenType) !== TokenType.EOF");


// src/interpreter/parser.ts(550,11): error TS2367: This comparison appears to be unintentional because the types 'TokenType.DOT' and 'TokenType.IDENTIFIER' have no overlap.
code = code.replace("this.currentToken.type !== TokenType.IDENTIFIER", "(this.currentToken.type as TokenType) !== TokenType.IDENTIFIER");
code = code.replace("this.currentToken.type === TokenType.IDENTIFIER", "(this.currentToken.type as TokenType) === TokenType.IDENTIFIER");
code = code.replace("this.currentToken.type === TokenType.STRING", "(this.currentToken.type as TokenType) === TokenType.STRING");
code = code.replace("this.currentToken.type === TokenType.DEF", "(this.currentToken.type as TokenType) === TokenType.DEF");

fs.writeFileSync('src/interpreter/parser.ts', code);

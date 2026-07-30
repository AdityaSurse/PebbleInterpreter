const fs = require('fs');
let code = fs.readFileSync('src/interpreter/parser.ts', 'utf8');

code = code.replaceAll("this.currentToken.type !==", "(this.currentToken.type as TokenType) !==");
code = code.replaceAll("this.currentToken.type ===", "(this.currentToken.type as TokenType) ===");
code = code.replaceAll("this.peekToken.type !==", "(this.peekToken.type as TokenType) !==");
code = code.replaceAll("this.peekToken.type ===", "(this.peekToken.type as TokenType) ===");

fs.writeFileSync('src/interpreter/parser.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/interpreter/parser.ts', 'utf8');

code = code.replace("if (this.currentToken.type !== TokenType.RBRACE) {", "if ((this.currentToken.type as TokenType) !== TokenType.RBRACE) {");

fs.writeFileSync('src/interpreter/parser.ts', code);

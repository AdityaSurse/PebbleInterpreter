const fs = require('fs');
let code = fs.readFileSync('src/interpreter/lexer.ts', 'utf8');

code = code.replace("for: TokenType.FOR,", "for: TokenType.FOR,\n  class: TokenType.CLASS,\n  new: TokenType.NEW,\n  this: TokenType.THIS,\n  def: TokenType.DEF,\n  return: TokenType.RETURN,");

const extraTokens = `
      case '.':
        tok = { type: TokenType.DOT, literal: this.ch, line: this.line };
        break;
      case ':':
        tok = { type: TokenType.COLON, literal: this.ch, line: this.line };
        break;
`;

code = code.replace("case ',':", extraTokens + "      case ',':");

fs.writeFileSync('src/interpreter/lexer.ts', code);

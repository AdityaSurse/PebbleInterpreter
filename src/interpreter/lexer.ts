import { Token, TokenType } from './types';

const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.LET,
  if: TokenType.IF,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  print: TokenType.PRINT,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  input: TokenType.INPUT,
  for: TokenType.FOR,
  class: TokenType.CLASS,
  new: TokenType.NEW,
  this: TokenType.THIS,
  def: TokenType.DEF,
  return: TokenType.RETURN,
};

export class Lexer {
  private input: string;
  private position: number = 0;
  private readPosition: number = 0;
  private ch: string | null = '';
  private line: number = 1;

  constructor(input: string) {
    this.input = input;
    this.readChar();
  }

  private readChar() {
    if (this.readPosition >= this.input.length) {
      this.ch = null;
    } else {
      this.ch = this.input[this.readPosition];
    }
    this.position = this.readPosition;
    this.readPosition++;
  }

  private peekChar(): string | null {
    if (this.readPosition >= this.input.length) {
      return null;
    }
    return this.input[this.readPosition];
  }

  public nextToken(): Token {
    let tok: Token;

    this.skipWhitespaceAndComments();

    if (this.ch === null) {
      return { type: TokenType.EOF, literal: '', line: this.line };
    }

    switch (this.ch) {
      case '=':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.EQUAL_EQUAL, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.EQUAL, literal: this.ch, line: this.line };
        }
        break;
      case '+':
        tok = { type: TokenType.PLUS, literal: this.ch, line: this.line };
        break;
      case '-':
        tok = { type: TokenType.MINUS, literal: this.ch, line: this.line };
        break;
      case '*':
        tok = { type: TokenType.STAR, literal: this.ch, line: this.line };
        break;
      case '/':
        tok = { type: TokenType.SLASH, literal: this.ch, line: this.line };
        break;
      case '%':
        tok = { type: TokenType.MODULO, literal: this.ch, line: this.line };
        break;
      case '!':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.BANG_EQUAL, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.BANG, literal: this.ch, line: this.line };
        }
        break;
      case '<':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.LESS_EQUAL, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.LESS, literal: this.ch, line: this.line };
        }
        break;
      case '>':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.GREATER_EQUAL, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.GREATER, literal: this.ch, line: this.line };
        }
        break;
      case '&':
        if (this.peekChar() === '&') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.AND, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.ILLEGAL, literal: this.ch, line: this.line };
        }
        break;
      case '|':
        if (this.peekChar() === '|') {
          const ch = this.ch;
          this.readChar();
          tok = { type: TokenType.OR, literal: ch + this.ch, line: this.line };
        } else {
          tok = { type: TokenType.ILLEGAL, literal: this.ch, line: this.line };
        }
        break;
      case ';':
        tok = { type: TokenType.SEMICOLON, literal: this.ch, line: this.line };
        break;
      case '(':
        tok = { type: TokenType.LPAREN, literal: this.ch, line: this.line };
        break;
      case ')':
        tok = { type: TokenType.RPAREN, literal: this.ch, line: this.line };
        break;
      case '{':
        tok = { type: TokenType.LBRACE, literal: this.ch, line: this.line };
        break;
      case '}':
        tok = { type: TokenType.RBRACE, literal: this.ch, line: this.line };
        break;
      case '[':
        tok = { type: TokenType.LBRACKET, literal: this.ch, line: this.line };
        break;
      case ']':
        tok = { type: TokenType.RBRACKET, literal: this.ch, line: this.line };
        break;
      
      case '.':
        tok = { type: TokenType.DOT, literal: this.ch, line: this.line };
        break;
      case ':':
        tok = { type: TokenType.COLON, literal: this.ch, line: this.line };
        break;
      case ',':
        tok = { type: TokenType.COMMA, literal: this.ch, line: this.line };
        break;
      case '"':
      case "'":
        const str = this.readString(this.ch);
        tok = { type: TokenType.STRING, literal: str, line: this.line };
        break;
      default:
        if (this.isLetter(this.ch)) {
          const literal = this.readIdentifier();
          const type = KEYWORDS[literal] || TokenType.IDENTIFIER;
          return { type, literal, line: this.line };
        } else if (this.isDigit(this.ch)) {
          const literal = this.readNumber();
          return { type: TokenType.NUMBER, literal, line: this.line };
        } else {
          tok = { type: TokenType.ILLEGAL, literal: this.ch, line: this.line };
        }
    }

    this.readChar();
    return tok;
  }

  private readIdentifier(): string {
    const position = this.position;
    while (this.ch !== null && this.isLetterOrDigit(this.ch)) {
      this.readChar();
    }
    return this.input.substring(position, this.position);
  }

  private readNumber(): string {
    const position = this.position;
    let hasDot = false;
    while (this.ch !== null && (this.isDigit(this.ch) || (this.ch === '.' && !hasDot))) {
      if (this.ch === '.') hasDot = true;
      this.readChar();
    }
    return this.input.substring(position, this.position);
  }

  private readString(quote: string): string {
    const position = this.position + 1;
    while (true) {
      this.readChar();
      if (this.ch === quote || this.ch === null) {
        break;
      }
    }
    return this.input.substring(position, this.position);
  }

  private isLetter(ch: string): boolean {
    return ('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z') || ch === '_';
  }

  private isDigit(ch: string): boolean {
    return '0' <= ch && ch <= '9';
  }

  private isLetterOrDigit(ch: string): boolean {
    return this.isLetter(ch) || this.isDigit(ch);
  }

  private skipWhitespaceAndComments() {
    while (this.ch !== null) {
      if (this.ch === ' ' || this.ch === '\t' || this.ch === '\r') {
        this.readChar();
      } else if (this.ch === '\n') {
        this.line++;
        this.readChar();
      } else if (this.ch === '/' && this.peekChar() === '/') {
        // Skip comment
        while (this.ch !== null && (this.ch as string | null) !== '\n') {
          this.readChar();
        }
      } else {
        break;
      }
    }
  }
}

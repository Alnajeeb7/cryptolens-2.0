import { Token, TokenType } from '@/types/cryptoscript';

export class CryptoScriptLexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Comments
      if (char === '/' && this.input[this.pos + 1] === '/') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Newlines
      if (char === '\n') {
        tokens.push({ type: 'NEWLINE', value: '\n', line: this.line, column: this.col });
        this.advance();
        this.line++;
        this.col = 1;
        continue;
      }

      // Whitespace
      if (/\s/.test(char)) {
        this.advance();
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Operators and punctuation
      if (char === '=' && this.input[this.pos + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '==', line: this.line, column: this.col });
        this.advance();
        this.advance();
        continue;
      }
      if (char === '!' && this.input[this.pos + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '!=', line: this.line, column: this.col });
        this.advance();
        this.advance();
        continue;
      }
      if (char === '>' && this.input[this.pos + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '>=', line: this.line, column: this.col });
        this.advance();
        this.advance();
        continue;
      }
      if (char === '<' && this.input[this.pos + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '<=', line: this.line, column: this.col });
        this.advance();
        this.advance();
        continue;
      }

      if ('+-*/%><=!'.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char, line: this.line, column: this.col });
        this.advance();
        continue;
      }

      if ('(),[].{}'.includes(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char, line: this.line, column: this.col });
        this.advance();
        continue;
      }

      // Unknown character, skip
      this.advance();
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, column: this.col });
    return tokens;
  }

  private advance() {
    this.pos++;
    this.col++;
  }

  private readNumber(): Token {
    const startCol = this.col;
    let numStr = '';
    while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
      numStr += this.input[this.pos];
      this.advance();
    }
    return { type: 'NUMBER', value: numStr, line: this.line, column: startCol };
  }

  private readString(quote: string): Token {
    const startCol = this.col;
    this.advance(); // skip opening quote
    let str = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      str += this.input[this.pos];
      this.advance();
    }
    if (this.pos < this.input.length) this.advance(); // skip closing quote
    return { type: 'STRING', value: str, line: this.line, column: startCol };
  }

  private readIdentifier(): Token {
    const startCol = this.col;
    let ident = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      ident += this.input[this.pos];
      this.advance();
    }

    const keywords = ['if', 'else', 'function', 'return', 'and', 'or', 'not', 'true', 'false', 'strategy'];
    const type: TokenType = keywords.includes(ident.toLowerCase()) ? 'KEYWORD' : 'IDENTIFIER';
    return { type, value: ident, line: this.line, column: startCol };
  }
}

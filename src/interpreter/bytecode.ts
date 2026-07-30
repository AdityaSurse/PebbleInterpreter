export enum OpCode {
  CONST,
  LOAD_VAR,
  STORE_VAR,
  ADD,
  SUB,
  MUL,
  DIV,
  MOD,
  EQUAL,
  GREATER,
  LESS,
  NOT,
  NEGATE,
  AND,
  OR,
  JUMP,
  JUMP_IF_FALSE,
  LOOP,
  CALL,
  RETURN,
  POP,
  PRINT,
  MAKE_ARRAY,
  MAKE_OBJECT,
  GET_INDEX,
  SET_INDEX,
  GET_PROP,
  SET_PROP,
  LOAD_GLOBAL,
  STORE_GLOBAL,
}

export type Value = number | string | boolean | any[] | Record<string, any> | NativeFunction | PebbleFunction | null;

export type NativeFunction = (...args: any[]) => any;

export class PebbleFunction {
  public chunk: Chunk;
  public name: string;
  public arity: number;

  constructor(name: string, arity: number) {
    this.name = name;
    this.arity = arity;
    this.chunk = new Chunk();
  }
}

export class Chunk {
  public code: number[] = [];
  public constants: Value[] = [];
  public lines: number[] = [];

  // Adds an instruction to the chunk
  public write(byte: number, line: number) {
    this.code.push(byte);
    this.lines.push(line);
  }

  // Adds a constant to the chunk and returns its index
  public addConstant(value: Value): number {
    this.constants.push(value);
    return this.constants.length - 1;
  }

  public disassemble(name: string): string[] {
    const lines: string[] = [];
    lines.push(`== ${name} ==`);
    let offset = 0;
    while (offset < this.code.length) {
      const { str, nextOffset } = this.disassembleInstruction(offset);
      lines.push(str);
      offset = nextOffset;
    }
    return lines;
  }

  private disassembleInstruction(offset: number): { str: string; nextOffset: number } {
    const instruction = this.code[offset];
    let str = offset.toString().padStart(4, '0') + '  ';
    
    // Check line
    if (offset > 0 && this.lines[offset] === this.lines[offset - 1]) {
      str += '   | ';
    } else {
      str += this.lines[offset].toString().padStart(4, ' ') + ' ';
    }
    
    switch (instruction) {
      case OpCode.CONST:
      case OpCode.LOAD_GLOBAL:
      case OpCode.STORE_GLOBAL: {
        const constant = this.code[offset + 1];
        str += `${OpCode[instruction].padEnd(16)} ${constant.toString().padStart(4, ' ')} '${this.constants[constant]}'`;
        return { str, nextOffset: offset + 2 };
      }
      case OpCode.LOAD_VAR:
      case OpCode.STORE_VAR:
      case OpCode.MAKE_ARRAY:
      case OpCode.CALL: {
        const slot = this.code[offset + 1];
        str += `${OpCode[instruction].padEnd(16)} ${slot.toString().padStart(4, ' ')}`;
        return { str, nextOffset: offset + 2 };
      }
      case OpCode.JUMP:
      case OpCode.JUMP_IF_FALSE: {
        const jump = this.code[offset + 1];
        str += `${OpCode[instruction].padEnd(16)} ${offset.toString().padStart(4, ' ')} -> ${offset + 2 + jump}`;
        return { str, nextOffset: offset + 2 };
      }
      case OpCode.LOOP: {
        const jump = this.code[offset + 1];
        str += `${OpCode[instruction].padEnd(16)} ${offset.toString().padStart(4, ' ')} -> ${offset + 2 - jump}`;
        return { str, nextOffset: offset + 2 };
      }
      default:
        str += OpCode[instruction];
        return { str, nextOffset: offset + 1 };
    }
  }
}

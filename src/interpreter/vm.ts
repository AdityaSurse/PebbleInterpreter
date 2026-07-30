import { OpCode, Chunk, PebbleFunction, Value, NativeFunction } from './bytecode';
import { TraceStep } from './interpreter'; // just for reusing the trace interface if we want, or define our own

export class RuntimeError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

class CallFrame {
  public function: PebbleFunction;
  public ip: number = 0;
  public slots: number;

  constructor(func: PebbleFunction, slots: number) {
    this.function = func;
    this.slots = slots;
  }

  public readByte(): number {
    return this.function.chunk.code[this.ip++];
  }

  public readConstant(): Value {
    return this.function.chunk.constants[this.readByte()];
  }
}

export class VM {
  private stack: Value[] = [];
  private frames: CallFrame[] = [];
  public globals: Map<string, Value> = new Map();
  private output: string[] = [];
  
  constructor() {
    this.globals.set('len', (args: any[]) => args[0].length);
    this.globals.set('push', (args: any[]) => { args[0].push(args[1]); return null; });
    this.globals.set('pop', (args: any[]) => args[0].pop());
    this.globals.set('abs', (args: any[]) => Math.abs(args[0]));
    this.globals.set('round', (args: any[]) => Math.round(args[0]));
    this.globals.set('floor', (args: any[]) => Math.floor(args[0]));
    this.globals.set('ceil', (args: any[]) => Math.ceil(args[0]));
    this.globals.set('random', () => Math.random());
    this.globals.set('sqrt', (args: any[]) => Math.sqrt(args[0]));
    this.globals.set('min', (args: any[]) => Math.min(...args));
    this.globals.set('max', (args: any[]) => Math.max(...args));
    
    // For input emulation (we can pass a custom input function if needed)
    this.globals.set('input', (args: any[]) => {
      const promptText = args.length > 0 ? args[0] : "";
      return prompt(promptText) || "";
    });
  }

  public getOutput(): string[] {
    return this.output;
  }
  
  public setInputHandler(handler: (promptText?: string) => string) {
     this.globals.set('input', (args: any[]) => {
       const promptText = args.length > 0 ? args[0] : "";
       return handler(promptText);
     });
  }

  public run(mainFunction: PebbleFunction) {
    this.stack = [];
    this.frames = [];
    
    // Set up main frame
    this.stack.push(mainFunction);
    this.frames.push(new CallFrame(mainFunction, 0));

    let frame = this.frames[this.frames.length - 1];

    while (true) {
      const instruction = frame.readByte();
      // Use the previous IP to get the exact line number for errors
      const line = frame.function.chunk.lines[frame.ip - 1];

      switch (instruction) {
        case OpCode.CONST: {
          const constant = frame.readConstant();
          this.stack.push(constant);
          break;
        }
        case OpCode.LOAD_VAR: {
          const slot = frame.readByte();
          this.stack.push(this.stack[frame.slots + slot]);
          break;
        }
        case OpCode.STORE_VAR: {
          const slot = frame.readByte();
          this.stack[frame.slots + slot] = this.peek(0);
          break;
        }
        case OpCode.LOAD_GLOBAL: {
          const name = frame.readConstant() as string;
          if (!this.globals.has(name)) {
            throw new RuntimeError(`Undefined global variable '${name}'`, line);
          }
          this.stack.push(this.globals.get(name)!);
          break;
        }
        case OpCode.STORE_GLOBAL: {
          const name = frame.readConstant() as string;
          this.globals.set(name, this.peek(0));
          break;
        }
        case OpCode.ADD: {
          const b = this.pop();
          const a = this.pop();
          if (typeof a === 'string' || typeof b === 'string') {
             this.stack.push(String(a) + String(b));
          } else {
             this.stack.push((a as number) + (b as number));
          }
          break;
        }
        case OpCode.SUB: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          this.stack.push(a - b);
          break;
        }
        case OpCode.MUL: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          this.stack.push(a * b);
          break;
        }
        case OpCode.DIV: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          if (b === 0) throw new RuntimeError("Division by zero", line);
          this.stack.push(a / b);
          break;
        }
        case OpCode.MOD: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          this.stack.push(a % b);
          break;
        }
        case OpCode.NEGATE: {
          const a = this.pop() as number;
          this.stack.push(-a);
          break;
        }
        case OpCode.NOT: {
          const a = this.pop();
          this.stack.push(!this.isTruthy(a));
          break;
        }
        case OpCode.EQUAL: {
          const b = this.pop();
          const a = this.pop();
          this.stack.push(a === b);
          break;
        }
        case OpCode.GREATER: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          this.stack.push(a > b);
          break;
        }
        case OpCode.LESS: {
          const b = this.pop() as number;
          const a = this.pop() as number;
          this.stack.push(a < b);
          break;
        }
        case OpCode.JUMP: {
          const offset = frame.readByte();
          frame.ip += offset;
          break;
        }
        case OpCode.JUMP_IF_FALSE: {
          const offset = frame.readByte();
          if (!this.isTruthy(this.peek(0))) {
            frame.ip += offset;
          }
          break;
        }
        case OpCode.LOOP: {
          const offset = frame.readByte();
          frame.ip -= offset;
          break;
        }
        case OpCode.POP: {
          this.pop();
          break;
        }
        case OpCode.PRINT: {
          const val = this.pop();
          this.output.push(this.formatVal(val));
          break;
        }
        case OpCode.MAKE_ARRAY: {
          const elementCount = frame.readByte();
          const arr: Value[] = [];
          for (let i = 0; i < elementCount; i++) {
             // Because we pushed them left to right, they are on stack.
             // Wait, if we push 1, 2, 3, pop gives 3, 2, 1. So we unshift or insert at right indices.
             arr.unshift(this.pop());
          }
          this.stack.push(arr);
          break;
        }
        case OpCode.GET_INDEX: {
          const index = this.pop() as number;
          const arr = this.pop() as any[];
          this.stack.push(arr[index]);
          break;
        }
        case OpCode.SET_INDEX: {
          const value = this.pop();
          const index = this.pop() as number;
          const arr = this.pop() as any[];
          arr[index] = value;
          break;
        }
        case OpCode.CALL: {
          const argCount = frame.readByte();
          const callee = this.peek(argCount);
          
          if (callee instanceof PebbleFunction) {
            if (argCount !== callee.arity) {
              throw new RuntimeError(`Expected ${callee.arity} arguments but got ${argCount}`, line);
            }
            this.frames.push(new CallFrame(callee, this.stack.length - argCount - 1));
            frame = this.frames[this.frames.length - 1];
          } else if (typeof callee === 'function') {
            const args = [];
            for (let i = 0; i < argCount; i++) {
              args.unshift(this.pop());
            }
            this.pop(); // pop callee
            
            try {
              const result = (callee as NativeFunction)(args);
              this.stack.push(result !== undefined ? result : null);
            } catch (e: any) {
              throw new RuntimeError(`Native function error: ${e.message}`, line);
            }
          } else {
            throw new RuntimeError("Can only call functions.", line);
          }
          break;
        }
        case OpCode.RETURN: {
          const result = this.pop();
          this.frames.pop();
          if (this.frames.length === 0) {
            return;
          }
          
          // pop the function and all arguments
          // the frame.slots points to the callee function itself
          this.stack.length = frame.slots;
          
          this.stack.push(result);
          frame = this.frames[this.frames.length - 1];
          break;
        }
        default:
          throw new RuntimeError(`Unknown opcode: ${instruction}`, line);
      }
    }
  }

  private peek(distance: number): Value {
    return this.stack[this.stack.length - 1 - distance];
  }

  private pop(): Value {
    if (this.stack.length === 0) {
        throw new Error("Stack underflow");
    }
    return this.stack.pop() as Value;
  }

  private isTruthy(val: Value): boolean {
    if (val === null || val === false) return false;
    return true;
  }
  
  private formatVal(val: any): string {
    if (Array.isArray(val)) {
       return `[${val.map(v => typeof v === 'string' ? '"' + v + '"' : v).join(', ')}]`;
    }
    return String(val);
  }
}

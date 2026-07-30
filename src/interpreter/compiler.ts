import {
  ASTNode,
  Program,
  Statement,
  Expression,
  BlockStatement,
  LetStatement,
  AssignmentStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  PrintStatement,
  ExpressionStatement,
  BinaryExpression,
  UnaryExpression,
  LiteralExpression,
  IdentifierExpression,
  ArrayExpression,
  IndexExpression,
  CallExpression,
  InputExpression
} from './types';
import { OpCode, Chunk, PebbleFunction, Value } from './bytecode';

interface Local {
  name: string;
  depth: number;
}

export class Compiler {
  private function: PebbleFunction;
  private locals: Local[] = [];
  private scopeDepth: number = 0;

  constructor() {
    this.function = new PebbleFunction("main", 0);
    // reserve slot 0 for internal use (or the function itself)
    this.locals.push({ name: "", depth: 0 });
  }

  public compile(program: Program): PebbleFunction {
    for (const stmt of program.statements) {
      this.compileStatement(stmt);
    }
    const lastStmt = program.statements.length > 0 ? program.statements[program.statements.length - 1] : null;
    const lastLine = lastStmt && 'line' in lastStmt ? (lastStmt as any).line : 1;
    this.emitReturn(lastLine);
    return this.function;
  }

  private currentChunk(): Chunk {
    return this.function.chunk;
  }

  private emitByte(byte: number, line: number) {
    this.currentChunk().write(byte, line);
  }

  private emitBytes(byte1: number, byte2: number, line: number) {
    this.emitByte(byte1, line);
    this.emitByte(byte2, line);
  }

  private emitReturn(line: number) {
    this.emitByte(OpCode.RETURN, line);
  }

  private emitConstant(value: Value, line: number) {
    const idx = this.currentChunk().addConstant(value);
    this.emitBytes(OpCode.CONST, idx, line);
  }

  private emitJump(instruction: OpCode, line: number): number {
    this.emitByte(instruction, line);
    this.emitByte(0xff, line); // Placeholder operand
    return this.currentChunk().code.length - 1;
  }

  private patchJump(offset: number) {
    const jump = this.currentChunk().code.length - offset - 1;
    this.currentChunk().code[offset] = jump;
  }

  private emitLoop(loopStart: number, line: number) {
    this.emitByte(OpCode.LOOP, line);
    const offset = this.currentChunk().code.length - loopStart + 1;
    this.emitByte(offset, line);
  }

  private beginScope() {
    this.scopeDepth++;
  }

  private endScope(line: number) {
    this.scopeDepth--;
    while (this.locals.length > 0 && this.locals[this.locals.length - 1].depth > this.scopeDepth) {
      this.emitByte(OpCode.POP, line);
      this.locals.pop();
    }
  }

  private compileStatement(stmt: Statement) {
    switch (stmt.type) {
      case 'BlockStatement':
        this.beginScope();
        for (const s of stmt.statements) {
          this.compileStatement(s);
        }
        this.endScope(0); // line number might be imperfect for POPs here
        break;
      case 'LetStatement':
        this.compileLetStatement(stmt);
        break;
      case 'AssignmentStatement':
        this.compileAssignmentStatement(stmt);
        break;
      case 'ExpressionStatement':
        this.compileExpression(stmt.expression);
        this.emitByte(OpCode.POP, stmt.line);
        break;
      case 'IfStatement':
        this.compileIfStatement(stmt);
        break;
      case 'WhileStatement':
        this.compileWhileStatement(stmt);
        break;
      case 'ForStatement':
        this.compileForStatement(stmt);
        break;
      case 'PrintStatement':
        this.compileExpression(stmt.expression);
        this.emitByte(OpCode.PRINT, stmt.line);
        break;
      case 'Program':
        break;
    }
  }

  private compileLetStatement(stmt: LetStatement) {
    this.compileExpression(stmt.value);
    
    if (this.scopeDepth > 0) {
      this.locals.push({ name: stmt.name.value, depth: this.scopeDepth });
    } else {
      const globalNameIdx = this.currentChunk().addConstant(stmt.name.value);
      this.emitBytes(OpCode.STORE_GLOBAL, globalNameIdx, stmt.line);
      // Remove the value from the stack after storing it to global
      this.emitByte(OpCode.POP, stmt.line);
    }
  }

  private compileAssignmentStatement(stmt: AssignmentStatement) {
    if (stmt.name.type === 'IdentifierExpression') {
      this.compileExpression(stmt.value);
      const arg = this.resolveLocal(stmt.name.value);
      if (arg !== -1) {
        this.emitBytes(OpCode.STORE_VAR, arg, stmt.line);
      } else {
        const globalNameIdx = this.currentChunk().addConstant(stmt.name.value);
        this.emitBytes(OpCode.STORE_GLOBAL, globalNameIdx, stmt.line);
      }
      // POP because assignment is a statement in Pebble, not an expression that leaves a value
      this.emitByte(OpCode.POP, stmt.line);
    } else if (stmt.name.type === 'IndexExpression') {
      this.compileExpression(stmt.name.left);
      this.compileExpression(stmt.name.index);
      this.compileExpression(stmt.value);
      this.emitByte(OpCode.SET_INDEX, stmt.line);
    }
  }

  private compileIfStatement(stmt: IfStatement) {
    this.compileExpression(stmt.condition);
    const thenJump = this.emitJump(OpCode.JUMP_IF_FALSE, stmt.line);
    this.emitByte(OpCode.POP, stmt.line); // pop condition
    
    this.compileStatement(stmt.consequence);
    
    const elseJump = this.emitJump(OpCode.JUMP, stmt.line);
    
    this.patchJump(thenJump);
    this.emitByte(OpCode.POP, stmt.line); // pop condition if jumped over consequence
    
    if (stmt.alternative) {
      this.compileStatement(stmt.alternative);
    }
    
    this.patchJump(elseJump);
  }

  private compileWhileStatement(stmt: WhileStatement) {
    const loopStart = this.currentChunk().code.length;
    this.compileExpression(stmt.condition);
    
    const exitJump = this.emitJump(OpCode.JUMP_IF_FALSE, stmt.line);
    this.emitByte(OpCode.POP, stmt.line); // pop condition
    
    this.compileStatement(stmt.body);
    
    this.emitLoop(loopStart, stmt.line);
    
    this.patchJump(exitJump);
    this.emitByte(OpCode.POP, stmt.line); // pop condition on exit
  }

  private compileForStatement(stmt: ForStatement) {
    this.beginScope(); // Enclose the init in a scope
    
    if (stmt.init) {
      this.compileStatement(stmt.init);
    }
    
    const loopStart = this.currentChunk().code.length;
    
    let exitJump = -1;
    if (stmt.condition) {
      this.compileExpression(stmt.condition);
      exitJump = this.emitJump(OpCode.JUMP_IF_FALSE, stmt.line);
      this.emitByte(OpCode.POP, stmt.line); // pop condition
    }
    
    this.compileStatement(stmt.body);
    
    if (stmt.update) {
      this.compileStatement(stmt.update);
    }
    
    this.emitLoop(loopStart, stmt.line);
    
    if (exitJump !== -1) {
      this.patchJump(exitJump);
      this.emitByte(OpCode.POP, stmt.line); // pop condition on exit
    }
    
    this.endScope(stmt.line);
  }

  private compileExpression(expr: Expression) {
    switch (expr.type) {
      case 'LiteralExpression':
        this.emitConstant(expr.value, expr.line);
        break;
      case 'IdentifierExpression':
        const arg = this.resolveLocal(expr.value);
        if (arg !== -1) {
          this.emitBytes(OpCode.LOAD_VAR, arg, expr.line);
        } else {
          const globalNameIdx = this.currentChunk().addConstant(expr.value);
          this.emitBytes(OpCode.LOAD_GLOBAL, globalNameIdx, expr.line);
        }
        break;
      case 'BinaryExpression':
        this.compileExpression(expr.left);
        // AND / OR short-circuiting
        if (expr.operator === '&&') {
           const endJump = this.emitJump(OpCode.JUMP_IF_FALSE, expr.line);
           this.emitByte(OpCode.POP, expr.line);
           this.compileExpression(expr.right);
           this.patchJump(endJump);
           break;
        } else if (expr.operator === '||') {
           // Not entirely correct for standard OR without a JUMP_IF_TRUE, but we can do:
           // if left is true, jump over the right evaluation
           const elseJump = this.emitJump(OpCode.JUMP_IF_FALSE, expr.line);
           const endJump = this.emitJump(OpCode.JUMP, expr.line);
           this.patchJump(elseJump);
           this.emitByte(OpCode.POP, expr.line); // pop the false left
           this.compileExpression(expr.right);
           this.patchJump(endJump);
           break;
        }
        
        this.compileExpression(expr.right);
        switch (expr.operator) {
          case '+': this.emitByte(OpCode.ADD, expr.line); break;
          case '-': this.emitByte(OpCode.SUB, expr.line); break;
          case '*': this.emitByte(OpCode.MUL, expr.line); break;
          case '/': this.emitByte(OpCode.DIV, expr.line); break;
          case '%': this.emitByte(OpCode.MOD, expr.line); break;
          case '==': this.emitByte(OpCode.EQUAL, expr.line); break;
          case '!=': 
            this.emitByte(OpCode.EQUAL, expr.line); 
            this.emitByte(OpCode.NOT, expr.line); 
            break;
          case '>': this.emitByte(OpCode.GREATER, expr.line); break;
          case '<': this.emitByte(OpCode.LESS, expr.line); break;
          case '>=': 
            this.emitByte(OpCode.LESS, expr.line); 
            this.emitByte(OpCode.NOT, expr.line); 
            break;
          case '<=': 
            this.emitByte(OpCode.GREATER, expr.line); 
            this.emitByte(OpCode.NOT, expr.line); 
            break;
        }
        break;
      case 'UnaryExpression':
        this.compileExpression(expr.right);
        if (expr.operator === '-') {
           this.emitByte(OpCode.NEGATE, expr.line);
        } else if (expr.operator === '!') {
           this.emitByte(OpCode.NOT, expr.line);
        }
        break;
      case 'ArrayExpression':
        for (const el of expr.elements) {
          this.compileExpression(el);
        }
        this.emitBytes(OpCode.MAKE_ARRAY, expr.elements.length, expr.line);
        break;
      case 'IndexExpression':
        this.compileExpression(expr.left);
        this.compileExpression(expr.index);
        this.emitByte(OpCode.GET_INDEX, expr.line);
        break;
      case 'CallExpression':
        this.compileExpression(expr.callee);
        for (const arg of expr.arguments) {
          this.compileExpression(arg);
        }
        this.emitBytes(OpCode.CALL, expr.arguments.length, expr.line);
        break;
      case 'InputExpression':
        if (expr.prompt) {
          this.compileExpression(expr.prompt);
          this.emitBytes(OpCode.CALL, 1, expr.line); // Assuming input is just a function call technically?
          // Actually no, we need to handle input. 
          // Let's treat input as a global function called 'input'.
          const globalNameIdx = this.currentChunk().addConstant("input");
          this.emitBytes(OpCode.LOAD_GLOBAL, globalNameIdx, expr.line);
          this.compileExpression(expr.prompt);
          this.emitBytes(OpCode.CALL, 1, expr.line);
        } else {
          const globalNameIdx = this.currentChunk().addConstant("input");
          this.emitBytes(OpCode.LOAD_GLOBAL, globalNameIdx, expr.line);
          this.emitBytes(OpCode.CALL, 0, expr.line);
        }
        break;
    }
  }

  private resolveLocal(name: string): number {
    for (let i = this.locals.length - 1; i >= 0; i--) {
      if (this.locals[i].name === name) {
        return i;
      }
    }
    return -1;
  }
}

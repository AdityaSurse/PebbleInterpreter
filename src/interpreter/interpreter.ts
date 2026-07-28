import { ASTNode, Expression, Statement, BlockStatement, Program } from './types';

export interface TraceStep {
  step: number;
  line: number;
  statement: string;
  state: Record<string, any>;
}

export class Environment {
  private store: Map<string, any>;
  private outer: Environment | null;

  constructor(outer: Environment | null = null) {
    this.store = new Map();
    this.outer = outer;
  }

  get(name: string): any {
    if (this.store.has(name)) {
      return this.store.get(name);
    }
    if (this.outer !== null) {
      return this.outer.get(name);
    }
    throw new Error(`Undefined variable '${name}'`);
  }

  set(name: string, value: any) {
    this.store.set(name, value);
  }

  assign(name: string, value: any) {
    if (this.store.has(name)) {
      this.store.set(name, value);
      return;
    }
    if (this.outer !== null) {
      this.outer.assign(name, value);
      return;
    }
    throw new Error(`Undefined variable '${name}'`);
  }

  getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = this.outer ? this.outer.getSnapshot() : {};
    for (const [k, v] of this.store.entries()) {
      snapshot[k] = v;
    }
    return snapshot;
  }
}

export class Interpreter {
  private env: Environment;
  private trace: TraceStep[] = [];
  private output: string[] = [];
  private stepCount = 0;
  private MAX_STEPS = 100000;

  constructor() {
    this.env = new Environment();
  }

  public getTrace() {
    return this.trace;
  }

  public getOutput() {
    return this.output;
  }

  private addTrace(line: number, stmtStr: string) {
    this.stepCount++;
    if (this.stepCount > this.MAX_STEPS) {
      throw new Error(`Execution limit exceeded - possible infinite loop (max ${this.MAX_STEPS} steps).`);
    }
    this.trace.push({
      step: this.stepCount,
      line,
      statement: stmtStr,
      state: this.env.getSnapshot()
    });
  }

  public evaluate(node: ASTNode, env: Environment = this.env): any {
    switch (node.type) {
      case 'Program':
        return this.evalProgram(node, env);
      case 'BlockStatement':
        return this.evalBlockStatement(node, env);
      case 'LetStatement':
        const letVal = this.evaluate(node.value, env);
        env.set(node.name.value, letVal);
        this.addTrace(node.line, `let ${node.name.value} = ${letVal}`);
        return null;
      case 'AssignmentStatement':
        const assignVal = this.evaluate(node.value, env);
        env.assign(node.name.value, assignVal);
        this.addTrace(node.line, `${node.name.value} = ${assignVal}`);
        return null;
      case 'ExpressionStatement':
        const expVal = this.evaluate(node.expression, env);
        // Avoid tracing simple expressions unless they have side effects, but for this toy language we might trace them.
        // Actually, let's just trace everything or maybe skip raw expressions? Let's trace it.
        this.addTrace(node.line, `<Expression>`);
        return expVal;
      case 'IfStatement':
        const condition = this.evaluate(node.condition, env);
        this.addTrace(node.line, `if (${condition})`);
        if (condition) {
          return this.evaluate(node.consequence, env);
        } else if (node.alternative) {
          return this.evaluate(node.alternative, env);
        }
        return null;
      case 'WhileStatement':
        while (this.evaluate(node.condition, env)) {
          this.addTrace(node.line, `while (${this.evaluate(node.condition, env)})`);
          this.evaluate(node.body, env);
        }
        this.addTrace(node.line, `while (false)`);
        return null;
      case 'PrintStatement':
        const printVal = this.evaluate(node.expression, env);
        this.output.push(String(printVal));
        this.addTrace(node.line, `print(${printVal})`);
        return null;
      case 'BinaryExpression':
        const left = this.evaluate(node.left, env);
        const right = this.evaluate(node.right, env);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': 
            if (right === 0) throw new Error(`Line ${node.line}: Division by zero`);
            return left / right;
          case '%': return left % right;
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return left < right;
          case '>': return left > right;
          case '<=': return left <= right;
          case '>=': return left >= right;
          case '&&': return left && right;
          case '||': return left || right;
          default: throw new Error(`Line ${node.line}: Unknown operator ${node.operator}`);
        }
      case 'UnaryExpression':
        const rightVal = this.evaluate(node.right, env);
        if (node.operator === '-') return -rightVal;
        if (node.operator === '!') return !rightVal;
        throw new Error(`Line ${node.line}: Unknown operator ${node.operator}`);
      case 'LiteralExpression':
        return node.value;
      case 'IdentifierExpression':
        try {
           return env.get(node.value);
        } catch (e: any) {
           throw new Error(`Line ${node.line}: ${e.message}`);
        }
      case 'InputExpression':
        let promptStr = '';
        if (node.prompt) {
          promptStr = String(this.evaluate(node.prompt, env));
        }
        const userInput = window.prompt(promptStr);
        // Handle null if user cancels
        const inputVal = userInput !== null ? userInput : '';
        this.addTrace(node.line, `input() -> "${inputVal}"`);
        return inputVal;
      default:
        return null;
    }
  }

  private evalProgram(program: Program, env: Environment) {
    let result: any;
    for (const statement of program.statements) {
      result = this.evaluate(statement, env);
    }
    return result;
  }

  private evalBlockStatement(block: BlockStatement, env: Environment) {
    const blockEnv = new Environment(env);
    let result: any;
    for (const statement of block.statements) {
      result = this.evaluate(statement, blockEnv);
    }
    return result;
  }
}

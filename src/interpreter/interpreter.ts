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
    this.env.set('len', (args: any[]) => args[0].length);
    this.env.set('push', (args: any[]) => { args[0].push(args[1]); return null; });
    this.env.set('pop', (args: any[]) => args[0].pop());
    this.env.set('abs', (args: any[]) => Math.abs(args[0]));
    this.env.set('round', (args: any[]) => Math.round(args[0]));
    this.env.set('floor', (args: any[]) => Math.floor(args[0]));
    this.env.set('ceil', (args: any[]) => Math.ceil(args[0]));
    this.env.set('random', () => Math.random());
    this.env.set('sqrt', (args: any[]) => Math.sqrt(args[0]));
    this.env.set('min', (args: any[]) => Math.min(...args));
    this.env.set('max', (args: any[]) => Math.max(...args));
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
        if (node.name.type === 'IdentifierExpression') {
          env.assign(node.name.value, assignVal);
          this.addTrace(node.line, `${node.name.value} = ${typeof assignVal === 'string' ? '"' + assignVal + '"' : assignVal}`);
        } else if (node.name.type === 'IndexExpression') {
          const arr = this.evaluate(node.name.left, env);
          const index = this.evaluate(node.name.index, env);
          arr[index] = assignVal;
          this.addTrace(node.line, `array[${index}] = ${typeof assignVal === 'string' ? '"' + assignVal + '"' : assignVal}`);
        }
        return null;
      case 'ForStatement':
        const forEnv = new Environment(env);
        if (node.init) {
          this.evaluate(node.init, forEnv);
        }
        while (!node.condition || this.evaluate(node.condition, forEnv)) {
          this.addTrace(node.line, `for (loop iteration)`);
          this.evaluate(node.body, forEnv);
          if (node.update) {
            this.evaluate(node.update, forEnv);
          }
        }
        this.addTrace(node.line, `for (loop end)`);
        return null;
      case 'ArrayExpression':
        return node.elements.map(el => this.evaluate(el, env));
      case 'IndexExpression':
        const arrLeft = this.evaluate(node.left, env);
        const idx = this.evaluate(node.index, env);
        return arrLeft[idx];
      case 'CallExpression':
        const callee = this.evaluate(node.callee, env);
        const args = node.arguments.map(arg => this.evaluate(arg, env));
        if (typeof callee === 'function') {
           const result = callee(args);
           this.addTrace(node.line, `call(...) -> ${result}`);
           return result;
        }
        throw new Error(`Line ${node.line}: Not a function`);
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
        const formatVal = (val: any) => Array.isArray(val) ? `[${val.map(v => typeof v === 'string' ? '"' + v + '"' : v).join(', ')}]` : String(val);
        this.output.push(formatVal(printVal));
        this.addTrace(node.line, `print(${formatVal(printVal)})`);
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

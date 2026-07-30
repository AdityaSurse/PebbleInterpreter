const fs = require('fs');
let code = fs.readFileSync('src/interpreter/types.ts', 'utf8');

code = code.replace("FOR = 'FOR',", "FOR = 'FOR',\n  CLASS = 'CLASS',\n  NEW = 'NEW',\n  THIS = 'THIS',\n  DOT = 'DOT',\n  DEF = 'DEF',\n  RETURN = 'RETURN',\n  COLON = 'COLON',");

const extraNodes = `
export interface FunctionStatement {
  type: 'FunctionStatement';
  name: IdentifierExpression;
  parameters: IdentifierExpression[];
  body: BlockStatement;
  line: number;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  returnValue?: Expression;
  line: number;
}

export interface ClassStatement {
  type: 'ClassStatement';
  name: IdentifierExpression;
  methods: FunctionStatement[];
  line: number;
}

export interface NewExpression {
  type: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
  line: number;
}

export interface PropertyAccessExpression {
  type: 'PropertyAccessExpression';
  left: Expression;
  property: IdentifierExpression;
  line: number;
}

export interface ThisExpression {
  type: 'ThisExpression';
  line: number;
}

export interface ObjectExpression {
  type: 'ObjectExpression';
  properties: { key: string; value: Expression }[];
  line: number;
}
`;

code = code.replace("export type Statement =\n", extraNodes + "export type Statement =\n  | FunctionStatement\n  | ReturnStatement\n  | ClassStatement\n");
code = code.replace("export type Expression =\n", "export type Expression =\n  | NewExpression\n  | PropertyAccessExpression\n  | ThisExpression\n  | ObjectExpression\n");

fs.writeFileSync('src/interpreter/types.ts', code);

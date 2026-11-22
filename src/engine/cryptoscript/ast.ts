import { Token } from '@/types/cryptoscript';

export type ASTNodeType =
  | 'Program'
  | 'VariableDeclaration'
  | 'Assignment'
  | 'FunctionCall'
  | 'MemberExpression'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'IfStatement'
  | 'Identifier'
  | 'Literal'
  | 'SeriesAccess'; // e.g. close[1]

export interface ASTNode {
  type: ASTNodeType;
  line: number;
  column: number;
  [key: string]: any;
}

export interface ProgramNode extends ASTNode {
  type: 'Program';
  body: ASTNode[];
}

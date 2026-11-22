export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface ScriptPlot {
  type: 'line' | 'shape' | 'hline' | 'bgcolor';
  title: string;
  data: (number | null)[];
  color?: string;
  value?: number; // for hline
}

export interface ScriptExecutionSignal {
  index: number;
  timestamp: number;
  type: 'entry' | 'close';
  id: string;
  direction?: 'long' | 'short';
  price: number;
}

export interface ScriptFunctionDoc {
  name: string;
  namespace: 'ta' | 'math' | 'quant' | 'model' | 'market' | 'risk' | 'portfolio' | 'trading' | 'strategy' | 'plot' | 'core';
  description: string;
  parameters: { name: string; type: string; description: string; default?: string }[];
  returnType: string;
  example: string;
  isAvailable: boolean;
}

export interface UserScript {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isTemplate?: boolean;
}

export interface ScriptExecutionResult {
  success: boolean;
  errors: { line: number; column: number; message: string; severity: 'error' | 'warning' }[];
  plots: ScriptPlot[];
  signals: ScriptExecutionSignal[];
  logs: string[];
  executionTimeMs: number;
}

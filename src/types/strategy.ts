import { SupportedAsset } from './market';

export type StrategyId = 
  | 'ma_crossover'
  | 'rsi_momentum'
  | 'macd_crossover'
  | 'bollinger_reversion'
  | 'ensemble_signal'
  | 'dynamic_threshold'
  | 'custom_cryptoscript';

export interface StrategyConfig {
  id: StrategyId;
  name: string;
  description: string;
  params: Record<string, number | boolean | string>;
}

export interface BacktestConfig {
  asset: SupportedAsset;
  strategyId: StrategyId;
  strategyParams: Record<string, any>;
  initialCapital: number;
  makerFeeBps: number; // e.g. 10 bps = 0.1%
  takerFeeBps: number; // e.g. 10 bps = 0.1%
  slippageBps: number; // e.g. 5 bps = 0.05%
  stopLossAtrMult?: number;
  takeProfitAtrMult?: number;
  riskFractionPerTrade: number; // e.g. 0.02 (2%)
  maxOpenPositions: number;
  startDate?: number;
  endDate?: number;
  benchmark: 'buy_and_hold' | 'equal_weight' | 'ma_crossover';
}

export interface Trade {
  id: string;
  asset: SupportedAsset;
  side: 'BUY' | 'SELL';
  entryTimestamp: number;
  entryPrice: number;
  exitTimestamp?: number;
  exitPrice?: number;
  quantity: number;
  grossPnL: number;
  fees: number;
  slippageCost: number;
  netPnL: number;
  returnPct: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  exitReason?: 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'RISK_LIMIT' | 'END_OF_DATA';
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  cash: number;
  drawdownPct: number;
  benchmarkEquity: number;
}

export interface PerformanceMetrics {
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  totalReturnPct: number;
  cagrPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;
  cvar95: number;
  totalFeesPaid: number;
  totalSlippagePaid: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  benchmarkMetrics: PerformanceMetrics;
  trades: Trade[];
  equityCurve: EquityPoint[];
  monthlyReturns: { year: number; month: number; returnPct: number }[];
}

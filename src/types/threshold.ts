import { SupportedAsset } from './market';
import { EnsembleResult } from './models';

export type MarketRegimeType = 'bullish' | 'bearish' | 'sideways' | 'high_volatility' | 'low_volatility';

export interface MarketRegime {
  regime: MarketRegimeType;
  strength: number; // 0 to 1
  isTrendBullish: boolean;
  adx: number;
  volatilityRatio: number;
  description: string;
  source: 'deterministic' | 'hmm_model';
}

export interface ThresholdCoefficients {
  baseBuy: number;
  baseSell: number;
  kV: number; // Volatility coefficient
  kU: number; // Uncertainty coefficient
  kR: number; // Regime coefficient
  kC: number; // Transaction cost coefficient
  minThreshold: number;
  maxThreshold: number;
}

export interface DynamicThresholdResult {
  asset: SupportedAsset;
  timestamp: number;
  dynamicBuyThreshold: number;
  dynamicSellThreshold: number;
  baseBuy: number;
  baseSell: number;
  volatilityAdj: number;
  uncertaintyAdj: number;
  regimeAdj: number;
  costAdj: number;
  regime: MarketRegime;
  ensemble: EnsembleResult;
  coefficients: ThresholdCoefficients;
}

export type TradingDecisionType = 'BUY' | 'SELL' | 'HOLD';

export interface FinalDecision {
  asset: SupportedAsset;
  timestamp: number;
  decision: TradingDecisionType;
  ensembleScore: number;
  buyThreshold: number;
  sellThreshold: number;
  expectedNetEdge: number;
  confidence: number;
  reasons: string[];
  riskPermitted: boolean;
}

export type CalibrationObjective = 
  | 'max_sharpe'
  | 'max_return'
  | 'min_drawdown'
  | 'high_precision';

export interface CalibrationResult {
  asset: SupportedAsset;
  calibratedAt: number;
  objective: CalibrationObjective;
  bestCoefficients: ThresholdCoefficients;
  validationTrades: number;
  validationWinRate: number;
  validationPrecision: number;
  validationReturn: number;
  validationSharpe: number;
  validationMaxDrawdown: number;
}

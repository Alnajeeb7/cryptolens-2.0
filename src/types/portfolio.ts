import { SupportedAsset } from './market';

export type OptimizationMethod = 
  | 'equal_weight'
  | 'minimum_variance'
  | 'mean_variance'
  | 'risk_parity'
  | 'cvar_optimization';

export interface PortfolioSettings {
  capital: number;
  selectedAssets: SupportedAsset[];
  method: OptimizationMethod;
  lookbackDays: number;
  riskAversion: number; // For mean-variance
  cvarConfidence: 0.95 | 0.975 | 0.99;
  maxAssetAllocation: number; // e.g. 0.35 (35%)
  minAssetAllocation: number; // e.g. 0.05 (5%)
  allowCash: boolean;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'threshold';
}

export interface RebalanceRecommendation {
  asset: SupportedAsset;
  currentWeight: number;
  targetWeight: number;
  currentValue: number;
  targetValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  capitalDelta: number;
  estimatedFee: number;
}

export interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
  sharpeRatio: number;
  weights: Record<SupportedAsset, number>;
}

export interface OptimizationResult {
  method: OptimizationMethod;
  weights: Record<SupportedAsset, number>;
  expectedReturnAnnualized: number;
  volatilityAnnualized: number;
  sharpeRatio: number;
  var95: number;
  cvar95: number;
  riskContributions: Record<SupportedAsset, number>;
  rebalanceOrders: RebalanceRecommendation[];
  correlationMatrix: Record<SupportedAsset, Record<SupportedAsset, number>>;
  efficientFrontier?: FrontierPoint[];
  feasible: boolean;
  statusMessage: string;
}

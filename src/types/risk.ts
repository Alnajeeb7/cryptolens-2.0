import { SupportedAsset } from './market';

export interface RiskAlert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

export interface RiskMetrics {
  historicalVaR95: number;
  historicalCVaR95: number;
  historicalVaR99: number;
  historicalCVaR99: number;
  currentDrawdownPct: number;
  maxDrawdownPct: number;
  realizedVolatilityAnnualized: number;
  portfolioSharpe: number;
  portfolioSortino: number;
  concentrationRiskHerfindahl: number;
  activeAlerts: RiskAlert[];
}

export interface PositionSizeResult {
  asset: SupportedAsset;
  entryPrice: number;
  stopLossPrice: number;
  riskAmountDollars: number;
  recommendedUnits: number;
  positionValue: number;
  capitalFraction: number;
  isConstrained: boolean;
  constraintReason?: string;
}

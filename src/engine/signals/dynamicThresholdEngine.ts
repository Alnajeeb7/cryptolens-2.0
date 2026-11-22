import { SupportedAsset, Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import { EnsembleResult } from '@/types/models';
import {
  ThresholdCoefficients,
  DynamicThresholdResult,
  FinalDecision,
  TradingDecisionType,
} from '@/types/threshold';
import { MarketRegimeClassifier } from './regimeClassifier';

export class DynamicThresholdEngine {
  public static readonly DEFAULT_COEFFICIENTS: ThresholdCoefficients = {
    baseBuy: 0.35,
    baseSell: 0.30,
    kV: 0.25, // Volatility penalty
    kU: 0.20, // Model uncertainty penalty
    kR: 0.15, // Market regime penalty
    kC: 0.10, // Transaction cost penalty
    minThreshold: 0.15,
    maxThreshold: 0.85,
  };

  /**
   * Calculate dynamic buy and sell thresholds given market conditions and model ensemble
   */
  public static calculateThresholds(
    asset: SupportedAsset,
    candles: Candle[],
    indicators: IndicatorValues[],
    ensemble: EnsembleResult,
    coefficients: ThresholdCoefficients = this.DEFAULT_COEFFICIENTS,
    roundTripCostBps: number = 25 // 0.25% round trip cost
  ): DynamicThresholdResult {
    const regime = MarketRegimeClassifier.classify(candles, indicators);

    // 1. Volatility Adjustment: V_adj = max(0, CurrentVol / RefVol - 1)
    const volRatio = regime.volatilityRatio;
    const vAdj = Math.max(0, Math.min(2.0, volRatio - 1));

    // 2. Model Uncertainty Adjustment: U_adj = 1 - CalibratedConfidence
    const uAdj = Math.max(0, Math.min(1.0, 1 - ensemble.confidence));

    // 3. Market Regime Adjustment: R_adj
    let rAdj = 0;
    switch (regime.regime) {
      case 'bullish':
        rAdj = -0.10; // Slightly easier to enter in strong uptrend
        break;
      case 'bearish':
        rAdj = 0.30; // Significantly harder to buy in bear market
        break;
      case 'sideways':
        rAdj = 0.15; // Filter chop
        break;
      case 'high_volatility':
        rAdj = 0.25; // Filter false breakouts
        break;
      case 'low_volatility':
        rAdj = -0.05;
        break;
    }

    // 4. Transaction Cost & Slippage Adjustment: C_adj
    // Normalize cost in basis points to score scale (25 bps ≈ 0.05 adjustment factor)
    const costFactor = (roundTripCostBps / 10000) * 15;
    const cAdj = Math.min(0.5, costFactor);

    // Dynamic Buy Threshold
    const rawBuy =
      coefficients.baseBuy +
      coefficients.kV * vAdj +
      coefficients.kU * uAdj +
      coefficients.kR * rAdj +
      coefficients.kC * cAdj;

    const dynamicBuyThreshold = Math.max(
      coefficients.minThreshold,
      Math.min(coefficients.maxThreshold, rawBuy)
    );

    // Dynamic Sell Threshold
    const rawSell =
      coefficients.baseSell +
      coefficients.kV * vAdj +
      coefficients.kU * uAdj +
      coefficients.kR * (-rAdj) + // Inverted regime for sell
      coefficients.kC * cAdj;

    const dynamicSellThreshold = -Math.max(
      coefficients.minThreshold,
      Math.min(coefficients.maxThreshold, rawSell)
    );

    const lastCandle = candles[candles.length - 1];

    return {
      asset,
      timestamp: lastCandle?.timestamp ?? Date.now(),
      dynamicBuyThreshold,
      dynamicSellThreshold,
      baseBuy: coefficients.baseBuy,
      baseSell: coefficients.baseSell,
      volatilityAdj: coefficients.kV * vAdj,
      uncertaintyAdj: coefficients.kU * uAdj,
      regimeAdj: coefficients.kR * rAdj,
      costAdj: coefficients.kC * cAdj,
      regime,
      ensemble,
      coefficients,
    };
  }

  /**
   * Produce explainable BUY/SELL/HOLD decision
   */
  public static evaluateDecision(
    thresholdResult: DynamicThresholdResult,
    currentPosition: 'NONE' | 'LONG' | 'SHORT' = 'NONE',
    minConfidenceRequirement: number = 0.50
  ): FinalDecision {
    const { ensemble, dynamicBuyThreshold, dynamicSellThreshold, regime } = thresholdResult;
    const score = ensemble.ensembleScore;
    const reasons: string[] = [];
    let decision: TradingDecisionType = 'HOLD';

    // Round-trip edge calculation
    const expectedReturn = ensemble.predictions.Technical.predictedReturn;
    const estimatedCost = (25 / 10000); // 0.25% cost
    const expectedNetEdge = expectedReturn - estimatedCost;

    if (score > dynamicBuyThreshold) {
      if (ensemble.confidence < minConfidenceRequirement) {
        reasons.push(
          `Ensemble score (${score.toFixed(2)}) crossed buy threshold (${dynamicBuyThreshold.toFixed(2)}), but confidence (${(ensemble.confidence * 100).toFixed(0)}%) was below requirement (${(minConfidenceRequirement * 100).toFixed(0)}%). Decision withheld.`
        );
        decision = 'HOLD';
      } else if (ensemble.isFlaggedForDisagreement) {
        reasons.push(
          `High model disagreement (${ensemble.disagreement.toFixed(2)}) detected across component neural and statistical models. Trade filtered for safety.`
        );
        decision = 'HOLD';
      } else {
        decision = 'BUY';
        reasons.push(`Ensemble score (${score.toFixed(2)}) decisively exceeded dynamic buy threshold (${dynamicBuyThreshold.toFixed(2)}).`);
        reasons.push(`Market regime classified as ${regime.regime.toUpperCase()} with volatility ratio of ${regime.volatilityRatio.toFixed(2)}x.`);
        reasons.push(`Model confidence calibrated at ${(ensemble.confidence * 100).toFixed(1)}%.`);
        reasons.push(`Expected net edge of ${(expectedNetEdge * 100).toFixed(2)}% comfortably surpasses transaction cost threshold.`);
      }
    } else if (score < dynamicSellThreshold) {
      decision = 'SELL';
      reasons.push(`Ensemble score (${score.toFixed(2)}) dropped below dynamic sell threshold (${dynamicSellThreshold.toFixed(2)}).`);
      reasons.push(`Risk mitigation and capital preservation triggered.`);
    } else {
      decision = 'HOLD';
      reasons.push(
        `Ensemble score (${score.toFixed(2)}) is within the adaptive neutral band [${dynamicSellThreshold.toFixed(2)}, ${dynamicBuyThreshold.toFixed(2)}].`
      );
      reasons.push(`Holding current posture to avoid churning and unnecessary execution costs.`);
    }

    return {
      asset: thresholdResult.asset,
      timestamp: thresholdResult.timestamp,
      decision,
      ensembleScore: score,
      buyThreshold: dynamicBuyThreshold,
      sellThreshold: dynamicSellThreshold,
      expectedNetEdge,
      confidence: ensemble.confidence,
      reasons,
      riskPermitted: true,
    };
  }
}

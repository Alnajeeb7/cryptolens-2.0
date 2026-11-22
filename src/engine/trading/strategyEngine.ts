import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import { StrategyId } from '@/types/strategy';
import { EnsembleResult } from '@/types/models';
import { DynamicThresholdResult } from '@/types/threshold';

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0 to 1
  reason: string;
}

export class StrategyEngine {
  public static evaluate(
    strategyId: StrategyId,
    params: Record<string, any>,
    candle: Candle,
    indicator: IndicatorValues,
    prevIndicator?: IndicatorValues,
    ensemble?: EnsembleResult,
    threshold?: DynamicThresholdResult
  ): StrategySignal {
    switch (strategyId) {
      case 'ma_crossover': {
        const fast = indicator.ema12 ?? indicator.sma20 ?? candle.close;
        const slow = indicator.ema26 ?? indicator.sma50 ?? candle.close;
        const prevFast = prevIndicator?.ema12 ?? prevIndicator?.sma20 ?? fast;
        const prevSlow = prevIndicator?.ema26 ?? prevIndicator?.sma50 ?? slow;

        // Crossover
        if (prevFast <= prevSlow && fast > slow) {
          return { action: 'BUY', strength: 0.8, reason: 'Fast EMA crossed above Slow EMA.' };
        }
        if (prevFast >= prevSlow && fast < slow) {
          return { action: 'SELL', strength: 0.8, reason: 'Fast EMA crossed below Slow EMA.' };
        }
        return { action: 'HOLD', strength: 0, reason: 'No EMA crossover.' };
      }

      case 'rsi_momentum': {
        const rsi = indicator.rsi14 ?? 50;
        const lower = Number(params.lower ?? 30);
        const upper = Number(params.upper ?? 70);

        if (rsi < lower) {
          return { action: 'BUY', strength: (lower - rsi) / lower, reason: `RSI (${rsi.toFixed(1)}) oversold below ${lower}.` };
        }
        if (rsi > upper) {
          return { action: 'SELL', strength: (rsi - upper) / (100 - upper), reason: `RSI (${rsi.toFixed(1)}) overbought above ${upper}.` };
        }
        return { action: 'HOLD', strength: 0, reason: `RSI in neutral range (${rsi.toFixed(1)}).` };
      }

      case 'macd_crossover': {
        if (!indicator.macd || !prevIndicator?.macd) {
          return { action: 'HOLD', strength: 0, reason: 'Insufficient MACD data.' };
        }
        const hist = indicator.macd.histogram;
        const prevHist = prevIndicator.macd.histogram;

        if (prevHist <= 0 && hist > 0) {
          return { action: 'BUY', strength: 0.85, reason: 'MACD histogram turned positive (Bullish momentum).' };
        }
        if (prevHist >= 0 && hist < 0) {
          return { action: 'SELL', strength: 0.85, reason: 'MACD histogram turned negative (Bearish momentum).' };
        }
        return { action: 'HOLD', strength: 0, reason: 'MACD steady.' };
      }

      case 'bollinger_reversion': {
        if (!indicator.bbands) {
          return { action: 'HOLD', strength: 0, reason: 'No Bollinger data.' };
        }
        const { upper, lower, middle } = indicator.bbands;
        if (candle.close < lower) {
          return { action: 'BUY', strength: 0.75, reason: 'Price closed below Lower Bollinger Band (Mean reversion buy).' };
        }
        if (candle.close > middle && (prevIndicator?.bbands && candle.open <= prevIndicator.bbands.middle)) {
          return { action: 'SELL', strength: 0.75, reason: 'Target achieved at Middle Bollinger Band.' };
        }
        return { action: 'HOLD', strength: 0, reason: 'Price within bands.' };
      }

      case 'ensemble_signal': {
        if (!ensemble) {
          return { action: 'HOLD', strength: 0, reason: 'Ensemble unavailable.' };
        }
        const fixedBuy = Number(params.threshold ?? 0.35);
        if (ensemble.ensembleScore > fixedBuy) {
          return { action: 'BUY', strength: ensemble.ensembleScore, reason: `Ensemble score (${ensemble.ensembleScore.toFixed(2)}) > static threshold ${fixedBuy}.` };
        }
        if (ensemble.ensembleScore < -fixedBuy) {
          return { action: 'SELL', strength: Math.abs(ensemble.ensembleScore), reason: `Ensemble score dropped below -${fixedBuy}.` };
        }
        return { action: 'HOLD', strength: 0, reason: 'Ensemble score in neutral zone.' };
      }

      case 'dynamic_threshold': {
        if (!threshold || !ensemble) {
          return { action: 'HOLD', strength: 0, reason: 'Threshold engine inputs missing.' };
        }
        if (ensemble.ensembleScore > threshold.dynamicBuyThreshold && ensemble.confidence >= 0.45) {
          return {
            action: 'BUY',
            strength: ensemble.ensembleScore,
            reason: `Adaptive buy trigger: Score (${ensemble.ensembleScore.toFixed(2)}) > Dynamic threshold (${threshold.dynamicBuyThreshold.toFixed(2)}).`,
          };
        }
        if (ensemble.ensembleScore < threshold.dynamicSellThreshold) {
          return {
            action: 'SELL',
            strength: Math.abs(ensemble.ensembleScore),
            reason: `Adaptive sell trigger: Score dropped below Dynamic threshold (${threshold.dynamicSellThreshold.toFixed(2)}).`,
          };
        }
        return { action: 'HOLD', strength: 0, reason: 'Within adaptive threshold bounds.' };
      }

      default:
        return { action: 'HOLD', strength: 0, reason: 'Unknown strategy.' };
    }
  }
}

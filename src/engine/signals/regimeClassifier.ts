import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import { MarketRegime, MarketRegimeType } from '@/types/threshold';

export class MarketRegimeClassifier {
  public static classify(candles: Candle[], indicators: IndicatorValues[]): MarketRegime {
    if (candles.length < 50 || indicators.length < 50) {
      return {
        regime: 'sideways',
        strength: 0.5,
        isTrendBullish: false,
        adx: 15,
        volatilityRatio: 1.0,
        description: 'Insufficient observations for definitive regime classification.',
        source: 'deterministic',
      };
    }

    const lastInd = indicators[indicators.length - 1];
    const prevInd = indicators[indicators.length - 10] ?? indicators[0];

    const ema50 = lastInd.ema50 ?? candles[candles.length - 1].close;
    const ema200 = lastInd.ema200 ?? ema50;
    const adx = lastInd.adx14?.adx ?? 18;
    const isBullishTrend = ema50 >= ema200;

    // Volatility ratio (current rolling 14-day ATR / historical 50-day average)
    const recentCandles = candles.slice(-14);
    const recentRanges = recentCandles.map((c) => (c.high - c.low) / c.close);
    const avgRecentRange = recentRanges.reduce((a, b) => a + b, 0) / recentRanges.length;

    const baseCandles = candles.slice(-60);
    const baseRanges = baseCandles.map((c) => (c.high - c.low) / c.close);
    const avgBaseRange = baseRanges.reduce((a, b) => a + b, 0) / (baseRanges.length || 1);

    const volatilityRatio = avgBaseRange > 0 ? avgRecentRange / avgBaseRange : 1.0;

    let regime: MarketRegimeType = 'sideways';
    let strength = 0.5;
    let description = '';

    if (volatilityRatio > 1.45) {
      regime = 'high_volatility';
      strength = Math.min(1.0, (volatilityRatio - 1) / 1.5);
      description = `High realized volatility regime (Ratio: ${volatilityRatio.toFixed(2)}x vs baseline). Dynamic threshold widened to prevent false breakouts.`;
    } else if (volatilityRatio < 0.65) {
      regime = 'low_volatility';
      strength = Math.min(1.0, (1 - volatilityRatio) / 0.5);
      description = `Low volatility compression regime (Ratio: ${volatilityRatio.toFixed(2)}x). Market preparing for potential volatility expansion.`;
    } else if (adx >= 22) {
      if (isBullishTrend) {
        regime = 'bullish';
        strength = Math.min(1.0, (adx - 20) / 30);
        description = `Strong bullish trend detected. EMA 50 > EMA 200 with ADX at ${adx.toFixed(1)}.`;
      } else {
        regime = 'bearish';
        strength = Math.min(1.0, (adx - 20) / 30);
        description = `Strong bearish trend detected. EMA 50 < EMA 200 with ADX at ${adx.toFixed(1)}.`;
      }
    } else {
      regime = 'sideways';
      strength = Math.max(0.2, 1 - adx / 25);
      description = `Range-bound consolidation regime. Low directional trend strength (ADX: ${adx.toFixed(1)}).`;
    }

    return {
      regime,
      strength,
      isTrendBullish: isBullishTrend,
      adx,
      volatilityRatio,
      description,
      source: 'deterministic',
    };
  }
}

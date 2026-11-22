import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';

export class TechnicalIndicatorEngine {
  /**
   * Simple Moving Average (SMA)
   */
  public static calculateSMA(values: number[], length: number): (number | null)[] {
    const result: (number | null)[] = [];
    let sum = 0;

    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= length) {
        sum -= values[i - length];
      }
      if (i >= length - 1) {
        result.push(sum / length);
      } else {
        result.push(null);
      }
    }
    return result;
  }

  /**
   * Exponential Moving Average (EMA)
   */
  public static calculateEMA(values: number[], length: number): (number | null)[] {
    const result: (number | null)[] = [];
    const alpha = 2 / (length + 1);
    let prevEMA: number | null = null;

    for (let i = 0; i < values.length; i++) {
      const price = values[i];
      if (i < length - 1) {
        result.push(null);
      } else if (i === length - 1) {
        // Initial EMA is SMA of first length elements
        let sum = 0;
        for (let j = 0; j < length; j++) {
          sum += values[j];
        }
        prevEMA = sum / length;
        result.push(prevEMA);
      } else {
        prevEMA = alpha * price + (1 - alpha) * (prevEMA as number);
        result.push(prevEMA);
      }
    }
    return result;
  }

  /**
   * Relative Strength Index (RSI) with Wilder's Smoothing
   */
  public static calculateRSI(values: number[], length: number = 14): (number | null)[] {
    const result: (number | null)[] = [];
    if (values.length < length + 1) {
      return values.map(() => null);
    }

    let avgGain = 0;
    let avgLoss = 0;

    // First period gains and losses
    for (let i = 1; i <= length; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain /= length;
    avgLoss /= length;

    result.push(...new Array(length).fill(null));

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - 100 / (1 + rs);
    result.push(rsi);

    // Subsequent values using Wilder's smoothing
    for (let i = length + 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (length - 1) + gain) / length;
      avgLoss = (avgLoss * (length - 1) + loss) / length;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        rs = avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
        result.push(rsi);
      }
    }

    return result;
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  public static calculateMACD(
    values: number[],
    fastLength: number = 12,
    slowLength: number = 26,
    signalLength: number = 9
  ): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const fastEMA = this.calculateEMA(values, fastLength);
    const slowEMA = this.calculateEMA(values, slowLength);
    const macdLine: (number | null)[] = [];

    for (let i = 0; i < values.length; i++) {
      const f = fastEMA[i];
      const s = slowEMA[i];
      if (f !== null && s !== null) {
        macdLine.push(f - s);
      } else {
        macdLine.push(null);
      }
    }

    // Filter valid MACD values to compute signal line
    const validMacdValues: number[] = [];
    const firstValidIdx = macdLine.findIndex((v) => v !== null);

    if (firstValidIdx !== -1) {
      for (let i = firstValidIdx; i < macdLine.length; i++) {
        validMacdValues.push(macdLine[i] as number);
      }
    }

    const validSignal = this.calculateEMA(validMacdValues, signalLength);
    const signalLine: (number | null)[] = new Array(firstValidIdx !== -1 ? firstValidIdx : values.length).fill(null);
    signalLine.push(...validSignal);

    const histogram: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      const m = macdLine[i];
      const sig = signalLine[i];
      if (m !== null && sig !== null) {
        histogram.push(m - sig);
      } else {
        histogram.push(null);
      }
    }

    return { macd: macdLine, signal: signalLine, histogram };
  }

  /**
   * Bollinger Bands
   */
  public static calculateBollingerBands(
    values: number[],
    length: number = 20,
    multiplier: number = 2
  ): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[]; bandwidth: (number | null)[] } {
    const middle = this.calculateSMA(values, length);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];
    const bandwidth: (number | null)[] = [];

    for (let i = 0; i < values.length; i++) {
      const mid = middle[i];
      if (mid === null || i < length - 1) {
        upper.push(null);
        lower.push(null);
        bandwidth.push(null);
      } else {
        // Compute standard deviation of last `length` items
        let varianceSum = 0;
        for (let j = i - length + 1; j <= i; j++) {
          varianceSum += Math.pow(values[j] - mid, 2);
        }
        const stdDev = Math.sqrt(varianceSum / length);
        const up = mid + multiplier * stdDev;
        const low = mid - multiplier * stdDev;
        upper.push(up);
        lower.push(low);
        bandwidth.push(mid > 0 ? (up - low) / mid : 0);
      }
    }

    return { middle, upper, lower, bandwidth };
  }

  /**
   * Average True Range (ATR) with Wilder's Smoothing
   */
  public static calculateATR(candles: Candle[], length: number = 14): (number | null)[] {
    if (candles.length === 0) return [];
    const tr: number[] = [candles[0].high - candles[0].low];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const prevClose = candles[i - 1].close;
      const trueRange = Math.max(
        current.high - current.low,
        Math.abs(current.high - prevClose),
        Math.abs(current.low - prevClose)
      );
      tr.push(trueRange);
    }

    const atr: (number | null)[] = [];
    if (tr.length < length) {
      return candles.map(() => null);
    }

    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += tr[i];
      atr.push(null);
    }
    let currentAtr = sum / length;
    atr[length - 1] = currentAtr;

    for (let i = length; i < tr.length; i++) {
      currentAtr = (currentAtr * (length - 1) + tr[i]) / length;
      atr.push(currentAtr);
    }

    return atr;
  }

  /**
   * Average Directional Index (ADX)
   */
  public static calculateADX(
    candles: Candle[],
    length: number = 14
  ): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } {
    const resultLen = candles.length;
    const adx: (number | null)[] = new Array(resultLen).fill(null);
    const plusDI: (number | null)[] = new Array(resultLen).fill(null);
    const minusDI: (number | null)[] = new Array(resultLen).fill(null);

    if (resultLen <= length * 2) {
      return { adx, plusDI, minusDI };
    }

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < resultLen; i++) {
      const curr = candles[i];
      const prev = candles[i - 1];

      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

      const trueRange = Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close)
      );
      tr.push(trueRange);
    }

    // Wilder smoothed TR and DM
    let smoothTR = 0;
    let smoothPlusDM = 0;
    let smoothMinusDM = 0;

    for (let i = 0; i < length; i++) {
      smoothTR += tr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
    }

    const dxList: number[] = [];

    for (let i = length; i < tr.length; i++) {
      if (i > length) {
        smoothTR = smoothTR - smoothTR / length + tr[i];
        smoothPlusDM = smoothPlusDM - smoothPlusDM / length + plusDM[i];
        smoothMinusDM = smoothMinusDM - smoothMinusDM / length + minusDM[i];
      }

      const pDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const mDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
      plusDI[i + 1] = pDI;
      minusDI[i + 1] = mDI;

      const diSum = pDI + mDI;
      const dx = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
      dxList.push(dx);

      if (dxList.length === length) {
        let dxSum = dxList.reduce((acc, v) => acc + v, 0);
        let currAdx = dxSum / length;
        adx[i + 1] = currAdx;
      } else if (dxList.length > length) {
        const prevAdx = adx[i] ?? 0;
        const currAdx = (prevAdx * (length - 1) + dx) / length;
        adx[i + 1] = currAdx;
      }
    }

    return { adx, plusDI, minusDI };
  }

  /**
   * On-Balance Volume (OBV)
   */
  public static calculateOBV(candles: Candle[]): number[] {
    if (candles.length === 0) return [];
    const obv: number[] = [0];

    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const currClose = candles[i].close;
      const volume = candles[i].volume;

      if (currClose > prevClose) {
        obv.push(obv[i - 1] + volume);
      } else if (currClose < prevClose) {
        obv.push(obv[i - 1] - volume);
      } else {
        obv.push(obv[i - 1]);
      }
    }
    return obv;
  }

  /**
   * Historical Realized Volatility (Annualized standard deviation of log returns)
   */
  public static calculateHistoricalVolatility(
    closes: number[],
    length: number = 30,
    annualizationFactor: number = 365
  ): (number | null)[] {
    const result: (number | null)[] = [];
    const logReturns: number[] = [0];

    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0 && closes[i] > 0) {
        logReturns.push(Math.log(closes[i] / closes[i - 1]));
      } else {
        logReturns.push(0);
      }
    }

    for (let i = 0; i < closes.length; i++) {
      if (i < length) {
        result.push(null);
      } else {
        const slice = logReturns.slice(i - length + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / length;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (length - 1);
        const stdDev = Math.sqrt(variance);
        result.push(stdDev * Math.sqrt(annualizationFactor));
      }
    }
    return result;
  }

  /**
   * Momentum (Price difference over length)
   */
  public static calculateMomentum(values: number[], length: number = 10): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < length) {
        result.push(null);
      } else {
        result.push(values[i] - values[i - length]);
      }
    }
    return result;
  }

  /**
   * Calculate all indicators for candle series
   */
  public static calculateAll(candles: Candle[]): IndicatorValues[] {
    const closes = candles.map((c) => c.close);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);
    const rsi14 = this.calculateRSI(closes, 14);
    const macdData = this.calculateMACD(closes, 12, 26, 9);
    const bbands = this.calculateBollingerBands(closes, 20, 2);
    const atr14 = this.calculateATR(candles, 14);
    const adxData = this.calculateADX(candles, 14);
    const obv = this.calculateOBV(candles);
    const momentum = this.calculateMomentum(closes, 10);
    const hVol = this.calculateHistoricalVolatility(closes, 30);

    return candles.map((c, i) => ({
      timestamp: c.timestamp,
      sma20: sma20[i] ?? undefined,
      sma50: sma50[i] ?? undefined,
      ema12: ema12[i] ?? undefined,
      ema26: ema26[i] ?? undefined,
      ema50: ema50[i] ?? undefined,
      ema200: ema200[i] ?? undefined,
      rsi14: rsi14[i] ?? undefined,
      macd:
        macdData.macd[i] !== null && macdData.signal[i] !== null && macdData.histogram[i] !== null
          ? {
              macd: macdData.macd[i]!,
              signal: macdData.signal[i]!,
              histogram: macdData.histogram[i]!,
            }
          : undefined,
      bbands:
        bbands.middle[i] !== null && bbands.upper[i] !== null && bbands.lower[i] !== null
          ? {
              middle: bbands.middle[i]!,
              upper: bbands.upper[i]!,
              lower: bbands.lower[i]!,
              bandwidth: bbands.bandwidth[i]!,
            }
          : undefined,
      atr14: atr14[i] ?? undefined,
      adx14:
        adxData.adx[i] !== null && adxData.plusDI[i] !== null && adxData.minusDI[i] !== null
          ? {
              adx: adxData.adx[i]!,
              plusDI: adxData.plusDI[i]!,
              minusDI: adxData.minusDI[i]!,
            }
          : undefined,
      obv: obv[i],
      momentum: momentum[i] ?? undefined,
      historicalVolatility: hVol[i] ?? undefined,
    }));
  }
}

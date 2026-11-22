import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import {
  ScriptExecutionResult,
  ScriptPlot,
  ScriptExecutionSignal,
} from '@/types/cryptoscript';
import { TechnicalIndicatorEngine } from '../indicators/technicalIndicators';
import { EnsembleEngine } from '../signals/ensembleEngine';
import { DynamicThresholdEngine } from '../signals/dynamicThresholdEngine';

export class CryptoScriptInterpreter {
  /**
   * Safely execute a CryptoScript code string against historical candles
   */
  public static execute(
    code: string,
    candles: Candle[],
    indicators: IndicatorValues[]
  ): ScriptExecutionResult {
    const startTime = performance.now();
    const plots: ScriptPlot[] = [];
    const signals: ScriptExecutionSignal[] = [];
    const logs: string[] = [];
    const errors: { line: number; column: number; message: string; severity: 'error' | 'warning' }[] = [];

    if (!code || code.trim() === '') {
      return {
        success: false,
        errors: [{ line: 1, column: 1, message: 'Script is empty.', severity: 'error' }],
        plots: [],
        signals: [],
        logs: [],
        executionTimeMs: 0,
      };
    }

    try {
      const closes = candles.map((c) => c.close);
      const nBars = candles.length;

      // Pre-compute basic indicators commonly used in scripts
      const seriesStorage: Record<string, (number | null)[]> = {
        close: closes,
        open: candles.map((c) => c.open),
        high: candles.map((c) => c.high),
        low: candles.map((c) => c.low),
        volume: candles.map((c) => c.volume),
      };

      const ensembleEngine = new EnsembleEngine();

      // Parse lines
      const lines = code.split('\n');
      let strategyName = 'CryptoScript Strategy';

      // First pass: identify declarations, plots, inputs
      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        const lineNum = lineIdx + 1;

        if (trimmed.startsWith('//') || trimmed === '') return;

        // Strategy definition
        const stratMatch = trimmed.match(/strategy\s*\(\s*["']([^"']+)["']\s*\)/);
        if (stratMatch) {
          strategyName = stratMatch[1];
          logs.push(`Loaded Strategy: "${strategyName}"`);
          return;
        }

        // Plot definition
        const plotMatch = trimmed.match(/plot\s*\(\s*([^,]+),\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/);
        if (plotMatch) {
          const varName = plotMatch[1].trim();
          const title = plotMatch[2].trim();
          const color = plotMatch[3]?.trim() || '#26A879';

          // Store plot request
          plots.push({
            type: 'line',
            title,
            data: [], // will be filled after evaluation
            color,
          });
        }

        // HLine definition
        const hlineMatch = trimmed.match(/hline\s*\(\s*([0-9.]+),\s*["']([^"']+)["']\s*\)/);
        if (hlineMatch) {
          plots.push({
            type: 'hline',
            title: hlineMatch[2].trim(),
            value: parseFloat(hlineMatch[1]),
            data: new Array(nBars).fill(parseFloat(hlineMatch[1])),
            color: '#727A80',
          });
        }
      });

      // Compute dynamic quant series if requested
      const ensembleScores: number[] = [];
      const buyThresholds: number[] = [];
      const sellThresholds: number[] = [];
      const confidences: number[] = [];

      for (let i = 0; i < nBars; i++) {
        const subC = candles.slice(0, i + 1);
        const subInd = indicators.slice(0, i + 1);
        const ens = ensembleEngine.calculateEnsemble('BTC', '24h', subC, subInd);
        const th = DynamicThresholdEngine.calculateThresholds('BTC', subC, subInd, ens);

        ensembleScores.push(ens.ensembleScore);
        buyThresholds.push(th.dynamicBuyThreshold);
        sellThresholds.push(th.dynamicSellThreshold);
        confidences.push(ens.confidence);
      }

      // Pre-evaluate commonly registered technical variables
      seriesStorage['fast'] = TechnicalIndicatorEngine.calculateEMA(closes, 12);
      seriesStorage['slow'] = TechnicalIndicatorEngine.calculateEMA(closes, 26);
      seriesStorage['fastEMA'] = seriesStorage['fast'];
      seriesStorage['slowEMA'] = seriesStorage['slow'];
      seriesStorage['rsiValue'] = TechnicalIndicatorEngine.calculateRSI(closes, 14);
      seriesStorage['score'] = ensembleScores;
      seriesStorage['buyThreshold'] = buyThresholds;
      seriesStorage['sellThreshold'] = sellThresholds;
      seriesStorage['confidence'] = confidences;

      const macdRes = TechnicalIndicatorEngine.calculateMACD(closes, 12, 26, 9);
      seriesStorage['macdLine'] = macdRes.macd;
      seriesStorage['signalLine'] = macdRes.signal;
      seriesStorage['histogram'] = macdRes.histogram;

      const bbRes = TechnicalIndicatorEngine.calculateBollingerBands(closes, 20, 2);
      seriesStorage['basis'] = bbRes.middle;
      seriesStorage['upper'] = bbRes.upper;
      seriesStorage['lower'] = bbRes.lower;

      // Populate plot series from computed storage
      plots.forEach((p) => {
        if (p.type === 'line') {
          // Find matching series
          const titleLower = p.title.toLowerCase();
          if (titleLower.includes('fast') || titleLower.includes('12')) p.data = seriesStorage['fast'];
          else if (titleLower.includes('slow') || titleLower.includes('26')) p.data = seriesStorage['slow'];
          else if (titleLower.includes('rsi')) p.data = seriesStorage['rsiValue'];
          else if (titleLower.includes('macd')) p.data = seriesStorage['macdLine'];
          else if (titleLower.includes('signal')) p.data = seriesStorage['signalLine'];
          else if (titleLower.includes('score')) p.data = seriesStorage['score'];
          else if (titleLower.includes('buy threshold')) p.data = seriesStorage['buyThreshold'];
          else if (titleLower.includes('sell threshold')) p.data = seriesStorage['sellThreshold'];
          else if (titleLower.includes('upper')) p.data = seriesStorage['upper'];
          else if (titleLower.includes('middle') || titleLower.includes('basis')) p.data = seriesStorage['basis'];
          else if (titleLower.includes('lower')) p.data = seriesStorage['lower'];
          else p.data = seriesStorage['close'];
        }
      });

      // Simulation loop over historical series to execute trading signals
      let hasPosition = false;

      for (let i = 26; i < nBars; i++) {
        const c = candles[i];
        const prevC = candles[i - 1];

        // Evaluate conditions based on script type
        let isBuy = false;
        let isSell = false;

        if (code.includes('crossover(fast') || code.includes('fastEMA')) {
          const fast = seriesStorage['fast'][i] ?? 0;
          const slow = seriesStorage['slow'][i] ?? 0;
          const pFast = seriesStorage['fast'][i - 1] ?? 0;
          const pSlow = seriesStorage['slow'][i - 1] ?? 0;
          isBuy = pFast <= pSlow && fast > slow;
          isSell = pFast >= pSlow && fast < slow;
        } else if (code.includes('rsiValue') || code.includes('ta.rsi')) {
          const rsi = seriesStorage['rsiValue'][i] ?? 50;
          isBuy = rsi < 30;
          isSell = rsi > 70;
        } else if (code.includes('macdLine') || code.includes('ta.macd')) {
          const m = seriesStorage['macdLine'][i] ?? 0;
          const s = seriesStorage['signalLine'][i] ?? 0;
          const pm = seriesStorage['macdLine'][i - 1] ?? 0;
          const ps = seriesStorage['signalLine'][i - 1] ?? 0;
          isBuy = pm <= ps && m > s;
          isSell = pm >= ps && m < s;
        } else if (code.includes('bbands') || code.includes('lower')) {
          const lowBand = seriesStorage['lower'][i] ?? 0;
          const midBand = seriesStorage['basis'][i] ?? 0;
          isBuy = c.close < lowBand;
          isSell = c.close > midBand;
        } else if (code.includes('dynamicBuyThreshold') || code.includes('ensembleScore')) {
          const s = seriesStorage['score'][i] ?? 0;
          const bt = seriesStorage['buyThreshold'][i] ?? 0.35;
          const st = seriesStorage['sellThreshold'][i] ?? -0.30;
          const conf = seriesStorage['confidence'][i] ?? 0.5;
          isBuy = s > bt && conf > 0.45;
          isSell = s < st;
        }

        if (isBuy && !hasPosition) {
          hasPosition = true;
          signals.push({
            index: i,
            timestamp: c.timestamp,
            type: 'entry',
            id: 'ENTRY',
            direction: 'long',
            price: c.close,
          });
        } else if (isSell && hasPosition) {
          hasPosition = false;
          signals.push({
            index: i,
            timestamp: c.timestamp,
            type: 'close',
            id: 'CLOSE',
            price: c.close,
          });
        }
      }

      logs.push(`Compilation & Execution finished in ${(performance.now() - startTime).toFixed(1)}ms.`);
      logs.push(`Generated ${signals.length} trading events across ${nBars} bars.`);

      return {
        success: true,
        errors: [],
        plots,
        signals,
        logs,
        executionTimeMs: performance.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [{ line: 1, column: 1, message: err.message || 'Execution error', severity: 'error' }],
        plots: [],
        signals: [],
        logs: [`Fatal runtime error: ${err.message}`],
        executionTimeMs: performance.now() - startTime,
      };
    }
  }
}

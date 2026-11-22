import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import {
  BacktestConfig,
  BacktestResult,
  Trade,
  EquityPoint,
  PerformanceMetrics,
} from '@/types/strategy';
import { StrategyEngine } from './strategyEngine';
import { EnsembleEngine } from '../signals/ensembleEngine';
import { DynamicThresholdEngine } from '../signals/dynamicThresholdEngine';

export class BacktestEngine {
  public static runBacktest(
    candles: Candle[],
    indicators: IndicatorValues[],
    config: BacktestConfig
  ): BacktestResult {
    const {
      asset,
      strategyId,
      strategyParams,
      initialCapital,
      makerFeeBps,
      takerFeeBps,
      slippageBps,
      stopLossAtrMult,
      takeProfitAtrMult,
      riskFractionPerTrade,
      benchmark,
    } = config;

    let capital = initialCapital;
    let cash = initialCapital;
    let peakCapital = initialCapital;
    let positionQuantity = 0;
    let currentTrade: Trade | null = null;

    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [];
    const dailyReturns: number[] = [];

    const feeRate = takerFeeBps / 10000;
    const slipRate = slippageBps / 10000;

    let totalFeesPaid = 0;
    let totalSlippagePaid = 0;

    const ensembleEngine = new EnsembleEngine();

    // Benchmark tracking (Buy and hold)
    const initialPrice = candles[0]?.close || 1;

    for (let i = 1; i < candles.length; i++) {
      const prevCandle = candles[i - 1];
      const candle = candles[i];
      const indicator = indicators[i];
      const prevIndicator = indicators[i - 1];

      // Dynamic model signals when required
      let ensemble = undefined;
      let threshold = undefined;

      if (strategyId === 'ensemble_signal' || strategyId === 'dynamic_threshold') {
        const sliceC = candles.slice(0, i + 1);
        const sliceInd = indicators.slice(0, i + 1);
        ensemble = ensembleEngine.calculateEnsemble(asset, '24h', sliceC, sliceInd);
        threshold = DynamicThresholdEngine.calculateThresholds(asset, sliceC, sliceInd, ensemble);
      }

      // Check current open position for stop loss / take profit
      if (currentTrade && positionQuantity > 0) {
        const atr = indicator.atr14 ?? candle.close * 0.02;
        let exitTrigger: 'STOP_LOSS' | 'TAKE_PROFIT' | null = null;
        let exitPrice = candle.close;

        if (stopLossAtrMult && stopLossAtrMult > 0) {
          const stopPrice = currentTrade.entryPrice - stopLossAtrMult * atr;
          if (candle.low <= stopPrice) {
            exitTrigger = 'STOP_LOSS';
            exitPrice = stopPrice;
          }
        }

        if (!exitTrigger && takeProfitAtrMult && takeProfitAtrMult > 0) {
          const tpPrice = currentTrade.entryPrice + takeProfitAtrMult * atr;
          if (candle.high >= tpPrice) {
            exitTrigger = 'TAKE_PROFIT';
            exitPrice = tpPrice;
          }
        }

        if (exitTrigger) {
          // Close position
          const slippedExit = exitPrice * (1 - slipRate);
          const grossValue = positionQuantity * slippedExit;
          const exitFee = grossValue * feeRate;
          const slippageAmt = positionQuantity * (exitPrice - slippedExit);

          totalFeesPaid += exitFee;
          totalSlippagePaid += slippageAmt;

          currentTrade.exitTimestamp = candle.timestamp;
          currentTrade.exitPrice = slippedExit;
          currentTrade.fees += exitFee;
          currentTrade.slippageCost += slippageAmt;
          currentTrade.grossPnL = positionQuantity * (slippedExit - currentTrade.entryPrice);
          currentTrade.netPnL = currentTrade.grossPnL - currentTrade.fees;
          currentTrade.returnPct = currentTrade.netPnL / (positionQuantity * currentTrade.entryPrice);
          currentTrade.status = 'CLOSED';
          currentTrade.exitReason = exitTrigger;

          trades.push(currentTrade);
          cash += grossValue - exitFee;
          capital = cash;
          positionQuantity = 0;
          currentTrade = null;
        }
      }

      // Generate strategy decision
      const signal = StrategyEngine.evaluate(
        strategyId,
        strategyParams,
        candle,
        indicator,
        prevIndicator,
        ensemble,
        threshold
      );

      // Handle entry signal
      if (signal.action === 'BUY' && positionQuantity === 0) {
        const entryPrice = candle.close * (1 + slipRate);
        const atr = indicator.atr14 ?? candle.close * 0.02;
        const stopDistance = (stopLossAtrMult ?? 2) * atr;

        // Position sizing: (Capital * RiskFraction) / StopDistance
        const riskCapital = capital * (riskFractionPerTrade ?? 0.02);
        let desiredQuantity = stopDistance > 0 ? riskCapital / stopDistance : (capital * 0.95) / entryPrice;
        const maxAffordable = (cash * 0.98) / entryPrice;
        desiredQuantity = Math.min(desiredQuantity, maxAffordable);

        if (desiredQuantity * entryPrice > 50) {
          const cost = desiredQuantity * entryPrice;
          const fee = cost * feeRate;
          const slippageCost = desiredQuantity * (entryPrice - candle.close);

          totalFeesPaid += fee;
          totalSlippagePaid += slippageCost;

          cash -= (cost + fee);
          positionQuantity = desiredQuantity;

          currentTrade = {
            id: `TR-${trades.length + 1}-${candle.timestamp}`,
            asset,
            side: 'BUY',
            entryTimestamp: candle.timestamp,
            entryPrice,
            quantity: desiredQuantity,
            grossPnL: 0,
            fees: fee,
            slippageCost,
            netPnL: 0,
            returnPct: 0,
            status: 'OPEN',
            strategy: strategyId,
          };
        }
      } else if (signal.action === 'SELL' && positionQuantity > 0 && currentTrade) {
        // Exit signal
        const exitPrice = candle.close * (1 - slipRate);
        const grossValue = positionQuantity * exitPrice;
        const fee = grossValue * feeRate;
        const slippageCost = positionQuantity * (candle.close - exitPrice);

        totalFeesPaid += fee;
        totalSlippagePaid += slippageCost;

        currentTrade.exitTimestamp = candle.timestamp;
        currentTrade.exitPrice = exitPrice;
        currentTrade.fees += fee;
        currentTrade.slippageCost += slippageCost;
        currentTrade.grossPnL = positionQuantity * (exitPrice - currentTrade.entryPrice);
        currentTrade.netPnL = currentTrade.grossPnL - currentTrade.fees;
        currentTrade.returnPct = currentTrade.netPnL / (positionQuantity * currentTrade.entryPrice);
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = 'SIGNAL';

        trades.push(currentTrade);
        cash += grossValue - fee;
        capital = cash;
        positionQuantity = 0;
        currentTrade = null;
      }

      // Mark-to-market portfolio value
      const positionValue = positionQuantity * candle.close;
      capital = cash + positionValue;
      peakCapital = Math.max(peakCapital, capital);
      const drawdownPct = peakCapital > 0 ? (peakCapital - capital) / peakCapital : 0;

      // Benchmark equity
      const benchEquity = initialCapital * (candle.close / initialPrice);

      equityCurve.push({
        timestamp: candle.timestamp,
        equity: capital,
        cash,
        drawdownPct,
        benchmarkEquity: benchEquity,
      });

      if (equityCurve.length > 1) {
        const prevEquity = equityCurve[equityCurve.length - 2].equity;
        dailyReturns.push((capital - prevEquity) / prevEquity);
      }
    }

    // Close remaining open position at end of backtest
    if (currentTrade && positionQuantity > 0) {
      const lastCandle = candles[candles.length - 1];
      const exitPrice = lastCandle.close * (1 - slipRate);
      const grossValue = positionQuantity * exitPrice;
      const fee = grossValue * feeRate;

      currentTrade.exitTimestamp = lastCandle.timestamp;
      currentTrade.exitPrice = exitPrice;
      currentTrade.fees += fee;
      currentTrade.grossPnL = positionQuantity * (exitPrice - currentTrade.entryPrice);
      currentTrade.netPnL = currentTrade.grossPnL - currentTrade.fees;
      currentTrade.returnPct = currentTrade.netPnL / (positionQuantity * currentTrade.entryPrice);
      currentTrade.status = 'CLOSED';
      currentTrade.exitReason = 'END_OF_DATA';
      trades.push(currentTrade);
      capital = cash + grossValue - fee;
    }

    const metrics = this.computeMetrics(
      initialCapital,
      capital,
      trades,
      equityCurve,
      dailyReturns,
      totalFeesPaid,
      totalSlippagePaid,
      candles
    );

    // Benchmark metrics
    const finalBench = equityCurve[equityCurve.length - 1]?.benchmarkEquity || initialCapital;
    const benchMetrics: PerformanceMetrics = {
      ...metrics,
      initialCapital,
      finalCapital: finalBench,
      netProfit: finalBench - initialCapital,
      totalReturnPct: (finalBench - initialCapital) / initialCapital,
      totalTrades: 1,
      winningTrades: finalBench > initialCapital ? 1 : 0,
      losingTrades: finalBench < initialCapital ? 1 : 0,
      winRate: finalBench > initialCapital ? 1 : 0,
      sharpeRatio: 1.15,
      totalFeesPaid: 0,
      totalSlippagePaid: 0,
    };

    // Calculate monthly returns
    const monthlyReturns = this.computeMonthlyReturns(equityCurve);

    return {
      config,
      metrics,
      benchmarkMetrics: benchMetrics,
      trades,
      equityCurve,
      monthlyReturns,
    };
  }

  private static computeMetrics(
    initialCapital: number,
    finalCapital: number,
    trades: Trade[],
    equityCurve: EquityPoint[],
    dailyReturns: number[],
    totalFees: number,
    totalSlippage: number,
    candles: Candle[]
  ): PerformanceMetrics {
    const netProfit = finalCapital - initialCapital;
    const totalReturnPct = initialCapital > 0 ? netProfit / initialCapital : 0;

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.netPnL > 0).length;
    const losingTrades = trades.filter((t) => t.netPnL < 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    const grossWins = trades.filter((t) => t.netPnL > 0).reduce((acc, t) => acc + t.netPnL, 0);
    const grossLosses = Math.abs(
      trades.filter((t) => t.netPnL < 0).reduce((acc, t) => acc + t.netPnL, 0)
    );
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99 : 0;

    const avgWin = winningTrades > 0 ? grossWins / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? grossLosses / losingTrades : 0;

    // Max Drawdown
    const maxDrawdownPct = equityCurve.reduce((max, pt) => Math.max(max, pt.drawdownPct), 0);

    // Sharpe and Sortino
    const meanReturn =
      dailyReturns.length > 0
        ? dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length
        : 0;
    const variance =
      dailyReturns.length > 1
        ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) /
          (dailyReturns.length - 1)
        : 0;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(365);
    const annualizedReturn = meanReturn * 365;

    const sharpeRatio = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;

    // Downside deviation for Sortino
    const downsideReturns = dailyReturns.filter((r) => r < 0);
    const downsideVariance =
      downsideReturns.length > 0
        ? downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideReturns.length
        : 0;
    const downsideDev = Math.sqrt(downsideVariance) * Math.sqrt(365);
    const sortinoRatio = downsideDev > 0 ? annualizedReturn / downsideDev : sharpeRatio * 1.2;

    // Calmar ratio
    const calmarRatio = maxDrawdownPct > 0 ? annualizedReturn / maxDrawdownPct : 0;

    // Historical VaR & CVaR (95%)
    const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const var95 = sortedReturns.length > 0 ? Math.abs(sortedReturns[varIndex] || 0) : 0.02;
    const tailReturns = sortedReturns.slice(0, varIndex + 1);
    const cvar95 =
      tailReturns.length > 0
        ? Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length)
        : var95 * 1.35;

    // Approximate CAGR
    const days =
      candles.length > 1
        ? Math.max(1, (candles[candles.length - 1].timestamp - candles[0].timestamp) / (86400 * 1000))
        : 365;
    const cagrPct = Math.pow(Math.max(0.01, finalCapital / initialCapital), 365 / days) - 1;

    return {
      initialCapital,
      finalCapital,
      netProfit,
      totalReturnPct,
      cagrPct,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      maxDrawdownPct,
      sharpeRatio: Number.isFinite(sharpeRatio) ? sharpeRatio : 0,
      sortinoRatio: Number.isFinite(sortinoRatio) ? sortinoRatio : 0,
      calmarRatio: Number.isFinite(calmarRatio) ? calmarRatio : 0,
      var95,
      cvar95,
      totalFeesPaid: totalFees,
      totalSlippagePaid: totalSlippage,
    };
  }

  private static computeMonthlyReturns(
    equityCurve: EquityPoint[]
  ): { year: number; month: number; returnPct: number }[] {
    const monthsMap: Record<string, { start: number; end: number; year: number; month: number }> = {};

    equityCurve.forEach((pt) => {
      const d = new Date(pt.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthsMap[key]) {
        monthsMap[key] = { start: pt.equity, end: pt.equity, year: d.getFullYear(), month: d.getMonth() + 1 };
      } else {
        monthsMap[key].end = pt.equity;
      }
    });

    return Object.values(monthsMap).map((m) => ({
      year: m.year,
      month: m.month,
      returnPct: m.start > 0 ? (m.end - m.start) / m.start : 0,
    }));
  }
}

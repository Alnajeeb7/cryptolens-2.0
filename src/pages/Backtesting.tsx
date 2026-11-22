import React, { useState } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { useSettingsStore } from '@/store/settingsStore';
import { BacktestEngine } from '@/engine/trading/backtestEngine';
import { StrategyId, BacktestResult } from '@/types/strategy';
import { EquityChart } from '@/components/charts/EquityChart';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatPercent, formatTimestamp } from '@/utils/formatters';
import { Play, Download, CheckCircle, Sliders } from 'lucide-react';

export const BacktestingPage: React.FC = () => {
  const { selectedAsset, candles, indicators } = useMarketStore();
  const { defaultCapital, makerFeeBps, takerFeeBps, slippageBps } = useSettingsStore();

  const [strategyId, setStrategyId] = useState<StrategyId>('dynamic_threshold');
  const [initialCapital, setInitialCapital] = useState(defaultCapital);
  const [stopLossAtr, setStopLossAtr] = useState(2.0);
  const [takeProfitAtr, setTakeProfitAtr] = useState(3.5);
  const [riskFraction, setRiskFraction] = useState(0.02);

  const cList = candles[selectedAsset] || [];
  const indList = indicators[selectedAsset] || [];

  const [result, setResult] = useState<BacktestResult>(() => {
    return BacktestEngine.runBacktest(cList, indList, {
      asset: selectedAsset,
      strategyId: 'dynamic_threshold',
      strategyParams: {},
      initialCapital: defaultCapital,
      makerFeeBps,
      takerFeeBps,
      slippageBps,
      stopLossAtrMult: 2.0,
      takeProfitAtrMult: 3.5,
      riskFractionPerTrade: 0.02,
      maxOpenPositions: 1,
      benchmark: 'buy_and_hold',
    });
  });

  const [isRunning, setIsRunning] = useState(false);

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = BacktestEngine.runBacktest(cList, indList, {
        asset: selectedAsset,
        strategyId,
        strategyParams: {},
        initialCapital,
        makerFeeBps,
        takerFeeBps,
        slippageBps,
        stopLossAtrMult: stopLossAtr,
        takeProfitAtrMult: takeProfitAtr,
        riskFractionPerTrade: riskFraction,
        maxOpenPositions: 1,
        benchmark: 'buy_and_hold',
      });
      setResult(res);
      setIsRunning(false);
    }, 150);
  };

  const exportCSV = () => {
    const headers = 'ID,Asset,Side,EntryTime,EntryPrice,ExitTime,ExitPrice,Qty,GrossPnL,Fees,NetPnL,ReturnPct,ExitReason\n';
    const rows = result.trades
      .map(
        (t) =>
          `${t.id},${t.asset},${t.side},${new Date(t.entryTimestamp).toISOString()},${t.entryPrice},${t.exitTimestamp ? new Date(t.exitTimestamp).toISOString() : ''},${t.exitPrice || ''},${t.quantity},${t.grossPnL},${t.fees},${t.netPnL},${t.returnPct},${t.exitReason || ''}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_${selectedAsset}_${strategyId}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-surface border border-border rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div>
            <span className="text-text-muted mr-1.5">Strategy:</span>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value as StrategyId)}
              className="bg-surface-secondary border border-border rounded px-2 py-1 text-xs text-text-primary"
            >
              <option value="dynamic_threshold">Dynamic Threshold Strategy</option>
              <option value="ensemble_signal">Ensemble Signal Strategy</option>
              <option value="ma_crossover">Moving Average Crossover</option>
              <option value="rsi_momentum">RSI Momentum Reversal</option>
              <option value="macd_crossover">MACD Crossover</option>
              <option value="bollinger_reversion">Bollinger Mean Reversion</option>
            </select>
          </div>

          <div>
            <span className="text-text-muted mr-1.5">Capital:</span>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-24 bg-surface-secondary border border-border rounded px-2 py-1 text-xs"
            />
          </div>

          <div>
            <span className="text-text-muted mr-1.5">SL ATR:</span>
            <input
              type="number"
              step="0.5"
              value={stopLossAtr}
              onChange={(e) => setStopLossAtr(Number(e.target.value))}
              className="w-16 bg-surface-secondary border border-border rounded px-2 py-1 text-xs"
            />
          </div>

          <div>
            <span className="text-text-muted mr-1.5">TP ATR:</span>
            <input
              type="number"
              step="0.5"
              value={takeProfitAtr}
              onChange={(e) => setTakeProfitAtr(Number(e.target.value))}
              className="w-16 bg-surface-secondary border border-border rounded px-2 py-1 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="px-4 py-2 bg-positive hover:bg-positive/90 text-white rounded font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Play size={13} />
            {isRunning ? 'Simulating Trades...' : 'Run Backtest'}
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-surface-secondary border border-border hover:bg-surface-hover text-text-primary rounded font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Equity & Drawdown Chart */}
      <EquityChart data={result.equityCurve} height={320} />

      {/* Comprehensive Quantitative Metrics Grid */}
      <div className="bg-surface border border-border rounded p-4 space-y-3">
        <div className="text-xs font-semibold text-text-primary tracking-wide pb-2 border-b border-border flex justify-between items-center">
          <span>HISTORICAL PERFORMANCE METRICS (AUDITED NET OF FEES & SLIPPAGE)</span>
          <Badge variant="accent">{result.trades.length} TRADES SIMULATED</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Net Profit</div>
            <div className={`text-base font-bold ${result.metrics.netProfit >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatCurrency(result.metrics.netProfit)}
            </div>
          </div>
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Total Return</div>
            <div className={`text-base font-bold ${result.metrics.totalReturnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatPercent(result.metrics.totalReturnPct)}
            </div>
          </div>
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Sharpe Ratio</div>
            <div className="text-base font-bold text-text-primary">{result.metrics.sharpeRatio.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Sortino Ratio</div>
            <div className="text-base font-bold text-text-primary">{result.metrics.sortinoRatio.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Max Drawdown</div>
            <div className="text-base font-bold text-negative">{formatPercent(result.metrics.maxDrawdownPct, 2, false)}</div>
          </div>
          <div className="p-2.5 rounded bg-surface-secondary">
            <div className="text-text-muted text-[10px]">Profit Factor</div>
            <div className="text-base font-bold text-text-primary">{result.metrics.profitFactor.toFixed(2)}</div>
          </div>
        </div>

        {/* Comparison Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div className="flex justify-between p-2 rounded border border-border">
            <span className="text-text-muted">Win Rate:</span>
            <span className="font-bold text-positive">{formatPercent(result.metrics.winRate, 1, false)}</span>
          </div>
          <div className="flex justify-between p-2 rounded border border-border">
            <span className="text-text-muted">Calmar Ratio:</span>
            <span className="font-bold text-text-primary">{result.metrics.calmarRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between p-2 rounded border border-border">
            <span className="text-text-muted">Total Fees Paid:</span>
            <span className="font-bold text-text-primary">{formatCurrency(result.metrics.totalFeesPaid)}</span>
          </div>
          <div className="flex justify-between p-2 rounded border border-border">
            <span className="text-text-muted">Total Slippage Cost:</span>
            <span className="font-bold text-text-primary">{formatCurrency(result.metrics.totalSlippagePaid)}</span>
          </div>
        </div>
      </div>

      {/* Simulated Trade Execution Log */}
      <div className="bg-surface border border-border rounded p-4 space-y-2">
        <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border">
          SYSTEMATIC TRADE LOG
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-text-muted text-[11px]">
                <th className="py-1.5 px-2">ID</th>
                <th className="py-1.5 px-2">Side</th>
                <th className="py-1.5 px-2">Entry Time</th>
                <th className="py-1.5 px-2">Entry Price</th>
                <th className="py-1.5 px-2">Exit Time</th>
                <th className="py-1.5 px-2">Exit Price</th>
                <th className="py-1.5 px-2">Net P&L</th>
                <th className="py-1.5 px-2">Return</th>
                <th className="py-1.5 px-2">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.trades.slice(-20).map((trade) => (
                <tr key={trade.id} className="hover:bg-surface-secondary/50">
                  <td className="py-1.5 px-2 text-text-muted">{trade.id.slice(0, 10)}</td>
                  <td className="py-1.5 px-2">
                    <Badge variant={trade.side === 'BUY' ? 'positive' : 'negative'}>{trade.side}</Badge>
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary">{formatTimestamp(trade.entryTimestamp, 'time')}</td>
                  <td className="py-1.5 px-2 font-semibold">{formatCurrency(trade.entryPrice)}</td>
                  <td className="py-1.5 px-2 text-text-secondary">
                    {trade.exitTimestamp ? formatTimestamp(trade.exitTimestamp, 'time') : 'OPEN'}
                  </td>
                  <td className="py-1.5 px-2">{trade.exitPrice ? formatCurrency(trade.exitPrice) : '—'}</td>
                  <td className={`py-1.5 px-2 font-bold ${trade.netPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatCurrency(trade.netPnL)}
                  </td>
                  <td className={`py-1.5 px-2 font-medium ${trade.returnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatPercent(trade.returnPct)}
                  </td>
                  <td className="py-1.5 px-2">
                    <Badge variant="neutral">{trade.exitReason || 'HOLDING'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  PieChart as PieIcon,
  Activity,
  Layers,
  CandlestickChart as CandleIcon,
  LineChart as LineIcon,
} from 'lucide-react';
import { useMarketStore } from '@/store/marketStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useSettingsStore } from '@/store/settingsStore';
import { KpiCard } from '@/components/common/KpiCard';
import { Badge } from '@/components/common/Badge';
import { EquityChart } from '@/components/charts/EquityChart';
import { LightweightCandleChart } from '@/components/charts/LightweightCandleChart';
import { BacktestEngine } from '@/engine/trading/backtestEngine';
import { RiskEngine } from '@/engine/risk/riskEngine';
import { EnsembleEngine } from '@/engine/signals/ensembleEngine';
import { DynamicThresholdEngine } from '@/engine/signals/dynamicThresholdEngine';
import { MarketRegimeClassifier } from '@/engine/signals/regimeClassifier';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/utils/formatters';
import { SupportedAsset } from '@/types/market';

export const OverviewPage: React.FC = () => {
  const { candles, indicators, selectedAsset, assetSummaries, setSelectedAsset, watchlist } = useMarketStore();
  const { currentWeights, settings: portfolioSettings } = usePortfolioStore();
  const [mainChartTab, setMainChartTab] = useState<'candlestick' | 'equity'>('candlestick');

  const cList = candles[selectedAsset] || [];
  const indList = indicators[selectedAsset] || [];

  // Run initial baseline strategy simulation
  const backtestResult = useMemo(() => {
    return BacktestEngine.runBacktest(cList, indList, {
      asset: selectedAsset,
      strategyId: 'dynamic_threshold',
      strategyParams: {},
      initialCapital: portfolioSettings.capital,
      makerFeeBps: 10,
      takerFeeBps: 15,
      slippageBps: 5,
      stopLossAtrMult: 2.0,
      takeProfitAtrMult: 3.5,
      riskFractionPerTrade: 0.02,
      maxOpenPositions: 1,
      benchmark: 'buy_and_hold',
    });
  }, [cList, indList, selectedAsset, portfolioSettings.capital]);

  const riskMetrics = useMemo(() => {
    return RiskEngine.calculateRiskMetrics(
      backtestResult.equityCurve,
      currentWeights
    );
  }, [backtestResult.equityCurve, currentWeights]);

  const latestEnsemble = useMemo(() => {
    const ensEngine = new EnsembleEngine();
    return ensEngine.calculateEnsemble(selectedAsset, '24h', cList, indList);
  }, [selectedAsset, cList, indList]);

  const latestThreshold = useMemo(() => {
    return DynamicThresholdEngine.calculateThresholds(selectedAsset, cList, indList, latestEnsemble);
  }, [selectedAsset, cList, indList, latestEnsemble]);

  const regime = useMemo(() => {
    return MarketRegimeClassifier.classify(cList, indList);
  }, [cList, indList]);

  const summary = assetSummaries[selectedAsset];

  return (
    <div className="space-y-4">
      {/* Top Financial KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Portfolio Value"
          value={formatCurrency(backtestResult.metrics.finalCapital)}
          change={formatPercent(backtestResult.metrics.totalReturnPct)}
          changeType={backtestResult.metrics.totalReturnPct >= 0 ? 'positive' : 'negative'}
          icon={<DollarSign size={15} />}
          subtext="Simulated equity"
        />
        <KpiCard
          label="Daily P&L"
          value={formatCurrency(summary?.change24h ? summary.price * summary.change24h * 1.5 : 0)}
          change={formatPercent(summary?.change24h || 0)}
          changeType={(summary?.change24h || 0) >= 0 ? 'positive' : 'negative'}
          icon={<TrendingUp size={15} />}
          subtext="24h asset drift"
        />
        <KpiCard
          label="Sharpe Ratio"
          value={backtestResult.metrics.sharpeRatio.toFixed(2)}
          change="Annualized"
          changeType="neutral"
          icon={<Activity size={15} />}
          subtext="Risk-adjusted return"
        />
        <KpiCard
          label="Max Drawdown"
          value={formatPercent(backtestResult.metrics.maxDrawdownPct, 2, false)}
          changeType="negative"
          change="Peak-to-Trough"
          icon={<ShieldAlert size={15} />}
          subtext="Capital preservation"
        />
        <KpiCard
          label="95% Daily CVaR"
          value={formatPercent(riskMetrics.historicalCVaR95, 2, false)}
          changeType="warning"
          change="Tail Risk"
          icon={<Layers size={15} />}
          subtext="Expected conditional loss"
        />
        <KpiCard
          label="Win Rate"
          value={formatPercent(backtestResult.metrics.winRate, 1, false)}
          change={`${backtestResult.metrics.winningTrades}/${backtestResult.metrics.totalTrades} W/L`}
          changeType={backtestResult.metrics.winRate >= 0.5 ? 'positive' : 'negative'}
          icon={<PieIcon size={15} />}
          subtext="Systematic execution"
        />
      </div>

      {/* Main Grid: TradingView Candlestick Chart / Equity Curve + Right Watchlist Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 columns: Primary Chart Workspace */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface border border-border rounded p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-text-primary px-1">
                {selectedAsset} / USD
              </span>
              <Badge variant={summary?.change24h >= 0 ? 'positive' : 'negative'}>
                {formatPercent(summary?.change24h || 0)}
              </Badge>
              <span className="text-[11px] text-text-muted font-mono hidden sm:inline">
                5-Year Historical Market Data
              </span>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center bg-surface-secondary border border-border rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setMainChartTab('candlestick')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  mainChartTab === 'candlestick'
                    ? 'bg-surface text-text-primary font-bold shadow-xs border border-border/60'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <CandleIcon size={13} className="text-[#089981]" />
                TradingView Candlesticks
              </button>
              <button
                onClick={() => setMainChartTab('equity')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  mainChartTab === 'equity'
                    ? 'bg-surface text-text-primary font-bold shadow-xs border border-border/60'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <LineIcon size={13} className="text-accent" />
                Strategy Equity
              </button>
            </div>
          </div>

          {mainChartTab === 'candlestick' ? (
            <LightweightCandleChart
              symbol={selectedAsset}
              candles={cList}
              indicators={indList}
              showEma={true}
              showBollinger={false}
              height={420}
            />
          ) : (
            <EquityChart data={backtestResult.equityCurve} height={420} />
          )}

          {/* Bottom Grid: Current Allocation & Recent Systematic Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asset Allocation Panel */}
            <div className="bg-surface border border-border rounded p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary tracking-wide">
                  PORTFOLIO ALLOCATION WEIGHTS
                </span>
                <Badge variant="accent">LONG ONLY</Badge>
              </div>

              <div className="space-y-2.5">
                {(Object.keys(currentWeights) as SupportedAsset[]).map((asset) => {
                  const weight = currentWeights[asset] || 0;
                  const price = assetSummaries[asset]?.price || 0;
                  return (
                    <div key={asset} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-semibold text-text-primary">{asset}</span>
                        <span className="text-text-secondary">
                          {(weight * 100).toFixed(1)}% ({formatCurrency(portfolioSettings.capital * weight)})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-secondary rounded overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Market Regime & Decision Intelligence */}
            <div className="bg-surface border border-border rounded p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text-primary tracking-wide">
                    QUANTITATIVE REGIME & SIGNAL INTEL
                  </span>
                  <Badge variant={regime.isTrendBullish ? 'positive' : 'negative'}>
                    {regime.regime.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-secondary">Asset</span>
                    <span className="font-semibold">{selectedAsset} / USD</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-secondary">Ensemble Score</span>
                    <span className={latestEnsemble.ensembleScore >= 0 ? 'text-positive font-bold' : 'text-negative font-bold'}>
                      {latestEnsemble.ensembleScore.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-secondary">Dynamic Buy Threshold</span>
                    <span className="text-accent font-semibold">{latestThreshold.dynamicBuyThreshold.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-secondary">Dynamic Sell Threshold</span>
                    <span className="text-negative font-semibold">{latestThreshold.dynamicSellThreshold.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-secondary">Model Disagreement</span>
                    <span className={latestEnsemble.isFlaggedForDisagreement ? 'text-warning font-semibold' : 'text-text-muted'}>
                      {latestEnsemble.disagreement.toFixed(2)} {latestEnsemble.isFlaggedForDisagreement ? '(Flagged)' : '(Low)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 rounded bg-surface-secondary text-[11px] text-text-secondary font-mono">
                {regime.description}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 column: Watchlist & Quick Switcher */}
        <div className="bg-surface border border-border rounded p-3 flex flex-col max-h-[640px]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              WATCHLIST (TOP COINS)
            </span>
            <span className="text-[10px] font-mono text-text-muted">{Object.keys(assetSummaries).length} COINS</span>
          </div>

          <div className="divide-y divide-border flex-1 overflow-y-auto">
            {Object.keys(assetSummaries).map((asset) => {
              const item = assetSummaries[asset];
              const isSelected = selectedAsset === asset;

              return (
                <div
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`py-2 px-1.5 flex items-center justify-between cursor-pointer transition-colors rounded ${
                    isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-hover'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-text-primary">{asset}</span>
                      <span className="text-[10px] text-text-muted truncate max-w-[80px]">{item.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Vol: {formatCompactNumber(item.volume24h)}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-semibold text-text-primary">
                      {formatCurrency(item.price, item.price < 0.1 ? 6 : item.price < 2 ? 4 : 2)}
                    </div>
                    <div
                      className={`text-[11px] font-medium ${
                        item.change24h >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {formatPercent(item.change24h)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Risk Alerts */}
          <div className="mt-3 pt-2 border-t border-border">
            <div className="text-[11px] font-semibold text-text-secondary uppercase mb-1.5">
              Risk Notifications
            </div>
            {riskMetrics.activeAlerts.length > 0 ? (
              <div className="space-y-1.5">
                {riskMetrics.activeAlerts.map((al) => (
                  <div key={al.id} className="p-1.5 rounded bg-warning/10 border border-warning/20 text-[11px]">
                    <span className="font-semibold text-warning">{al.title}:</span>{' '}
                    <span className="text-text-secondary">{al.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-positive font-mono">
                No critical risk breaches detected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

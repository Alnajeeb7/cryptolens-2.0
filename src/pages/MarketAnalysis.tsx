import React, { useState, useMemo } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { LightweightCandleChart } from '@/components/charts/LightweightCandleChart';
import { IndicatorSubChart } from '@/components/charts/IndicatorSubChart';
import { Badge } from '@/components/common/Badge';
import { EnsembleEngine } from '@/engine/signals/ensembleEngine';
import { DynamicThresholdEngine } from '@/engine/signals/dynamicThresholdEngine';
import { MarketRegimeClassifier } from '@/engine/signals/regimeClassifier';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters';

export const MarketAnalysisPage: React.FC = () => {
  const { selectedAsset, candles, indicators, assetSummaries } = useMarketStore();
  const [showEma, setShowEma] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [activeSubChart, setActiveSubChart] = useState<'RSI' | 'MACD'>('RSI');

  const cList = candles[selectedAsset] || [];
  const indList = indicators[selectedAsset] || [];
  const summary = assetSummaries[selectedAsset];

  const ensemble = useMemo(() => {
    const engine = new EnsembleEngine();
    return engine.calculateEnsemble(selectedAsset, '24h', cList, indList);
  }, [selectedAsset, cList, indList]);

  const threshold = useMemo(() => {
    return DynamicThresholdEngine.calculateThresholds(selectedAsset, cList, indList, ensemble);
  }, [selectedAsset, cList, indList, ensemble]);

  const regime = useMemo(() => {
    return MarketRegimeClassifier.classify(cList, indList);
  }, [cList, indList]);

  const lastInd = indList[indList.length - 1];

  return (
    <div className="space-y-3">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface border border-border p-2 rounded">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-text-primary px-2">
            {selectedAsset} / USD
          </span>
          <Badge variant={summary?.change24h >= 0 ? 'positive' : 'negative'}>
            {formatPercent(summary?.change24h || 0)}
          </Badge>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <span className="text-xs text-text-muted font-mono">
            {cList.length} Bars Loaded
          </span>
        </div>

        {/* Overlay and Sub-chart toggles */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2 py-1 rounded border transition-colors ${
              showEma ? 'bg-surface-secondary border-accent text-accent font-semibold' : 'border-border text-text-muted'
            }`}
          >
            EMA (12/26)
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-1 rounded border transition-colors ${
              showBollinger ? 'bg-surface-secondary border-accent text-accent font-semibold' : 'border-border text-text-muted'
            }`}
          >
            Bollinger (20, 2)
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            onClick={() => setActiveSubChart('RSI')}
            className={`px-2 py-1 rounded border transition-colors ${
              activeSubChart === 'RSI' ? 'bg-surface-secondary border-accent text-accent font-semibold' : 'border-border text-text-muted'
            }`}
          >
            RSI
          </button>
          <button
            onClick={() => setActiveSubChart('MACD')}
            className={`px-2 py-1 rounded border transition-colors ${
              activeSubChart === 'MACD' ? 'bg-surface-secondary border-accent text-accent font-semibold' : 'border-border text-text-muted'
            }`}
          >
            MACD
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chart + Right Terminal Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Left: Charts (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <LightweightCandleChart
            symbol={selectedAsset}
            candles={cList}
            indicators={indList}
            showEma={showEma}
            showBollinger={showBollinger}
            height={480}
          />

          {/* Sub Chart */}
          <IndicatorSubChart type={activeSubChart} data={indList} height={140} />
        </div>

        {/* Right: Quantitative Stats & Technical Indicators */}
        <div className="space-y-3">
          {/* Signal & Threshold Intelligence Box */}
          <div className="bg-surface border border-border rounded p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-text-primary tracking-wide">
                QUANT SIGNAL & THRESHOLDS
              </span>
              <Badge variant={regime.isTrendBullish ? 'positive' : 'negative'}>
                {regime.regime.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Ensemble Score</span>
                <span className={ensemble.ensembleScore >= 0 ? 'text-positive font-bold' : 'text-negative font-bold'}>
                  {ensemble.ensembleScore.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Adaptive Buy Thresh</span>
                <span className="text-positive font-semibold">{threshold.dynamicBuyThreshold.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Adaptive Sell Thresh</span>
                <span className="text-negative font-semibold">{threshold.dynamicSellThreshold.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Model Confidence</span>
                <span className="font-semibold text-text-primary">{(ensemble.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Realized Vol Ratio</span>
                <span className="text-text-primary font-medium">{regime.volatilityRatio.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Trend Strength (ADX)</span>
                <span className="text-text-primary font-medium">{regime.adx.toFixed(1)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="text-[11px] font-semibold text-text-muted mb-1">DECISION DIRECTIVE:</div>
              <div className="p-2 rounded bg-surface-secondary text-xs font-mono font-bold text-center">
                {ensemble.ensembleScore > threshold.dynamicBuyThreshold
                  ? 'BUY / ACCUMULATE'
                  : ensemble.ensembleScore < threshold.dynamicSellThreshold
                  ? 'SELL / EXIT'
                  : 'HOLD / NEUTRAL'}
              </div>
            </div>
          </div>

          {/* Real Technical Indicator Snapshot */}
          <div className="bg-surface border border-border rounded p-3 space-y-2">
            <div className="text-xs font-semibold text-text-primary tracking-wide pb-1.5 border-b border-border">
              TECHNICAL INDICATOR SNAPSHOT
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">SMA (20)</span>
                <span>{lastInd?.sma20 ? formatCurrency(lastInd.sma20) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">SMA (50)</span>
                <span>{lastInd?.sma50 ? formatCurrency(lastInd.sma50) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">EMA (12)</span>
                <span>{lastInd?.ema12 ? formatCurrency(lastInd.ema12) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">EMA (26)</span>
                <span>{lastInd?.ema26 ? formatCurrency(lastInd.ema26) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">RSI (14)</span>
                <span className={(lastInd?.rsi14 ?? 50) > 70 ? 'text-negative' : (lastInd?.rsi14 ?? 50) < 30 ? 'text-positive' : ''}>
                  {lastInd?.rsi14?.toFixed(2) ?? 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">ATR (14)</span>
                <span>{lastInd?.atr14 ? formatCurrency(lastInd.atr14) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">Annualized Vol</span>
                <span>{lastInd?.historicalVolatility ? formatPercent(lastInd.historicalVolatility) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-secondary">OBV</span>
                <span>{lastInd?.obv ? formatNumber(lastInd.obv, 0) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

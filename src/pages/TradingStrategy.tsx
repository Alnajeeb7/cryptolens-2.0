import React, { useState } from 'react';
import { StrategyId } from '@/types/strategy';
import { Badge } from '@/components/common/Badge';
import { Sliders, Shield, Zap, DollarSign, Save } from 'lucide-react';

export const TradingStrategyPage: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('dynamic_threshold');
  const [params, setParams] = useState({
    fastEma: 12,
    slowEma: 26,
    rsiLower: 30,
    rsiUpper: 70,
    bbLength: 20,
    bbMultiplier: 2.0,
    stopLossAtr: 2.0,
    takeProfitAtr: 3.5,
    riskFraction: 0.02,
    maxPositions: 1,
    makerFeeBps: 10,
    takerFeeBps: 15,
    slippageBps: 5,
  });

  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = () => {
    localStorage.setItem('cryptolens_strategy_params', JSON.stringify({ strategy: selectedStrategy, params }));
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const strategies: { id: StrategyId; name: string; tag: string; description: string }[] = [
    {
      id: 'dynamic_threshold',
      name: 'CryptoLens Dynamic Threshold Strategy',
      tag: 'Research Core',
      description: 'Adapts entry and exit thresholds dynamically based on real-time volatility, regime classification, transaction costs, and model confidence.',
    },
    {
      id: 'ensemble_signal',
      name: 'Ensemble Multi-Model Strategy',
      tag: 'Machine Learning',
      description: 'Executes systematically based on the weighted consensus of LSTM, GRU, XGBoost, and statistical models with fixed score thresholds.',
    },
    {
      id: 'ma_crossover',
      name: 'Moving Average Crossover',
      tag: 'Trend Following',
      description: 'Classical trend-following strategy using fast and slow exponential moving average crossovers.',
    },
    {
      id: 'rsi_momentum',
      name: 'RSI Mean Reversion',
      tag: 'Momentum',
      description: 'Buys when market reaches oversold boundaries and sells at overbought extremes using Wilder smoothed RSI.',
    },
    {
      id: 'macd_crossover',
      name: 'MACD Signal Crossover',
      tag: 'Momentum',
      description: 'Enters when the MACD line crosses above the 9-period signal line and exits on negative histogram flip.',
    },
    {
      id: 'bollinger_reversion',
      name: 'Bollinger Band Mean Reversion',
      tag: 'Volatility',
      description: 'Exploits statistical price extremes by longing touches of the lower 2-sigma band with profit-taking at the middle band.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Strategy Selection Grid */}
      <div className="bg-surface border border-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              SYSTEMATIC STRATEGY CATALOG
            </span>
          </div>
          <Badge variant="accent">6 STRATEGIES</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map((strat) => {
            const isSelected = selectedStrategy === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => setSelectedStrategy(strat.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-accent bg-surface-secondary shadow-sm'
                    : 'border-border bg-surface hover:border-text-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-text-primary">{strat.name}</span>
                  <Badge variant={isSelected ? 'accent' : 'neutral'}>{strat.tag}</Badge>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{strat.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parameter Configuration Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk & Position Execution Parameters */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Shield size={16} className="text-positive" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              RISK MANAGEMENT & POSITION SIZING
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex justify-between mb-1 text-text-secondary">
                <span>Stop-Loss (ATR Multiplier):</span>
                <span className="font-bold text-text-primary">{params.stopLossAtr}x ATR</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.25"
                value={params.stopLossAtr}
                onChange={(e) => setParams({ ...params, stopLossAtr: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-text-secondary">
                <span>Take-Profit (ATR Multiplier):</span>
                <span className="font-bold text-text-primary">{params.takeProfitAtr}x ATR</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.25"
                value={params.takeProfitAtr}
                onChange={(e) => setParams({ ...params, takeProfitAtr: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-text-secondary">
                <span>Risk Fraction Per Trade:</span>
                <span className="font-bold text-text-primary">{(params.riskFraction * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.05"
                step="0.005"
                value={params.riskFraction}
                onChange={(e) => setParams({ ...params, riskFraction: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>

        {/* Transaction Cost & Slippage Assumptions */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <DollarSign size={16} className="text-warning" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              COST SIMULATION ASSUMPTIONS
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Maker Fee:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={params.makerFeeBps}
                  onChange={(e) => setParams({ ...params, makerFeeBps: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-surface-secondary border border-border rounded text-right text-xs"
                />
                <span className="text-text-muted">bps</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Taker Fee:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={params.takerFeeBps}
                  onChange={(e) => setParams({ ...params, takerFeeBps: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-surface-secondary border border-border rounded text-right text-xs"
                />
                <span className="text-text-muted">bps</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Expected Slippage:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={params.slippageBps}
                  onChange={(e) => setParams({ ...params, slippageBps: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-surface-secondary border border-border rounded text-right text-xs"
                />
                <span className="text-text-muted">bps</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-2 py-2 bg-accent hover:bg-accent/90 text-white rounded font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={14} />
              {savedNotification ? 'Configuration Saved!' : 'Save Strategy Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

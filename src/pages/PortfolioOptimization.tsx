import React, { useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useMarketStore } from '@/store/marketStore';
import { OptimizationMethod } from '@/types/portfolio';
import { SupportedAsset } from '@/types/market';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { PieChart, RefreshCw, ArrowRightLeft, Layers, ShieldCheck } from 'lucide-react';

export const PortfolioOptimizationPage: React.FC = () => {
  const {
    settings,
    currentWeights,
    optimizationResult,
    isOptimizing,
    setCapital,
    setSelectedAssets,
    setMethod,
    setRiskAversion,
    runOptimization,
    applyRebalance,
  } = usePortfolioStore();

  const allAssets: SupportedAsset[] = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA'];

  useEffect(() => {
    if (!optimizationResult) {
      runOptimization();
    }
  }, []);

  const methods: { id: OptimizationMethod; label: string; desc: string }[] = [
    { id: 'mean_variance', label: 'Mean-Variance', desc: 'Quadratic utility maximization balancing return vs variance.' },
    { id: 'minimum_variance', label: 'Minimum Variance', desc: 'Minimizes total portfolio variance regardless of return.' },
    { id: 'risk_parity', label: 'Risk Parity', desc: 'Balances risk contribution equally across all portfolio assets.' },
    { id: 'cvar_optimization', label: 'CVaR Optimization', desc: 'Minimizes tail downside loss (Conditional Value at Risk).' },
    { id: 'equal_weight', label: 'Equal Weight', desc: '1/N baseline allocation across selected assets.' },
  ];

  const toggleAsset = (asset: SupportedAsset) => {
    const current = settings.selectedAssets;
    if (current.includes(asset)) {
      if (current.length > 2) {
        setSelectedAssets(current.filter((a) => a !== asset));
      }
    } else {
      setSelectedAssets([...current, asset]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Grid */}
      <div className="bg-surface border border-border rounded p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              QUANTITATIVE ALLOCATION ENGINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runOptimization}
              disabled={isOptimizing}
              className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} className={isOptimizing ? 'animate-spin' : ''} />
              Re-Optimize
            </button>
            <button
              onClick={applyRebalance}
              disabled={!optimizationResult?.feasible}
              className="px-3 py-1.5 bg-positive hover:bg-positive/90 text-white rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft size={13} />
              Execute Rebalancing
            </button>
          </div>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {methods.map((m) => {
            const isSelected = settings.method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`p-2.5 rounded border text-left transition-all ${
                  isSelected
                    ? 'border-accent bg-surface-secondary shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="font-semibold text-xs text-text-primary">{m.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{m.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Asset Selection & Parameter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Included Assets:</span>
            <div className="flex gap-1">
              {allAssets.map((asset) => {
                const isSelected = settings.selectedAssets.includes(asset);
                return (
                  <button
                    key={asset}
                    onClick={() => toggleAsset(asset)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-accent text-white'
                        : 'bg-surface-secondary text-text-muted border border-border'
                    }`}
                  >
                    {asset}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Capital:</span>
              <input
                type="number"
                value={settings.capital}
                onChange={(e) => setCapital(parseFloat(e.target.value) || 10000)}
                className="w-24 px-2 py-1 bg-surface-secondary border border-border rounded text-right"
              />
            </div>
            {settings.method === 'mean_variance' && (
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Risk Aversion (λ):</span>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={settings.riskAversion}
                  onChange={(e) => setRiskAversion(parseFloat(e.target.value))}
                  className="w-20 accent-accent"
                />
                <span className="text-text-primary font-bold">{settings.riskAversion.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optimization Statistics & Rebalance Orders */}
      {optimizationResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Key Optimization Statistics */}
          <div className="bg-surface border border-border rounded p-4 space-y-3">
            <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border">
              PORTFOLIO EXPECTED METRICS
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Expected Return (Ann):</span>
                <span className="text-positive font-bold">
                  {formatPercent(optimizationResult.expectedReturnAnnualized)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Expected Volatility (Ann):</span>
                <span className="text-text-primary font-semibold">
                  {formatPercent(optimizationResult.volatilityAnnualized)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Sharpe Ratio:</span>
                <span className="text-accent font-bold">{optimizationResult.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">95% Daily VaR:</span>
                <span>{formatPercent(optimizationResult.var95, 2, false)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">95% Daily CVaR:</span>
                <span className="text-warning font-semibold">
                  {formatPercent(optimizationResult.cvar95, 2, false)}
                </span>
              </div>
            </div>
            <div className="p-2 rounded bg-surface-secondary text-[11px] text-text-secondary font-mono">
              {optimizationResult.statusMessage}
            </div>
          </div>

          {/* Allocation Weights Comparison (Current vs Target) */}
          <div className="md:col-span-2 bg-surface border border-border rounded p-4 space-y-3">
            <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border flex justify-between">
              <span>WEIGHT ALLOCATION (CURRENT VS OPTIMIZED)</span>
              <span className="text-text-muted font-mono text-[10px]">SUM: 100.0%</span>
            </div>

            <div className="space-y-2.5">
              {settings.selectedAssets.map((asset) => {
                const targetW = optimizationResult.weights[asset] || 0;
                const currentW = currentWeights[asset] || 0;
                return (
                  <div key={asset} className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="font-bold text-text-primary">{asset}</span>
                      <div className="flex gap-4">
                        <span className="text-text-muted">Current: {(currentW * 100).toFixed(1)}%</span>
                        <span className="text-accent font-semibold">Target: {(targetW * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-secondary rounded overflow-hidden flex">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${targetW * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Rebalancing Recommendations Table */}
      {optimizationResult && (
        <div className="bg-surface border border-border rounded p-4 space-y-2">
          <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border flex justify-between">
            <span>RECOMMENDED REBALANCING TRADES</span>
            <Badge variant="accent">TRANSACTION-AWARE</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-text-muted text-[11px]">
                  <th className="py-2 px-2">Asset</th>
                  <th className="py-2 px-2">Current Weight</th>
                  <th className="py-2 px-2">Target Weight</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Capital Delta</th>
                  <th className="py-2 px-2">Estimated Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {optimizationResult.rebalanceOrders.map((order) => (
                  <tr key={order.asset} className="hover:bg-surface-secondary/50">
                    <td className="py-2 px-2 font-bold">{order.asset}</td>
                    <td className="py-2 px-2 text-text-secondary">{(order.currentWeight * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2 font-semibold">{(order.targetWeight * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          order.action === 'BUY'
                            ? 'positive'
                            : order.action === 'SELL'
                            ? 'negative'
                            : 'neutral'
                        }
                      >
                        {order.action}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 font-semibold">
                      {order.capitalDelta >= 0 ? `+${formatCurrency(order.capitalDelta)}` : formatCurrency(order.capitalDelta)}
                    </td>
                    <td className="py-2 px-2 text-text-muted">{formatCurrency(order.estimatedFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

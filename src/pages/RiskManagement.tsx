import React, { useState, useMemo } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { RiskEngine } from '@/engine/risk/riskEngine';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { ShieldAlert, AlertTriangle, Calculator, ShieldCheck } from 'lucide-react';
import { SupportedAsset } from '@/types/market';

export const RiskManagementPage: React.FC = () => {
  const { selectedAsset, assetSummaries, indicators } = useMarketStore();
  const { settings, currentWeights } = usePortfolioStore();

  const [calcRiskPct, setCalcRiskPct] = useState(0.02);
  const [calcStopDistPct, setCalcStopDistPct] = useState(0.04);

  const price = assetSummaries[selectedAsset]?.price || 50000;
  const indList = indicators[selectedAsset] || [];
  const lastAtr = indList[indList.length - 1]?.atr14 || price * 0.03;

  // Position Sizing Calculation
  const positionSize = useMemo(() => {
    const stopPrice = price * (1 - calcStopDistPct);
    return RiskEngine.calculatePositionSize(
      selectedAsset,
      price,
      stopPrice,
      settings.capital,
      calcRiskPct,
      0.35 // Max 35% capital
    );
  }, [selectedAsset, price, settings.capital, calcRiskPct, calcStopDistPct]);

  // ATR Stops
  const atrStops = useMemo(() => {
    return RiskEngine.calculateAtrStops(price, lastAtr, 'LONG', 2.0, 3.5);
  }, [price, lastAtr]);

  // General Risk Metrics
  const riskMetrics = useMemo(() => {
    return RiskEngine.calculateRiskMetrics([], currentWeights);
  }, [currentWeights]);

  return (
    <div className="space-y-4">
      {/* Top Risk Exposure KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded bg-surface border border-border">
          <div className="text-[11px] font-mono text-text-muted uppercase mb-1">95% Daily VaR</div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {formatPercent(riskMetrics.historicalVaR95, 2, false)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Parametric / Historical</div>
        </div>

        <div className="p-3.5 rounded bg-surface border border-border">
          <div className="text-[11px] font-mono text-text-muted uppercase mb-1">95% Daily CVaR</div>
          <div className="text-xl font-bold font-mono text-warning">
            {formatPercent(riskMetrics.historicalCVaR95, 2, false)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Expected Tail Loss</div>
        </div>

        <div className="p-3.5 rounded bg-surface border border-border">
          <div className="text-[11px] font-mono text-text-muted uppercase mb-1">Concentration (HHI)</div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {riskMetrics.concentrationRiskHerfindahl.toFixed(2)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Herfindahl Index</div>
        </div>

        <div className="p-3.5 rounded bg-surface border border-border">
          <div className="text-[11px] font-mono text-text-muted uppercase mb-1">Portfolio Volatility</div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {formatPercent(riskMetrics.realizedVolatilityAnnualized)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Annualized Realized</div>
        </div>
      </div>

      {/* Main 2-column: Position Sizing Calculator + Active Risk Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Systematic Position Sizing Engine */}
        <div className="bg-surface border border-border rounded p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Calculator size={16} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              SYSTEMATIC POSITION SIZING CALCULATOR
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-2 rounded bg-surface-secondary text-[11px] text-text-secondary">
              Position Size = (Capital · RiskFraction) / |EntryPrice - StopLoss|
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-text-secondary">Selected Asset Price:</span>
              <span className="font-bold text-text-primary">{formatCurrency(price)}</span>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-text-secondary">
                <span>Risk Capital Fraction:</span>
                <span className="font-bold text-accent">{(calcRiskPct * 100).toFixed(1)}% ({formatCurrency(settings.capital * calcRiskPct)})</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.05"
                step="0.005"
                value={calcRiskPct}
                onChange={(e) => setCalcRiskPct(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-text-secondary">
                <span>Stop Loss Distance:</span>
                <span className="font-bold text-negative">{(calcStopDistPct * 100).toFixed(1)}% ({formatCurrency(price * (1 - calcStopDistPct))})</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.005"
                value={calcStopDistPct}
                onChange={(e) => setCalcStopDistPct(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            <div className="pt-2 border-t border-border space-y-1.5 bg-surface-secondary/40 p-2.5 rounded">
              <div className="flex justify-between">
                <span className="text-text-secondary">Recommended Units:</span>
                <span className="font-bold text-text-primary">{positionSize.recommendedUnits.toFixed(4)} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Position Value:</span>
                <span className="font-bold text-text-primary">{formatCurrency(positionSize.positionValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Capital Exposure:</span>
                <span className="font-bold text-text-primary">{formatPercent(positionSize.capitalFraction)}</span>
              </div>
              {positionSize.isConstrained && (
                <div className="text-[11px] text-warning pt-1">
                  Constraint: {positionSize.constraintReason}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic ATR Stop Loss & Risk Alerts */}
        <div className="space-y-4">
          {/* ATR Volatility Stops */}
          <div className="bg-surface border border-border rounded p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <ShieldCheck size={16} className="text-positive" />
              <span className="text-xs font-semibold text-text-primary tracking-wide">
                ATR-DERIVED DYNAMIC STOPS
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Current 14-bar ATR:</span>
                <span>{formatCurrency(lastAtr)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Stop-Loss (2.0x ATR):</span>
                <span className="text-negative font-semibold">{formatCurrency(atrStops.stopLoss)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">Take-Profit (3.5x ATR):</span>
                <span className="text-positive font-semibold">{formatCurrency(atrStops.takeProfit)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Risk / Reward Ratio:</span>
                <span className="font-bold text-text-primary">1 : {atrStops.riskRewardRatio.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Active Risk Alerts */}
          <div className="bg-surface border border-border rounded p-4 space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <ShieldAlert size={16} className="text-warning" />
              <span className="text-xs font-semibold text-text-primary tracking-wide">
                ACTIVE RISK ALERTS & CONSTRAINTS
              </span>
            </div>

            {riskMetrics.activeAlerts.map((al) => (
              <div
                key={al.id}
                className="p-2.5 rounded border border-warning/30 bg-warning/10 text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-warning">{al.title}</span>
                  <Badge variant="warning">ALERT</Badge>
                </div>
                <p className="text-[11px] text-text-secondary">{al.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

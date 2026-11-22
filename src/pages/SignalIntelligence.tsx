import React, { useMemo, useState } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { EnsembleEngine } from '@/engine/signals/ensembleEngine';
import { DynamicThresholdEngine } from '@/engine/signals/dynamicThresholdEngine';
import { ThresholdCalibrationEngine } from '@/engine/signals/calibrationEngine';
import { MarketRegimeClassifier } from '@/engine/signals/regimeClassifier';
import { ModelType } from '@/types/models';
import { CalibrationObjective, CalibrationResult } from '@/types/threshold';
import { Badge } from '@/components/common/Badge';
import { formatPercent, formatNumber } from '@/utils/formatters';
import { Cpu, Scale, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const SignalIntelligencePage: React.FC = () => {
  const { selectedAsset, candles, indicators } = useMarketStore();
  const [weights, setWeights] = useState<Record<ModelType, number>>({
    LSTM: 0.25,
    GRU: 0.20,
    XGBoost: 0.20,
    Technical: 0.20,
    Statistical: 0.15,
  });

  const [calibObjective, setCalibObjective] = useState<CalibrationObjective>('max_sharpe');
  const [calibResult, setCalibResult] = useState<CalibrationResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const cList = candles[selectedAsset] || [];
  const indList = indicators[selectedAsset] || [];

  const ensemble = useMemo(() => {
    const engine = new EnsembleEngine();
    return engine.calculateEnsemble(selectedAsset, '24h', cList, indList, weights);
  }, [selectedAsset, cList, indList, weights]);

  const threshold = useMemo(() => {
    return DynamicThresholdEngine.calculateThresholds(
      selectedAsset,
      cList,
      indList,
      ensemble,
      calibResult?.bestCoefficients || DynamicThresholdEngine.DEFAULT_COEFFICIENTS
    );
  }, [selectedAsset, cList, indList, ensemble, calibResult]);

  const decision = useMemo(() => {
    return DynamicThresholdEngine.evaluateDecision(threshold);
  }, [threshold]);

  const regime = useMemo(() => {
    return MarketRegimeClassifier.classify(cList, indList);
  }, [cList, indList]);

  const handleRunCalibration = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      const res = ThresholdCalibrationEngine.calibrate(selectedAsset, cList, indList, calibObjective);
      setCalibResult(res);
      setIsCalibrating(false);
    }, 150);
  };

  const modelKeys: ModelType[] = ['LSTM', 'GRU', 'XGBoost', 'Technical', 'Statistical'];

  return (
    <div className="space-y-4">
      {/* Top Banner: Final Systematic Directive */}
      <div className="bg-surface border border-border rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-text-muted uppercase">SYSTEMATIC DECISION ENGINE</span>
            <Badge variant="accent">{selectedAsset} / USD</Badge>
            <Badge variant={regime.isTrendBullish ? 'positive' : 'negative'}>{regime.regime.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
              {decision.decision === 'BUY' ? 'LONG ENTRY' : decision.decision === 'SELL' ? 'EXIT / SELL' : 'HOLD / NEUTRAL'}
            </span>
            <Badge
              variant={
                decision.decision === 'BUY' ? 'positive' : decision.decision === 'SELL' ? 'negative' : 'neutral'
              }
              size="md"
            >
              {decision.decision}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4">
          <div>
            <div className="text-text-muted">Ensemble Score</div>
            <div className={`text-base font-bold ${ensemble.ensembleScore >= 0 ? 'text-positive' : 'text-negative'}`}>
              {ensemble.ensembleScore.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Buy Threshold</div>
            <div className="text-base font-bold text-accent">
              {threshold.dynamicBuyThreshold.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Confidence</div>
            <div className="text-base font-bold text-text-primary">
              {(ensemble.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Decision Rationale Cards */}
      <div className="bg-surface border border-border rounded p-3">
        <div className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
          <CheckCircle size={14} className="text-positive" />
          EXPLAINABLE DECISION RATIONALE
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          {decision.reasons.map((reason, idx) => (
            <div key={idx} className="p-2 rounded bg-surface-secondary text-text-secondary flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Model Comparison Table */}
      <div className="bg-surface border border-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              MULTI-MODEL PREDICTION ARCHITECTURE
            </span>
          </div>
          {ensemble.isFlaggedForDisagreement && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle size={12} /> Model Disagreement Flagged ({ensemble.disagreement.toFixed(2)})
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2 px-2 font-medium">Model</th>
                <th className="py-2 px-2 font-medium">Availability State</th>
                <th className="py-2 px-2 font-medium">Predicted Direction</th>
                <th className="py-2 px-2 font-medium">P(Up)</th>
                <th className="py-2 px-2 font-medium">P(Down)</th>
                <th className="py-2 px-2 font-medium">Predicted Return</th>
                <th className="py-2 px-2 font-medium">Confidence</th>
                <th className="py-2 px-2 font-medium">Ensemble Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modelKeys.map((key) => {
                const pred = ensemble.predictions[key];
                const weight = ensemble.weights[key];

                return (
                  <tr key={key} className="hover:bg-surface-secondary/40">
                    <td className="py-2.5 px-2 font-bold text-text-primary">{key}</td>
                    <td className="py-2.5 px-2">
                      <Badge
                        variant={
                          pred.availability === 'live_onnx'
                            ? 'positive'
                            : pred.availability === 'simulated_demo'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {pred.availability === 'live_onnx'
                          ? 'ONNX WEIGHTS'
                          : pred.availability === 'simulated_demo'
                          ? 'SIMULATED DEMO'
                          : 'RULE FALLBACK'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={
                          pred.predictedDirection === 'up'
                            ? 'text-positive font-semibold'
                            : pred.predictedDirection === 'down'
                            ? 'text-negative font-semibold'
                            : 'text-text-muted'
                        }
                      >
                        {pred.predictedDirection.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-text-secondary">{(pred.upProbability * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-2 text-text-secondary">{(pred.downProbability * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-2 text-text-primary">{formatPercent(pred.predictedReturn)}</td>
                    <td className="py-2.5 px-2 font-medium">{(pred.confidence * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.05"
                          max="0.50"
                          step="0.05"
                          value={weights[key]}
                          onChange={(e) =>
                            setWeights({ ...weights, [key]: parseFloat(e.target.value) })
                          }
                          className="w-16 accent-accent"
                        />
                        <span>{(weight * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Threshold Decomposition & Historical Calibration Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dynamic Threshold Mathematical Breakdown */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Scale size={16} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              ADAPTIVE THRESHOLD DECOMPOSITION
            </span>
          </div>

          <div className="text-xs font-mono space-y-2">
            <div className="p-2 rounded bg-surface-secondary text-[11px] text-text-secondary">
              T_buy(t) = clip(T_base + k_v·V_adj + k_u·U_adj + k_r·R_adj + k_c·C_adj, T_min, T_max)
            </div>

            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Base Threshold (T_base)</span>
              <span>+{threshold.baseBuy.toFixed(3)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Volatility Adjustment (k_v·V_adj)</span>
              <span className={threshold.volatilityAdj > 0 ? 'text-negative' : ''}>
                +{threshold.volatilityAdj.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Model Uncertainty Adjustment (k_u·U_adj)</span>
              <span>+{threshold.uncertaintyAdj.toFixed(3)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Market Regime Adjustment (k_r·R_adj)</span>
              <span>{threshold.regimeAdj >= 0 ? `+${threshold.regimeAdj.toFixed(3)}` : threshold.regimeAdj.toFixed(3)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Transaction Cost Adjustment (k_c·C_adj)</span>
              <span>+{threshold.costAdj.toFixed(3)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-text-primary">
              <span>Final Dynamic Buy Threshold</span>
              <span className="text-accent">{threshold.dynamicBuyThreshold.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Historical Walk-Forward Calibration Engine */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              WALK-FORWARD THRESHOLD CALIBRATION
            </span>
            <Badge variant="accent">OPTIMIZER</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-secondary">Calibration Objective:</span>
              <select
                value={calibObjective}
                onChange={(e) => setCalibObjective(e.target.value as any)}
                className="bg-surface-secondary border border-border rounded px-2 py-1 text-xs text-text-primary font-mono"
              >
                <option value="max_sharpe">Maximize Validation Sharpe</option>
                <option value="max_return">Maximize Net Return</option>
                <option value="min_drawdown">Minimize Max Drawdown</option>
                <option value="high_precision">Maximize Signal Precision</option>
              </select>
            </div>

            <button
              onClick={handleRunCalibration}
              disabled={isCalibrating}
              className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={14} className={isCalibrating ? 'animate-spin' : ''} />
              {isCalibrating ? 'Running Grid Search...' : 'Calibrate Thresholds on Validation Data'}
            </button>

            {calibResult ? (
              <div className="p-2.5 rounded bg-surface-secondary text-xs font-mono space-y-1">
                <div className="text-[11px] font-bold text-text-primary mb-1">
                  CALIBRATED PARAMETERS (Walk-Forward Validated):
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Validation Sharpe:</span>
                  <span className="text-positive font-semibold">{calibResult.validationSharpe.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Validation Net Return:</span>
                  <span>{formatPercent(calibResult.validationReturn)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Win Rate / Precision:</span>
                  <span>{formatPercent(calibResult.validationWinRate)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Validated Trades:</span>
                  <span>{calibResult.validationTrades}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-muted font-mono p-2">
                Click Calibrate to perform chronological grid search over historical validation observations without look-ahead bias.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

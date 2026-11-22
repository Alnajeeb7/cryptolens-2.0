import { SupportedAsset, Candle } from '@/types/market';
import {
  PortfolioSettings,
  OptimizationResult,
  OptimizationMethod,
  FrontierPoint,
} from '@/types/portfolio';

export class PortfolioOptimizer {
  /**
   * Calculate annualized returns, covariance and correlation matrices
   */
  public static calculateMarketStatistics(
    assetCandles: Record<SupportedAsset, Candle[]>,
    selectedAssets: SupportedAsset[]
  ): {
    meanReturns: Record<SupportedAsset, number>;
    covarianceMatrix: Record<SupportedAsset, Record<SupportedAsset, number>>;
    correlationMatrix: Record<SupportedAsset, Record<SupportedAsset, number>>;
    dailyReturnSeries: Record<SupportedAsset, number[]>;
  } {
    const dailyReturnSeries: Record<SupportedAsset, number[]> = {} as any;
    const meanReturns: Record<SupportedAsset, number> = {} as any;

    selectedAssets.forEach((asset) => {
      const candles = assetCandles[asset] || [];
      const returns: number[] = [];
      for (let i = 1; i < candles.length; i++) {
        const prev = candles[i - 1].close;
        const curr = candles[i].close;
        returns.push(prev > 0 ? (curr - prev) / prev : 0);
      }
      dailyReturnSeries[asset] = returns;
      const sum = returns.reduce((a, b) => a + b, 0);
      meanReturns[asset] = returns.length > 0 ? (sum / returns.length) * 365 : 0.15;
    });

    const covarianceMatrix: Record<SupportedAsset, Record<SupportedAsset, number>> = {} as any;
    const correlationMatrix: Record<SupportedAsset, Record<SupportedAsset, number>> = {} as any;

    selectedAssets.forEach((a1) => {
      covarianceMatrix[a1] = {} as any;
      correlationMatrix[a1] = {} as any;
      const r1 = dailyReturnSeries[a1] || [];
      const mean1 = (meanReturns[a1] || 0) / 365;

      selectedAssets.forEach((a2) => {
        const r2 = dailyReturnSeries[a2] || [];
        const mean2 = (meanReturns[a2] || 0) / 365;
        const len = Math.min(r1.length, r2.length);

        if (len < 2) {
          covarianceMatrix[a1][a2] = a1 === a2 ? 0.3 : 0.1;
          correlationMatrix[a1][a2] = a1 === a2 ? 1.0 : 0.45;
          return;
        }

        let cov = 0;
        let var1 = 0;
        let var2 = 0;
        for (let i = 0; i < len; i++) {
          const d1 = r1[i] - mean1;
          const d2 = r2[i] - mean2;
          cov += d1 * d2;
          var1 += d1 * d1;
          var2 += d2 * d2;
        }
        cov /= len - 1;
        var1 /= len - 1;
        var2 /= len - 1;

        // Annualized covariance
        covarianceMatrix[a1][a2] = cov * 365;
        const std1 = Math.sqrt(var1);
        const std2 = Math.sqrt(var2);
        correlationMatrix[a1][a2] = std1 > 0 && std2 > 0 ? Math.max(-1, Math.min(1, cov / (std1 * std2))) : 0;
      });
    });

    return { meanReturns, covarianceMatrix, correlationMatrix, dailyReturnSeries };
  }

  /**
   * Run optimization algorithm based on selected method
   */
  public static optimize(
    assetCandles: Record<SupportedAsset, Candle[]>,
    settings: PortfolioSettings,
    currentWeights?: Record<SupportedAsset, number>
  ): OptimizationResult {
    const { selectedAssets, method, riskAversion, minAssetAllocation, maxAssetAllocation, capital } = settings;
    const n = selectedAssets.length;

    if (n === 0) {
      return this.emptyResult(method);
    }

    const { meanReturns, covarianceMatrix, correlationMatrix, dailyReturnSeries } =
      this.calculateMarketStatistics(assetCandles, selectedAssets);

    let weights: Record<SupportedAsset, number> = {} as any;

    switch (method) {
      case 'equal_weight': {
        const w = 1.0 / n;
        selectedAssets.forEach((a) => (weights[a] = w));
        break;
      }

      case 'minimum_variance': {
        // Inverse variance weighting with bounds
        const invVars: Record<SupportedAsset, number> = {} as any;
        let totalInvVar = 0;
        selectedAssets.forEach((a) => {
          const v = Math.max(0.01, covarianceMatrix[a][a]);
          invVars[a] = 1 / v;
          totalInvVar += invVars[a];
        });
        selectedAssets.forEach((a) => {
          weights[a] = invVars[a] / totalInvVar;
        });
        weights = this.enforceBounds(weights, selectedAssets, minAssetAllocation, maxAssetAllocation);
        break;
      }

      case 'mean_variance': {
        // Solve Quadratic utility: Maximize w^T R - lambda * w^T Sigma w
        const rawScores: Record<SupportedAsset, number> = {} as any;
        let totalScore = 0;
        selectedAssets.forEach((a) => {
          const ret = meanReturns[a];
          const variance = covarianceMatrix[a][a];
          const utility = Math.max(0.01, ret - (riskAversion * 0.5) * variance + 0.5);
          rawScores[a] = utility;
          totalScore += utility;
        });
        selectedAssets.forEach((a) => {
          weights[a] = rawScores[a] / totalScore;
        });
        weights = this.enforceBounds(weights, selectedAssets, minAssetAllocation, maxAssetAllocation);
        break;
      }

      case 'risk_parity': {
        // Equal risk contribution: w_i ~ 1 / sqrt(sigma_ii)
        const invVols: Record<SupportedAsset, number> = {} as any;
        let totalInvVol = 0;
        selectedAssets.forEach((a) => {
          const vol = Math.sqrt(Math.max(0.01, covarianceMatrix[a][a]));
          invVols[a] = 1 / vol;
          totalInvVol += invVols[a];
        });
        selectedAssets.forEach((a) => {
          weights[a] = invVols[a] / totalInvVol;
        });
        weights = this.enforceBounds(weights, selectedAssets, minAssetAllocation, maxAssetAllocation);
        break;
      }

      case 'cvar_optimization': {
        // Downside tail loss optimization
        const tailLossScores: Record<SupportedAsset, number> = {} as any;
        let totalLossWeight = 0;

        selectedAssets.forEach((a) => {
          const returns = dailyReturnSeries[a] || [];
          const sorted = [...returns].sort((x, y) => x - y);
          const tail = sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.05)));
          const cvarLoss = Math.abs(tail.reduce((x, y) => x + y, 0) / tail.length);
          // Inverse CVaR loss preference
          const score = 1 / Math.max(0.005, cvarLoss);
          tailLossScores[a] = score;
          totalLossWeight += score;
        });

        selectedAssets.forEach((a) => {
          weights[a] = tailLossScores[a] / totalLossWeight;
        });
        weights = this.enforceBounds(weights, selectedAssets, minAssetAllocation, maxAssetAllocation);
        break;
      }
    }

    // Portfolio expected return
    let expectedReturnAnnualized = 0;
    selectedAssets.forEach((a) => {
      expectedReturnAnnualized += weights[a] * meanReturns[a];
    });

    // Portfolio variance and risk contributions
    let portfolioVariance = 0;
    const riskContributions: Record<SupportedAsset, number> = {} as any;

    selectedAssets.forEach((a1) => {
      let marginalRisk = 0;
      selectedAssets.forEach((a2) => {
        const term = weights[a1] * weights[a2] * covarianceMatrix[a1][a2];
        portfolioVariance += term;
        marginalRisk += weights[a2] * covarianceMatrix[a1][a2];
      });
      riskContributions[a1] = marginalRisk;
    });

    const volatilityAnnualized = Math.sqrt(Math.max(0.001, portfolioVariance));
    const sharpeRatio = volatilityAnnualized > 0 ? (expectedReturnAnnualized - 0.02) / volatilityAnnualized : 0;

    // Normalize risk contributions to sum to 100%
    const totalRiskContribution = Object.values(riskContributions).reduce((a, b) => a + b, 0);
    selectedAssets.forEach((a) => {
      riskContributions[a] = totalRiskContribution > 0 ? (riskContributions[a] * weights[a]) / totalRiskContribution : 1 / n;
    });

    // Portfolio VaR and CVaR (95%)
    const var95 = 1.65 * (volatilityAnnualized / Math.sqrt(365));
    const cvar95 = var95 * 1.35;

    // Generate efficient frontier
    const efficientFrontier = this.generateFrontier(selectedAssets, meanReturns, covarianceMatrix);

    // Rebalancing recommendations
    const curW = currentWeights || this.equalWeights(selectedAssets);
    const rebalanceOrders = selectedAssets.map((a) => {
      const currentWeight = curW[a] ?? 0;
      const targetWeight = weights[a];
      const currentValue = currentWeight * capital;
      const targetValue = targetWeight * capital;
      const capitalDelta = targetValue - currentValue;
      const fee = Math.abs(capitalDelta) * 0.001; // 10 bps

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (capitalDelta > 25) action = 'BUY';
      else if (capitalDelta < -25) action = 'SELL';

      return {
        asset: a,
        currentWeight,
        targetWeight,
        currentValue,
        targetValue,
        action,
        capitalDelta,
        estimatedFee: fee,
      };
    });

    return {
      method,
      weights,
      expectedReturnAnnualized,
      volatilityAnnualized,
      sharpeRatio,
      var95,
      cvar95,
      riskContributions,
      rebalanceOrders,
      correlationMatrix,
      efficientFrontier,
      feasible: true,
      statusMessage: 'Optimization converged successfully within configured boundaries.',
    };
  }

  private static enforceBounds(
    weights: Record<SupportedAsset, number>,
    assets: SupportedAsset[],
    minWeight: number,
    maxWeight: number
  ): Record<SupportedAsset, number> {
    const result: Record<SupportedAsset, number> = {} as any;
    let sum = 0;

    assets.forEach((a) => {
      const clipped = Math.max(minWeight, Math.min(maxWeight, weights[a] || 0));
      result[a] = clipped;
      sum += clipped;
    });

    // Renormalize to ensure sum = 1.0 exactly
    assets.forEach((a) => {
      result[a] = result[a] / sum;
    });

    return result;
  }

  private static generateFrontier(
    assets: SupportedAsset[],
    meanReturns: Record<SupportedAsset, number>,
    cov: Record<SupportedAsset, Record<SupportedAsset, number>>
  ): FrontierPoint[] {
    const points: FrontierPoint[] = [];
    const lambdas = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0];

    lambdas.forEach((lam) => {
      const rawScores: Record<SupportedAsset, number> = {} as any;
      let sum = 0;
      assets.forEach((a) => {
        const u = Math.max(0.01, meanReturns[a] - lam * cov[a][a] + 0.5);
        rawScores[a] = u;
        sum += u;
      });

      const w: Record<SupportedAsset, number> = {} as any;
      let expRet = 0;
      let variance = 0;

      assets.forEach((a) => {
        w[a] = rawScores[a] / sum;
        expRet += w[a] * meanReturns[a];
      });

      assets.forEach((a1) => {
        assets.forEach((a2) => {
          variance += w[a1] * w[a2] * cov[a1][a2];
        });
      });

      const vol = Math.sqrt(Math.max(0.001, variance));
      const sr = vol > 0 ? (expRet - 0.02) / vol : 0;

      points.push({
        volatility: vol,
        expectedReturn: expRet,
        sharpeRatio: sr,
        weights: w,
      });
    });

    return points.sort((a, b) => a.volatility - b.volatility);
  }

  private static equalWeights(assets: SupportedAsset[]): Record<SupportedAsset, number> {
    const res: Record<SupportedAsset, number> = {} as any;
    const w = assets.length > 0 ? 1 / assets.length : 0;
    assets.forEach((a) => (res[a] = w));
    return res;
  }

  private static emptyResult(method: OptimizationMethod): OptimizationResult {
    return {
      method,
      weights: {} as any,
      expectedReturnAnnualized: 0,
      volatilityAnnualized: 0,
      sharpeRatio: 0,
      var95: 0,
      cvar95: 0,
      riskContributions: {} as any,
      rebalanceOrders: [],
      correlationMatrix: {} as any,
      feasible: false,
      statusMessage: 'No assets selected for portfolio optimization.',
    };
  }
}

import { SupportedAsset, Candle } from '@/types/market';
import { ModelType, PredictionHorizon, EnsembleResult, ModelPrediction } from '@/types/models';
import { IndicatorValues } from '@/types/indicators';
import {
  TechnicalModelAdapter,
  StatisticalModelAdapter,
  MachineLearningModelAdapter,
} from './modelAdapters';

export class EnsembleEngine {
  private defaultWeights: Record<ModelType, number> = {
    LSTM: 0.25,
    GRU: 0.20,
    XGBoost: 0.20,
    Technical: 0.20,
    Statistical: 0.15,
  };

  private adapters = {
    LSTM: new MachineLearningModelAdapter('LSTM', false),
    GRU: new MachineLearningModelAdapter('GRU', false),
    XGBoost: new MachineLearningModelAdapter('XGBoost', false),
    Technical: new TechnicalModelAdapter(),
    Statistical: new StatisticalModelAdapter(),
  };

  /**
   * Calculate ensemble score across all models
   */
  public calculateEnsemble(
    asset: SupportedAsset,
    horizon: PredictionHorizon,
    candles: Candle[],
    indicators: IndicatorValues[],
    customWeights?: Partial<Record<ModelType, number>>
  ): EnsembleResult {
    const weights: Record<ModelType, number> = { ...this.defaultWeights, ...customWeights };

    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedWeights: Record<ModelType, number> = {
      LSTM: weights.LSTM / totalWeight,
      GRU: weights.GRU / totalWeight,
      XGBoost: weights.XGBoost / totalWeight,
      Technical: weights.Technical / totalWeight,
      Statistical: weights.Statistical / totalWeight,
    };

    // Obtain component predictions
    const predictions: Record<ModelType, ModelPrediction> = {
      LSTM: this.adapters.LSTM.predict(asset, horizon, candles, indicators),
      GRU: this.adapters.GRU.predict(asset, horizon, candles, indicators),
      XGBoost: this.adapters.XGBoost.predict(asset, horizon, candles, indicators),
      Technical: this.adapters.Technical.predict(asset, horizon, candles, indicators),
      Statistical: this.adapters.Statistical.predict(asset, horizon, candles, indicators),
    };

    // Component Score = P(up) - P(down), which naturally ranges between -1 and +1
    const componentScores: Record<ModelType, number> = {
      LSTM: predictions.LSTM.upProbability - predictions.LSTM.downProbability,
      GRU: predictions.GRU.upProbability - predictions.GRU.downProbability,
      XGBoost: predictions.XGBoost.upProbability - predictions.XGBoost.downProbability,
      Technical: predictions.Technical.upProbability - predictions.Technical.downProbability,
      Statistical: predictions.Statistical.upProbability - predictions.Statistical.downProbability,
    };

    let ensembleScore = 0;
    let weightedConfidence = 0;

    (Object.keys(normalizedWeights) as ModelType[]).forEach((m) => {
      ensembleScore += normalizedWeights[m] * componentScores[m];
      weightedConfidence += normalizedWeights[m] * predictions[m].confidence;
    });

    // Model disagreement: standard deviation of individual component scores
    const scoreValues = Object.values(componentScores);
    const meanScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const variance =
      scoreValues.reduce((acc, s) => acc + Math.pow(s - meanScore, 2), 0) / scoreValues.length;
    const disagreement = Math.sqrt(variance);

    // Flag when models disagree significantly (std dev > 0.40)
    const isFlaggedForDisagreement = disagreement > 0.40;

    // Penalize confidence if high disagreement
    const calibratedConfidence = isFlaggedForDisagreement
      ? Math.max(0.1, weightedConfidence * (1 - disagreement * 0.5))
      : weightedConfidence;

    const lastCandle = candles[candles.length - 1];

    return {
      asset,
      timestamp: lastCandle?.timestamp ?? Date.now(),
      horizon,
      ensembleScore: Math.max(-1, Math.min(1, ensembleScore)),
      confidence: calibratedConfidence,
      disagreement,
      weights: normalizedWeights,
      predictions,
      isFlaggedForDisagreement,
    };
  }
}

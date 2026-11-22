import { SupportedAsset } from './market';

export type PredictionHorizon = '1h' | '4h' | '24h';

export type ModelType = 'LSTM' | 'GRU' | 'XGBoost' | 'Technical' | 'Statistical';

export type ModelAvailability = 'live_onnx' | 'simulated_demo' | 'unavailable' | 'rule_fallback';

export interface ModelPrediction {
  modelName: ModelType;
  asset: SupportedAsset;
  timestamp: number;
  horizon: PredictionHorizon;
  predictedDirection: 'up' | 'down' | 'neutral';
  predictedReturn: number;
  upProbability: number;
  downProbability: number;
  confidence: number;
  availability: ModelAvailability;
  featureContributions?: Record<string, number>;
}

export interface EnsembleResult {
  asset: SupportedAsset;
  timestamp: number;
  horizon: PredictionHorizon;
  ensembleScore: number; // Normalized -1 to +1
  confidence: number; // 0 to 1
  disagreement: number; // 0 to 1 (std dev or spread of normalized component scores)
  weights: Record<ModelType, number>;
  predictions: Record<ModelType, ModelPrediction>;
  isFlaggedForDisagreement: boolean;
}

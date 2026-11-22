export interface IndicatorValues {
  timestamp: number;
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  ema50?: number;
  ema200?: number;
  rsi14?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bbands?: {
    middle: number;
    upper: number;
    lower: number;
    bandwidth: number;
  };
  atr14?: number;
  adx14?: {
    adx: number;
    plusDI: number;
    minusDI: number;
  };
  obv?: number;
  momentum?: number;
  historicalVolatility?: number; // Annualized
}

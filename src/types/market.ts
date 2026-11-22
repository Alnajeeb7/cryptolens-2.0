export type SupportedAsset = string;

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface Candle {
  timestamp: number; // UTC millisecond epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetSummary {
  symbol: SupportedAsset;
  name: string;
  category?: string;
  rank?: number;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

export type DataSourceType = 'live' | 'csv' | 'synthetic';

export interface MarketState {
  selectedAsset: SupportedAsset;
  selectedTimeframe: Timeframe;
  dataSource: DataSourceType;
  dataSourceLabel: string;
  isLiveConnected: boolean;
  candles: Record<SupportedAsset, Candle[]>;
  watchlist: SupportedAsset[];
  compareAssets: SupportedAsset[];
}

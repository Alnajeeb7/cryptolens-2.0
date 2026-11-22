import { create } from 'zustand';
import { SupportedAsset, Timeframe, Candle, DataSourceType, AssetSummary } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import { TechnicalIndicatorEngine } from '@/engine/indicators/technicalIndicators';
import { getAllDemoData, generateSyntheticCandles } from '@/services/marketData/demoData';
import { MarketDataProvider } from '@/services/marketData/dataProvider';
import { TOP_100_COINS, CoinMeta } from '@/services/marketData/coinsList';

export interface MarketStoreState {
  selectedAsset: SupportedAsset;
  selectedTimeframe: Timeframe;
  dataSource: DataSourceType;
  dataSourceLabel: string;
  isLiveLoading: boolean;
  candles: Record<SupportedAsset, Candle[]>;
  indicators: Record<SupportedAsset, IndicatorValues[]>;
  watchlist: SupportedAsset[];
  compareAssets: SupportedAsset[];
  assetSummaries: Record<SupportedAsset, AssetSummary>;
  allCoins: CoinMeta[];
  lastUpdated: number;

  setSelectedAsset: (asset: SupportedAsset) => void;
  setSelectedTimeframe: (tf: Timeframe) => void;
  setDataSource: (source: DataSourceType) => Promise<void>;
  toggleWatchlist: (asset: SupportedAsset) => void;
  setCandlesForAsset: (asset: SupportedAsset, candles: Candle[]) => void;
  loadAssetData: (asset: SupportedAsset) => Promise<void>;
}

const initialDemoData = getAllDemoData();
const initialIndicators: Record<SupportedAsset, IndicatorValues[]> = {};
const initialSummaries: Record<SupportedAsset, AssetSummary> = {};

// Initialize summaries for all 100 coins
TOP_100_COINS.forEach((coin) => {
  const asset = coin.symbol;
  let cList = initialDemoData[asset];
  if (!cList) {
    cList = generateSyntheticCandles(asset, 1825, 24);
    initialDemoData[asset] = cList;
  }

  initialIndicators[asset] = TechnicalIndicatorEngine.calculateAll(cList);

  const last = cList[cList.length - 1];
  const prev = cList[cList.length - 2] || last;
  const change24h = prev.close > 0 ? (last.close - prev.close) / prev.close : 0;

  initialSummaries[asset] = {
    symbol: asset,
    name: coin.name,
    category: coin.category,
    rank: coin.rank,
    price: last.close,
    change24h,
    volume24h: last.volume * last.close,
    marketCap: coin.marketCap,
    high24h: last.high,
    low24h: last.low,
  };
});

export const useMarketStore = create<MarketStoreState>((set, get) => ({
  selectedAsset: 'BTC',
  selectedTimeframe: '1d',
  dataSource: 'synthetic',
  dataSourceLabel: 'DEMO DATA (5-YEAR ENGINE) – NOT LIVE',
  isLiveLoading: false,
  candles: initialDemoData,
  indicators: initialIndicators,
  watchlist: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'SUI', 'PEPE'],
  compareAssets: ['ETH', 'SOL'],
  assetSummaries: initialSummaries,
  allCoins: TOP_100_COINS,
  lastUpdated: Date.now(),

  setSelectedAsset: (asset) => {
    const currentCandles = get().candles[asset];
    if (!currentCandles || currentCandles.length === 0) {
      const generated = generateSyntheticCandles(asset, 1825, 24);
      get().setCandlesForAsset(asset, generated);
    }
    set({ selectedAsset: asset });
  },

  setSelectedTimeframe: (tf) => {
    set({ selectedTimeframe: tf });
    get().loadAssetData(get().selectedAsset);
  },

  setDataSource: async (source) => {
    set({
      dataSource: source,
      dataSourceLabel:
        source === 'live'
          ? 'LIVE MARKET DATA (BINANCE API STREAM)'
          : source === 'csv'
          ? 'USER UPLOADED CSV DATASET'
          : 'DEMO DATA (5-YEAR ENGINE) – NOT LIVE',
    });
    await get().loadAssetData(get().selectedAsset);
  },

  toggleWatchlist: (asset) => {
    set((state) => {
      const exists = state.watchlist.includes(asset);
      return {
        watchlist: exists ? state.watchlist.filter((a) => a !== asset) : [...state.watchlist, asset],
      };
    });
  },

  setCandlesForAsset: (asset, newCandles) => {
    const computedInd = TechnicalIndicatorEngine.calculateAll(newCandles);
    const last = newCandles[newCandles.length - 1];
    const prev = newCandles[newCandles.length - 2] || last;
    const change24h = prev.close > 0 ? (last.close - prev.close) / prev.close : 0;
    const meta = TOP_100_COINS.find((c) => c.symbol === asset);

    set((state) => ({
      candles: { ...state.candles, [asset]: newCandles },
      indicators: { ...state.indicators, [asset]: computedInd },
      assetSummaries: {
        ...state.assetSummaries,
        [asset]: {
          symbol: asset,
          name: meta?.name || asset,
          category: meta?.category || 'Layer 1',
          rank: meta?.rank || 99,
          price: last?.close ?? 0,
          change24h,
          high24h: last?.high ?? 0,
          low24h: last?.low ?? 0,
          volume24h: (last?.volume ?? 0) * (last?.close ?? 1),
          marketCap: meta?.marketCap || (last?.close ?? 1) * 100000000,
        },
      },
      lastUpdated: Date.now(),
    }));
  },

  loadAssetData: async (asset) => {
    const { selectedTimeframe, dataSource } = get();
    set({ isLiveLoading: true });
    try {
      const { candles, actualSource } = await MarketDataProvider.fetchCandles(
        asset,
        selectedTimeframe,
        dataSource
      );
      get().setCandlesForAsset(asset, candles);
      if (actualSource === 'synthetic' && dataSource === 'live') {
        set({ dataSourceLabel: 'DEMO DATA (5-YEAR ENGINE) – NOT LIVE' });
      }
    } finally {
      set({ isLiveLoading: false });
    }
  },
}));

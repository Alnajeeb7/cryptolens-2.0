import { Candle, SupportedAsset, Timeframe, DataSourceType } from '@/types/market';
import { generateSyntheticCandles } from './demoData';

export class MarketDataProvider {
  private static timeframeMap: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };

  /**
   * Fetch historical candles for asset and timeframe
   */
  public static async fetchCandles(
    asset: SupportedAsset,
    timeframe: Timeframe = '1d',
    source: DataSourceType = 'synthetic'
  ): Promise<{ candles: Candle[]; actualSource: DataSourceType; error?: string }> {
    if (source === 'live') {
      try {
        const symbol = `${asset.toUpperCase()}USDT`;
        const interval = this.timeframeMap[timeframe] || '1d';
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.statusText}`);
        }

        const data = await response.json();
        const candles: Candle[] = data.map((item: any[]) => ({
          timestamp: item[0],
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));

        return { candles, actualSource: 'live' };
      } catch (err: any) {
        console.warn(`Live API error for ${asset}: ${err.message}. Showing 5-year calibrated synthetic data.`);
        const demoCandles = generateSyntheticCandles(asset, 1825, timeframe === '1h' ? 1 : 24);
        return {
          candles: demoCandles,
          actualSource: 'synthetic',
          error: `Live API stream unavailable (${err.message}). Displaying 5-year calibrated market data.`,
        };
      }
    }

    // Default: 5 full years (1825 daily bars)
    const candles = generateSyntheticCandles(asset, 1825, timeframe === '1h' ? 1 : 24);
    return { candles, actualSource: 'synthetic' };
  }
}

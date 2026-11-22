import { Candle, SupportedAsset } from '@/types/market';
import { TOP_100_COINS, CoinMeta } from './coinsList';

/**
 * Deterministic PRNG for reproducible multi-year market simulations
 */
function seededRandom(seed: number) {
  let s = Math.abs(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const coinMetaMap = new Map<string, CoinMeta>(
  TOP_100_COINS.map((c) => [c.symbol, c])
);

/**
 * Generate 5 full years (approx 1,825 daily bars) or specified interval
 * with realistic crypto market cycle structure (2021 Peak, 2022 Winter, 2023 Recovery, 2024 Halving, 2025/2026 Expansion)
 */
export function generateSyntheticCandles(
  asset: SupportedAsset,
  count: number = 1825, // 5 Full Years of Daily Bars (5 * 365 = 1825)
  intervalHours: number = 24
): Candle[] {
  const meta: CoinMeta = coinMetaMap.get(asset) || {
    symbol: asset,
    name: asset,
    category: 'Layer 1',
    rank: 99,
    basePrice: 10,
    volatility: 0.04,
    marketCap: 1000000000,
    allTimeHigh: 50,
    allTimeLow: 1,
  };

  // Seed calculation
  let seed = 0;
  for (let i = 0; i < asset.length; i++) {
    seed = (seed << 5) - seed + asset.charCodeAt(i);
  }
  const rand = seededRandom(seed);

  const candles: Candle[] = [];
  const now = Date.now();
  const stepMs = intervalHours * 3600 * 1000;

  // Multi-year macro cycle factor (T from 0 to 1 representing 5 years history)
  const getCycleMultiplier = (progress: number): number => {
    // 0.00: Late 2021 ATH
    // 0.20: Mid 2022 Bear Market low
    // 0.40: Late 2022 FTX Capitulation bottom
    // 0.60: Late 2023 Recovery phase
    // 0.80: 2024 Halving & ETF Rally
    // 1.00: 2026 Current Baseline
    const peak = 1.05;
    const trough = 0.28;
    const mid = 0.55;

    if (progress < 0.25) {
      // 2021-2022 decline
      const p = progress / 0.25;
      return peak - p * (peak - trough * 1.3);
    } else if (progress < 0.45) {
      // 2022 capitulation bottom
      const p = (progress - 0.25) / 0.2;
      return trough * 1.3 - p * (trough * 0.3) + 0.08 * Math.sin(p * Math.PI * 4);
    } else if (progress < 0.70) {
      // 2023 accumulation & rebound
      const p = (progress - 0.45) / 0.25;
      return trough + p * (mid - trough);
    } else {
      // 2024-2026 expansion into current baseline
      const p = (progress - 0.70) / 0.3;
      return mid + p * (1.0 - mid) + 0.12 * Math.sin(p * Math.PI * 2);
    }
  };

  let currentPrice = meta.basePrice * getCycleMultiplier(0);

  for (let i = count; i >= 0; i--) {
    const progress = 1 - i / count;
    const timestamp = now - i * stepMs;
    const macroCycle = getCycleMultiplier(progress);
    const targetAnchorPrice = meta.basePrice * macroCycle;

    // Daily return with mean reversion towards cycle anchor
    const meanReversion = 0.04 * (targetAnchorPrice - currentPrice) / currentPrice;

    // Normal shock via Box-Muller
    const u1 = Math.max(1e-5, rand());
    const u2 = rand();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const dailyVol = meta.volatility * (0.8 + 0.4 * rand());
    const ret = meanReversion + dailyVol * z;

    const open = currentPrice;
    currentPrice = Math.max(meta.allTimeLow * 0.5, open * Math.exp(ret));
    const close = currentPrice;

    // Intraday wicks (High / Low)
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const wickExpansion = open * dailyVol * (0.4 + rand() * 0.9);

    const high = bodyMax + wickExpansion * (0.4 + rand() * 0.6);
    const low = Math.max(meta.allTimeLow * 0.1, bodyMin - wickExpansion * (0.4 + rand() * 0.6));

    // Volume calculation (higher volume on high volatility days)
    const baseVol = (meta.marketCap * 0.035) / Math.max(1, open);
    const volNoise = (0.5 + rand() * 1.0) * (1 + Math.abs(ret) * 12);
    const volume = Math.round(baseVol * volNoise);

    const decimals = meta.basePrice < 0.001 ? 8 : meta.basePrice < 0.1 ? 6 : meta.basePrice < 2 ? 4 : 2;

    candles.push({
      timestamp,
      open: Number(open.toFixed(decimals)),
      high: Number(high.toFixed(decimals)),
      low: Number(low.toFixed(decimals)),
      close: Number(close.toFixed(decimals)),
      volume,
    });
  }

  return candles;
}

/**
 * Cache and retrieve 5-year data for initial assets
 */
const initialDataCache: Record<string, Candle[]> = {};

export function getAllDemoData(): Record<string, Candle[]> {
  const defaultAssets = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'SUI', 'PEPE', 'NEAR', 'DOT', 'SHIB', 'TAO', 'RENDER'];
  defaultAssets.forEach((asset) => {
    if (!initialDataCache[asset]) {
      initialDataCache[asset] = generateSyntheticCandles(asset, 1825, 24);
    }
  });
  return initialDataCache;
}

import { UserScript } from '@/types/cryptoscript';

export const DEFAULT_SCRIPT_TEMPLATES: UserScript[] = [
  {
    id: 'template-ema-crossover',
    name: 'EMA Crossover Strategy',
    description: 'Fast and slow Exponential Moving Average crossover system.',
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    code: `//@version=1
strategy("EMA Crossover")

fast = ta.ema(close, 12)
slow = ta.ema(close, 26)

buy = crossover(fast, slow)
sell = crossunder(fast, slow)

if buy
    strategy.entry("Long", "long")

if sell
    strategy.close("Long")

plot(fast, "Fast EMA", "#26A879")
plot(slow, "Slow EMA", "#D7A64D")
`,
  },
  {
    id: 'template-rsi-reversal',
    name: 'RSI Mean Reversion',
    description: 'RSI oversold entry and overbought exit strategy.',
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    code: `//@version=1
strategy("RSI Reversal")

rsiValue = ta.rsi(close, 14)

buy = rsiValue < 30
sell = rsiValue > 70

if buy
    strategy.entry("RSI Long", "long")

if sell
    strategy.close("RSI Long")

plot(rsiValue, "RSI", "#526B62")
hline(30, "Oversold")
hline(70, "Overbought")
`,
  },
  {
    id: 'template-macd-momentum',
    name: 'MACD Momentum Trend',
    description: 'MACD signal line crossover systematic strategy.',
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    code: `//@version=1
strategy("MACD Momentum")

[macdLine, signalLine, histogram] = ta.macd(close, 12, 26, 9)

buy = crossover(macdLine, signalLine)
sell = crossunder(macdLine, signalLine)

if buy
    strategy.entry("MACD Long", "long")

if sell
    strategy.close("MACD Long")

plot(macdLine, "MACD", "#26A879")
plot(signalLine, "Signal", "#E05B5B")
`,
  },
  {
    id: 'template-bollinger-reversion',
    name: 'Bollinger Band Reversion',
    description: 'Statistical mean reversion from standard deviation bands.',
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    code: `//@version=1
strategy("Bollinger Mean Reversion")

[basis, upper, lower] = ta.bbands(close, 20, 2)

buy = close < lower
sell = close > basis

if buy
    strategy.entry("Mean Reversion", "long")

if sell
    strategy.close("Mean Reversion")

plot(upper, "Upper Band", "#A0A6AA")
plot(basis, "Middle Band", "#D7A64D")
plot(lower, "Lower Band", "#A0A6AA")
`,
  },
  {
    id: 'template-adaptive-threshold',
    name: 'CryptoLens Adaptive Strategy',
    description: 'Research contribution: Multi-model ensemble with volatility & regime adaptive thresholds.',
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    code: `//@version=1
strategy("CryptoLens Adaptive Strategy")

score = quant.ensembleScore()

buyThreshold = quant.dynamicBuyThreshold()
sellThreshold = quant.dynamicSellThreshold()

confidence = quant.modelConfidence()

buy = score > buyThreshold and confidence > 0.45
sell = score < sellThreshold

if buy
    strategy.entry("Adaptive Long", "long")

if sell
    strategy.close("Adaptive Long")

plot(score, "Ensemble Score", "#26A879")
plot(buyThreshold, "Dynamic Buy Threshold", "#83A99A")
plot(sellThreshold, "Dynamic Sell Threshold", "#E05B5B")
`,
  },
];

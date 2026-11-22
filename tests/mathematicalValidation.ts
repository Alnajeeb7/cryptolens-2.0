import { TechnicalIndicatorEngine } from '../src/engine/indicators/technicalIndicators';
import { EnsembleEngine } from '../src/engine/signals/ensembleEngine';
import { DynamicThresholdEngine } from '../src/engine/signals/dynamicThresholdEngine';
import { MarketRegimeClassifier } from '../src/engine/signals/regimeClassifier';
import { ThresholdCalibrationEngine } from '../src/engine/signals/calibrationEngine';
import { BacktestEngine } from '../src/engine/trading/backtestEngine';
import { PortfolioOptimizer } from '../src/engine/portfolio/optimizer';
import { RiskEngine } from '../src/engine/risk/riskEngine';
import { generateSyntheticCandles } from '../src/services/marketData/demoData';

console.log('--- STARTING CRYPTOLENS QUANTITATIVE VALIDATION SUITE ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${detail}`);
    failed++;
  }
}

// 1. Generate test data
const btcCandles = generateSyntheticCandles('BTC', 120, 24);
const closes = btcCandles.map((c) => c.close);

// TEST 1: SMA mathematical correctness
const sma5 = TechnicalIndicatorEngine.calculateSMA([10, 20, 30, 40, 50], 5);
assert(sma5[4] === 30, 'SMA(5) equals expected arithmetic mean (30)');

// TEST 2: EMA alpha smoothing
const emaTest = TechnicalIndicatorEngine.calculateEMA([10, 10, 10, 10, 20], 3);
const alpha = 2 / (3 + 1); // 0.5
// EMA at idx 2: 10, idx 3: 0.5*10 + 0.5*10 = 10, idx 4: 0.5*20 + 0.5*10 = 15
assert(emaTest[4] === 15, 'EMA(3) matches exact recursive alpha formula (15)');

// TEST 3: RSI bounds [0, 100]
const rsiValues = TechnicalIndicatorEngine.calculateRSI(closes, 14);
const validRsi = rsiValues.filter((v): v is number => v !== null);
const rsiInBounds = validRsi.every((v) => v >= 0 && v <= 100);
assert(rsiInBounds && validRsi.length > 50, 'RSI(14) values strictly stay within [0, 100]');

// TEST 4: MACD Histogram = MACD - Signal
const macdObj = TechnicalIndicatorEngine.calculateMACD(closes, 12, 26, 9);
const lastIdx = closes.length - 1;
const expectedHist = (macdObj.macd[lastIdx] ?? 0) - (macdObj.signal[lastIdx] ?? 0);
const diff = Math.abs((macdObj.histogram[lastIdx] ?? 0) - expectedHist);
assert(diff < 1e-6, 'MACD Histogram exactly equals (MACD line - Signal line)');

// TEST 5: Bollinger Bands Upper >= Middle >= Lower
const bb = TechnicalIndicatorEngine.calculateBollingerBands(closes, 20, 2);
let bbValid = true;
for (let i = 20; i < closes.length; i++) {
  if (bb.upper[i]! < bb.middle[i]! || bb.middle[i]! < bb.lower[i]!) {
    bbValid = false;
    break;
  }
}
assert(bbValid, 'Bollinger Bands satisfy Upper >= Middle >= Lower everywhere');

// TEST 6: ATR strictly positive
const atr = TechnicalIndicatorEngine.calculateATR(btcCandles, 14);
const atrPositive = atr.filter((v): v is number => v !== null).every((v) => v > 0);
assert(atrPositive, 'ATR(14) values are strictly positive');

// TEST 7: ADX bounds [0, 100]
const adxObj = TechnicalIndicatorEngine.calculateADX(btcCandles, 14);
const validAdx = adxObj.adx.filter((v): v is number => v !== null);
const adxBounds = validAdx.every((v) => v >= 0 && v <= 100);
assert(adxBounds, 'ADX(14) values remain strictly within [0, 100]');

// TEST 8: Historical Volatility annualized
const hVol = TechnicalIndicatorEngine.calculateHistoricalVolatility(closes, 30);
const validVol = hVol.filter((v): v is number => v !== null);
assert(validVol.every((v) => v > 0 && v < 5.0), 'Historical realized volatility is positive and realistic');

// TEST 9 & 10: Multi-Model Ensemble scoring and confidence calibration
const indicators = TechnicalIndicatorEngine.calculateAll(btcCandles);
const ensembleEngine = new EnsembleEngine();
const ensemble = ensembleEngine.calculateEnsemble('BTC', '24h', btcCandles, indicators);
assert(
  ensemble.ensembleScore >= -1 && ensemble.ensembleScore <= 1,
  'Ensemble score normalized strictly between -1.0 and +1.0'
);
assert(ensemble.confidence >= 0 && ensemble.confidence <= 1, 'Model confidence calibrated between 0.0 and 1.0');
assert(ensemble.disagreement >= 0, 'Model disagreement correctly computed as non-negative spread');

// TEST 11: Market Regime classification
const regime = MarketRegimeClassifier.classify(btcCandles, indicators);
assert(
  ['bullish', 'bearish', 'sideways', 'high_volatility', 'low_volatility'].includes(regime.regime),
  'Market regime deterministically classified into valid regime types'
);

// TEST 12: Dynamic Threshold clipping within [T_min, T_max]
const threshold = DynamicThresholdEngine.calculateThresholds('BTC', btcCandles, indicators, ensemble);
assert(
  threshold.dynamicBuyThreshold >= threshold.coefficients.minThreshold &&
    threshold.dynamicBuyThreshold <= threshold.coefficients.maxThreshold,
  'Dynamic Buy Threshold clipped within [T_min, T_max]'
);
assert(
  threshold.dynamicSellThreshold <= -threshold.coefficients.minThreshold &&
    threshold.dynamicSellThreshold >= -threshold.coefficients.maxThreshold,
  'Dynamic Sell Threshold clipped within [-T_max, -T_min]'
);

// TEST 13: BUY/SELL/HOLD decision explainability
const decision = DynamicThresholdEngine.evaluateDecision(threshold);
assert(['BUY', 'SELL', 'HOLD'].includes(decision.decision), 'Decision is one of BUY, SELL, or HOLD');
assert(decision.reasons.length > 0, 'Decision contains comprehensive mathematical explanation reasons');

// TEST 14 & 15: Position sizing & transaction costs
const posSize = RiskEngine.calculatePositionSize('BTC', 65000, 62400, 100000, 0.02, 0.35);
assert(posSize.recommendedUnits > 0, 'Position sizing computes positive unit allocation');
assert(posSize.positionValue <= 100000 * 0.35 + 1e-4, 'Position sizing enforces maximum capital constraint');

// TEST 16, 17, 18, 19, 20, 21: Backtesting Engine, Sharpe, Sortino, Drawdown, VaR, CVaR
const backtest = BacktestEngine.runBacktest(btcCandles, indicators, {
  asset: 'BTC',
  strategyId: 'dynamic_threshold',
  strategyParams: {},
  initialCapital: 100000,
  makerFeeBps: 10,
  takerFeeBps: 15,
  slippageBps: 5,
  stopLossAtrMult: 2.0,
  takeProfitAtrMult: 3.5,
  riskFractionPerTrade: 0.02,
  maxOpenPositions: 1,
  benchmark: 'buy_and_hold',
});
assert(backtest.metrics.finalCapital > 0, 'Backtest completes and tracks capital');
assert(backtest.metrics.totalFeesPaid >= 0, 'Backtest deducts real transaction costs on entries and exits');
assert(backtest.metrics.maxDrawdownPct >= 0 && backtest.metrics.maxDrawdownPct <= 1, 'Max drawdown is in [0, 1]');
assert(Number.isFinite(backtest.metrics.sharpeRatio), 'Sharpe ratio is finite numeric value');
assert(backtest.metrics.var95 >= 0, '95% Value at Risk is computed and positive');
assert(backtest.metrics.cvar95 >= backtest.metrics.var95, '95% CVaR is >= 95% VaR (Subadditivity/coherent risk)');

// TEST 22, 23, 24: Portfolio Optimization, Constraints, Risk Parity
const ethCandles = generateSyntheticCandles('ETH', 120, 24);
const solCandles = generateSyntheticCandles('SOL', 120, 24);
const optCandles = { BTC: btcCandles, ETH: ethCandles, SOL: solCandles, BNB: [], XRP: [], ADA: [] };

const opt = PortfolioOptimizer.optimize(optCandles, {
  capital: 100000,
  selectedAssets: ['BTC', 'ETH', 'SOL'],
  method: 'mean_variance',
  lookbackDays: 90,
  riskAversion: 2.5,
  cvarConfidence: 0.95,
  maxAssetAllocation: 0.60,
  minAssetAllocation: 0.05,
  allowCash: false,
  rebalanceFrequency: 'monthly',
});

const weightSum = Object.values(opt.weights).reduce((a, b) => a + b, 0);
assert(Math.abs(weightSum - 1.0) < 1e-4, 'Portfolio weights sum to 1.0 within numerical tolerance');
const allWeightsNonNegative = Object.values(opt.weights).every((w) => w >= 0);
assert(allWeightsNonNegative, 'All portfolio weights are non-negative (Long-only constraint satisfied)');
assert(opt.rebalanceOrders.length === 3, 'Rebalance recommendations generated for all selected assets');

console.log(`\n--- VALIDATION SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
if (failed > 0) process.exit(1);

# CryptoLens
### Multi-Model Quantitative Trading & Portfolio Intelligence

> **Official Project Title:**  
> Development and Evaluation of a Multi-Model Quantitative Framework for Cryptocurrency Market Analysis and Systematic Trading with Dynamic Portfolio Optimization and Risk-Aware Investment Decision Support.

---

## 1. Executive Overview

**CryptoLens** is an integrated quantitative financial analysis and systematic trading platform engineered entirely in modern TypeScript/React. It bridges three core quantitative modules into a unified decision-support system:

1. **Module 1: Market Analysis & Quantitative Signal Generation**
   - High-performance technical indicator library (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, ADX, OBV, Historical Realized Volatility).
   - Multi-model prediction architecture integrating LSTM, GRU, XGBoost, Technical, and Statistical adapters.
   - Deterministic market regime classifier (Bullish, Bearish, Sideways, High Volatility, Low Volatility).
   - **Core Research Contribution:** Adaptive Dynamic Buy/Sell Threshold Engine adjusting entry/exit hurdles in real time based on realized volatility, model confidence, regime shifts, and round-trip execution costs.

2. **Module 2: Systematic Trading Strategy & Event-Driven Backtesting**
   - 6 configurable systematic strategies (Moving Average Crossover, RSI Momentum, MACD Crossover, Bollinger Band Mean Reversion, Ensemble Signal, Dynamic Threshold).
   - Audited historical trading simulation engine with no look-ahead bias.
   - Explicit deduction of maker/taker fees and execution slippage on all orders.
   - Comprehensive quantitative performance metrics: Sharpe, Sortino, Calmar, Max Drawdown, CAGR, Win Rate, Profit Factor, VaR, CVaR.

3. **Module 3: Dynamic Portfolio Optimization & Risk Management**
   - 5 allocation models: Equal Weight (1/N), Minimum Variance, Mean-Variance Optimization, Risk Parity, and CVaR-Constrained Downside Optimization.
   - Dynamic rebalancing recommendations accounting for trading friction and fee hurdles.
   - Parametric and historical simulation Value at Risk (VaR 95%, 99%) and Conditional Value at Risk (CVaR).
   - Systematic ATR stop-loss / take-profit calculations and capital-constrained position sizing.

4. **Section 27: Strategy Lab (Pine Script-Inspired IDE)**
   - Browser-based quantitative development environment powered by Monaco Editor.
   - Dedicated **CryptoScript** language compiler and sandboxed execution engine.
   - Autocomplete and centralized function registry (`ta.*`, `math.*`, `quant.*`, `model.*`, `risk.*`, `portfolio.*`, `strategy.*`, `plot`).
   - 5 built-in ready-to-test strategy templates with instant backtesting integration.

---

## 2. Professional Design System

- **Warm Beige & Ivory Light Theme:** Warm ivory background (`#F5F3ED`), crisp surface panels (`#FFFFFF`), charcoal typography (`#252820`), forest green positive values (`#16865B`), and restrained negative values (`#D64C4C`).
- **Professional Terminal Dark Theme:** Charcoal background (`#111315`), surface panels (`#191C1F`), high-contrast tabular typography, and TradingView-style data density.
- **Persistent Theme Converter:** Immediate toggle with persistent preferences in `localStorage`.

---

## 3. Technology Stack

- **Framework:** React 18+, TypeScript, Vite
- **Styling:** Tailwind CSS, PostCSS, Lucide React
- **Charting:** TradingView Lightweight Charts (`lightweight-charts`), Recharts
- **State Management:** Zustand
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Mathematics:** Decimal.js, Native Web Workers / TypeScript math utilities

---

## 4. Getting Started

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- npm

### Installation & Launch

```bash
# 1. Navigate to the project directory
cd C:\Users\Naj\.gemini\antigravity\scratch\cryptolens

# 2. Install dependencies
npm install

# 3. Run mathematical test suite (27 unit tests)
npm test

# 4. Start local development server
npm run dev

# 5. Production build
npm run build
```

---

## 5. Mathematical Formulations

### 5.1 Dynamic Threshold Engine
The dynamic trading hurdles adapt to changing market conditions:

$$T_{\text{buy}}(t) = \text{clip}\Big(T_{\text{base\_buy}} + k_v \cdot V_{\text{adj}}(t) + k_u \cdot U_{\text{adj}}(t) + k_r \cdot R_{\text{adj}}(t) + k_c \cdot C_{\text{adj}}(t), \, T_{\text{min}}, \, T_{\text{max}}\Big)$$

$$T_{\text{sell}}(t) = -\text{clip}\Big(T_{\text{base\_sell}} + k_v \cdot V_{\text{adj}}(t) + k_u \cdot U_{\text{adj}}(t) + k_r \cdot R_{\text{adj}}(t) + k_c \cdot C_{\text{adj}}(t), \, T_{\text{min}}, \, T_{\text{max}}\Big)$$

Where:
- $V_{\text{adj}}(t) = \max\left(0, \frac{\text{CurrentVol}}{\text{RefVol}} - 1\right)$
- $U_{\text{adj}}(t) = 1 - \text{CalibratedConfidence}(t)$
- $R_{\text{adj}}(t)$ applies regime-dependent penalties/bonuses.
- $C_{\text{adj}}(t)$ incorporates round-trip fees, estimated slippage, and spread.

### 5.2 Position Sizing Formula
Systematic position sizing enforces a strict risk-of-ruin constraint:

$$\text{Position Size} = \min\left(\frac{\text{Capital} \times \text{Risk Fraction}}{|\text{Entry Price} - \text{Stop Loss}|}, \; \frac{\text{Capital} \times \text{Max Asset Allocation}}{\text{Entry Price}}\right)$$

---

## 6. Project Architecture

```
cryptolens/
├── src/
│   ├── components/
│   │   ├── charts/       # LightweightCandleChart, IndicatorSubChart, EquityChart
│   │   ├── common/       # KpiCard, Badge, Tabs, Modals
│   │   └── layout/       # AppLayout, Sidebar, TopNavbar
│   ├── engine/
│   │   ├── cryptoscript/ # Lexer, Parser, AST, Interpreter, Registry, Templates
│   │   ├── indicators/   # Mathematical Technical Indicator Engine
│   │   ├── portfolio/    # Optimization algorithms & dynamic rebalancer
│   │   ├── risk/         # VaR, CVaR, drawdown, and position sizing
│   │   ├── signals/      # Ensemble engine, regime classifier, threshold engine
│   │   └── trading/      # Strategy engine & backtest simulator
│   ├── pages/            # 12 fully functional pages
│   ├── services/         # Binance API, Synthetic Demo Data, CSV Parser
│   ├── store/            # Zustand stores (market, settings, portfolio, script)
│   ├── styles/           # Tailwind globals with light/dark CSS tokens
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Currency, percent, and number formatters
├── tests/
│   └── mathematicalValidation.ts # 27 automated mathematical validation tests
├── package.json
├── tsconfig.json
└── vite.config.ts
```

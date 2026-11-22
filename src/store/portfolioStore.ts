import { create } from 'zustand';
import { SupportedAsset } from '@/types/market';
import {
  PortfolioSettings,
  OptimizationResult,
  OptimizationMethod,
} from '@/types/portfolio';
import { PortfolioOptimizer } from '@/engine/portfolio/optimizer';
import { useMarketStore } from './marketStore';

export interface PortfolioStoreState {
  settings: PortfolioSettings;
  currentWeights: Record<SupportedAsset, number>;
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;

  setCapital: (capital: number) => void;
  setSelectedAssets: (assets: SupportedAsset[]) => void;
  setMethod: (method: OptimizationMethod) => void;
  setRiskAversion: (lambda: number) => void;
  runOptimization: () => void;
  applyRebalance: () => void;
}

const initialWeights: Record<SupportedAsset, number> = {
  BTC: 0.40,
  ETH: 0.30,
  BNB: 0.10,
  SOL: 0.10,
  XRP: 0.05,
  ADA: 0.05,
};

export const usePortfolioStore = create<PortfolioStoreState>((set, get) => ({
  settings: {
    capital: 100000,
    selectedAssets: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA'],
    method: 'mean_variance',
    lookbackDays: 90,
    riskAversion: 2.5,
    cvarConfidence: 0.95,
    maxAssetAllocation: 0.40,
    minAssetAllocation: 0.05,
    allowCash: false,
    rebalanceFrequency: 'monthly',
  },
  currentWeights: initialWeights,
  optimizationResult: null,
  isOptimizing: false,

  setCapital: (capital) =>
    set((state) => ({ settings: { ...state.settings, capital } })),

  setSelectedAssets: (assets) => {
    set((state) => ({ settings: { ...state.settings, selectedAssets: assets } }));
    get().runOptimization();
  },

  setMethod: (method) => {
    set((state) => ({ settings: { ...state.settings, method } }));
    get().runOptimization();
  },

  setRiskAversion: (riskAversion) => {
    set((state) => ({ settings: { ...state.settings, riskAversion } }));
    get().runOptimization();
  },

  runOptimization: () => {
    const { settings, currentWeights } = get();
    const marketCandles = useMarketStore.getState().candles;
    set({ isOptimizing: true });

    try {
      const result = PortfolioOptimizer.optimize(marketCandles, settings, currentWeights);
      set({ optimizationResult: result, isOptimizing: false });
    } catch (err) {
      console.error('Optimization error:', err);
      set({ isOptimizing: false });
    }
  },

  applyRebalance: () => {
    const { optimizationResult } = get();
    if (optimizationResult && optimizationResult.feasible) {
      set({ currentWeights: { ...optimizationResult.weights } });
      get().runOptimization();
    }
  },
}));

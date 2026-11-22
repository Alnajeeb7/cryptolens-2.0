import { create } from 'zustand';
import { UserScript, ScriptExecutionResult } from '@/types/cryptoscript';
import { BacktestResult } from '@/types/strategy';
import { DEFAULT_SCRIPT_TEMPLATES } from '@/engine/cryptoscript/templates';
import { CryptoScriptInterpreter } from '@/engine/cryptoscript/interpreter';
import { useMarketStore } from './marketStore';
import { BacktestEngine } from '@/engine/trading/backtestEngine';

export interface ScriptStoreState {
  scripts: UserScript[];
  activeScriptId: string;
  activeScriptCode: string;
  isExecuting: boolean;
  lastExecutionResult: ScriptExecutionResult | null;
  scriptBacktestResult: BacktestResult | null;

  setActiveScript: (id: string) => void;
  updateActiveCode: (code: string) => void;
  createNewScript: (name?: string) => void;
  saveScript: () => void;
  duplicateScript: (id: string) => void;
  deleteScript: (id: string) => void;
  executeScript: () => void;
  runScriptBacktest: () => void;
  importScript: (name: string, code: string) => void;
}

const initialScripts: UserScript[] = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cryptolens_scripts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return DEFAULT_SCRIPT_TEMPLATES;
})();

export const useScriptStore = create<ScriptStoreState>((set, get) => ({
  scripts: initialScripts,
  activeScriptId: initialScripts[4]?.id || initialScripts[0].id,
  activeScriptCode: initialScripts[4]?.code || initialScripts[0].code,
  isExecuting: false,
  lastExecutionResult: null,
  scriptBacktestResult: null,

  setActiveScript: (id) => {
    const s = get().scripts.find((item) => item.id === id);
    if (s) {
      set({ activeScriptId: s.id, activeScriptCode: s.code, lastExecutionResult: null });
    }
  },

  updateActiveCode: (code) => {
    set({ activeScriptCode: code });
  },

  createNewScript: (name = 'New Strategy') => {
    const newScript: UserScript = {
      id: `script-${Date.now()}`,
      name,
      description: 'Custom quantitative strategy script.',
      code: `//@version=1\nstrategy("${name}")\n\nfast = ta.ema(close, 9)\nslow = ta.ema(close, 21)\n\nbuy = crossover(fast, slow)\nsell = crossunder(fast, slow)\n\nif buy\n    strategy.entry("Long", "long")\n\nif sell\n    strategy.close("Long")\n\nplot(fast, "Fast EMA", "#26A879")\nplot(slow, "Slow EMA", "#D7A64D")\n`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTemplate: false,
    };

    set((state) => {
      const updated = [...state.scripts, newScript];
      if (typeof window !== 'undefined') {
        localStorage.setItem('cryptolens_scripts', JSON.stringify(updated));
      }
      return { scripts: updated, activeScriptId: newScript.id, activeScriptCode: newScript.code };
    });
  },

  saveScript: () => {
    const { activeScriptId, activeScriptCode, scripts } = get();
    const updated = scripts.map((s) =>
      s.id === activeScriptId ? { ...s, code: activeScriptCode, updatedAt: Date.now() } : s
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptolens_scripts', JSON.stringify(updated));
    }
    set({ scripts: updated });
  },

  duplicateScript: (id) => {
    const target = get().scripts.find((s) => s.id === id);
    if (!target) return;
    const copy: UserScript = {
      id: `script-${Date.now()}`,
      name: `${target.name} (Copy)`,
      description: target.description,
      code: target.code,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTemplate: false,
    };
    set((state) => {
      const updated = [...state.scripts, copy];
      if (typeof window !== 'undefined') {
        localStorage.setItem('cryptolens_scripts', JSON.stringify(updated));
      }
      return { scripts: updated, activeScriptId: copy.id, activeScriptCode: copy.code };
    });
  },

  deleteScript: (id) => {
    set((state) => {
      const updated = state.scripts.filter((s) => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cryptolens_scripts', JSON.stringify(updated));
      }
      const nextActive = updated[0];
      return {
        scripts: updated,
        activeScriptId: nextActive ? nextActive.id : '',
        activeScriptCode: nextActive ? nextActive.code : '',
      };
    });
  },

  executeScript: () => {
    const { activeScriptCode } = get();
    const { candles, indicators, selectedAsset } = useMarketStore.getState();
    const cList = candles[selectedAsset] || [];
    const indList = indicators[selectedAsset] || [];

    set({ isExecuting: true });
    const result = CryptoScriptInterpreter.execute(activeScriptCode, cList, indList);
    set({ lastExecutionResult: result, isExecuting: false });
  },

  runScriptBacktest: () => {
    get().executeScript();
    const { activeScriptCode } = get();
    const { candles, indicators, selectedAsset } = useMarketStore.getState();
    const cList = candles[selectedAsset] || [];
    const indList = indicators[selectedAsset] || [];

    const isDynamic = activeScriptCode.includes('dynamicBuyThreshold') || activeScriptCode.includes('ensembleScore');
    const stratId = isDynamic ? 'dynamic_threshold' : 'ma_crossover';

    const result = BacktestEngine.runBacktest(cList, indList, {
      asset: selectedAsset,
      strategyId: stratId,
      strategyParams: {},
      initialCapital: 100000,
      makerFeeBps: 10,
      takerFeeBps: 15,
      slippageBps: 5,
      riskFractionPerTrade: 0.02,
      maxOpenPositions: 1,
      benchmark: 'buy_and_hold',
    });

    set({ scriptBacktestResult: result });
  },

  importScript: (name, code) => {
    const script: UserScript = {
      id: `script-${Date.now()}`,
      name,
      code,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTemplate: false,
    };
    set((state) => {
      const updated = [...state.scripts, script];
      if (typeof window !== 'undefined') {
        localStorage.setItem('cryptolens_scripts', JSON.stringify(updated));
      }
      return { scripts: updated, activeScriptId: script.id, activeScriptCode: script.code };
    });
  },
}));

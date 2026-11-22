import React, { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useMarketStore } from '@/store/marketStore';
import { Badge } from '@/components/common/Badge';
import { Settings as SettingsIcon, Sun, Moon, Save, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    toggleTheme,
    defaultCapital,
    makerFeeBps,
    takerFeeBps,
    slippageBps,
    maxPortfolioRisk,
    updateSettings,
  } = useSettingsStore();

  const { dataSource, setDataSource } = useMarketStore();

  const [capital, setCapital] = useState(defaultCapital);
  const [makerFee, setMakerFee] = useState(makerFeeBps);
  const [takerFee, setTakerFee] = useState(takerFeeBps);
  const [slippage, setSlippage] = useState(slippageBps);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    updateSettings({
      defaultCapital: capital,
      makerFeeBps: makerFee,
      takerFeeBps: takerFee,
      slippageBps: slippage,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Settings Header */}
      <div className="bg-surface border border-border rounded p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon size={18} className="text-accent" />
          <span className="text-xs font-semibold text-text-primary tracking-wide">
            GLOBAL QUANTITATIVE TERMINAL SETTINGS
          </span>
        </div>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Save size={13} />
          {savedToast ? 'Settings Saved!' : 'Save Preferences'}
        </button>
      </div>

      {/* Theme Converter Section */}
      <div className="bg-surface border border-border rounded p-4 space-y-3">
        <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border">
          THEME CONVERTER & TERMINAL AESTHETIC
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <button
            onClick={() => {
              if (theme !== 'dark') toggleTheme();
            }}
            className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
              theme === 'dark' ? 'border-accent bg-surface-secondary shadow-sm' : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon size={16} className="text-accent" />
              <div>
                <div className="font-bold text-text-primary">Professional Terminal (Dark)</div>
                <div className="text-[10px] text-text-muted mt-0.5">Deep charcoal #111315 with high-contrast data</div>
              </div>
            </div>
            {theme === 'dark' && <Badge variant="accent">ACTIVE</Badge>}
          </button>

          <button
            onClick={() => {
              if (theme !== 'light') toggleTheme();
            }}
            className={`p-3 rounded border text-left flex items-center justify-between transition-all ${
              theme === 'light' ? 'border-accent bg-surface-secondary shadow-sm' : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun size={16} className="text-warning" />
              <div>
                <div className="font-bold text-text-primary">Warm Ivory & Beige (Light)</div>
                <div className="text-[10px] text-text-muted mt-0.5">Warm ivory #F5F3ED with restrained colors</div>
              </div>
            </div>
            {theme === 'light' && <Badge variant="accent">ACTIVE</Badge>}
          </button>
        </div>
      </div>

      {/* Execution & Financial Assumptions */}
      <div className="bg-surface border border-border rounded p-4 space-y-3">
        <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border">
          FINANCIAL PARAMETERS & SIMULATION DEFAULTS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-text-secondary block mb-1">Default Simulated Capital ($):</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 10000)}
              className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded text-text-primary"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">Max Risk Per Trade Fraction:</label>
            <input
              type="text"
              disabled
              value={`${(maxPortfolioRisk * 100).toFixed(1)}% (Hard Fixed Risk Ceiling)`}
              className="w-full px-2.5 py-1.5 bg-surface-secondary/50 border border-border rounded text-text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">Maker Fee (basis points):</label>
            <input
              type="number"
              value={makerFee}
              onChange={(e) => setMakerFee(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded text-text-primary"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">Taker Fee (basis points):</label>
            <input
              type="number"
              value={takerFee}
              onChange={(e) => setTakerFee(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded text-text-primary"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">Simulated Slippage (basis points):</label>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded text-text-primary"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">Market Data Source Provider:</label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded text-text-primary"
            >
              <option value="synthetic">Calibrated Synthetic Demo Data</option>
              <option value="live">Binance Public REST API (Live Stream)</option>
              <option value="csv">User Uploaded CSV Dataset</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

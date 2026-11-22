import React, { useState } from 'react';
import { Sun, Moon, Database, Radio, RefreshCw, Search } from 'lucide-react';
import { SupportedAsset, Timeframe } from '@/types/market';
import { useMarketStore } from '@/store/marketStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Badge } from '@/components/common/Badge';
import { AssetSearchModal } from '@/components/common/AssetSearchModal';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface TopNavbarProps {
  pageTitle: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ pageTitle }) => {
  const {
    selectedAsset,
    setSelectedAsset,
    selectedTimeframe,
    setSelectedTimeframe,
    assetSummaries,
    dataSource,
    setDataSource,
    isLiveLoading,
  } = useMarketStore();

  const { theme, toggleTheme } = useSettingsStore();
  const summary = assetSummaries[selectedAsset];

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const quickAssets: SupportedAsset[] = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'SUI', 'PEPE', 'NEAR'];
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  return (
    <>
      <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between z-10 shrink-0">
        {/* Left: Page Title & Global Asset Search / Quick Switch */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-text-primary tracking-tight">{pageTitle}</h1>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Asset Search & Selector Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 bg-surface-secondary hover:bg-surface-hover border border-border rounded text-xs font-mono font-medium transition-colors"
          >
            <Search size={12} className="text-accent" />
            <span className="font-bold text-text-primary">{selectedAsset}</span>
            <span className="text-[10px] text-text-muted">100 Coins</span>
          </button>

          {/* Quick Assets Bar */}
          <div className="hidden xl:flex items-center gap-1 bg-surface-secondary border border-border rounded p-0.5">
            {quickAssets.map((asset) => {
              const isSelected = selectedAsset === asset;
              return (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`px-1.5 py-0.5 text-[11px] font-mono font-medium rounded transition-colors ${
                    isSelected
                      ? 'bg-surface text-text-primary shadow-xs border border-border/80 font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {asset}
                </button>
              );
            })}
          </div>

          {/* Selected Asset Price Ticker */}
          {summary && (
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
              <span className="font-semibold text-text-primary">
                {formatCurrency(summary.price, summary.price < 0.1 ? 6 : summary.price < 2 ? 4 : 2)}
              </span>
              <span
                className={`font-medium ${
                  summary.change24h >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                }`}
              >
                {formatPercent(summary.change24h)}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="hidden md:flex items-center gap-0.5 bg-surface-secondary border border-border rounded p-0.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-surface text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Data Source Indicator */}
          <div className="flex items-center gap-1.5">
            {dataSource === 'live' ? (
              <Badge variant="positive" className="gap-1">
                <Radio size={10} className="animate-pulse" />
                LIVE BINANCE
              </Badge>
            ) : dataSource === 'csv' ? (
              <Badge variant="accent" className="gap-1">
                <Database size={10} />
                CSV DATA
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                5Y DATA ENGINE
              </Badge>
            )}

            <button
              onClick={() => setDataSource(dataSource === 'live' ? 'synthetic' : 'live')}
              title="Toggle Live Binance stream / 5-Year Calibrated data"
              className="p-1.5 text-text-muted hover:text-text-primary rounded border border-border hover:bg-surface-hover"
            >
              <RefreshCw size={13} className={isLiveLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Theme Converter Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Warm Beige Light' : 'Terminal Dark'} theme`}
            className="p-2 text-text-secondary hover:text-text-primary rounded border border-border hover:bg-surface-hover transition-colors flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun size={15} className="text-warning" /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Asset Search Modal */}
      <AssetSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

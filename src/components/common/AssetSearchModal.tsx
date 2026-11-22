import React, { useState, useMemo } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { TOP_100_COINS, CoinMeta } from '@/services/marketData/coinsList';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/utils/formatters';
import { Search, X, TrendingUp, Layers } from 'lucide-react';

interface AssetSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetSearchModal: React.FC<AssetSearchModalProps> = ({ isOpen, onClose }) => {
  const { selectedAsset, setSelectedAsset, assetSummaries } = useMarketStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Layer 1', 'Layer 2', 'DeFi', 'AI & Data', 'Meme', 'Infra', 'Gaming', 'RWA'];

  const filteredCoins = useMemo(() => {
    return TOP_100_COINS.filter((coin) => {
      const matchCat = selectedCategory === 'All' || coin.category === selectedCategory;
      const query = search.toLowerCase().trim();
      const matchSearch =
        query === '' ||
        coin.symbol.toLowerCase().includes(query) ||
        coin.name.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-surface border border-border rounded shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Search */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary tracking-wide">
              SELECT CRYPTOCURRENCY ASSET (100 COINS AVAILABLE)
            </span>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface-secondary"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              autoFocus
              placeholder="Search by ticker (e.g. BTC, SUI, PEPE) or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-secondary border border-border rounded text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent text-white font-semibold'
                    : 'bg-surface-secondary text-text-muted hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Coins Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border text-xs font-mono">
          {filteredCoins.map((coin) => {
            const isSelected = selectedAsset === coin.symbol;
            const summary = assetSummaries[coin.symbol];
            const price = summary?.price ?? coin.basePrice;
            const change = summary?.change24h ?? 0;

            return (
              <div
                key={coin.symbol}
                onClick={() => {
                  setSelectedAsset(coin.symbol);
                  onClose();
                }}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-surface-secondary/80 font-bold border-l-2 border-accent' : 'hover:bg-surface-secondary/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-[10px] text-text-muted font-normal text-right">
                    #{coin.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-primary font-bold">{coin.symbol}</span>
                      <span className="text-[11px] text-text-muted font-normal">{coin.name}</span>
                      <Badge variant="neutral" size="sm">{coin.category}</Badge>
                    </div>
                    <div className="text-[10px] text-text-muted">
                      Cap: {formatCompactNumber(coin.marketCap)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-text-primary">
                    {formatCurrency(price, price < 0.1 ? 6 : price < 2 ? 4 : 2)}
                  </div>
                  <div className={`text-[11px] ${change >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatPercent(change)}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCoins.length === 0 && (
            <div className="p-8 text-center text-text-muted text-xs">
              No cryptocurrency matching "{search}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

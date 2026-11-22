import React, { useState, useMemo } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { useSettingsStore } from '@/store/settingsStore';
import { BacktestEngine } from '@/engine/trading/backtestEngine';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatPercent, formatTimestamp } from '@/utils/formatters';
import { ListOrdered, Search, Download, Filter } from 'lucide-react';

export const TradeHistoryPage: React.FC = () => {
  const { selectedAsset, candles, indicators } = useMarketStore();
  const { defaultCapital, makerFeeBps, takerFeeBps, slippageBps } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const cList = candles[selectedAsset] || [];
  const indList = indicators[selectedAsset] || [];

  const backtest = useMemo(() => {
    return BacktestEngine.runBacktest(cList, indList, {
      asset: selectedAsset,
      strategyId: 'dynamic_threshold',
      strategyParams: {},
      initialCapital: defaultCapital,
      makerFeeBps,
      takerFeeBps,
      slippageBps,
      stopLossAtrMult: 2.0,
      takeProfitAtrMult: 3.5,
      riskFractionPerTrade: 0.02,
      maxOpenPositions: 1,
      benchmark: 'buy_and_hold',
    });
  }, [cList, indList, selectedAsset, defaultCapital, makerFeeBps, takerFeeBps, slippageBps]);

  const filteredTrades = useMemo(() => {
    return backtest.trades.filter((t) => {
      const matchSide = filterSide === 'ALL' || t.side === filterSide;
      const matchSearch =
        search === '' ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.exitReason && t.exitReason.toLowerCase().includes(search.toLowerCase()));
      return matchSide && matchSearch;
    });
  }, [backtest.trades, search, filterSide]);

  const exportCSV = () => {
    const headers = 'ID,Asset,Side,EntryTime,EntryPrice,ExitTime,ExitPrice,Qty,GrossPnL,Fees,NetPnL,ReturnPct,ExitReason\n';
    const rows = filteredTrades
      .map(
        (t) =>
          `${t.id},${t.asset},${t.side},${new Date(t.entryTimestamp).toISOString()},${t.entryPrice},${t.exitTimestamp ? new Date(t.exitTimestamp).toISOString() : ''},${t.exitPrice || ''},${t.quantity},${t.grossPnL},${t.fees},${t.netPnL},${t.returnPct},${t.exitReason || ''}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${selectedAsset}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-surface border border-border rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <ListOrdered size={16} className="text-accent" />
            <span>TRADE EXECUTION HISTORY</span>
          </div>
          <Badge variant="neutral">{filteredTrades.length} RECORDED</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search trade ID or exit reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-surface-secondary border border-border rounded text-xs text-text-primary font-mono w-56 placeholder:text-text-muted"
            />
          </div>

          {/* Filter */}
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value as any)}
            className="px-2 py-1.5 bg-surface-secondary border border-border rounded text-xs text-text-primary font-mono"
          >
            <option value="ALL">All Sides</option>
            <option value="BUY">BUY Only</option>
            <option value="SELL">SELL Only</option>
          </select>

          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-surface-secondary border border-border hover:bg-surface-hover text-text-primary rounded font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/40 text-text-muted text-[11px]">
                <th className="py-2.5 px-3">Trade ID</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Entry Time</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Exit Time</th>
                <th className="py-2.5 px-3">Exit Price</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Fees Paid</th>
                <th className="py-2.5 px-3">Net P&L</th>
                <th className="py-2.5 px-3">Return</th>
                <th className="py-2.5 px-3">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTrades.map((t) => (
                <tr key={t.id} className="hover:bg-surface-secondary/50">
                  <td className="py-2.5 px-3 text-text-muted">{t.id}</td>
                  <td className="py-2.5 px-3 font-bold text-text-primary">{t.asset}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={t.side === 'BUY' ? 'positive' : 'negative'}>{t.side}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary">{formatTimestamp(t.entryTimestamp, 'full')}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatCurrency(t.entryPrice)}</td>
                  <td className="py-2.5 px-3 text-text-secondary">
                    {t.exitTimestamp ? formatTimestamp(t.exitTimestamp, 'full') : 'ACTIVE'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">
                    {t.exitPrice ? formatCurrency(t.exitPrice) : '—'}
                  </td>
                  <td className="py-2.5 px-3">{t.quantity.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-text-muted">{formatCurrency(t.fees)}</td>
                  <td className={`py-2.5 px-3 font-bold ${t.netPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatCurrency(t.netPnL)}
                  </td>
                  <td className={`py-2.5 px-3 font-semibold ${t.returnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatPercent(t.returnPct)}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="neutral">{t.exitReason || 'HOLDING'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

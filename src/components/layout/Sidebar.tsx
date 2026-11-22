import React from 'react';
import {
  LayoutDashboard,
  CandlestickChart,
  BrainCircuit,
  Sliders,
  History,
  PieChart,
  ShieldAlert,
  BarChart3,
  ListOrdered,
  Code2,
  Database,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type NavPage =
  | 'overview'
  | 'market_analysis'
  | 'signal_intelligence'
  | 'trading_strategy'
  | 'backtesting'
  | 'portfolio_optimization'
  | 'risk_management'
  | 'performance_analytics'
  | 'trade_history'
  | 'strategy_lab'
  | 'data_management'
  | 'settings';

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  const navItems: { id: NavPage; label: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'market_analysis', label: 'Market Analysis', icon: <CandlestickChart size={16} /> },
    { id: 'signal_intelligence', label: 'Signal Intelligence', icon: <BrainCircuit size={16} />, tag: 'ML' },
    { id: 'trading_strategy', label: 'Trading Strategies', icon: <Sliders size={16} /> },
    { id: 'backtesting', label: 'Backtesting', icon: <History size={16} /> },
    { id: 'portfolio_optimization', label: 'Portfolio Optimization', icon: <PieChart size={16} /> },
    { id: 'risk_management', label: 'Risk Management', icon: <ShieldAlert size={16} /> },
    { id: 'performance_analytics', label: 'Performance Analytics', icon: <BarChart3 size={16} /> },
    { id: 'trade_history', label: 'Trade History', icon: <ListOrdered size={16} /> },
    { id: 'strategy_lab', label: 'Strategy Lab', icon: <Code2 size={16} />, tag: 'IDE' },
    { id: 'data_management', label: 'Data Management', icon: <Database size={16} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <aside className="w-[220px] h-screen bg-surface border-r border-border flex flex-col flex-shrink-0 select-none z-20">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-positive flex items-center justify-center text-white font-mono font-bold text-xs">
            CL
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-text-primary leading-none">
              CryptoLens
            </span>
            <span className="text-[9px] font-mono text-text-muted mt-0.5 tracking-wider">
              QUANT PLATFORM
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Workspaces
        </div>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium transition-colors text-left group',
                isActive
                  ? 'bg-surface-secondary text-text-primary font-semibold border-l-2 border-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn(isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.tag && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-secondary text-text-muted border border-border">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-border bg-surface-secondary/50 text-[10px] text-text-muted font-mono flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Engine:</span>
          <span className="text-positive font-medium">v1.0 TypeScript</span>
        </div>
        <div className="flex justify-between">
          <span>Execution:</span>
          <span>Zero-Backend</span>
        </div>
      </div>
    </aside>
  );
};

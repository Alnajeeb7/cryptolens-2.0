import React from 'react';
import { Sidebar, NavPage } from './Sidebar';
import { TopNavbar } from './TopNavbar';

interface AppLayoutProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  children: React.ReactNode;
}

const pageTitles: Record<NavPage, string> = {
  overview: 'Overview Dashboard',
  market_analysis: 'Market Analysis & Charting',
  signal_intelligence: 'AI Signal Intelligence',
  trading_strategy: 'Trading Strategies',
  backtesting: 'Systematic Backtesting Engine',
  portfolio_optimization: 'Dynamic Portfolio Optimization',
  risk_management: 'Risk Management & Capital Preservation',
  performance_analytics: 'Performance Analytics',
  trade_history: 'Trade History & Audit Log',
  strategy_lab: 'Strategy Lab (CryptoScript IDE)',
  data_management: 'Data Management & CSV Import',
  settings: 'System & Execution Settings',
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  activePage,
  onSelectPage,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* 220px Left Sidebar */}
      <Sidebar activePage={activePage} onSelectPage={onSelectPage} />

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 56px Top Navigation */}
        <TopNavbar pageTitle={pageTitles[activePage]} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

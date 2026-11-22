import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { NavPage } from '@/components/layout/Sidebar';
import { OverviewPage } from '@/pages/Overview';
import { MarketAnalysisPage } from '@/pages/MarketAnalysis';
import { SignalIntelligencePage } from '@/pages/SignalIntelligence';
import { TradingStrategyPage } from '@/pages/TradingStrategy';
import { BacktestingPage } from '@/pages/Backtesting';
import { PortfolioOptimizationPage } from '@/pages/PortfolioOptimization';
import { RiskManagementPage } from '@/pages/RiskManagement';
import { PerformanceAnalyticsPage } from '@/pages/PerformanceAnalytics';
import { TradeHistoryPage } from '@/pages/TradeHistory';
import { StrategyLabPage } from '@/pages/StrategyLab';
import { DataManagementPage } from '@/pages/DataManagement';
import { SettingsPage } from '@/pages/Settings';
import { useSettingsStore } from '@/store/settingsStore';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<NavPage>('overview');
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'market_analysis':
        return <MarketAnalysisPage />;
      case 'signal_intelligence':
        return <SignalIntelligencePage />;
      case 'trading_strategy':
        return <TradingStrategyPage />;
      case 'backtesting':
        return <BacktestingPage />;
      case 'portfolio_optimization':
        return <PortfolioOptimizationPage />;
      case 'risk_management':
        return <RiskManagementPage />;
      case 'performance_analytics':
        return <PerformanceAnalyticsPage />;
      case 'trade_history':
        return <TradeHistoryPage />;
      case 'strategy_lab':
        return <StrategyLabPage />;
      case 'data_management':
        return <DataManagementPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <AppLayout activePage={activePage} onSelectPage={setActivePage}>
      {renderPage()}
    </AppLayout>
  );
};

export default App;

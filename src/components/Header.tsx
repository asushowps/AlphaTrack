import React from 'react';
import { 
  TrendingUp, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Plus, 
  RefreshCw, 
  SlidersHorizontal,
  Laptop
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: 'dashboard' | 'daily_pnl' | 'compare' | 'charts' | 'holdings') => void;
  onOpenSearch: () => void;
  onOpenAlerts: () => void;
  onOpenSync: () => void;
  onOpenAddModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onOpenSearch,
  onOpenAlerts,
  onOpenSync,
  onOpenAddModal
}) => {
  const { 
    theme, 
    toggleTheme, 
    unreadAlertsCount, 
    marketStatus, 
    refreshInterval, 
    setRefreshInterval,
    refreshMarketData,
    quotesLoading,
    isSimulatingTicks,
    setIsSimulatingTicks
  } = usePortfolio();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-6">
      {/* Zone 1: Brand Wordmark (Single text element, no subtitle clutter) */}
      <div className="flex items-center gap-3 shrink-0">
        <a 
          href="#compare" 
          onClick={(e) => { e.preventDefault(); setActiveView('compare'); }}
          className="text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 whitespace-nowrap"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>AlphaTrack</span>
        </a>

        {/* Live Market Status Pill */}
        {marketStatus && (
          <div 
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-slate-900/60 border-slate-800 text-slate-300"
            title={`US Market Status: ${marketStatus.message} (${marketStatus.nyTime})`}
          >
            <span className={`w-2 h-2 rounded-full ${marketStatus.status === 'OPEN' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{marketStatus.status === 'OPEN' ? 'NYSE Open' : marketStatus.message}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links (Clean single-line prose, no pills) */}
      <nav className="hidden md:flex items-center gap-6 text-xs md:text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveView('compare')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeView === 'compare' ? 'text-white font-semibold' : ''}`}
        >
          20Y Compare
        </button>
        <button
          onClick={() => setActiveView('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeView === 'dashboard' ? 'text-white font-semibold' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView('daily_pnl')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeView === 'daily_pnl' ? 'text-white font-semibold' : ''}`}
        >
          Daily P&L
        </button>
        <button
          onClick={() => setActiveView('charts')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeView === 'charts' ? 'text-white font-semibold' : ''}`}
        >
          20Y Charts
        </button>
        <button
          onClick={() => setActiveView('holdings')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeView === 'holdings' ? 'text-white font-semibold' : ''}`}
        >
          Holdings
        </button>
      </nav>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Quick Search Button (Cmd+K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors text-xs font-sans"
          title="Search Stocks & Indices (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden lg:inline text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Live Tick Simulator Toggle */}
        <button
          onClick={() => setIsSimulatingTicks(prev => !prev)}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
            isSimulatingTicks 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle Real-Time Market Ticks Simulator"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSimulatingTicks ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="hidden xl:inline">Live Ticks</span>
        </button>

        {/* Drop Alerts Notification Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Price Drop Alerts & Push Settings"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Cross-Device Sync Button */}
        <button
          onClick={onOpenSync}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition-colors"
          title="Sync across Mobile & Desktop"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>

        {/* 1 Primary Action: Add Holding */}
        <button
          onClick={onOpenAddModal}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Position</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
};

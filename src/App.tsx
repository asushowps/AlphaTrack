import React, { useState, useEffect } from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { Header } from './components/Header';
import { IndicesTicker } from './components/IndicesTicker';
import { PortfolioMetrics } from './components/PortfolioMetrics';
import { InteractiveChart } from './components/InteractiveChart';
import { DailyPnLSummary } from './components/DailyPnLSummary';
import { HoldingsTable } from './components/HoldingsTable';
import { StockSearchModal } from './components/StockSearchModal';
import { AlertsManagerModal } from './components/AlertsManagerModal';
import { AddHoldingModal } from './components/AddHoldingModal';
import { SyncModal } from './components/SyncModal';
import { SignificantDropToast } from './components/SignificantDropToast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Portfolio20YComparison } from './components/Portfolio20YComparison';
import type { Holding } from './types';
import { 
  BarChart3, 
  PieChart, 
  ShieldAlert, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Layers,
  Sparkles
} from 'lucide-react';

function DashboardContent() {
  const { 
    selectedTicker, 
    setSelectedTicker, 
    holdingsWithMetrics, 
    portfolioSummary,
    quotesLastUpdated 
  } = usePortfolio();

  const [activeView, setActiveView] = useState<'dashboard' | 'daily_pnl' | 'compare' | 'charts' | 'holdings'>('compare');
  
  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alertsInitialTicker, setAlertsInitialTicker] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialTicker, setAddModalInitialTicker] = useState('');
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAlertForTicker = (ticker: string) => {
    setAlertsInitialTicker(ticker);
    setIsAlertsOpen(true);
  };

  const handleOpenAddForTicker = (ticker: string) => {
    setEditingHolding(null);
    setAddModalInitialTicker(ticker);
    setIsAddModalOpen(true);
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setAddModalInitialTicker(holding.ticker);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-10 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. Header with 3-Zone Contract */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAlerts={() => {
          setAlertsInitialTicker('ALL');
          setIsAlertsOpen(true);
        }}
        onOpenSync={() => setIsSyncOpen(true)}
        onOpenAddModal={() => {
          setEditingHolding(null);
          setAddModalInitialTicker('');
          setIsAddModalOpen(true);
        }}
      />

      {/* 2. Live Indices Ticker Banner */}
      <IndicesTicker />

      {/* 3. Significant Drop Alert Floating Toast */}
      <SignificantDropToast onOpenAlertModalForTicker={handleOpenAlertForTicker} />

      {/* 4. Main Scrollable Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* VIEW 1: DASHBOARD (Overview with KPI, 20Y Chart & Allocation, Daily P&L, Holdings) */}
        {activeView === 'dashboard' && (
          <>
            {/* Top KPI Metrics Strip */}
            <PortfolioMetrics onOpenAlerts={() => handleOpenAlertForTicker('ALL')} />

            {/* Split Grid: 20-Year Chart + Asset Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Primary 20-Year Chart (Spans 2 columns on desktop) */}
              <div className="lg:col-span-2 space-y-2">
                <InteractiveChart ticker={selectedTicker} height={360} showControls={true} />
              </div>

              {/* Asset Allocation Breakdown & Quick Stats */}
              <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white uppercase font-mono">
                      Asset Allocation
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {holdingsWithMetrics.length} Holdings
                  </span>
                </div>

                {/* Progress bars list */}
                <div className="space-y-3 pt-1">
                  {holdingsWithMetrics.slice(0, 5).map(h => (
                    <div key={h.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <button
                          onClick={() => setSelectedTicker(h.ticker)}
                          className="font-bold text-white hover:text-emerald-400 transition-colors"
                        >
                          {h.ticker}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 tabular-nums">${h.currentValue.toFixed(0)}</span>
                          <span className="font-semibold text-emerald-400 tabular-nums">{h.portfolioWeight.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, h.portfolioWeight)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Cash allocation */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold">Cash Reserves</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 tabular-nums">${portfolioSummary.cashBalance.toFixed(0)}</span>
                        <span className="font-semibold text-slate-300 tabular-nums">
                          {((portfolioSummary.cashBalance / (portfolioSummary.netWorth || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-600 h-full rounded-full"
                        style={{ width: `${(portfolioSummary.cashBalance / (portfolioSummary.netWorth || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Alert Tip */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-400 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium block">Price Drop Guard Active</span>
                    Push alerts trigger when any stock drops &gt;3.0%. Click Bell in header to adjust.
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Gains & Losses Summary (Detailed Breakdown) */}
            <DailyPnLSummary onOpenAlertModalForTicker={handleOpenAlertForTicker} />

            {/* 20-Year Value & Profit Comparison Section */}
            <Portfolio20YComparison 
              onOpenAlertModalForTicker={handleOpenAlertForTicker}
              onOpenAddHolding={handleOpenAddForTicker}
            />

            {/* Complete Holdings Management Table */}
            <HoldingsTable
              onOpenAddModal={() => {
                setEditingHolding(null);
                setAddModalInitialTicker('');
                setIsAddModalOpen(true);
              }}
              onEditHolding={handleEditHolding}
              onOpenAlertModalForTicker={handleOpenAlertForTicker}
            />
          </>
        )}

        {/* VIEW 2: DAILY GAINS & LOSSES (Deep dive) */}
        {activeView === 'daily_pnl' && (
          <div className="space-y-6">
            <DailyPnLSummary onOpenAlertModalForTicker={handleOpenAlertForTicker} />
            <div className="mt-6">
              <InteractiveChart ticker={selectedTicker} height={380} showControls={true} />
            </div>
          </div>
        )}

        {/* VIEW 2b: 20Y VALUE & PROFIT COMPARISON DEDICATED VIEW */}
        {activeView === 'compare' && (
          <div className="space-y-6">
            <Portfolio20YComparison 
              onOpenAlertModalForTicker={handleOpenAlertForTicker}
              onOpenAddHolding={handleOpenAddForTicker}
            />
          </div>
        )}

        {/* VIEW 3: 20Y CHARTS EXPANDED WORKSPACE */}
        {activeView === 'charts' && (
          <div className="space-y-6">
            {/* Ticker Quick Selector Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-mono text-slate-400 uppercase mr-1">Select Security:</span>
              {['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'VOO', 'QQQ', '^GSPC', '^IXIC', '^DJI', '^VIX', 'GLD'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTicker(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    selectedTicker === t
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Full High-Resolution Chart Viewport */}
            <InteractiveChart ticker={selectedTicker} height={460} showControls={true} />

            {/* Holdings Table under chart */}
            <HoldingsTable
              onOpenAddModal={() => {
                setEditingHolding(null);
                setAddModalInitialTicker('');
                setIsAddModalOpen(true);
              }}
              onEditHolding={handleEditHolding}
              onOpenAlertModalForTicker={handleOpenAlertForTicker}
            />
          </div>
        )}

        {/* VIEW 4: HOLDINGS & POSITIONS */}
        {activeView === 'holdings' && (
          <div className="space-y-6">
            <HoldingsTable
              onOpenAddModal={() => {
                setEditingHolding(null);
                setAddModalInitialTicker('');
                setIsAddModalOpen(true);
              }}
              onEditHolding={handleEditHolding}
              onOpenAlertModalForTicker={handleOpenAlertForTicker}
            />
            <DailyPnLSummary onOpenAlertModalForTicker={handleOpenAlertForTicker} />
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-auto pt-6 pb-4 border-t border-slate-900 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>AlphaTrack Financial Terminal</span>
          <span>·</span>
          <span>Last sync: {new Date(quotesLastUpdated).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>20-Year Historical Modeling (2006–2026)</span>
          <span>·</span>
          <span>Push Notification Enabled</span>
        </div>
      </footer>

      {/* 5. Mobile Ergonomic Bottom Tab Bar */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAlerts={() => {
          setAlertsInitialTicker('ALL');
          setIsAlertsOpen(true);
        }}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      {/* Modals */}
      <StockSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenAddHolding={handleOpenAddForTicker}
        onOpenAlertModalForTicker={handleOpenAlertForTicker}
      />

      <AlertsManagerModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        initialTicker={alertsInitialTicker}
      />

      <AddHoldingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHolding(null);
        }}
        initialTicker={addModalInitialTicker}
        editingHolding={editingHolding}
      />

      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <DashboardContent />
    </PortfolioProvider>
  );
}

import React from 'react';
import { 
  LayoutDashboard, 
  TrendingDown, 
  BarChart3, 
  Wallet, 
  Bell,
  RefreshCw
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface MobileBottomNavProps {
  activeView: 'dashboard' | 'daily_pnl' | 'compare' | 'charts' | 'holdings';
  setActiveView: (view: 'dashboard' | 'daily_pnl' | 'compare' | 'charts' | 'holdings') => void;
  onOpenAlerts: () => void;
  onOpenSync: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenAlerts,
  onOpenSync
}) => {
  const { unreadAlertsCount } = usePortfolio();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center h-16 px-1 safe-area-pb">
      {/* 1. 20Y Compare */}
      <button
        onClick={() => setActiveView('compare')}
        className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeView === 'compare' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-[10px] mt-1 tracking-tight">Compare</span>
      </button>

      {/* 2. Overview */}
      <button
        onClick={() => setActiveView('dashboard')}
        className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeView === 'dashboard' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] mt-1 tracking-tight">Overview</span>
      </button>

      {/* 3. Daily P&L */}
      <button
        onClick={() => setActiveView('daily_pnl')}
        className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeView === 'daily_pnl' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <TrendingDown className="w-5 h-5" />
        <span className="text-[10px] mt-1 tracking-tight">Daily P&L</span>
      </button>

      {/* 4. 20Y Charts */}
      <button
        onClick={() => setActiveView('charts')}
        className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeView === 'charts' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Wallet className="w-5 h-5" />
        <span className="text-[10px] mt-1 tracking-tight">Holdings</span>
      </button>

      {/* 5. Alerts & Sync */}
      <button
        onClick={onOpenAlerts}
        className="min-h-[44px] flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 relative transition-colors"
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </div>
        <span className="text-[10px] mt-1 tracking-tight">Alerts</span>
      </button>
    </nav>
  );
};

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Wallet, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface PortfolioMetricsProps {
  onOpenAlerts: () => void;
}

export const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({ onOpenAlerts }) => {
  const { portfolioSummary, quotesLastUpdated, alertRules, notifications } = usePortfolio();
  
  const isDayPositive = portfolioSummary.dailyGainLoss >= 0;
  const isTotalPositive = portfolioSummary.totalGainLoss >= 0;
  const todayDropsCount = notifications.filter(
    n => (n.severity === 'urgent_drop' || n.severity === 'drop') && (Date.now() - n.timestamp < 24 * 3600 * 1000)
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Net Worth */}
      <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 backdrop-blur-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="uppercase">Total Portfolio Value</span>
          <span className="text-[10px] text-slate-500">Equity + Cash</span>
        </div>
        <div className="mt-2">
          <div className="text-2xl md:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            ${portfolioSummary.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-mono">
            <span className="text-slate-400">Equity: ${portfolioSummary.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">Cash: ${portfolioSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* 2. Today's Intraday Return */}
      <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 backdrop-blur-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="uppercase">Today's Daily Return</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Live Intraday
          </span>
        </div>
        <div className="mt-2">
          <div className={`text-2xl md:text-3xl font-extrabold font-mono tabular-nums tracking-tight flex items-center ${
            isDayPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isDayPositive ? (
              <ArrowUpRight className="w-6 h-6 mr-1 shrink-0" />
            ) : (
              <ArrowDownRight className="w-6 h-6 mr-1 shrink-0" />
            )}
            <span>
              {isDayPositive ? '+' : ''}${Math.abs(portfolioSummary.dailyGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`mt-1.5 text-xs font-mono font-semibold ${
            isDayPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isDayPositive ? '+' : ''}{portfolioSummary.dailyGainLossPercent.toFixed(2)}% vs Yesterday
          </div>
        </div>
      </div>

      {/* 3. Total Unrealized Return */}
      <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 backdrop-blur-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="uppercase">Total Unrealized Gain</span>
          <span className="text-[10px] text-slate-500">All-Time ROI</span>
        </div>
        <div className="mt-2">
          <div className={`text-2xl md:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
            isTotalPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isTotalPositive ? '+' : ''}${portfolioSummary.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 text-xs font-mono font-semibold ${
            isTotalPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isTotalPositive ? '+' : ''}{portfolioSummary.totalGainLossPercent.toFixed(2)}% on ${portfolioSummary.totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} basis
          </div>
        </div>
      </div>

      {/* 4. Drop Alerts Status */}
      <div 
        onClick={onOpenAlerts}
        className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 backdrop-blur-sm flex flex-col justify-between cursor-pointer hover:border-slate-700 transition-colors group"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Drop Protection
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">
            Active
          </span>
        </div>
        <div className="mt-2">
          <div className="text-2xl md:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight flex items-center justify-between">
            <span>{alertRules.filter(r => r.enabled).length} Rules</span>
            {todayDropsCount > 0 ? (
              <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-sans">
                {todayDropsCount} Alert{todayDropsCount > 1 ? 's' : ''} Today
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-sans font-normal">
                0 Triggers
              </span>
            )}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
            <span>Custom push notifications</span>
            <span>Configure &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
};

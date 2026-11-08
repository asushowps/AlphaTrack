import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bell, 
  Filter,
  BarChart2
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import type { HoldingWithMetrics } from '../types';

interface DailyPnLSummaryProps {
  onOpenAlertModalForTicker?: (ticker: string) => void;
}

export const DailyPnLSummary: React.FC<DailyPnLSummaryProps> = ({ onOpenAlertModalForTicker }) => {
  const { holdingsWithMetrics, portfolioSummary, setSelectedTicker, selectedTicker } = usePortfolio();
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'losers' | 'drops'>('all');

  const advancingCount = holdingsWithMetrics.filter(h => h.dailyGainLoss >= 0).length;
  const decliningCount = holdingsWithMetrics.filter(h => h.dailyGainLoss < 0).length;
  const significantDrops = holdingsWithMetrics.filter(h => h.dailyGainLossPercent <= -3.0);

  // Filtered list
  const filteredHoldings = holdingsWithMetrics.filter(h => {
    if (filterType === 'gainers') return h.dailyGainLoss > 0;
    if (filterType === 'losers') return h.dailyGainLoss < 0;
    if (filterType === 'drops') return h.dailyGainLossPercent <= -2.5;
    return true;
  }).sort((a, b) => b.dailyGainLossPercent - a.dailyGainLossPercent);

  // Max move for scaling visual horizontal bar
  const maxAbsMove = Math.max(
    ...holdingsWithMetrics.map(h => Math.abs(h.dailyGainLossPercent)),
    5.0
  );

  return (
    <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-6 backdrop-blur-sm flex flex-col gap-5">
      {/* Header and Filter segmented control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Daily Gains & Losses Breakdown</span>
            {significantDrops.length > 0 && (
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                {significantDrops.length} Significant Drop{significantDrops.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time intraday P&L performance for each asset in your portfolio
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded font-medium transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All ({holdingsWithMetrics.length})
          </button>
          <button
            onClick={() => setFilterType('gainers')}
            className={`px-3 py-1 rounded font-medium transition-colors ${filterType === 'gainers' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Gainers ({advancingCount})
          </button>
          <button
            onClick={() => setFilterType('losers')}
            className={`px-3 py-1 rounded font-medium transition-colors ${filterType === 'losers' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Losers ({decliningCount})
          </button>
          <button
            onClick={() => setFilterType('drops')}
            className={`px-3 py-1 rounded font-medium transition-colors ${filterType === 'drops' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Drops &gt;2.5% ({significantDrops.length})
          </button>
        </div>
      </div>

      {/* Intraday Summary KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase">Today's Total Return</div>
          <div className={`text-xl font-bold font-mono tabular-nums mt-0.5 flex items-center ${portfolioSummary.dailyGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {portfolioSummary.dailyGainLoss >= 0 ? '+' : ''}${portfolioSummary.dailyGainLoss.toFixed(2)}
          </div>
          <div className={`text-xs font-mono font-medium ${portfolioSummary.dailyGainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {portfolioSummary.dailyGainLossPercent >= 0 ? '+' : ''}{portfolioSummary.dailyGainLossPercent.toFixed(2)}% today
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase">Day's Top Performer</div>
          {portfolioSummary.topGainer ? (
            <>
              <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                <span>{portfolioSummary.topGainer.ticker}</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  +{portfolioSummary.topGainer.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs font-mono text-emerald-400/80">
                +${portfolioSummary.topGainer.gainDollars.toFixed(2)} gained
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 mt-2">--</div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase">Day's Deepest Drop</div>
          {portfolioSummary.topLoser ? (
            <>
              <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                <span>{portfolioSummary.topLoser.ticker}</span>
                <span className="text-xs font-semibold text-rose-400 font-mono">
                  {portfolioSummary.topLoser.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs font-mono text-rose-400/80">
                -${Math.abs(portfolioSummary.topLoser.lossDollars).toFixed(2)} lost
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 mt-2">--</div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase">Market Breadth</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            <span className="text-emerald-400">{advancingCount} Up</span>
            <span className="text-slate-500 mx-1.5">/</span>
            <span className="text-rose-400">{decliningCount} Down</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5 flex">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${(advancingCount / (holdingsWithMetrics.length || 1)) * 100}%` }} 
            />
            <div 
              className="bg-rose-500 h-full" 
              style={{ width: `${(decliningCount / (holdingsWithMetrics.length || 1)) * 100}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Asset by Asset Daily Gains & Losses Table / Cards */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3 text-right">Current Price</th>
              <th className="py-2.5 px-3 text-right">Prev Close</th>
              <th className="py-2.5 px-3 text-right">Today's %</th>
              <th className="py-2.5 px-3 text-right">Today's $ P&L</th>
              <th className="py-2.5 px-3 hidden md:table-cell">Intraday Delta Meter</th>
              <th className="py-2.5 px-3 text-right">Alert Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No assets match the selected filter.
                </td>
              </tr>
            ) : (
              filteredHoldings.map(h => {
                const isUp = h.dailyGainLoss >= 0;
                const isSignificantDrop = h.dailyGainLossPercent <= -3.0;
                const isSelected = selectedTicker === h.ticker;
                const barRatio = Math.min(100, (Math.abs(h.dailyGainLossPercent) / maxAbsMove) * 100);

                return (
                  <tr 
                    key={h.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-slate-800/60' : ''
                    } ${isSignificantDrop ? 'bg-rose-950/20' : ''}`}
                  >
                    {/* Asset Name & Ticker */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelectedTicker(h.ticker)}
                        className="text-left group flex flex-col"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {h.ticker}
                          </span>
                          {isSignificantDrop && (
                            <span className="text-[10px] text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded font-sans font-medium">
                              Alert Triggered
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-sans truncate max-w-[120px] md:max-w-[160px]">
                          {h.quote.name}
                        </span>
                      </button>
                    </td>

                    {/* Current Price */}
                    <td className="py-3 px-3 text-right tabular-nums text-white font-semibold">
                      ${h.quote.price.toFixed(2)}
                    </td>

                    {/* Previous Close */}
                    <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                      ${h.quote.previousClose.toFixed(2)}
                    </td>

                    {/* Today's % Change */}
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-flex items-center font-bold tabular-nums px-2 py-0.5 rounded ${
                        isUp 
                          ? 'text-emerald-400 bg-emerald-500/10' 
                          : isSignificantDrop 
                            ? 'text-rose-300 bg-rose-600/30 ring-1 ring-rose-500/40 font-extrabold'
                            : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {isUp ? (
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                        )}
                        {isUp ? '+' : ''}{h.dailyGainLossPercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Today's $ P&L (shares * delta) */}
                    <td className="py-3 px-3 text-right tabular-nums">
                      <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isUp ? '+' : ''}${h.dailyGainLoss.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {h.shares} shs
                      </div>
                    </td>

                    {/* Visual Intraday Delta Meter */}
                    <td className="py-3 px-3 hidden md:table-cell w-44">
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                          {!isUp && (
                            <div 
                              className="bg-rose-500 h-full rounded-l-full transition-all duration-500"
                              style={{ width: `${barRatio}%` }}
                            />
                          )}
                        </div>
                        <div className="w-1 h-3 bg-slate-600 rounded-full" />
                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-start">
                          {isUp && (
                            <div 
                              className="bg-emerald-500 h-full rounded-r-full transition-all duration-500"
                              style={{ width: `${barRatio}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Alert Action Trigger */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenAlertModalForTicker?.(h.ticker)}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title={`Configure drop alert threshold for ${h.ticker}`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedTicker(h.ticker)}
                          className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-sans font-medium transition-colors"
                          title="View 20Y Chart"
                        >
                          Chart
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

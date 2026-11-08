import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Wallet,
  TrendingDown,
  LineChart
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import type { HoldingWithMetrics, Holding } from '../types';

interface HoldingsTableProps {
  onOpenAddModal: () => void;
  onEditHolding: (holding: Holding) => void;
  onOpenAlertModalForTicker: (ticker: string) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  onOpenAddModal,
  onEditHolding,
  onOpenAlertModalForTicker
}) => {
  const { 
    holdingsWithMetrics, 
    removeHolding, 
    cashBalance, 
    updateCashBalance,
    selectedTicker, 
    setSelectedTicker 
  } = usePortfolio();

  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(cashBalance.toString());

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput);
    if (!isNaN(val) && val >= 0) {
      updateCashBalance(val);
      setIsEditingCash(false);
    }
  };

  return (
    <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-6 backdrop-blur-sm flex flex-col gap-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Portfolio Positions & Holdings</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {holdingsWithMetrics.length} Assets
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full view of position sizing, cost basis, unrealized gain/loss, and portfolio allocation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3 text-right">Shares</th>
              <th className="py-2.5 px-3 text-right">Live Price</th>
              <th className="py-2.5 px-3 text-right">Cost Basis</th>
              <th className="py-2.5 px-3 text-right">Market Value</th>
              <th className="py-2.5 px-3 text-right">Total Return ($ / %)</th>
              <th className="py-2.5 px-3 text-center">Portfolio %</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {holdingsWithMetrics.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                  No holdings in your portfolio yet. Click "Add Position" to track an equity or index!
                </td>
              </tr>
            ) : (
              holdingsWithMetrics.map(h => {
                const isTotalGain = h.totalGainLoss >= 0;
                const isSelected = selectedTicker === h.ticker;
                const isSignificantDrop = h.dailyGainLossPercent <= -3.0;

                return (
                  <tr
                    key={h.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-slate-800/60 ring-1 ring-emerald-500/30' : ''
                    } ${isSignificantDrop ? 'bg-rose-950/20' : ''}`}
                  >
                    {/* Symbol & Name */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelectedTicker(h.ticker)}
                        className="text-left group flex flex-col"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {h.ticker}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {h.quote.sector}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-sans truncate max-w-[160px]">
                          {h.quote.name}
                        </span>
                      </button>
                    </td>

                    {/* Shares */}
                    <td className="py-3 px-3 text-right tabular-nums text-slate-300">
                      {h.shares}
                    </td>

                    {/* Live Price & Day Change */}
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className="font-bold text-white">
                        ${h.quote.price.toFixed(2)}
                      </div>
                      <div className={`text-[10px] font-semibold ${h.dailyGainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.dailyGainLossPercent >= 0 ? '+' : ''}{h.dailyGainLossPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* Cost Basis */}
                    <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                      ${h.costBasis.toFixed(2)}
                      <div className="text-[10px] text-slate-500">
                        @${h.avgBuyPrice.toFixed(2)}
                      </div>
                    </td>

                    {/* Market Value */}
                    <td className="py-3 px-3 text-right tabular-nums text-white font-bold">
                      ${h.currentValue.toFixed(2)}
                    </td>

                    {/* Total Return */}
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className={`font-bold ${isTotalGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isTotalGain ? '+' : ''}${h.totalGainLoss.toFixed(2)}
                      </div>
                      <div className={`text-[11px] ${isTotalGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isTotalGain ? '+' : ''}{h.totalGainLossPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* Portfolio % Allocation */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="tabular-nums font-semibold text-slate-300">
                          {h.portfolioWeight.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, h.portfolioWeight)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedTicker(h.ticker)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Inspect 20Y Chart"
                        >
                          <LineChart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenAlertModalForTicker(h.ticker)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Configure Drop Alert"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditHolding(h)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Position"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeHolding(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remove from Portfolio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Cash Balance Row */}
            <tr className="bg-slate-950/40 border-t border-slate-700/80">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm font-sans">
                      Cash Reserves
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Liquid buying power
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right text-slate-500 font-sans">--</td>
              <td className="py-3 px-3 text-right text-slate-500 font-sans">$1.00</td>
              <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                ${cashBalance.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-emerald-400 tabular-nums">
                ${cashBalance.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-right text-slate-400 font-sans text-[11px]">
                Safe cash yield
              </td>
              <td className="py-3 px-3 text-center text-slate-500">--</td>
              <td className="py-3 px-3 text-right">
                <button
                  onClick={() => {
                    setCashInput(cashBalance.toString());
                    setIsEditingCash(true);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-sans transition-colors"
                >
                  Edit Cash
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Ergonomic Thumb Targets >= 44px) */}
      <div className="lg:hidden space-y-3">
        {holdingsWithMetrics.map(h => {
          const isTotalGain = h.totalGainLoss >= 0;
          const isSelected = selectedTicker === h.ticker;
          const isSignificantDrop = h.dailyGainLossPercent <= -3.0;

          return (
            <div
              key={h.id}
              onClick={() => setSelectedTicker(h.ticker)}
              className={`p-4 rounded-xl border transition-all ${
                isSelected 
                  ? 'bg-slate-800/80 border-emerald-500/50' 
                  : isSignificantDrop 
                    ? 'bg-rose-950/30 border-rose-500/40' 
                    : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-extrabold text-base text-white">{h.ticker}</span>
                    <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1.5 py-0.2 rounded">
                      {h.shares} shs
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[180px]">
                    {h.quote.name}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-base font-extrabold text-white tabular-nums">
                    ${h.currentValue.toFixed(2)}
                  </div>
                  <div className={`text-xs font-semibold tabular-nums ${h.dailyGainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {h.dailyGainLossPercent >= 0 ? '+' : ''}{h.dailyGainLossPercent.toFixed(2)}% today
                  </div>
                </div>
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Cost Basis</span>
                  <div className="text-slate-300 tabular-nums">
                    ${h.costBasis.toFixed(2)} (@${h.avgBuyPrice.toFixed(2)})
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] uppercase">Total Return</span>
                  <div className={`tabular-nums font-bold ${isTotalGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isTotalGain ? '+' : ''}${h.totalGainLoss.toFixed(2)} ({isTotalGain ? '+' : ''}{h.totalGainLossPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Mobile Card Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/60">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAlertModalForTicker(h.ticker);
                  }}
                  className="min-h-[40px] px-3 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  <span>Set Drop Alert</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditHolding(h);
                  }}
                  className="min-h-[40px] px-3 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHolding(h.id);
                  }}
                  className="min-h-[40px] px-3 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-900/50 text-xs font-sans flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Mobile Cash Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Cash Balance</div>
              <div className="text-xs font-mono text-emerald-400 tabular-nums">
                ${cashBalance.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setCashInput(cashBalance.toString());
              setIsEditingCash(true);
            }}
            className="min-h-[40px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
          >
            Edit Cash
          </button>
        </div>
      </div>

      {/* Cash Editing Modal */}
      {isEditingCash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Update Cash Reserves</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter current available cash in USD
            </p>
            <form onSubmit={handleCashSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500 font-mono">$</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Save Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

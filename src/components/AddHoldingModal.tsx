import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, DollarSign, Calendar, Hash, FileText, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { getSimulatedQuoteClient, MARKET_SECURITIES } from '../services/marketData';
import type { Holding } from '../types';

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
  editingHolding?: Holding | null;
}

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({
  isOpen,
  onClose,
  initialTicker = '',
  editingHolding = null
}) => {
  const { addHolding, updateHolding, quotes } = usePortfolio();

  const [ticker, setTicker] = useState(initialTicker);
  const [shares, setShares] = useState('10');
  const [avgBuyPrice, setAvgBuyPrice] = useState('150.00');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Prefill ONLY when modal opens or editingHolding/initialTicker changes (NEVER re-trigger on quotes polling)
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessMsg('');

    if (editingHolding) {
      setTicker(editingHolding.ticker);
      setShares(editingHolding.shares.toString());
      setAvgBuyPrice(editingHolding.avgBuyPrice.toString());
      setBuyDate(editingHolding.buyDate || new Date().toISOString().split('T')[0]);
      setNotes(editingHolding.notes || '');
    } else {
      const cleanInit = (initialTicker || '').toUpperCase().trim();
      setTicker(cleanInit);
      setShares('10');
      setBuyDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      if (cleanInit) {
        const q = quotes[cleanInit] || getSimulatedQuoteClient(cleanInit);
        if (q && q.price > 0) {
          setAvgBuyPrice(q.price.toFixed(2));
        } else {
          setAvgBuyPrice('150.00');
        }
      } else {
        // Default to first popular stock price
        const defQ = quotes['NVDA'] || getSimulatedQuoteClient('NVDA');
        setAvgBuyPrice(defQ ? defQ.price.toFixed(2) : '150.00');
      }
    }
  }, [isOpen, editingHolding, initialTicker]);

  // Active quote preview for the entered ticker
  const activeQuote = useMemo(() => {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return null;
    return quotes[clean] || getSimulatedQuoteClient(clean);
  }, [ticker, quotes]);

  // Live total cost calculation
  const totalCost = useMemo(() => {
    const s = parseFloat(shares);
    const p = parseFloat(avgBuyPrice);
    if (isNaN(s) || s <= 0 || isNaN(p) || p <= 0) return 0;
    return s * p;
  }, [shares, avgBuyPrice]);

  if (!isOpen) return null;

  const handleSelectTicker = (selectedSymbol: string) => {
    const clean = selectedSymbol.toUpperCase().trim();
    setTicker(clean);
    const q = quotes[clean] || getSimulatedQuoteClient(clean);
    if (q && q.price > 0) {
      setAvgBuyPrice(q.price.toFixed(2));
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(avgBuyPrice);

    if (!cleanTicker) {
      setError('Please enter a stock or index symbol (e.g. AAPL, NVDA, VOO).');
      return;
    }

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Please enter a valid number of shares (must be greater than 0).');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid purchase price per share (must be greater than $0).');
      return;
    }

    setError('');

    if (editingHolding) {
      updateHolding(editingHolding.id, {
        ticker: cleanTicker,
        shares: sharesNum,
        avgBuyPrice: priceNum,
        buyDate,
        notes
      });
      setSuccessMsg(`Holding ${cleanTicker} updated successfully!`);
    } else {
      addHolding({
        ticker: cleanTicker,
        shares: sharesNum,
        avgBuyPrice: priceNum,
        buyDate,
        notes
      });
      setSuccessMsg(`Position for ${cleanTicker} (${sharesNum} shares) added!`);
    }

    // Close after short feedback
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const POPULAR_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'VOO', 'QQQ', 'PLTR', 'AMD'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span>{editingHolding ? `Edit ${editingHolding.ticker} Position` : 'Add Position to Portfolio'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your shares and cost basis to track in your 20Y backtest & portfolio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick Select Chips */}
          {!editingHolding && (
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 uppercase flex items-center justify-between">
                <span>Quick Select Popular Assets:</span>
                <span className="text-[10px] text-slate-500">Auto-fills price</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TICKERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTicker(t)}
                    className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                      ticker.toUpperCase() === t ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ticker Symbol Input */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span>Symbol / Ticker</span>
              {activeQuote && (
                <span className="text-emerald-400 font-bold">
                  {activeQuote.name} · ${activeQuote.price.toFixed(2)}
                </span>
              )}
            </label>
            <input
              type="text"
              required
              disabled={!!editingHolding}
              value={ticker}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setTicker(val);
                setError('');
                const q = quotes[val] || getSimulatedQuoteClient(val);
                if (q && q.price > 0) {
                  setAvgBuyPrice(q.price.toFixed(2));
                }
              }}
              placeholder="e.g. AAPL, NVDA, VOO, AMZN"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Shares and Buy Price */}
          <div className="grid grid-cols-2 gap-3">
            {/* Shares Quantity */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Shares / Units
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value);
                  setError('');
                }}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Average Buy Price */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Avg Buy Price ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={avgBuyPrice}
                  onChange={(e) => {
                    setAvgBuyPrice(e.target.value);
                    setError('');
                  }}
                  placeholder="150.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-6 pr-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500 font-mono">$</span>
              </div>
            </div>
          </div>

          {/* Investment Total Cost Preview Box */}
          {totalCost > 0 && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Total Capital Outlay:</span>
              <span className="text-white font-bold text-sm">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Buy Date */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Investment Thesis Notes */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Notes / Strategy (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Core long-term, Dollar cost averaging"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingHolding ? 'Update Holding' : 'Add Position'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

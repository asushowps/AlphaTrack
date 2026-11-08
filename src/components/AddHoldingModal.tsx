import React, { useState, useEffect } from 'react';
import { X, Plus, DollarSign, Calendar, Hash, FileText } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
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

  // Prefill when editing or given initialTicker
  useEffect(() => {
    if (editingHolding) {
      setTicker(editingHolding.ticker);
      setShares(editingHolding.shares.toString());
      setAvgBuyPrice(editingHolding.avgBuyPrice.toString());
      setBuyDate(editingHolding.buyDate || new Date().toISOString().split('T')[0]);
      setNotes(editingHolding.notes || '');
    } else if (initialTicker) {
      setTicker(initialTicker);
      const q = quotes[initialTicker.toUpperCase()];
      if (q) {
        setAvgBuyPrice(q.price.toFixed(2));
      }
    } else {
      setTicker('');
      setShares('10');
      setAvgBuyPrice('150.00');
      setBuyDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [editingHolding, initialTicker, isOpen, quotes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(avgBuyPrice);

    if (!cleanTicker || isNaN(sharesNum) || sharesNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
      return;
    }

    if (editingHolding) {
      updateHolding(editingHolding.id, {
        ticker: cleanTicker,
        shares: sharesNum,
        avgBuyPrice: priceNum,
        buyDate,
        notes
      });
    } else {
      addHolding({
        ticker: cleanTicker,
        shares: sharesNum,
        avgBuyPrice: priceNum,
        buyDate,
        notes
      });
    }

    onClose();
  };

  const POPULAR_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'VOO', 'QQQ', 'SCHD'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {editingHolding ? `Edit ${editingHolding.ticker} Position` : 'Add New Holding'}
            </h2>
            <p className="text-xs text-slate-400">
              Track position size, purchase price, and daily performance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Popular Ticker Quick Chips */}
          {!editingHolding && (
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 uppercase">Quick Select:</div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TICKERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTicker(t);
                      const q = quotes[t];
                      if (q) setAvgBuyPrice(q.price.toFixed(2));
                    }}
                    className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                      ticker === t ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Symbol / Ticker
            </label>
            <input
              type="text"
              required
              disabled={!!editingHolding}
              value={ticker}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setTicker(val);
                const q = quotes[val];
                if (q) setAvgBuyPrice(q.price.toFixed(2));
              }}
              placeholder="e.g. AAPL, NVDA, VOO"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-hidden focus:border-emerald-500"
            />
          </div>

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
                onChange={(e) => setShares(e.target.value)}
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
                  onChange={(e) => setAvgBuyPrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-6 pr-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500 font-mono">$</span>
              </div>
            </div>
          </div>

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
              placeholder="e.g. Dividend reinvestment, Long-term compounder"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
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

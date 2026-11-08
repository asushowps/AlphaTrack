import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  BarChart2, 
  Bell, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { searchSecurities as querySecuritiesService, type SearchItem } from '../services/marketData';

interface StockSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddHolding?: (ticker: string) => void;
  onOpenAlertModalForTicker?: (ticker: string) => void;
}

export const StockSearchModal: React.FC<StockSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenAddHolding,
  onOpenAlertModalForTicker
}) => {
  const { setSelectedTicker, quotes } = usePortfolio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'stock' | 'index' | 'etf'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchSecurities('');
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const searchSecurities = async (q: string) => {
    setLoading(true);
    try {
      const items = await querySecuritiesService(q);
      setResults(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      searchSecurities(query);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  if (!isOpen) return null;

  const filteredResults = results.filter(item => {
    if (filterCategory === 'stock') return item.assetType === 'stock';
    if (filterCategory === 'index') return item.assetType === 'index';
    if (filterCategory === 'etf') return item.assetType === 'etf';
    return true;
  });

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/40">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by symbol or name (e.g. NVDA, Apple, S&P 500, QQQ, VOO)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-hidden font-sans"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-mono text-slate-500 uppercase mr-1">Filter:</span>
          {(['all', 'stock', 'index', 'etf'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterCategory === cat 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Assets' : cat === 'stock' ? 'Equities' : cat === 'index' ? 'Indices' : 'ETFs'}
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="p-2 overflow-y-auto divide-y divide-slate-800/60 flex-1">
          {loading && (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Searching global equities & indices...
            </div>
          )}

          {!loading && filteredResults.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No securities found matching "{query}".
            </div>
          )}

          {!loading && filteredResults.map(item => {
            const liveQuote = quotes[item.ticker];
            const price = liveQuote ? liveQuote.price : item.basePrice;
            const changePercent = liveQuote ? liveQuote.changePercent : ((item.basePrice - item.prevClose) / item.prevClose) * 100;
            const isUp = changePercent >= 0;

            return (
              <div
                key={item.ticker}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 transition-colors group cursor-pointer"
                onClick={() => handleSelectTicker(item.ticker)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 group-hover:border-emerald-500/50 transition-colors">
                    {item.ticker.replace('^', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {item.ticker}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {item.assetType}
                      </span>
                      {item.marketCap && (
                        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                          Cap: {item.marketCap}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                      {item.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Price & Change */}
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-white tabular-nums">
                      ${price.toFixed(2)}
                    </div>
                    <div className={`text-[11px] font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlertModalForTicker?.(item.ticker);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Set Drop Alert"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddHolding?.(item.ticker);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors"
                      title="Add to Portfolio Holdings"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

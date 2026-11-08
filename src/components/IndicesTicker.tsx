import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

const INDICES_CONFIG = [
  { ticker: '^GSPC', shortName: 'S&P 500' },
  { ticker: '^IXIC', shortName: 'NASDAQ' },
  { ticker: '^DJI', shortName: 'DOW 30' },
  { ticker: '^RUT', shortName: 'RUSSELL 2000' },
  { ticker: '^VIX', shortName: 'VIX VOLATILITY' },
  { ticker: 'GLD', shortName: 'GOLD' },
  { ticker: '^TNX', shortName: '10Y TREASURY' },
];

export const IndicesTicker: React.FC = () => {
  const { quotes, selectedTicker, setSelectedTicker } = usePortfolio();

  return (
    <div className="w-full bg-slate-950/70 border-b border-slate-800/80 overflow-x-auto scrollbar-none py-2 px-4">
      <div className="flex items-center gap-3 min-w-max">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider pr-2 border-r border-slate-800 shrink-0 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400" />
          Markets
        </span>

        {INDICES_CONFIG.map(({ ticker, shortName }) => {
          const q = quotes[ticker];
          const isSelected = selectedTicker === ticker;
          const price = q ? q.price : 0;
          const changePct = q ? q.changePercent : 0;
          const isUp = changePct >= 0;

          return (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                isSelected 
                  ? 'bg-slate-800 text-white ring-1 ring-emerald-500/50' 
                  : 'text-slate-300 hover:bg-slate-900/90 hover:text-white'
              }`}
            >
              <span className="font-semibold text-slate-300">{shortName}</span>
              <span className="tabular-nums font-mono text-white">
                {ticker === '^TNX' ? `${price.toFixed(2)}%` : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-[11px] font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

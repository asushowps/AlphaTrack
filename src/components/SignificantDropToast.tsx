import React from 'react';
import { AlertOctagon, X, ArrowDownRight, ExternalLink } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface SignificantDropToastProps {
  onOpenAlertModalForTicker?: (ticker: string) => void;
}

export const SignificantDropToast: React.FC<SignificantDropToastProps> = ({ onOpenAlertModalForTicker }) => {
  const { significantDropToast, dismissToast, setSelectedTicker } = usePortfolio();

  if (!significantDropToast) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-bounce-in">
      <div className="bg-rose-950/95 border-2 border-rose-500/80 rounded-xl p-4 shadow-2xl backdrop-blur-md text-white flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                <span>{significantDropToast.ticker}</span>
                <span className="text-xs bg-rose-500 text-white px-1.5 py-0.2 rounded font-sans font-semibold">
                  DROP ALERT
                </span>
              </div>
              <div className="text-xs font-mono text-rose-300">
                {significantDropToast.percentChange.toFixed(2)}% drop (${significantDropToast.price.toFixed(2)})
              </div>
            </div>
          </div>
          <button 
            onClick={dismissToast}
            className="text-rose-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
          {significantDropToast.message}
        </p>

        <div className="flex items-center gap-2 mt-1 pt-2 border-t border-rose-800/60 text-xs">
          <button
            onClick={() => {
              setSelectedTicker(significantDropToast.ticker);
              dismissToast();
            }}
            className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-center transition-colors flex items-center justify-center gap-1"
          >
            <span>Inspect Chart</span>
            <ArrowDownRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              onOpenAlertModalForTicker?.(significantDropToast.ticker);
              dismissToast();
            }}
            className="py-1.5 px-3 bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-medium rounded-lg text-center transition-colors"
          >
            Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

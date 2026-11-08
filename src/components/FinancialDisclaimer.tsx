import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Scale, Info } from 'lucide-react';

export const FinancialDisclaimer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <section 
      aria-label="Financial Disclaimer" 
      className="w-full mt-8 pt-6 border-t border-slate-800/80 text-slate-400"
    >
      <div className="bg-slate-900/40 dark:bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 backdrop-blur-sm">
        {/* Header Strip */}
        <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-200 tracking-tight font-mono uppercase">
                Important Regulatory & Financial Disclaimer
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Educational Demonstration Only · Not Investment Advice · No Fiduciary Relationship
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors shrink-0"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Less' : 'Full Terms'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Primary Disclaimer Statement (Always visible) */}
        <div className="pt-3 text-xs leading-relaxed text-slate-300 font-sans space-y-2">
          <p>
            <strong className="text-white font-semibold">Educational demonstration only, not investment advice.</strong> AlphaTrack 
            is an analytical software application built solely for educational, simulation, and informational demonstration purposes. 
            Nothing presented herein—including historical backtests, price trajectory visualizations, drawdown metrics, compound annual 
            growth rates (CAGR), price drop notifications, or portfolio comparisons—constitutes financial, investment, legal, tax, or 
            accounting advice, nor a personal recommendation, solicitation, or endorsement to buy, hold, or sell any security, index, 
            derivative, or financial asset.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-400 border-t border-slate-800/40">
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold text-xs shrink-0">·</span>
              <span><strong className="text-slate-300">Past Performance:</strong> Past market performance does not guarantee or predict future results. Investments are subject to market volatility and risk of capital loss.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold text-xs shrink-0">·</span>
              <span><strong className="text-slate-300">Frictionless Prices:</strong> Results use historical closing prices exactly as supplied, with no dividends, cash distributions, taxes, brokerage commissions, or fees.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold text-xs shrink-0">·</span>
              <span><strong className="text-slate-300">Native Currency:</strong> No currency conversion is applied. Each security or counter is measured strictly in its own price currency (e.g. USD).</span>
            </div>
          </div>
        </div>

        {/* Expanded Detailed Clauses (Collapsible or fully readable) */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-400 font-sans">
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex items-center gap-1.5 font-mono text-slate-200 font-bold text-xs">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pricing Assumptions & Frictionless Model</span>
              </div>
              <p>
                All calculations and 20-year comparisons utilize historical closing prices exactly as supplied. Results represent a 
                theoretical, frictionless model and <strong>do not include</strong> cash dividends, dividend reinvestment, transaction commissions, 
                custody fees, margin interest, brokerage spreads, execution slippage, or applicable local and federal capital gains taxes. 
                Actual investment returns will be reduced by these and other expenses.
              </p>
            </div>

            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex items-center gap-1.5 font-mono text-slate-200 font-bold text-xs">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Currency & Foreign Exchange Notice</span>
              </div>
              <p>
                <strong>No currency conversion is applied.</strong> Each ticker, equity, index, or ETF counter is measured and computed 
                exclusively in its own native price currency (e.g., USD for US exchanges). Cross-asset comparisons do not reflect foreign exchange 
                fluctuations, currency conversion costs, hedging spreads, or geopolitical currency risk.
              </p>
            </div>

            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex items-center gap-1.5 font-mono text-slate-200 font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Data As-Is & Latency Disclaimer</span>
              </div>
              <p>
                Market quotes, simulated intraday price ticks, historical time series, and push notification triggers are provided on an 
                &quot;as is&quot; and &quot;as available&quot; basis without warranty of any kind, express or implied. AlphaTrack does not guarantee 
                the accuracy, timeliness, completeness, or operational continuity of any data feed, algorithm, or alert mechanism.
              </p>
            </div>

            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex items-center gap-1.5 font-mono text-slate-200 font-bold text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Independent Professional Consultation</span>
              </div>
              <p>
                Users should independently verify all data before making financial commitments. Always consult a qualified, licensed independent 
                financial advisor, certified public accountant (CPA), or legal counsel tailored to your specific financial situation, risk 
                tolerance, and investment objectives prior to executing real-world capital allocation.
              </p>
            </div>
          </div>
        )}

        {/* Quick Summary Footnote */}
        <div className="mt-3 pt-2 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/40">
          <span>Model: Closing Price Frictionless Simulation · No Reinvestment · Local Currency</span>
          <span>AlphaTrack Analytical Tools · All Rights Reserved</span>
        </div>
      </div>
    </section>
  );
};

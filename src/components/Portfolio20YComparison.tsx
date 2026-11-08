import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart2, 
  Sparkles, 
  Trophy, 
  Award,
  Filter,
  Sliders,
  LineChart,
  Eye,
  EyeOff,
  RefreshCw,
  Scale
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface TrajectoryPoint {
  date: string;
  timestamp: number;
  value: number;
}

interface StockComparisonItem {
  ticker: string;
  name: string;
  sector: string;
  assetType: string;
  initialAmount: number;
  years: number;
  startPrice: number;
  currentPrice: number;
  finalValue: number;
  profit: number;
  totalReturnPercent: number;
  cagrPercent: number;
  maxDrawdown: number;
  avgDrawdownPerYear: number;
  multiplier?: number;
  alphaVsSP500: number;
  profitDiffVsSP500: number;
  startDate: string;
  endDate: string;
  trajectory: TrajectoryPoint[];
}

interface BenchmarkItem {
  ticker: string;
  name: string;
  finalValue: number;
  profit: number;
  totalReturnPercent: number;
  cagrPercent: number;
  maxDrawdown?: number;
  avgDrawdownPerYear?: number;
  multiplier?: number;
  trajectory: TrajectoryPoint[];
}

interface Portfolio20YComparisonProps {
  onOpenAlertModalForTicker?: (ticker: string) => void;
  onOpenAddHolding?: (ticker: string) => void;
}

const STOCK_PALETTE = [
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
];

export const Portfolio20YComparison: React.FC<Portfolio20YComparisonProps> = ({
  onOpenAlertModalForTicker,
  onOpenAddHolding
}) => {
  const { holdings, setSelectedTicker, selectedTicker } = usePortfolio();

  // User Inputs: Exact amount invested and exact number of years invested
  const [investedAmountInput, setInvestedAmountInput] = useState<string>('10000');
  const [yearsInput, setYearsInput] = useState<number>(20);

  // Sorting: Default sorted by most profit generated!
  const [sortBy, setSortBy] = useState<'profit' | 'return' | 'cagr' | 'maxDrawdown' | 'finalValue' | 'ticker'>('profit');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Chart settings
  const [showChart, setShowChart] = useState<boolean>(true);
  const [useLogScale, setUseLogScale] = useState<boolean>(false);
  const [hiddenTickers, setHiddenTickers] = useState<Record<string, boolean>>({});
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Comparison data
  const [items, setItems] = useState<StockComparisonItem[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Amount parsing
  const numericAmount = useMemo(() => {
    const val = parseFloat(investedAmountInput.replace(/[^0-9.]/g, ''));
    return isNaN(val) || val <= 0 ? 10000 : val;
  }, [investedAmountInput]);

  // Fetch comparison data when holdings, amount, or years change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const tickersList = holdings.map(h => h.ticker).join(',');
    const url = `/api/compare-portfolio?tickers=${encodeURIComponent(tickersList || 'NVDA,AAPL,MSFT,VOO,AMZN,TSLA')}&amount=${numericAmount}&years=${yearsInput}`;

    async function loadComparison() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load comparison data');
        const json = await res.json();
        if (!isCancelled) {
          setItems(json.items || []);
          setBenchmark(json.benchmark || null);
        }
      } catch (err) {
        console.error('Error fetching portfolio comparison:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadComparison();
    return () => { isCancelled = true; };
  }, [holdings, numericAmount, yearsInput]);

  // Sort items according to active sort rule
  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'profit') diff = b.profit - a.profit;
      else if (sortBy === 'return') diff = b.totalReturnPercent - a.totalReturnPercent;
      else if (sortBy === 'cagr') diff = b.cagrPercent - a.cagrPercent;
      else if (sortBy === 'maxDrawdown') diff = b.maxDrawdown - a.maxDrawdown; // e.g. -20% is higher (less severe) than -60%
      else if (sortBy === 'finalValue') diff = b.finalValue - a.finalValue;
      else if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);

      return sortDirection === 'desc' ? diff : -diff;
    });
    return copy;
  }, [items, sortBy, sortDirection]);

  // Top profit generator
  const topProfitItem = sortedItems.length > 0 ? sortedItems[0] : null;

  // Portfolio aggregates
  const portfolioAverageFinalValue = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, it) => acc + it.finalValue, 0);
    return sum / items.length;
  }, [items]);

  const portfolioAverageReturn = useMemo(() => {
    if (numericAmount <= 0 || items.length === 0) return 0;
    const profit = portfolioAverageFinalValue - numericAmount;
    return (profit / numericAmount) * 100;
  }, [portfolioAverageFinalValue, numericAmount]);

  // Quick Amount presets
  const AMOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];
  const YEAR_PRESETS = [1, 3, 5, 10, 15, 20];

  // SVG Chart Computations
  const chartHeight = 280;
  const chartWidth = 900;
  const visibleItems = items.filter(it => !hiddenTickers[it.ticker]);

  // Find min and max value across all visible trajectories and benchmark
  const { chartMinVal, chartMaxVal, maxTrajectoryLength } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxLen = 0;

    const allSeries = [...visibleItems.map(it => it.trajectory)];
    if (benchmark && !hiddenTickers['^GSPC']) {
      allSeries.push(benchmark.trajectory);
    }

    allSeries.forEach(traj => {
      if (!traj) return;
      if (traj.length > maxLen) maxLen = traj.length;
      traj.forEach(p => {
        if (p.value < min) min = p.value;
        if (p.value > max) max = p.value;
      });
    });

    if (min === Infinity) min = numericAmount * 0.8;
    if (max === -Infinity) max = numericAmount * 2;

    return {
      chartMinVal: Math.max(1, min * 0.9),
      chartMaxVal: max * 1.05,
      maxTrajectoryLength: Math.max(2, maxLen)
    };
  }, [visibleItems, benchmark, hiddenTickers, numericAmount]);

  const getChartX = (idx: number, len: number) => {
    if (len <= 1) return 0;
    return (idx / (len - 1)) * chartWidth;
  };

  const getChartY = (val: number) => {
    const v = Math.max(1, val);
    if (useLogScale) {
      const minLog = Math.log10(chartMinVal);
      const maxLog = Math.log10(chartMaxVal);
      const valLog = Math.log10(v);
      const ratio = (valLog - minLog) / (maxLog - minLog || 1);
      return chartHeight - ratio * (chartHeight - 40) - 20;
    } else {
      const ratio = (v - chartMinVal) / (chartMaxVal - chartMinVal || 1);
      return chartHeight - ratio * (chartHeight - 40) - 20;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxTrajectoryLength <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relX / rect.width;
    const idx = Math.round(ratio * (maxTrajectoryLength - 1));
    setHoverIndex(Math.max(0, Math.min(maxTrajectoryLength - 1, idx)));
  };

  const toggleTickerVisibility = (ticker: string) => {
    setHiddenTickers(prev => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  return (
    <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-6 backdrop-blur-sm flex flex-col gap-6">
      {/* 1. Header & Explainer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              <span>20-Year Value & Profit Comparison</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                Backtest Simulator
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulate and compare how each individual stock in your current portfolio grew over up to 20 years. Key in any initial investment amount and holding duration to rank your assets by profit generated.
          </p>
        </div>

        {/* Sort selector dropdown / segmented */}
        <div className="flex items-center gap-2 text-xs font-mono self-start lg:self-auto">
          <span className="text-slate-400 text-[11px] uppercase">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
          >
            <option value="profit">Most Profit Generated ($) [Default]</option>
            <option value="return">Highest Total Return (%)</option>
            <option value="cagr">Highest Annualized CAGR (%)</option>
            <option value="maxDrawdown">Lowest Max Drawdown (Capital Preservation)</option>
            <option value="finalValue">Highest Ending Value ($)</option>
            <option value="ticker">Asset Ticker (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 2. Interactive Input Control Console (Key in Exact Amount & Exact Years) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* INPUT BOX 1: EXACT AMOUNT INVESTED */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exact Amount Invested ($ USD)</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              Per stock initial capital
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              step="100"
              min="1"
              value={investedAmountInput}
              onChange={(e) => setInvestedAmountInput(e.target.value)}
              placeholder="10000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-base text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
            />
            <span className="absolute left-3 top-3 text-sm text-slate-400 font-mono">$</span>
          </div>

          {/* Quick Amount Preset Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Presets:</span>
            {AMOUNT_PRESETS.map(amt => (
              <button
                key={amt}
                onClick={() => setInvestedAmountInput(amt.toString())}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  numericAmount === amt
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ${amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT BOX 2: EXACT NUMBER OF YEARS INVESTED */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exact Years Invested (1 to 20 Years)</span>
            </label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {yearsInput} Year{yearsInput > 1 ? 's' : ''} ({2026 - yearsInput} – 2026)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={yearsInput}
              onChange={(e) => setYearsInput(parseInt(e.target.value, 10))}
              className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <input
              type="number"
              min="1"
              max="20"
              value={yearsInput}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setYearsInput(Math.min(20, Math.max(1, val)));
              }}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono font-bold text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Quick Year Preset Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Timeframe:</span>
            {YEAR_PRESETS.map(yr => (
              <button
                key={yr}
                onClick={() => setYearsInput(yr)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  yearsInput === yr
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {yr}Y
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. High-Level Performance Comparison KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Top Performer Card */}
        <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase flex items-center gap-1.5 text-emerald-400 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              #1 Profit Generator
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              {topProfitItem ? `+${topProfitItem.cagrPercent.toFixed(1)}% CAGR` : '--'}
            </span>
          </div>

          {topProfitItem ? (
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-mono font-extrabold text-white">
                  {topProfitItem.ticker}
                </span>
                <span className="text-xs text-slate-400 truncate max-w-[120px]">
                  {topProfitItem.name}
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                ${topProfitItem.finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Profit: <span className="text-emerald-400 font-bold">+${topProfitItem.profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> ({topProfitItem.totalReturnPercent.toLocaleString()}%)
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-2">Loading performance...</div>
          )}
        </div>

        {/* S&P 500 Benchmark Comparison Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase">S&P 500 Baseline</span>
            <span className="text-[10px] text-cyan-400 font-mono">^GSPC Benchmark</span>
          </div>
          {benchmark ? (
            <div className="mt-2">
              <div className="text-xl md:text-2xl font-mono font-extrabold text-white tabular-nums">
                ${benchmark.finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-mono text-cyan-400 mt-0.5">
                +{benchmark.totalReturnPercent.toFixed(1)}% total ({benchmark.cagrPercent.toFixed(1)}% CAGR)
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Profit: <span className="text-slate-200 font-semibold">+${benchmark.profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-2">Loading index...</div>
          )}
        </div>

        {/* Portfolio Average Performance Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase">Portfolio Average</span>
            <span className="text-[10px] text-slate-500">{items.length} Equities</span>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-mono font-extrabold text-white tabular-nums">
              ${portfolioAverageFinalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-mono mt-0.5 ${portfolioAverageReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioAverageReturn >= 0 ? '+' : ''}{portfolioAverageReturn.toFixed(1)}% avg return
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              {benchmark && portfolioAverageReturn > benchmark.totalReturnPercent ? (
                <span className="text-emerald-400 font-semibold">
                  Beating S&P 500 by +{(portfolioAverageReturn - benchmark.totalReturnPercent).toFixed(1)}%
                </span>
              ) : (
                <span className="text-slate-400">Across current holdings</span>
              )}
            </div>
          </div>
        </div>

        {/* Capital Compounding Insight */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase">Horizon Insight</span>
            <span className="text-[10px] text-slate-500">{yearsInput}Y Window</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white font-sans leading-tight">
              ${numericAmount.toLocaleString()} invested in {2026 - yearsInput}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
              Shows how holding conviction during major historical corrections transforms initial capital into generational wealth.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Interactive Multi-Asset Comparative Chart */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase text-white">
              Comparative Growth Trajectory of ${numericAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Log Scale Toggle */}
            <button
              onClick={() => setUseLogScale(!useLogScale)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
                useLogScale 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Logarithmic scale for better visibility of all assets"
            >
              {useLogScale ? 'Scale: Log' : 'Scale: Linear'}
            </button>

            {/* Toggle chart display */}
            <button
              onClick={() => setShowChart(!showChart)}
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </button>
          </div>
        </div>

        {showChart && (
          <>
            {/* Ticker Badges Legend (Toggleable) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              {items.map((it, idx) => {
                const color = STOCK_PALETTE[idx % STOCK_PALETTE.length];
                const isHidden = hiddenTickers[it.ticker];
                return (
                  <button
                    key={it.ticker}
                    onClick={() => toggleTickerVisibility(it.ticker)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] border transition-all ${
                      !isHidden
                        ? 'bg-slate-900 text-white border-slate-700'
                        : 'bg-slate-950 text-slate-600 border-slate-800 opacity-60'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: !isHidden ? color : '#475569' }} 
                    />
                    <span className="font-bold">{it.ticker}</span>
                    <span className="text-slate-400 font-normal">
                      ${it.finalValue >= 1000000 ? `${(it.finalValue / 1000000).toFixed(1)}M` : `${(it.finalValue / 1000).toFixed(0)}k`}
                    </span>
                  </button>
                );
              })}

              {/* S&P 500 Legend Badge */}
              {benchmark && (
                <button
                  onClick={() => toggleTickerVisibility('^GSPC')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] border transition-all ${
                    !hiddenTickers['^GSPC']
                      ? 'bg-slate-900 text-white border-slate-700'
                      : 'bg-slate-950 text-slate-600 border-slate-800 opacity-60'
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: !hiddenTickers['^GSPC'] ? '#ffffff' : '#475569' }} 
                  />
                  <span className="font-bold">S&P 500</span>
                  <span className="text-slate-400 font-normal">
                    ${(benchmark.finalValue / 1000).toFixed(0)}k
                  </span>
                </button>
              )}
            </div>

            {/* SVG Multi-Line Canvas */}
            <div className="relative w-full overflow-hidden select-none" style={{ height: chartHeight }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs z-10 text-xs text-slate-400 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" />
                  Calculating 20-year trajectories...
                </div>
              )}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full cursor-crosshair overflow-visible"
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setHoverIndex(null)}
                preserveAspectRatio="none"
              >
                {/* Horizontal grid lines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                  const y = chartHeight * ratio;
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.08)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Initial investment baseline */}
                <line
                  x1={0}
                  y1={getChartY(numericAmount)}
                  x2={chartWidth}
                  y2={getChartY(numericAmount)}
                  stroke="rgba(148, 163, 184, 0.3)"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />

                {/* S&P 500 Benchmark Line (Dashed White) */}
                {benchmark && !hiddenTickers['^GSPC'] && benchmark.trajectory.length > 1 && (
                  <path
                    d={`M ${benchmark.trajectory.map((pt, idx) => `${getChartX(idx, benchmark.trajectory.length).toFixed(1)},${getChartY(pt.value).toFixed(1)}`).join(' L ')}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    opacity="0.75"
                  />
                )}

                {/* Individual Stock Lines */}
                {visibleItems.map((it, idx) => {
                  if (!it.trajectory || it.trajectory.length <= 1) return null;
                  const color = STOCK_PALETTE[idx % STOCK_PALETTE.length];
                  const pts = it.trajectory.map((pt, ptIdx) => 
                    `${getChartX(ptIdx, it.trajectory.length).toFixed(1)},${getChartY(pt.value).toFixed(1)}`
                  );

                  return (
                    <path
                      key={it.ticker}
                      d={`M ${pts.join(' L ')}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Hover vertical crosshair */}
                {hoverIndex !== null && (
                  <line
                    x1={getChartX(hoverIndex, maxTrajectoryLength)}
                    y1={0}
                    x2={getChartX(hoverIndex, maxTrajectoryLength)}
                    y2={chartHeight}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                )}
              </svg>
            </div>
          </>
        )}
      </div>

      {/* 5. Main Comparison List (Default sorted by most profit generated) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-semibold uppercase text-slate-400">
            Portfolio Assets Ranked by Profit Generated ({sortedItems.length} Assets)
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Initial: ${numericAmount.toLocaleString()} over {yearsInput}Y
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3 px-3 text-center">Rank</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3 text-right">Initial Invested</th>
                <th className="py-3 px-3 text-right">Ending Value</th>
                <th className="py-3 px-3 text-right">Net Profit Generated</th>
                <th className="py-3 px-3 text-right">Total Return (%)</th>
                <th className="py-3 px-3 text-right">CAGR (%)</th>
                <th className="py-3 px-3 text-right">Maximum Drawdown</th>
                <th className="py-3 px-3 text-right">Avg Drawdown / Year</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {sortedItems.map((item, idx) => {
                const isSelected = selectedTicker === item.ticker;
                const isProfit = item.profit >= 0;

                return (
                  <tr
                    key={item.ticker}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-slate-800/60 ring-1 ring-emerald-500/30' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-3 text-center">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center justify-center font-bold text-xs">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/30 inline-flex items-center justify-center font-bold text-xs">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 inline-flex items-center justify-center font-bold text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{idx + 1}</span>
                      )}
                    </td>

                    {/* Asset Ticker & Name */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => setSelectedTicker(item.ticker)}
                        className="text-left group flex flex-col"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {item.ticker}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {item.sector}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-sans truncate max-w-[150px]">
                          {item.name}
                        </span>
                      </button>
                    </td>

                    {/* Initial Invested */}
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-400">
                      ${item.initialAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Ending Value */}
                    <td className="py-3.5 px-3 text-right tabular-nums text-white font-bold text-sm">
                      ${item.finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Net Profit Generated (Primary Feature) */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className={`font-extrabold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.profitDiffVsSP500 >= 0 ? (
                          <span className="text-emerald-500">
                            +${item.profitDiffVsSP500.toLocaleString('en-US', { maximumFractionDigits: 0 })} vs S&P 500
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            -${Math.abs(item.profitDiffVsSP500).toLocaleString('en-US', { maximumFractionDigits: 0 })} vs S&P 500
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Return % */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded ${
                        isProfit ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                        {isProfit ? '+' : ''}{item.totalReturnPercent.toLocaleString()}%
                      </span>
                    </td>

                    {/* CAGR % */}
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-200 font-semibold">
                      {item.cagrPercent >= 0 ? '+' : ''}{item.cagrPercent.toFixed(1)}% / yr
                    </td>

                    {/* Maximum Drawdown */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className="inline-block font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                        {item.maxDrawdown.toFixed(1)}%
                      </span>
                    </td>

                    {/* Average Drawdown Per Year */}
                    <td className="py-3.5 px-3 text-right tabular-nums text-rose-300 font-mono font-medium">
                      {item.avgDrawdownPerYear.toFixed(1)}% / yr
                    </td>

                    {/* Quick Action Button */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedTicker(item.ticker)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium rounded-lg transition-colors"
                        title="View Detailed 20Y Chart"
                      >
                        Chart
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (Touch Ergonomic >= 44px) */}
        <div className="lg:hidden space-y-3">
          {sortedItems.map((item, idx) => {
            const isProfit = item.profit >= 0;
            const isTop = idx === 0;

            return (
              <div
                key={item.ticker}
                onClick={() => setSelectedTicker(item.ticker)}
                className={`p-4 rounded-xl border transition-all ${
                  isTop 
                    ? 'bg-slate-950/70 border-emerald-500/40 shadow-sm' 
                    : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono font-bold text-xs ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-extrabold text-base text-white">{item.ticker}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{item.sector}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[160px]">
                        {item.name}
                      </div>
                    </div>
                  </div>

                  {/* Maximum Drawdown Badge */}
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 uppercase block">Max Drawdown</span>
                    <span className="text-xs font-bold text-rose-400 tabular-nums">
                      {item.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Primary Profit & Final Value Breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/60 font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase">Final Value Today</span>
                    <div className="text-base font-extrabold text-white tabular-nums">
                      ${item.finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase">Profit Generated</span>
                    <div className={`text-base font-extrabold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Drawdowns and Returns Row */}
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs font-mono pt-2 mt-2 border-t border-slate-800/40 text-slate-400">
                  <div>Return: <strong className="text-white">+{item.totalReturnPercent.toLocaleString()}%</strong></div>
                  <div className="text-right">CAGR: <strong className="text-white">+{item.cagrPercent.toFixed(1)}% / yr</strong></div>
                  <div>Max Drawdown: <strong className="text-rose-400">{item.maxDrawdown.toFixed(1)}%</strong></div>
                  <div className="text-right">Avg DD / Yr: <strong className="text-rose-300">{item.avgDrawdownPerYear.toFixed(1)}%</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

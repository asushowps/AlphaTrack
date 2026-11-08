import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Activity, 
  Maximize2, 
  Sliders, 
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import type { HistoricalPoint, TimeRange } from '../types';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchHistoricalData } from '../services/marketData';

interface InteractiveChartProps {
  ticker?: string;
  height?: number;
  showControls?: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ 
  ticker: propTicker, 
  height = 380,
  showControls = true 
}) => {
  const { selectedTicker, setSelectedTicker, quotes } = usePortfolio();
  const activeTicker = (propTicker || selectedTicker || 'NVDA').toUpperCase();
  const quote = quotes[activeTicker];

  const [timeRange, setTimeRange] = useState<TimeRange>('1y');
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [data, setData] = useState<HistoricalPoint[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSMA, setShowSMA] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);
  const [benchmarkTicker, setBenchmarkTicker] = useState<'^GSPC' | '^IXIC'>('^GSPC');

  // Hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fetch primary ticker history (Resilient for Vercel, Node, and browser)
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    async function loadHistory() {
      try {
        const points = await fetchHistoricalData(activeTicker, timeRange);
        if (!isCancelled && Array.isArray(points)) {
          setData(points);
        }
      } catch (e) {
        console.error('Error fetching historical data:', e);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => { isCancelled = true; };
  }, [activeTicker, timeRange]);

  // Fetch benchmark data when benchmark toggle is active
  useEffect(() => {
    if (!showBenchmark) {
      setBenchmarkData([]);
      return;
    }
    let isCancelled = false;

    async function loadBenchmark() {
      try {
        const points = await fetchHistoricalData(benchmarkTicker, timeRange);
        if (!isCancelled && Array.isArray(points)) {
          setBenchmarkData(points);
        }
      } catch {}
    }

    loadBenchmark();
    return () => { isCancelled = true; };
  }, [showBenchmark, benchmarkTicker, timeRange]);

  // Calculations for chart geometry
  const { minPrice, maxPrice, startPrice, endPrice, rangePercent, isPositive, maxVolume } = useMemo(() => {
    if (data.length === 0) {
      return { minPrice: 0, maxPrice: 100, startPrice: 100, endPrice: 100, rangePercent: 0, isPositive: true, maxVolume: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    data.forEach(p => {
      if (p.low < min) min = p.low;
      if (p.high > max) max = p.high;
      if (p.volume > maxVol) maxVol = p.volume;
    });

    const start = data[0].close;
    const end = data[data.length - 1].close;
    const diff = end - start;
    const pct = start > 0 ? (diff / start) * 100 : 0;

    // Buffer margins
    const margin = (max - min) * 0.08 || 1;
    return {
      minPrice: Math.max(0, min - margin),
      maxPrice: max + margin,
      startPrice: start,
      endPrice: end,
      rangePercent: pct,
      isPositive: diff >= 0,
      maxVolume: maxVol || 1
    };
  }, [data]);

  // Moving Average Helper (SMA 20)
  const sma20 = useMemo(() => {
    if (!showSMA || data.length < 5) return [];
    const period = Math.min(20, Math.floor(data.length / 3));
    const sma: Array<{ x: number; y: number } | null> = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        sma.push({ x: i, y: sum / period });
      }
    }
    return sma;
  }, [data, showSMA]);

  // Normalized benchmark path generator
  const benchmarkPath = useMemo(() => {
    if (!showBenchmark || benchmarkData.length === 0 || data.length === 0) return '';
    const bStart = benchmarkData[0]?.close || 1;
    const width = 1000;
    const mainHeight = showVolume ? height * 0.72 : height - 40;

    // Map benchmark relative % changes into main chart coordinate space
    const pts = benchmarkData.map((bp, i) => {
      const pct = (bp.close - bStart) / bStart;
      const equivalentPrice = startPrice * (1 + pct);
      const x = (i / (benchmarkData.length - 1 || 1)) * width;
      const y = mainHeight - ((equivalentPrice - minPrice) / (maxPrice - minPrice || 1)) * (mainHeight - 30) - 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${pts.join(' L ')}`;
  }, [showBenchmark, benchmarkData, data, startPrice, minPrice, maxPrice, height, showVolume]);

  // SVG dimensions
  const viewWidth = 1000;
  const chartHeight = height;
  const pricePlotHeight = showVolume ? chartHeight * 0.72 : chartHeight - 40;
  const volumePlotTop = pricePlotHeight + 10;
  const volumePlotHeight = chartHeight - volumePlotTop - 25;

  const getX = useCallback((index: number) => {
    if (data.length <= 1) return 0;
    return (index / (data.length - 1)) * viewWidth;
  }, [data.length, viewWidth]);

  const getY = useCallback((price: number) => {
    if (maxPrice === minPrice) return pricePlotHeight / 2;
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return pricePlotHeight - ratio * (pricePlotHeight - 30) - 15;
  }, [minPrice, maxPrice, pricePlotHeight]);

  // Path commands for Area & Line
  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '' };

    const points = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.close).toFixed(1)}`);
    const line = `M ${points.join(' L ')}`;
    const area = `${line} L ${getX(data.length - 1).toFixed(1)},${pricePlotHeight} L ${getX(0).toFixed(1)},${pricePlotHeight} Z`;

    return { linePath: line, areaPath: area };
  }, [data, getX, getY, pricePlotHeight]);

  // Hover point details
  const activeHoverPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;
  const currentHoverPrice = activeHoverPoint ? activeHoverPoint.close : endPrice;
  const currentHoverDiff = activeHoverPoint ? activeHoverPoint.close - startPrice : endPrice - startPrice;
  const currentHoverPercent = startPrice > 0 ? (currentHoverDiff / startPrice) * 100 : 0;

  // Mouse / Touch handlers for crosshair tracking
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const indexRatio = relativeX / rect.width;
    const index = Math.round(indexRatio * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const timeRanges: Array<{ label: string; value: TimeRange; description: string }> = [
    { label: '1D', value: '1d', description: 'Intraday 5-min' },
    { label: '5D', value: '5d', description: '5-Day hourly' },
    { label: '1M', value: '1m', description: '1 Month daily' },
    { label: '6M', value: '6m', description: '6 Months' },
    { label: 'YTD', value: 'ytd', description: 'Year to date' },
    { label: '1Y', value: '1y', description: '1 Year daily' },
    { label: '5Y', value: '5y', description: '5 Years' },
    { label: '10Y', value: '10y', description: '10 Years macro' },
    { label: '20Y', value: '20y', description: '2006-2026 Historical cycles' },
    { label: 'MAX', value: 'max', description: 'Full history' },
  ];

  const strokeColor = isPositive ? '#10b981' : '#f43f5e'; // emerald-500 or rose-500
  const fillColor = isPositive ? 'url(#greenGradient)' : 'url(#redGradient)';

  return (
    <div className="bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-6 backdrop-blur-sm relative flex flex-col">
      {/* Header bar: Symbol, current price, day/range change, and control toggles */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">
              {activeTicker}
            </span>
            <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] md:max-w-xs">
              {quote?.name || `${activeTicker} Equity`}
            </span>
            <span className="text-[11px] text-slate-500 font-mono uppercase bg-slate-800/80 px-2 py-0.5 rounded">
              {quote?.assetType || 'Stock'}
            </span>
          </div>

          {/* Price & Change */}
          <div className="flex items-baseline gap-3 mt-1.5">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              ${currentHoverPrice.toFixed(2)}
            </span>
            <div className={`flex items-center text-sm font-semibold font-mono tabular-nums ${currentHoverDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentHoverDiff >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-0.5 shrink-0" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-0.5 shrink-0" />
              )}
              <span>
                {currentHoverDiff >= 0 ? '+' : ''}${currentHoverDiff.toFixed(2)} ({currentHoverPercent >= 0 ? '+' : ''}{currentHoverPercent.toFixed(2)}%)
              </span>
              <span className="text-xs text-slate-400 font-normal ml-1.5 hidden sm:inline">
                {activeHoverPoint ? `on ${activeHoverPoint.date}` : `past ${timeRange.toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Chart View Toggles (Indicators, Candlestick, Benchmark) */}
        {showControls && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Chart type segmented control */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60 text-xs">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${chartType === 'area' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Line / Area View"
              >
                Line
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${chartType === 'candlestick' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Candlestick OHLC View"
              >
                Candles
              </button>
            </div>

            {/* SMA Indicator */}
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                showSMA 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Toggle SMA 20 Day Moving Average"
            >
              SMA 20
            </button>

            {/* Volume Toggle */}
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showVolume 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Toggle Volume Histogram"
            >
              Vol
            </button>

            {/* Benchmark Compare */}
            <button
              onClick={() => setShowBenchmark(!showBenchmark)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showBenchmark 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Compare vs S&P 500 Index"
            >
              vs S&P 500
            </button>
          </div>
        )}
      </div>

      {/* Main SVG Interactive Chart Viewport */}
      <div className="relative w-full overflow-hidden select-none" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
              <Activity className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Loading 20y historical data...</span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewWidth} ${chartHeight}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const y = pricePlotHeight * ratio;
            const priceVal = maxPrice - (ratio * (maxPrice - minPrice));
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={viewWidth}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.08)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={viewWidth - 8}
                  y={y - 4}
                  fill="rgba(148, 163, 184, 0.35)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  ${priceVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Volume Bars */}
          {showVolume && data.map((d, i) => {
            const x = getX(i);
            const barW = Math.max(1.5, (viewWidth / data.length) * 0.7);
            const volRatio = d.volume / maxVolume;
            const barH = volRatio * volumePlotHeight;
            const barY = volumePlotTop + (volumePlotHeight - barH);
            const isBarUp = d.close >= d.open;

            return (
              <rect
                key={`vol-${i}`}
                x={x - barW / 2}
                y={barY}
                width={barW}
                height={Math.max(1, barH)}
                fill={isBarUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
              />
            );
          })}

          {/* Area Fill */}
          {chartType === 'area' && areaPath && (
            <path d={areaPath} fill={fillColor} />
          )}

          {/* Benchmark comparison line (Cyan) */}
          {showBenchmark && benchmarkPath && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.8"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}

          {/* Moving Average SMA 20 (Amber line) */}
          {showSMA && (
            <path
              d={(() => {
                const pts = sma20
                  .map((p, i) => (p ? `${getX(i).toFixed(1)},${getY(p.y).toFixed(1)}` : null))
                  .filter(Boolean);
                return pts.length > 0 ? `M ${pts.join(' L ')}` : '';
              })()}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
              opacity="0.85"
            />
          )}

          {/* Primary Price Line (Area Mode) */}
          {chartType === 'area' && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Candlestick OHLC Mode */}
          {chartType === 'candlestick' && data.map((d, i) => {
            const x = getX(i);
            const candleW = Math.max(2, (viewWidth / data.length) * 0.65);
            const yOpen = getY(d.open);
            const yClose = getY(d.close);
            const yHigh = getY(d.high);
            const yLow = getY(d.low);
            const isUp = d.close >= d.open;
            const candleTop = Math.min(yOpen, yClose);
            const candleH = Math.max(1.5, Math.abs(yClose - yOpen));
            const cColor = isUp ? '#10b981' : '#f43f5e';

            return (
              <g key={`candle-${i}`}>
                {/* Upper and lower wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={cColor}
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                {/* Real candle body */}
                <rect
                  x={x - candleW / 2}
                  y={candleTop}
                  width={candleW}
                  height={candleH}
                  fill={isUp ? cColor : cColor}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* Interactive Crosshair Tracking */}
          {hoverIndex !== null && data[hoverIndex] && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={0}
                x2={getX(hoverIndex)}
                y2={chartHeight - 20}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Horizontal Crosshair Line */}
              <line
                x1={0}
                y1={getY(data[hoverIndex].close)}
                x2={viewWidth}
                y2={getY(data[hoverIndex].close)}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Point Indicator Dot */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].close)}
                r="4.5"
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Crosshair Tooltip Card */}
        {activeHoverPoint && (
          <div 
            className="absolute top-2 pointer-events-none bg-slate-950/90 border border-slate-700/80 rounded-lg p-2.5 text-xs shadow-xl backdrop-blur-md z-20"
            style={{
              left: `${Math.min(78, Math.max(2, (hoverIndex! / (data.length - 1)) * 100))}%`
            }}
          >
            <div className="text-[11px] text-slate-400 font-mono mb-1">
              {activeHoverPoint.date}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
              <span className="text-slate-400">Close:</span>
              <span className="text-white font-semibold tabular-nums text-right">${activeHoverPoint.close.toFixed(2)}</span>
              <span className="text-slate-400">Open:</span>
              <span className="text-slate-200 tabular-nums text-right">${activeHoverPoint.open.toFixed(2)}</span>
              <span className="text-slate-400">High:</span>
              <span className="text-emerald-400 tabular-nums text-right">${activeHoverPoint.high.toFixed(2)}</span>
              <span className="text-slate-400">Low:</span>
              <span className="text-rose-400 tabular-nums text-right">${activeHoverPoint.low.toFixed(2)}</span>
              {showVolume && (
                <>
                  <span className="text-slate-400">Vol:</span>
                  <span className="text-indigo-300 tabular-nums text-right">
                    {(activeHoverPoint.volume / 1000000).toFixed(1)}M
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Range Selectors: 1D to 20Y */}
      {showControls && (
        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-3 border-t border-slate-800/80 mt-2 scrollbar-none">
          <div className="flex items-center gap-1">
            {timeRanges.map(r => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all whitespace-nowrap ${
                  timeRange === r.value
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={r.description}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* 52-Week Range indicator */}
          {quote && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 pl-4 border-l border-slate-800">
              <span>52W L: ${quote.week52Low.toFixed(2)}</span>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((quote.price - quote.week52Low) / (quote.week52High - quote.week52Low || 1)) * 100))}%`
                  }}
                />
              </div>
              <span>52W H: ${quote.week52High.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

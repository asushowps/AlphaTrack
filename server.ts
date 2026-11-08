import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory sync store for multi-device cross-sync (mobile & desktop)
const syncDatabase: Record<string, { data: any; updatedAt: number }> = {};

// Clean up sync tokens older than 30 days
setInterval(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [key, val] of Object.entries(syncDatabase)) {
    if (val.updatedAt < cutoff) {
      delete syncDatabase[key];
    }
  }
}, 3600000);

// Comprehensive list of equities, indices, and ETFs
export interface SearchItem {
  ticker: string;
  name: string;
  sector: string;
  assetType: 'stock' | 'index' | 'etf' | 'commodity' | 'treasury';
  basePrice: number;
  prevClose: number;
  currency: string;
  marketCap?: string;
  peRatio?: number;
  dividendYield?: number;
}

const MARKET_SECURITIES: SearchItem[] = [
  // Major Indices
  { ticker: '^GSPC', name: 'S&P 500 Index', sector: 'Index', assetType: 'index', basePrice: 5985.40, prevClose: 5970.20, currency: 'USD' },
  { ticker: '^IXIC', name: 'NASDAQ Composite', sector: 'Index', assetType: 'index', basePrice: 19320.15, prevClose: 19280.50, currency: 'USD' },
  { ticker: '^DJI', name: 'Dow Jones Industrial Average', sector: 'Index', assetType: 'index', basePrice: 43910.80, prevClose: 43980.20, currency: 'USD' },
  { ticker: '^RUT', name: 'Russell 2000 Small Cap', sector: 'Index', assetType: 'index', basePrice: 2380.45, prevClose: 2395.10, currency: 'USD' },
  { ticker: '^VIX', name: 'CBOE Volatility Index', sector: 'Volatility', assetType: 'index', basePrice: 15.20, prevClose: 16.10, currency: 'USD' },
  { ticker: 'GLD', name: 'SPDR Gold Shares ETF', sector: 'Commodities', assetType: 'commodity', basePrice: 248.60, prevClose: 246.90, currency: 'USD', marketCap: '$68.2B' },
  { ticker: '^TNX', name: '10-Year US Treasury Yield', sector: 'Fixed Income', assetType: 'treasury', basePrice: 4.42, prevClose: 4.39, currency: 'USD' },

  // Megacap & Tech Equities
  { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors', assetType: 'stock', basePrice: 147.50, prevClose: 144.20, currency: 'USD', marketCap: '$3.62T', peRatio: 52.4, dividendYield: 0.03 },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Electronics', assetType: 'stock', basePrice: 227.40, prevClose: 229.80, currency: 'USD', marketCap: '$3.45T', peRatio: 34.1, dividendYield: 0.44 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Software & Cloud', assetType: 'stock', basePrice: 422.80, prevClose: 420.10, currency: 'USD', marketCap: '$3.14T', peRatio: 35.8, dividendYield: 0.76 },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)', sector: 'Interactive Media', assetType: 'stock', basePrice: 178.60, prevClose: 180.20, currency: 'USD', marketCap: '$2.21T', peRatio: 23.4, dividendYield: 0.45 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'E-Commerce & Cloud', assetType: 'stock', basePrice: 208.20, prevClose: 206.50, currency: 'USD', marketCap: '$2.18T', peRatio: 41.2, dividendYield: 0.0 },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Social Media & AI', assetType: 'stock', basePrice: 585.30, prevClose: 592.10, currency: 'USD', marketCap: '$1.48T', peRatio: 27.6, dividendYield: 0.34 },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive & Clean Energy', assetType: 'stock', basePrice: 321.40, prevClose: 338.90, currency: 'USD', marketCap: '$1.03T', peRatio: 98.2, dividendYield: 0.0 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc.', sector: 'Financial Conglomerate', assetType: 'stock', basePrice: 468.90, prevClose: 467.40, currency: 'USD', marketCap: '$1.01T', peRatio: 19.8, dividendYield: 0.0 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Semiconductors', assetType: 'stock', basePrice: 176.40, prevClose: 172.80, currency: 'USD', marketCap: '$820B', peRatio: 38.5, dividendYield: 1.25 },
  { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Pharmaceuticals', assetType: 'stock', basePrice: 795.10, prevClose: 812.50, currency: 'USD', marketCap: '$755B', peRatio: 64.2, dividendYield: 0.65 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Banking & Financials', assetType: 'stock', basePrice: 242.30, prevClose: 240.80, currency: 'USD', marketCap: '$690B', peRatio: 12.8, dividendYield: 2.06 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Payment Processing', assetType: 'stock', basePrice: 312.80, prevClose: 311.20, currency: 'USD', marketCap: '$615B', peRatio: 30.2, dividendYield: 0.75 },
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', assetType: 'stock', basePrice: 91.40, prevClose: 90.80, currency: 'USD', marketCap: '$734B', peRatio: 32.1, dividendYield: 0.92 },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', sector: 'Semiconductors', assetType: 'stock', basePrice: 142.60, prevClose: 148.90, currency: 'USD', marketCap: '$231B', peRatio: 45.3, dividendYield: 0.0 },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Streaming & Entertainment', assetType: 'stock', basePrice: 875.20, prevClose: 864.10, currency: 'USD', marketCap: '$375B', peRatio: 44.8, dividendYield: 0.0 },
  { ticker: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment', assetType: 'stock', basePrice: 114.50, prevClose: 116.20, currency: 'USD', marketCap: '$208B', peRatio: 38.1, dividendYield: 0.78 },
  { ticker: 'PLTR', name: 'Palantir Technologies Inc.', sector: 'Data & Enterprise AI', assetType: 'stock', basePrice: 65.80, prevClose: 69.40, currency: 'USD', marketCap: '$148B', peRatio: 115.0, dividendYield: 0.0 },
  { ticker: 'ARM', name: 'Arm Holdings plc', sector: 'Semiconductors', assetType: 'stock', basePrice: 138.90, prevClose: 142.10, currency: 'USD', marketCap: '$145B', peRatio: 88.0, dividendYield: 0.0 },
  { ticker: 'COIN', name: 'Coinbase Global Inc.', sector: 'Crypto Infrastructure', assetType: 'stock', basePrice: 312.00, prevClose: 334.50, currency: 'USD', marketCap: '$76B', peRatio: 48.0, dividendYield: 0.0 },
  { ticker: 'INTC', name: 'Intel Corporation', sector: 'Semiconductors', assetType: 'stock', basePrice: 24.30, prevClose: 24.80, currency: 'USD', marketCap: '$104B', peRatio: 28.0, dividendYield: 2.05 },
  
  // Popular ETFs
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Index ETF', assetType: 'etf', basePrice: 597.80, prevClose: 596.20, currency: 'USD', marketCap: '$605B', peRatio: 26.5, dividendYield: 1.22 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'Tech ETF', assetType: 'etf', basePrice: 512.40, prevClose: 510.80, currency: 'USD', marketCap: '$290B', peRatio: 31.8, dividendYield: 0.58 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'Index ETF', assetType: 'etf', basePrice: 549.20, prevClose: 547.80, currency: 'USD', marketCap: '$520B', peRatio: 26.5, dividendYield: 1.30 },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'Broad Market ETF', assetType: 'etf', basePrice: 294.60, prevClose: 293.90, currency: 'USD', marketCap: '$410B', peRatio: 25.1, dividendYield: 1.35 },
  { ticker: 'SMH', name: 'VanEck Semiconductor ETF', sector: 'Semiconductors', assetType: 'etf', basePrice: 254.10, prevClose: 251.20, currency: 'USD', marketCap: '$22B', peRatio: 38.2, dividendYield: 0.48 },
  { ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF', sector: 'Dividend ETF', assetType: 'etf', basePrice: 84.10, prevClose: 83.90, currency: 'USD', marketCap: '$60B', peRatio: 16.4, dividendYield: 3.42 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', sector: 'Bonds', assetType: 'etf', basePrice: 89.20, prevClose: 89.80, currency: 'USD', marketCap: '$58B', peRatio: 0, dividendYield: 4.10 },
];

// Helper: dynamic quote generator with deterministic seed and realistic intraday price movements
function getSimulatedQuote(ticker: string) {
  const item = MARKET_SECURITIES.find(s => s.ticker.toUpperCase() === ticker.toUpperCase()) || {
    ticker: ticker.toUpperCase(),
    name: `${ticker.toUpperCase()} Equity`,
    sector: 'Equities',
    assetType: 'stock' as const,
    basePrice: 150.0,
    prevClose: 152.0,
    currency: 'USD',
    marketCap: '$45B',
    peRatio: 24.5,
    dividendYield: 1.2
  };

  // Add realistic micro-drift based on time of day
  const now = Date.now();
  const timeHash = Math.sin((now / 15000) + (ticker.charCodeAt(0) * 17)) * 0.008;
  const currentPrice = Number((item.basePrice * (1 + timeHash)).toFixed(2));
  const change = Number((currentPrice - item.prevClose).toFixed(2));
  const changePercent = Number(((change / item.prevClose) * 100).toFixed(2));
  const dayHigh = Number((Math.max(currentPrice, item.prevClose) * 1.012).toFixed(2));
  const dayLow = Number((Math.min(currentPrice, item.prevClose) * 0.988).toFixed(2));

  return {
    ticker: item.ticker,
    name: item.name,
    sector: item.sector,
    assetType: item.assetType,
    price: currentPrice,
    change,
    changePercent,
    high: dayHigh,
    low: dayLow,
    open: Number((item.prevClose * 1.002).toFixed(2)),
    previousClose: item.prevClose,
    volume: Math.floor(12500000 + Math.abs(Math.cos(ticker.charCodeAt(0)) * 25000000)),
    marketCap: item.marketCap || '$250B',
    peRatio: item.peRatio ?? 28.5,
    dividendYield: item.dividendYield ?? 0.8,
    week52High: Number((item.basePrice * 1.22).toFixed(2)),
    week52Low: Number((item.basePrice * 0.68).toFixed(2)),
    lastUpdated: new Date().toISOString()
  };
}

// 20-Year Historical Data Generator (from 2006 to 2026!)
function generateHistoricalData(ticker: string, range: string) {
  const currentQuote = getSimulatedQuote(ticker);
  const currentPrice = currentQuote.price;
  const points: Array<{
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  const now = new Date('2026-11-07T18:35:00Z');
  
  // Decide steps and duration
  let daysBack = 365;
  let intervalDays = 1;
  let stepCount = 100;

  switch (range.toLowerCase()) {
    case '1d': {
      // 5-minute intraday steps for 1 trading day (6.5 hours = 78 bars)
      stepCount = 78;
      const startMs = now.getTime() - 6.5 * 3600 * 1000;
      let runningPrice = currentQuote.open;
      for (let i = 0; i < stepCount; i++) {
        const time = new Date(startMs + i * 5 * 60 * 1000);
        const noise = (Math.sin(i * 0.4 + ticker.charCodeAt(0)) * 0.003) + ((Math.random() - 0.49) * 0.004);
        const open = runningPrice;
        runningPrice = runningPrice * (1 + noise);
        if (i === stepCount - 1) runningPrice = currentPrice;
        const close = runningPrice;
        const high = Math.max(open, close) * (1 + Math.random() * 0.002);
        const low = Math.min(open, close) * (1 - Math.random() * 0.002);
        const volume = Math.floor(10000 + Math.random() * 80000);
        points.push({
          date: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          timestamp: time.getTime(),
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume
        });
      }
      return points;
    }
    case '5d':
      daysBack = 5;
      intervalDays = 0.2; // 25 points
      break;
    case '1m':
      daysBack = 30;
      intervalDays = 1;
      break;
    case '6m':
      daysBack = 180;
      intervalDays = 2;
      break;
    case 'ytd':
      daysBack = 312; // Jan 1 2026 to Nov 7 2026
      intervalDays = 3;
      break;
    case '1y':
      daysBack = 365;
      intervalDays = 3;
      break;
    case '5y':
      daysBack = 5 * 365;
      intervalDays = 14;
      break;
    case '10y':
      daysBack = 10 * 365;
      intervalDays = 25;
      break;
    case '20y':
    case 'max':
    default:
      daysBack = 20 * 365; // Full 20 years: Nov 2006 to Nov 2026
      intervalDays = 30; // Monthly points
      break;
  }

  // Construct realistic historical trajectory:
  // For 20-year range (2006 to 2026), model major economic cycles:
  // - 2006-2007: Pre-crisis peak
  // - 2008-2009: Great Financial Crisis drawdowns (-45% to -55% for market, higher for tech/financials)
  // - 2010-2019: Historic decade-long bull run
  // - 2020 March: COVID-19 crash shock (-30%) and rapid stimulus V-shape recovery
  // - 2021: Tech/Crypto mania
  // - 2022: Inflation/Fed rate hikes bear market (-25% to -35%)
  // - 2023-2026: AI supercycle expansion to all-time highs
  
  const totalSteps = Math.floor(daysBack / intervalDays);
  
  // Starting price ratio 20 years ago
  let initialMultiplier = 0.15;
  if (ticker === 'NVDA') initialMultiplier = 0.005; // NVDA surged ~200x in 20 years
  else if (ticker === 'AAPL') initialMultiplier = 0.02; // AAPL surged ~50x
  else if (ticker === 'TSLA') initialMultiplier = 0.01;
  else if (ticker === '^GSPC') initialMultiplier = 0.23; // S&P was ~1400 in late 2006, now ~6000
  else if (ticker === '^IXIC') initialMultiplier = 0.12;
  else if (ticker === '^VIX') initialMultiplier = 0.95; // Mean reverting
  else if (ticker === 'GLD') initialMultiplier = 0.25;

  // Compute backward or forward from 2006 to 2026
  for (let i = 0; i <= totalSteps; i++) {
    const fraction = i / totalSteps; // 0 is oldest, 1 is today
    const pointTime = new Date(now.getTime() - (totalSteps - i) * intervalDays * 24 * 3600 * 1000);
    const year = pointTime.getFullYear() + pointTime.getMonth() / 12;

    let cycleWeight = 1.0;

    if (daysBack >= 365 * 10) {
      // Macro cycle adjustments based on exact calendar year
      if (year >= 2007.5 && year <= 2009.2) {
        // 2008 Crash
        const dip = Math.sin((year - 2007.5) / 1.7 * Math.PI);
        cycleWeight = 1.0 - (dip * (ticker === '^VIX' ? -2.5 : 0.48));
      } else if (year >= 2020.1 && year <= 2020.4) {
        // Covid crash
        cycleWeight = 0.72;
      } else if (year >= 2021.8 && year <= 2022.9) {
        // 2022 Fed rate hike bear market
        cycleWeight = 0.75;
      } else if (year >= 2024.0) {
        // 2024-2026 AI expansion
        cycleWeight = 1.05 + (year - 2024) * 0.15;
      }
    }

    // Baseline growth path
    let trendFactor = 0;
    if (ticker === '^VIX') {
      trendFactor = 1.0;
    } else {
      trendFactor = initialMultiplier + (1.0 - initialMultiplier) * Math.pow(fraction, 1.8);
    }

    const deterministicNoise = Math.sin(i * 0.7 + ticker.charCodeAt(0)) * 0.04;
    let price = currentPrice * trendFactor * cycleWeight * (1 + deterministicNoise);

    if (i === totalSteps) {
      price = currentPrice;
    }

    price = Math.max(price, 0.5);

    const open = price * (1 + (Math.sin(i) * 0.01));
    const close = price;
    const high = Math.max(open, close) * (1 + Math.abs(Math.cos(i)) * 0.015);
    const low = Math.min(open, close) * (1 - Math.abs(Math.sin(i * 1.3)) * 0.015);
    const volume = Math.floor(15000000 + Math.abs(Math.sin(i)) * 30000000);

    const dateStr = range === '1d' 
      ? pointTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : pointTime.toISOString().split('T')[0];

    points.push({
      date: dateStr,
      timestamp: pointTime.getTime(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return points;
}

// 1. API: Quotes for single or multiple tickers
app.get('/api/quotes', (req: Request, res: Response) => {
  const tickersParam = (req.query.tickers as string) || 'AAPL,MSFT,NVDA,^GSPC,^IXIC';
  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  
  const quotes = tickers.map(ticker => getSimulatedQuote(ticker));
  res.json({ quotes, timestamp: Date.now() });
});

// 2. API: Historical Performance Data (Supports 20 Years!)
app.get('/api/history/:ticker', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const range = ((req.query.range as string) || '1y').toLowerCase();
  
  try {
    const data = generateHistoricalData(ticker, range);
    res.json({
      ticker,
      range,
      points: data,
      count: data.length,
      currentPrice: data[data.length - 1]?.close || 100
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate historical data', details: err.message });
  }
});

// 2b. API: 20-Year Value Comparison for Portfolio Stocks with Custom Investment Amount & Years
app.get('/api/compare-portfolio', (req: Request, res: Response) => {
  try {
    const tickersParam = (req.query.tickers as string) || 'NVDA,AAPL,MSFT,VOO,AMZN,TSLA';
    const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    const initialAmount = Math.max(1, parseFloat((req.query.amount as string) || '10000'));
    const years = Math.min(20, Math.max(1, parseInt((req.query.years as string) || '20', 10)));

    // Ensure S&P 500 is included as standard benchmark
    const allTickers = Array.from(new Set([...tickers, '^GSPC']));

    const results = allTickers.map(ticker => {
      const full20yPoints = generateHistoricalData(ticker, '20y');
      const totalPoints = full20yPoints.length;
      
      // Calculate index corresponding to N years ago (out of 20 years)
      const fractionFromEnd = years / 20;
      const startIndex = Math.max(0, Math.floor(totalPoints * (1 - fractionFromEnd)));
      
      const startPoint = full20yPoints[startIndex] || full20yPoints[0];
      const endPoint = full20yPoints[totalPoints - 1];

      const startPrice = startPoint.close;
      const currentPrice = endPoint.close;
      const multiplier = startPrice > 0 ? currentPrice / startPrice : 1;
      const finalValue = Number((initialAmount * multiplier).toFixed(2));
      const profit = Number((finalValue - initialAmount).toFixed(2));
      const totalReturnPercent = Number((((finalValue - initialAmount) / initialAmount) * 100).toFixed(2));
      const cagrPercent = Number(((Math.pow(finalValue / initialAmount, 1 / years) - 1) * 100).toFixed(2));

      // Sample trajectory for interactive chart (up to 25 points)
      const subPoints = full20yPoints.slice(startIndex);
      const step = Math.max(1, Math.floor(subPoints.length / 24));
      const trajectory = subPoints.filter((_, idx) => idx % step === 0 || idx === subPoints.length - 1).map(pt => ({
        date: pt.date,
        timestamp: pt.timestamp,
        value: Number((initialAmount * (pt.close / startPrice)).toFixed(2))
      }));

      // Calculate Maximum Drawdown across the entire period
      let peakPrice = -Infinity;
      let maxDrawdownPct = 0;
      subPoints.forEach(pt => {
        const highVal = pt.high || pt.close;
        const lowVal = pt.low || pt.close;
        if (highVal > peakPrice) peakPrice = highVal;
        if (peakPrice > 0) {
          const dd = ((lowVal - peakPrice) / peakPrice) * 100;
          if (dd < maxDrawdownPct) {
            maxDrawdownPct = dd;
          }
        }
      });
      const maxDrawdown = Number(maxDrawdownPct.toFixed(2));

      // Calculate Average Drawdown Per Year (average annual intra-year peak-to-trough pullback)
      const yearMap: Record<string, typeof subPoints> = {};
      subPoints.forEach(pt => {
        const yr = new Date(pt.timestamp).getFullYear().toString();
        if (!yearMap[yr]) yearMap[yr] = [];
        yearMap[yr].push(pt);
      });

      const yearlyDrawdowns: number[] = [];
      Object.values(yearMap).forEach(ptsInYear => {
        let yrPeak = -Infinity;
        let worstYrDd = 0;
        ptsInYear.forEach(p => {
          const h = p.high || p.close;
          const l = p.low || p.close;
          if (h > yrPeak) yrPeak = h;
          if (yrPeak > 0) {
            const dd = ((l - yrPeak) / yrPeak) * 100;
            if (dd < worstYrDd) worstYrDd = dd;
          }
        });
        yearlyDrawdowns.push(worstYrDd);
      });

      const avgDrawdownPerYear = yearlyDrawdowns.length > 0
        ? Number((yearlyDrawdowns.reduce((a, b) => a + b, 0) / yearlyDrawdowns.length).toFixed(2))
        : maxDrawdown;

      const quote = getSimulatedQuote(ticker);

      return {
        ticker,
        name: quote.name,
        sector: quote.sector,
        assetType: quote.assetType,
        initialAmount,
        years,
        startPrice: Number(startPrice.toFixed(2)),
        currentPrice: Number(currentPrice.toFixed(2)),
        finalValue,
        profit,
        totalReturnPercent,
        cagrPercent,
        maxDrawdown,
        avgDrawdownPerYear,
        multiplier: Number(multiplier.toFixed(2)),
        startDate: startPoint.date,
        endDate: endPoint.date,
        trajectory
      };
    });

    // Separate benchmark and portfolio items
    const benchmark = results.find(r => r.ticker === '^GSPC') || results[0];
    const portfolioItems = results
      .filter(r => r.ticker !== '^GSPC')
      .map(item => ({
        ...item,
        alphaVsSP500: Number((item.totalReturnPercent - benchmark.totalReturnPercent).toFixed(2)),
        profitDiffVsSP500: Number((item.profit - benchmark.profit).toFixed(2))
      }))
      // DEFAULT SORT: sorted by most profit generated!
      .sort((a, b) => b.profit - a.profit);

    res.json({
      initialAmount,
      years,
      startDate: benchmark.startDate,
      endDate: benchmark.endDate,
      benchmark,
      items: portfolioItems
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute portfolio comparison', details: err.message });
  }
});

// 3. API: Search securities
app.get('/api/search', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();
  
  if (!query) {
    // Return trending/popular securities
    res.json({ results: MARKET_SECURITIES.slice(0, 16) });
    return;
  }

  const results = MARKET_SECURITIES.filter(sec => 
    sec.ticker.toLowerCase().includes(query) ||
    sec.name.toLowerCase().includes(query) ||
    sec.sector.toLowerCase().includes(query)
  );

  // If query looks like an unlisted valid ticker, synthesize on the fly!
  if (results.length === 0 && query.length >= 1 && query.length <= 6 && /^[a-z^.]+$/i.test(query)) {
    results.push({
      ticker: query.toUpperCase(),
      name: `${query.toUpperCase()} Corporation`,
      sector: 'General Equity',
      assetType: 'stock',
      basePrice: 125.00,
      prevClose: 124.50,
      currency: 'USD'
    });
  }

  res.json({ results });
});

// 4. API: Market status (US Market Hours: 9:30 AM - 4:00 PM EST)
app.get('/api/market-status', (_req: Request, res: Response) => {
  const now = new Date();
  // Get time in America/New_York
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDate = new Date(nyTimeStr);
  const day = nyDate.getDay(); // 0 is Sunday, 6 is Saturday
  const hours = nyDate.getHours();
  const minutes = nyDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const isWeekend = day === 0 || day === 6;
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM
  const preMarketMinutes = 4 * 60; // 4:00 AM
  const afterHoursMinutes = 20 * 60; // 8:00 PM

  let status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS' = 'CLOSED';
  let message = 'Market Closed';

  if (!isWeekend) {
    if (totalMinutes >= marketOpenMinutes && totalMinutes < marketCloseMinutes) {
      status = 'OPEN';
      message = 'Regular Market Hours';
    } else if (totalMinutes >= preMarketMinutes && totalMinutes < marketOpenMinutes) {
      status = 'PRE_MARKET';
      message = 'Pre-Market Trading';
    } else if (totalMinutes >= marketCloseMinutes && totalMinutes < afterHoursMinutes) {
      status = 'AFTER_HOURS';
      message = 'After-Hours Trading';
    }
  } else {
    message = 'Weekend - Closed';
  }

  res.json({
    status,
    message,
    nyTime: nyDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }),
    isTrading: status === 'OPEN'
  });
});

// 5. API: Cross-Device Sync (Store & Retrieve Portfolio across Mobile & Desktop)
app.get('/api/sync/:syncId', (req: Request, res: Response) => {
  const syncId = req.params.syncId.toUpperCase();
  const entry = syncDatabase[syncId];
  if (!entry) {
    res.status(404).json({ error: 'Sync code not found or expired' });
    return;
  }
  res.json({ syncId, data: entry.data, updatedAt: entry.updatedAt });
});

app.post('/api/sync/:syncId', (req: Request, res: Response) => {
  const syncId = req.params.syncId.toUpperCase();
  const { data } = req.body;
  if (!data) {
    res.status(400).json({ error: 'Data payload is required' });
    return;
  }
  syncDatabase[syncId] = {
    data,
    updatedAt: Date.now()
  };
  res.json({ success: true, syncId, updatedAt: syncDatabase[syncId].updatedAt });
});

// Setup Vite dev server or serve production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

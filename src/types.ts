export type AssetType = 'stock' | 'index' | 'etf' | 'commodity' | 'treasury';

export interface StockQuote {
  ticker: string;
  name: string;
  sector: string;
  assetType: AssetType;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap: string;
  peRatio?: number;
  dividendYield?: number;
  week52High: number;
  week52Low: number;
  lastUpdated: string;
}

export interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgBuyPrice: number;
  buyDate: string;
  notes?: string;
  targetPercent?: number;
}

export interface HoldingWithMetrics extends Holding {
  quote: StockQuote;
  currentValue: number;
  costBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyGainLoss: number;
  dailyGainLossPercent: number;
  portfolioWeight: number; // percentage of equity portfolio
}

export type AlertType = 'DROP_PERCENT' | 'GAIN_PERCENT' | 'PRICE_BELOW' | 'PRICE_ABOVE';

export interface AlertRule {
  id: string;
  ticker: string; // 'ALL' or specific symbol
  type: AlertType;
  thresholdValue: number; // e.g. 3.5 for 3.5%
  enabled: boolean;
  pushNotification: boolean;
  soundAlert: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface AlertNotification {
  id: string;
  ruleId?: string;
  ticker: string;
  title: string;
  message: string;
  severity: 'urgent_drop' | 'drop' | 'gain' | 'info';
  percentChange: number;
  price: number;
  timestamp: number;
  read: boolean;
}

export interface HistoricalPoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = '1d' | '5d' | '1m' | '6m' | 'ytd' | '1y' | '5y' | '10y' | '20y' | 'max';

export interface MarketStatus {
  status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  message: string;
  nyTime: string;
  isTrading: boolean;
}

export interface PortfolioSummary {
  totalEquity: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyGainLoss: number;
  dailyGainLossPercent: number;
  cashBalance: number;
  netWorth: number;
  holdingsCount: number;
  topGainer?: { ticker: string; changePercent: number; gainDollars: number };
  topLoser?: { ticker: string; changePercent: number; lossDollars: number };
}

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Holding, 
  HoldingWithMetrics, 
  StockQuote, 
  AlertRule, 
  AlertNotification, 
  PortfolioSummary,
  MarketStatus 
} from '../types';
import { playAlertChime, dispatchSystemNotification, getNotificationPermissionStatus } from '../utils/notifications';
import { fetchLiveQuotes, fetchMarketHours, getSimulatedQuoteClient } from '../services/marketData';

interface PortfolioContextType {
  holdings: Holding[];
  quotes: Record<string, StockQuote>;
  quotesLoading: boolean;
  quotesLastUpdated: number;
  cashBalance: number;
  theme: 'dark' | 'light';
  alertRules: AlertRule[];
  notifications: AlertNotification[];
  unreadAlertsCount: number;
  syncId: string;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  marketStatus: MarketStatus | null;
  refreshInterval: number; // in seconds, 0 = manual
  isSimulatingTicks: boolean;
  selectedTicker: string;
  significantDropToast: AlertNotification | null;
  portfolioSummary: PortfolioSummary;
  holdingsWithMetrics: HoldingWithMetrics[];
  
  // Actions
  setSelectedTicker: (ticker: string) => void;
  setRefreshInterval: (sec: number) => void;
  setIsSimulatingTicks: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleTheme: () => void;
  addHolding: (holding: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  updateCashBalance: (amount: number) => void;
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  dismissToast: () => void;
  testTriggerDropAlert: (ticker: string, dropPercent: number) => void;
  refreshMarketData: () => Promise<void>;
  pushSyncToCloud: () => Promise<boolean>;
  pullSyncFromCloud: (code: string) => Promise<boolean>;
  exportPortfolioJSON: () => string;
  importPortfolioJSON: (jsonStr: string) => boolean;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const DEFAULT_HOLDINGS: Holding[] = [
  { id: 'h-nvda', ticker: 'NVDA', shares: 24, avgBuyPrice: 112.50, buyDate: '2024-03-15', notes: 'AI compute core holding' },
  { id: 'h-aapl', ticker: 'AAPL', shares: 35, avgBuyPrice: 188.40, buyDate: '2023-11-20', notes: 'Ecosystem & services dividend' },
  { id: 'h-msft', ticker: 'MSFT', shares: 14, avgBuyPrice: 382.00, buyDate: '2024-01-10', notes: 'Enterprise cloud & Copilot' },
  { id: 'h-voo', ticker: 'VOO', shares: 25, avgBuyPrice: 485.00, buyDate: '2023-08-01', notes: 'Core S&P 500 index ETF' },
  { id: 'h-tsla', ticker: 'TSLA', shares: 18, avgBuyPrice: 245.20, buyDate: '2024-05-12', notes: 'Autonomous mobility & energy' },
  { id: 'h-amzn', ticker: 'AMZN', shares: 20, avgBuyPrice: 172.80, buyDate: '2024-02-18', notes: 'AWS & retail logistics' },
];

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'rule-drop-all-3',
    ticker: 'ALL',
    type: 'DROP_PERCENT',
    thresholdValue: 3.0,
    enabled: true,
    pushNotification: true,
    soundAlert: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule-drop-all-5',
    ticker: 'ALL',
    type: 'DROP_PERCENT',
    thresholdValue: 5.0,
    enabled: true,
    pushNotification: true,
    soundAlert: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule-tsla-drop',
    ticker: 'TSLA',
    type: 'DROP_PERCENT',
    thresholdValue: 4.0,
    enabled: true,
    pushNotification: true,
    soundAlert: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule-nvda-target',
    ticker: 'NVDA',
    type: 'GAIN_PERCENT',
    thresholdValue: 5.0,
    enabled: true,
    pushNotification: true,
    soundAlert: true,
    createdAt: new Date().toISOString()
  }
];

function generateSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TRK-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Core State
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_holdings');
      return saved ? JSON.parse(saved) : DEFAULT_HOLDINGS;
    } catch {
      return DEFAULT_HOLDINGS;
    }
  });

  const [cashBalance, setCashBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_cash');
      return saved ? parseFloat(saved) : 12450.0;
    } catch {
      return 12450.0;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_rules');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const [notifications, setNotifications] = useState<AlertNotification[]>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_notifications');
      return saved ? JSON.parse(saved) : [
        {
          id: 'init-drop-sample',
          ticker: 'TSLA',
          title: 'Significant Drop Alert',
          message: 'TSLA is down -3.42% ($321.40) today, crossing your 3.0% threshold.',
          severity: 'drop',
          percentChange: -3.42,
          price: 321.40,
          timestamp: Date.now() - 3600000 * 2,
          read: false
        }
      ];
    } catch {
      return [];
    }
  });

  const [syncId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('alphatrack_sync_id');
      if (saved) return saved;
      const newId = generateSyncCode();
      localStorage.setItem('alphatrack_sync_id', newId);
      return newId;
    } catch {
      return generateSyncCode();
    }
  });

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [quotesLoading, setQuotesLoading] = useState<boolean>(true);
  const [quotesLastUpdated, setQuotesLastUpdated] = useState<number>(Date.now());
  const [refreshInterval, setRefreshInterval] = useState<number>(10); // default 10s auto-refresh
  const [isSimulatingTicks, setIsSimulatingTicks] = useState<boolean>(true);
  const [selectedTicker, setSelectedTicker] = useState<string>('NVDA');
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [significantDropToast, setSignificantDropToast] = useState<AlertNotification | null>(null);

  // Cooldown tracker for alert notifications so user isn't spammed on every 5s tick
  const notifiedEventsRef = React.useRef<Record<string, { timestamp: number; price: number }>>({});

  // Synchronize theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('alphatrack_theme', theme);
  }, [theme]);

  // Persist core state
  useEffect(() => {
    localStorage.setItem('alphatrack_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('alphatrack_cash', cashBalance.toString());
  }, [cashBalance]);

  useEffect(() => {
    localStorage.setItem('alphatrack_rules', JSON.stringify(alertRules));
  }, [alertRules]);

  useEffect(() => {
    localStorage.setItem('alphatrack_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Fetch Quotes function (Resilient for Vercel, Node, and browser)
  const fetchQuotes = useCallback(async () => {
    try {
      // Gather unique tickers: holdings + major indices + selectedTicker
      const tickerSet = new Set<string>([
        '^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX', 'GLD', '^TNX',
        selectedTicker,
        ...holdings.map(h => h.ticker)
      ]);

      const quotesArray = await fetchLiveQuotes(Array.from(tickerSet));
      const quoteMap: Record<string, StockQuote> = {};
      
      quotesArray.forEach((q: StockQuote) => {
        quoteMap[q.ticker.toUpperCase()] = q;
      });

      setQuotes(prev => ({ ...prev, ...quoteMap }));
      setQuotesLastUpdated(Date.now());
      setQuotesLoading(false);
    } catch (err) {
      console.warn('Error fetching quotes, keeping existing cache:', err);
      setQuotesLoading(false);
    }
  }, [holdings, selectedTicker]);

  // Fetch Market Status (Resilient for Vercel)
  const fetchMarketStatus = useCallback(async () => {
    try {
      const data = await fetchMarketHours();
      setMarketStatus(data);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchQuotes();
    fetchMarketStatus();
  }, [fetchQuotes, fetchMarketStatus]);

  // Polling Interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchQuotes();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchQuotes]);

  // Periodic market status update
  useEffect(() => {
    const interval = setInterval(fetchMarketStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchMarketStatus]);

  // Real-time tick simulation (subtle live order-book price oscillations)
  useEffect(() => {
    if (!isSimulatingTicks) return;
    const tickInterval = setInterval(() => {
      setQuotes(prev => {
        const updated = { ...prev };
        // Randomly nudge 1 or 2 quotes slightly
        const keys = Object.keys(updated);
        if (keys.length === 0) return prev;
        
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const current = updated[randomKey];
        if (!current) return prev;

        const deltaFactor = (Math.random() - 0.49) * 0.003;
        const newPrice = Number((current.price * (1 + deltaFactor)).toFixed(2));
        const newChange = Number((newPrice - current.previousClose).toFixed(2));
        const newChangePercent = Number(((newChange / current.previousClose) * 100).toFixed(2));

        updated[randomKey] = {
          ...current,
          price: newPrice,
          change: newChange,
          changePercent: newChangePercent,
          high: Math.max(current.high, newPrice),
          low: Math.min(current.low, newPrice),
          lastUpdated: new Date().toISOString()
        };

        return updated;
      });
    }, 2500);

    return () => clearInterval(tickInterval);
  }, [isSimulatingTicks]);

  // ALERT TRIGGER EVALUATION ENGINE
  // Evaluates every holding against rules whenever quotes update
  useEffect(() => {
    if (Object.keys(quotes).length === 0) return;

    holdings.forEach(holding => {
      const quote = quotes[holding.ticker.toUpperCase()];
      if (!quote) return;

      const changePct = quote.changePercent; // daily change percentage e.g. -3.45

      // Check applicable rules: ticker-specific first, then 'ALL'
      const applicableRules = alertRules.filter(
        r => r.enabled && (r.ticker.toUpperCase() === 'ALL' || r.ticker.toUpperCase() === holding.ticker.toUpperCase())
      );

      applicableRules.forEach(rule => {
        let isTriggered = false;
        let severity: 'urgent_drop' | 'drop' | 'gain' | 'info' = 'drop';
        let alertTitle = '';
        let alertMessage = '';

        if (rule.type === 'DROP_PERCENT' && changePct <= -rule.thresholdValue) {
          isTriggered = true;
          severity = Math.abs(changePct) >= 5.0 ? 'urgent_drop' : 'drop';
          alertTitle = severity === 'urgent_drop' 
            ? `⚠️ Significant Drop: ${holding.ticker} Down ${Math.abs(changePct).toFixed(2)}%`
            : `📉 Price Alert: ${holding.ticker} Down ${Math.abs(changePct).toFixed(2)}%`;
          alertMessage = `${holding.ticker} dropped ${Math.abs(changePct).toFixed(2)}% today to $${quote.price.toFixed(2)}, crossing your -${rule.thresholdValue}% threshold.`;
        } else if (rule.type === 'GAIN_PERCENT' && changePct >= rule.thresholdValue) {
          isTriggered = true;
          severity = 'gain';
          alertTitle = `🚀 Price Surge: ${holding.ticker} Up +${changePct.toFixed(2)}%`;
          alertMessage = `${holding.ticker} gained +${changePct.toFixed(2)}% today to $${quote.price.toFixed(2)}, surpassing your +${rule.thresholdValue}% target.`;
        } else if (rule.type === 'PRICE_BELOW' && quote.price <= rule.thresholdValue) {
          isTriggered = true;
          severity = 'urgent_drop';
          alertTitle = `⚠️ Price Level Breached: ${holding.ticker} < $${rule.thresholdValue}`;
          alertMessage = `${holding.ticker} fell below your price floor of $${rule.thresholdValue} to $${quote.price.toFixed(2)}.`;
        } else if (rule.type === 'PRICE_ABOVE' && quote.price >= rule.thresholdValue) {
          isTriggered = true;
          severity = 'gain';
          alertTitle = `🎯 Price Target Met: ${holding.ticker} > $${rule.thresholdValue}`;
          alertMessage = `${holding.ticker} reached your upside target of $${rule.thresholdValue} (current: $${quote.price.toFixed(2)}).`;
        }

        if (isTriggered) {
          const cooldownKey = `${rule.id}_${holding.ticker}`;
          const lastNotif = notifiedEventsRef.current[cooldownKey];
          const now = Date.now();
          const cooldownMs = 15 * 60 * 1000; // 15 min cooldown

          // Fire if never notified or cooldown elapsed
          if (!lastNotif || (now - lastNotif.timestamp > cooldownMs)) {
            notifiedEventsRef.current[cooldownKey] = { timestamp: now, price: quote.price };

            const newNotif: AlertNotification = {
              id: `notif-${now}-${Math.random().toString(36).substring(2, 7)}`,
              ruleId: rule.id,
              ticker: holding.ticker,
              title: alertTitle,
              message: alertMessage,
              severity,
              percentChange: changePct,
              price: quote.price,
              timestamp: now,
              read: false
            };

            setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

            // Show top toast banner for significant drops
            if (severity === 'urgent_drop' || severity === 'drop') {
              setSignificantDropToast(newNotif);
            }

            // Play synthesized Web Audio chime
            if (rule.soundAlert) {
              playAlertChime(severity);
            }

            // Push notification to browser / mobile device
            if (rule.pushNotification && getNotificationPermissionStatus() === 'granted') {
              dispatchSystemNotification(alertTitle, {
                body: alertMessage,
                tag: `${holding.ticker}-alert`,
              });
            }
          }
        }
      });
    });
  }, [quotes, holdings, alertRules]);

  // Compute Holdings with Metrics & Portfolio Summary
  const holdingsWithMetrics = useMemo<HoldingWithMetrics[]>(() => {
    const list: HoldingWithMetrics[] = [];
    let equitySum = 0;

    // First pass: compute individual values
    const intermediate = holdings.map(h => {
      const quote = quotes[h.ticker.toUpperCase()] || {
        ticker: h.ticker,
        name: `${h.ticker} Corp`,
        sector: 'Equities',
        assetType: 'stock' as const,
        price: h.avgBuyPrice,
        change: 0,
        changePercent: 0,
        high: h.avgBuyPrice,
        low: h.avgBuyPrice,
        open: h.avgBuyPrice,
        previousClose: h.avgBuyPrice,
        volume: 0,
        marketCap: '--',
        week52High: h.avgBuyPrice * 1.2,
        week52Low: h.avgBuyPrice * 0.8,
        lastUpdated: new Date().toISOString()
      };

      const currentValue = h.shares * quote.price;
      const costBasis = h.shares * h.avgBuyPrice;
      const totalGainLoss = currentValue - costBasis;
      const totalGainLossPercent = costBasis > 0 ? (totalGainLoss / costBasis) * 100 : 0;
      const dailyGainLoss = h.shares * quote.change;
      const dailyGainLossPercent = quote.changePercent;

      equitySum += currentValue;

      return {
        ...h,
        quote,
        currentValue,
        costBasis,
        totalGainLoss,
        totalGainLossPercent,
        dailyGainLoss,
        dailyGainLossPercent,
        portfolioWeight: 0,
      };
    });

    // Second pass: compute portfolio weights
    return intermediate.map(item => ({
      ...item,
      portfolioWeight: equitySum > 0 ? (item.currentValue / equitySum) * 100 : 0
    }));
  }, [holdings, quotes]);

  const portfolioSummary = useMemo<PortfolioSummary>(() => {
    let totalEquity = 0;
    let totalCostBasis = 0;
    let dailyGainLoss = 0;
    let topGainer: { ticker: string; changePercent: number; gainDollars: number } | undefined;
    let topLoser: { ticker: string; changePercent: number; lossDollars: number } | undefined;

    holdingsWithMetrics.forEach(item => {
      totalEquity += item.currentValue;
      totalCostBasis += item.costBasis;
      dailyGainLoss += item.dailyGainLoss;

      if (!topGainer || item.dailyGainLossPercent > topGainer.changePercent) {
        topGainer = {
          ticker: item.ticker,
          changePercent: item.dailyGainLossPercent,
          gainDollars: item.dailyGainLoss
        };
      }

      if (!topLoser || item.dailyGainLossPercent < topLoser.changePercent) {
        topLoser = {
          ticker: item.ticker,
          changePercent: item.dailyGainLossPercent,
          lossDollars: item.dailyGainLoss
        };
      }
    });

    const totalGainLoss = totalEquity - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const prevEquity = totalEquity - dailyGainLoss;
    const dailyGainLossPercent = prevEquity > 0 ? (dailyGainLoss / prevEquity) * 100 : 0;

    return {
      totalEquity,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      dailyGainLoss,
      dailyGainLossPercent,
      cashBalance,
      netWorth: totalEquity + cashBalance,
      holdingsCount: holdings.length,
      topGainer,
      topLoser
    };
  }, [holdingsWithMetrics, cashBalance, holdings.length]);

  const unreadAlertsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const addHolding = (newHolding: Omit<Holding, 'id'>) => {
    const ticker = newHolding.ticker.toUpperCase().trim();

    // 1. Immediately guarantee quote availability so metrics calculate right away
    const immediateQuote = getSimulatedQuoteClient(ticker);
    setQuotes(prev => ({
      ...prev,
      [ticker]: prev[ticker] || immediateQuote
    }));

    // 2. Either combine with existing position or append new holding
    setHoldings(prev => {
      const existingIdx = prev.findIndex(h => h.ticker.toUpperCase() === ticker);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const combinedShares = Number((existing.shares + newHolding.shares).toFixed(4));
        const totalCost = (existing.shares * existing.avgBuyPrice) + (newHolding.shares * newHolding.avgBuyPrice);
        const combinedAvgPrice = combinedShares > 0 ? Number((totalCost / combinedShares).toFixed(2)) : newHolding.avgBuyPrice;
        
        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          shares: combinedShares,
          avgBuyPrice: combinedAvgPrice,
          buyDate: newHolding.buyDate || existing.buyDate,
          notes: newHolding.notes ? `${existing.notes ? existing.notes + ' · ' : ''}${newHolding.notes}` : existing.notes
        };
        return updated;
      }

      const id = `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      return [...prev, { ...newHolding, id, ticker }];
    });

    // 3. Set active selected ticker so charts focus on it
    setSelectedTicker(ticker);

    // 4. Create an in-app audit notification
    const newNotif: AlertNotification = {
      id: `notif-add-${Date.now()}`,
      ruleId: 'manual-add',
      ticker,
      title: `Position Added: ${ticker}`,
      message: `Added ${newHolding.shares} shares of ${ticker} at $${newHolding.avgBuyPrice.toFixed(2)}/share.`,
      severity: 'info',
      percentChange: 0,
      price: newHolding.avgBuyPrice,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // 5. Trigger quotes refresh
    fetchQuotes();
  };

  const updateHolding = (id: string, updates: Partial<Holding>) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const removeHolding = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  const updateCashBalance = (amount: number) => {
    setCashBalance(Math.max(0, amount));
  };

  const addAlertRule = (rule: Omit<AlertRule, 'id' | 'createdAt'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setAlertRules(prev => [newRule, ...prev]);
  };

  const updateAlertRule = (id: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeAlertRule = (id: string) => {
    setAlertRules(prev => prev.filter(r => r.id !== id));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const dismissToast = () => {
    setSignificantDropToast(null);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Test trigger for drop alert to let user experience the audio, visual, and push triggers!
  const testTriggerDropAlert = (ticker: string, dropPercent: number) => {
    const currentPrice = quotes[ticker.toUpperCase()]?.price || 150.00;
    const now = Date.now();
    const severity = Math.abs(dropPercent) >= 5.0 ? 'urgent_drop' : 'drop';
    const testNotif: AlertNotification = {
      id: `test-drop-${now}`,
      ticker: ticker.toUpperCase(),
      title: `⚡ Test Significant Drop: ${ticker.toUpperCase()} Down ${Math.abs(dropPercent).toFixed(2)}%`,
      message: `Test alert simulated! ${ticker.toUpperCase()} dropped ${Math.abs(dropPercent).toFixed(2)}% ($${currentPrice.toFixed(2)}).`,
      severity,
      percentChange: -Math.abs(dropPercent),
      price: currentPrice,
      timestamp: now,
      read: false
    };

    setNotifications(prev => [testNotif, ...prev]);
    setSignificantDropToast(testNotif);
    playAlertChime(severity);

    if (getNotificationPermissionStatus() === 'granted') {
      dispatchSystemNotification(testNotif.title, {
        body: testNotif.message,
        tag: 'test-drop'
      });
    }
  };

  // Cross-device sync functions (Resilient for Vercel and local)
  const pushSyncToCloud = async (): Promise<boolean> => {
    setIsSyncing(true);
    const payload = {
      holdings,
      cashBalance,
      alertRules,
      syncId,
      theme,
      timestamp: Date.now()
    };

    // Always cache locally by syncId for offline and cross-tab pairing
    try {
      localStorage.setItem(`alphatrack_sync_store_${syncId}`, JSON.stringify(payload));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('alphatrack_sync');
        bc.postMessage({ type: 'SYNC_PUSH', syncId, payload });
        bc.close();
      }
    } catch {}

    try {
      const res = await fetch(`/api/sync/${syncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
      });
      if (res.ok) {
        setLastSyncedAt(Date.now());
        setIsSyncing(false);
        return true;
      }
    } catch {
      // Server route may not exist on static Vercel
    }

    setLastSyncedAt(Date.now());
    setIsSyncing(false);
    return true;
  };

  const pullSyncFromCloud = async (code: string): Promise<boolean> => {
    setIsSyncing(true);
    const cleanCode = code.trim().toUpperCase();

    try {
      const res = await fetch(`/api/sync/${cleanCode}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          const d = json.data;
          if (Array.isArray(d.holdings)) setHoldings(d.holdings);
          if (typeof d.cashBalance === 'number') setCashBalance(d.cashBalance);
          if (Array.isArray(d.alertRules)) setAlertRules(d.alertRules);
          if (d.theme === 'dark' || d.theme === 'light') setTheme(d.theme);
          setLastSyncedAt(json.updatedAt || Date.now());
          setIsSyncing(false);
          fetchQuotes();
          return true;
        }
      }
    } catch {}

    // Fallback: check localStorage store for paired device sync
    try {
      const localStored = localStorage.getItem(`alphatrack_sync_store_${cleanCode}`);
      if (localStored) {
        const d = JSON.parse(localStored);
        if (Array.isArray(d.holdings)) setHoldings(d.holdings);
        if (typeof d.cashBalance === 'number') setCashBalance(d.cashBalance);
        if (Array.isArray(d.alertRules)) setAlertRules(d.alertRules);
        if (d.theme === 'dark' || d.theme === 'light') setTheme(d.theme);
        setLastSyncedAt(d.timestamp || Date.now());
        setIsSyncing(false);
        fetchQuotes();
        return true;
      }
    } catch {}

    setIsSyncing(false);
    return false;
  };

  const exportPortfolioJSON = (): string => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      syncId,
      holdings,
      cashBalance,
      alertRules,
      portfolioSummary
    };
    return JSON.stringify(exportData, null, 2);
  };

  const importPortfolioJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.holdings)) {
        setHoldings(parsed.holdings);
      }
      if (typeof parsed.cashBalance === 'number') {
        setCashBalance(parsed.cashBalance);
      }
      if (Array.isArray(parsed.alertRules)) {
        setAlertRules(parsed.alertRules);
      }
      fetchQuotes();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        quotes,
        quotesLoading,
        quotesLastUpdated,
        cashBalance,
        theme,
        alertRules,
        notifications,
        unreadAlertsCount,
        syncId,
        isSyncing,
        lastSyncedAt,
        marketStatus,
        refreshInterval,
        isSimulatingTicks,
        selectedTicker,
        significantDropToast,
        portfolioSummary,
        holdingsWithMetrics,
        setSelectedTicker,
        setRefreshInterval,
        setIsSimulatingTicks,
        toggleTheme,
        addHolding,
        updateHolding,
        removeHolding,
        updateCashBalance,
        addAlertRule,
        updateAlertRule,
        removeAlertRule,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        dismissToast,
        testTriggerDropAlert,
        refreshMarketData: fetchQuotes,
        pushSyncToCloud,
        pullSyncFromCloud,
        exportPortfolioJSON,
        importPortfolioJSON
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

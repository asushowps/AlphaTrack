import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Send,
  Smartphone,
  ShieldAlert
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../utils/notifications';
import type { AlertType } from '../types';

interface AlertsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
}

export const AlertsManagerModal: React.FC<AlertsManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTicker 
}) => {
  const { 
    alertRules, 
    addAlertRule, 
    updateAlertRule, 
    removeAlertRule, 
    holdings, 
    notifications,
    clearNotifications,
    testTriggerDropAlert 
  } = usePortfolio();

  const [activeTab, setActiveTab] = useState<'rules' | 'history' | 'push'>('rules');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => getNotificationPermissionStatus());

  // Form for new rule
  const [ticker, setTicker] = useState<string>(initialTicker || 'ALL');
  const [alertType, setAlertType] = useState<AlertType>('DROP_PERCENT');
  const [thresholdValue, setThresholdValue] = useState<string>('3.5');
  const [pushNotification, setPushNotification] = useState<boolean>(true);
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    const res = await requestNotificationPermission();
    setPermissionStatus(res);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(thresholdValue);
    if (isNaN(val) || val <= 0) return;

    addAlertRule({
      ticker: ticker.toUpperCase(),
      type: alertType,
      thresholdValue: val,
      enabled: true,
      pushNotification,
      soundAlert
    });

    // Reset default
    setThresholdValue('3.5');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Drop Alerts & Custom Push Notifications
              </h2>
              <p className="text-xs text-slate-400">
                Configure threshold triggers and real-time push alerts for severe price drops
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-slate-900/50 text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alert Rules ({alertRules.length})
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'push'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Push Settings & Test
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alert Log ({notifications.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: RULES MANAGEMENT */}
          {activeTab === 'rules' && (
            <>
              {/* Quick Add Form */}
              <form onSubmit={handleCreateRule} className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 space-y-4">
                <div className="text-xs font-semibold uppercase font-mono text-slate-300">
                  Create New Price Alert
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Ticker selector */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Asset</label>
                    <select
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="ALL">ANY Asset in Portfolio (Global)</option>
                      {holdings.map(h => (
                        <option key={h.id} value={h.ticker}>
                          {h.ticker} ({h.shares} shs)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Alert Condition Type */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Condition</label>
                    <select
                      value={alertType}
                      onChange={(e) => setAlertType(e.target.value as AlertType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="DROP_PERCENT">Drops more than % (Intraday)</option>
                      <option value="GAIN_PERCENT">Surges more than % (Intraday)</option>
                      <option value="PRICE_BELOW">Price Falls Below ($ Price Floor)</option>
                      <option value="PRICE_ABOVE">Price Rises Above ($ Target)</option>
                    </select>
                  </div>

                  {/* Threshold Value */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      {alertType.includes('PERCENT') ? 'Threshold Percentage (%)' : 'Target Price ($)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        placeholder={alertType.includes('PERCENT') ? 'e.g. 3.5' : 'e.g. 210.00'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">
                        {alertType.includes('PERCENT') ? '%' : '$'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notification Options & Submit */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushNotification}
                        onChange={(e) => setPushNotification(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Push Notification</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soundAlert}
                        onChange={(e) => setSoundAlert(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Audio Chime</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Alert Trigger</span>
                  </button>
                </div>
              </form>

              {/* Active Rules List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase font-mono text-slate-400 px-1">
                  Active Alert Rules ({alertRules.length})
                </div>

                {alertRules.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-slate-800/60">
                    No active alert rules. Create one above to get notified on sudden price swings.
                  </div>
                ) : (
                  alertRules.map(rule => {
                    const isDrop = rule.type === 'DROP_PERCENT' || rule.type === 'PRICE_BELOW';
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          rule.enabled 
                            ? 'bg-slate-950/40 border-slate-800' 
                            : 'bg-slate-950/10 border-slate-800/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateAlertRule(rule.id, { enabled: !rule.enabled })}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            title={rule.enabled ? 'Disable Alert' : 'Enable Alert'}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-white">
                                {rule.ticker}
                              </span>
                              <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                isDrop ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {rule.type === 'DROP_PERCENT' && `Drop > ${rule.thresholdValue}%`}
                                {rule.type === 'GAIN_PERCENT' && `Gain > ${rule.thresholdValue}%`}
                                {rule.type === 'PRICE_BELOW' && `Price < $${rule.thresholdValue}`}
                                {rule.type === 'PRICE_ABOVE' && `Price > $${rule.thresholdValue}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>Channels:</span>
                              {rule.pushNotification && <span>Push</span>}
                              {rule.soundAlert && <span>Audio</span>}
                              {!rule.pushNotification && !rule.soundAlert && <span>In-App Only</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeAlertRule(rule.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete Alert Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: PUSH NOTIFICATIONS & TEST SUITE */}
          {activeTab === 'push' && (
            <div className="space-y-5">
              {/* Permission Status Box */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Browser & Mobile Push Notifications
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Receive alerts on your desktop or smartphone even when looking at other tabs or lock screen
                    </p>
                    <div className="mt-2 text-xs font-mono">
                      Status: {permissionStatus === 'granted' ? (
                        <span className="text-emerald-400 font-bold">Enabled & Granted</span>
                      ) : permissionStatus === 'denied' ? (
                        <span className="text-rose-400 font-bold">Blocked by Browser Settings</span>
                      ) : (
                        <span className="text-amber-400 font-bold">Prompt Not Requested Yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {permissionStatus !== 'granted' && (
                  <button
                    onClick={handleRequestPush}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    Enable Push Notifications
                  </button>
                )}
              </div>

              {/* Simulation / Test Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase font-mono text-white">
                    Live Drop Alert Simulation Test
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Verify your audio chimes, top toast banner, and browser push notification delivery:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => testTriggerDropAlert('NVDA', 4.8)}
                    className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-mono transition-colors"
                  >
                    Simulate NVDA -4.8% Drop
                  </button>
                  <button
                    onClick={() => testTriggerDropAlert('TSLA', 6.2)}
                    className="px-3 py-2 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-rose-200 rounded-lg text-xs font-mono transition-colors"
                  >
                    Simulate TSLA -6.2% Crash
                  </button>
                  <button
                    onClick={() => testTriggerDropAlert('AAPL', 3.1)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
                  >
                    Simulate AAPL -3.1% Drop
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase font-mono text-slate-400">
                  Trigger History ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-slate-800/60">
                  No alert notifications recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs font-sans transition-colors ${
                        n.severity === 'urgent_drop'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-mono font-bold">
                          <span>{n.ticker}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                            n.severity === 'urgent_drop' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {n.percentChange.toFixed(2)}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-normal">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

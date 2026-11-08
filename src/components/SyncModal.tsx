import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Laptop, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  QrCode, 
  CloudCheck,
  CheckCircle2
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { 
    syncId, 
    lastSyncedAt, 
    isSyncing, 
    pushSyncToCloud, 
    pullSyncFromCloud,
    exportPortfolioJSON,
    importPortfolioJSON 
  } = usePortfolio();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [showJsonMode, setShowJsonMode] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePush = async () => {
    setSyncStatus('Pushing portfolio to cloud...');
    const ok = await pushSyncToCloud();
    if (ok) {
      setSyncStatus('Portfolio synchronized successfully!');
    } else {
      setSyncStatus('Sync failed. Please check network.');
    }
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode) return;
    setSyncStatus('Loading portfolio from code...');
    const ok = await pullSyncFromCloud(inputCode);
    if (ok) {
      setSyncStatus('Portfolio restored & synced!');
      setInputCode('');
    } else {
      setSyncStatus('Invalid code or not found.');
    }
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const handleExportFile = () => {
    const jsonStr = exportPortfolioJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphatrack-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = importPortfolioJSON(importJson);
    if (ok) {
      setSyncStatus('JSON backup imported successfully!');
      setShowJsonMode(false);
      setImportJson('');
    } else {
      setSyncStatus('Failed to parse JSON file.');
    }
    setTimeout(() => setSyncStatus(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Seamless Cross-Device Sync
              </h2>
              <p className="text-xs text-slate-400">
                Keep holdings and drop alerts synced between desktop and mobile phone
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

        {/* Status message */}
        {syncStatus && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Device Sync Code Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400">Your Sync Code</span>
              {lastSyncedAt && (
                <span className="text-[11px] font-mono text-emerald-400">
                  Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
              <span className="font-mono font-extrabold text-xl md:text-2xl tracking-wider text-cyan-400">
                {syncId}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handlePush}
                disabled={isSyncing}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Save / Push to Cloud</span>
              </button>
            </div>
          </div>

          {/* Connect Another Device (e.g. Mobile phone or Laptop) */}
          <form onSubmit={handlePull} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono uppercase font-semibold text-white">
                Pair with Another Device
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enter the Sync Code from your other device (mobile phone or computer) to import and synchronize:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. TRK-4X9K"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase tracking-wider focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!inputCode || isSyncing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
              >
                Sync Now
              </button>
            </div>
          </form>

          {/* Offline JSON Backup & Restore */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Offline file backup:
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => setShowJsonMode(!showJsonMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
              </button>
            </div>
          </div>

          {showJsonMode && (
            <form onSubmit={handleImportSubmit} className="space-y-2 pt-2">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste backup JSON content here..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-[11px] font-mono text-slate-200 focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!importJson.trim()}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Confirm JSON Restore
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

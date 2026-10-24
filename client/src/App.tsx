import { useState } from 'react';
import { api, AutoMateConfig, StoreConfig } from './api';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Store as StoreIcon,
  ShoppingBag,
  ExternalLink,
  Send,
  Terminal,
  ShieldCheck,
  Package,
  ShoppingCart,
  Copy,
  Check,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export default function App() {
  // Store Config
  const [platform, setPlatform] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isStoreTesting, setIsStoreTesting] = useState(false);
  const [storeStatus, setStoreStatus] = useState<{ connected: boolean; name?: string; error?: string } | null>(null);

  // AutoMate Config
  const [automateBaseUrl, setAutomateBaseUrl] = useState('');
  const [automateToken, setAutomateToken] = useState('');
  const [isAutomateTesting, setIsAutomateTesting] = useState(false);
  const [automateStatus, setAutomateStatus] = useState<{ connected: boolean; shop?: string; store?: string; error?: string } | null>(null);

  // Sync state
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Stateless AutoMate Bridge initialized. No database required.',
    },
  ]);

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const currentStoreConfig: StoreConfig = {
    platform,
    storeUrl,
    storeDomain: storeUrl,
    consumerKey,
    consumerSecret,
    accessToken: consumerKey,
  };

  const currentAutoMateConfig: AutoMateConfig = {
    baseUrl: automateBaseUrl,
    token: automateToken,
  };

  const handleTestStore = async () => {
    setIsStoreTesting(true);
    setStoreStatus(null);
    addLog('info', `Testing connection to ${platform === 'woocommerce' ? 'WooCommerce' : 'Shopify'} store...`);
    try {
      const res = await api.testStoreConnection(currentStoreConfig);
      setStoreStatus({ connected: true, name: res.storeName });
      addLog('success', `Store verified successfully: "${res.storeName}"`);
    } catch (err: any) {
      setStoreStatus({ connected: false, error: err.message });
      addLog('error', `Store connection failed: ${err.message}`);
    } finally {
      setIsStoreTesting(false);
    }
  };

  const handleTestAutoMate = async () => {
    setIsAutomateTesting(true);
    setAutomateStatus(null);
    addLog('info', `Testing connection to AutoMate (${automateBaseUrl})...`);
    try {
      const res = await api.testAutoMateConnection(currentAutoMateConfig);
      setAutomateStatus({ connected: true, shop: res.shop, store: res.store });
      addLog('success', `AutoMate verified! Shop: "${res.shop}", Connected Store: "${res.store}"`);
    } catch (err: any) {
      setAutomateStatus({ connected: false, error: err.message });
      addLog('error', `AutoMate verification failed: ${err.message}`);
    } finally {
      setIsAutomateTesting(false);
    }
  };

  const handleSyncProducts = async () => {
    setIsSyncingProducts(true);
    addLog('info', `Fetching products from ${platform} and streaming directly to AutoMate...`);
    try {
      const res = await api.syncProductsToAutoMate(currentStoreConfig, currentAutoMateConfig);
      addLog('success', `Batch product sync finished! Total fetched: ${res.totalFetched}, Synced to AutoMate: ${res.synced}, Failed: ${res.failed}`);
      if (res.items) {
        res.items.forEach((item: any) => {
          if (item.success) {
            const varCount = typeof item.variantsCount === 'number'
              ? item.variantsCount
              : (item.autoMate?.variants ?? 0);
            const varInfo = varCount > 0 ? ` (${varCount} variant${varCount > 1 ? 's' : ''})` : '';
            addLog('info', `-> Product synced: "${item.name}" (ID: ${item.id})${varInfo}`);
          } else {
            addLog('warning', `-> Product failed: "${item.name}" - ${item.error}`);
          }
        });
      }
    } catch (err: any) {
      addLog('error', `Product sync error: ${err.message}`);
    } finally {
      setIsSyncingProducts(false);
    }
  };

  const handleSyncOrders = async () => {
    setIsSyncingOrders(true);
    addLog('info', `Fetching confirmed orders from ${platform} and forwarding directly to AutoMate...`);
    try {
      const res = await api.syncOrdersToAutoMate(currentStoreConfig, currentAutoMateConfig);
      addLog('success', `Batch order sync finished! Total fetched: ${res.totalFetched}, Created in AutoMate: ${res.synced}, Failed: ${res.failed}`);
      if (res.items) {
        res.items.forEach((item: any) => {
          if (item.success) {
            const invoice = item.autoMate?.invoiceId ? `Invoice #${item.autoMate.invoiceId}` : 'Success';
            addLog('info', `-> Order #${item.order_id} created for ${item.name} (${invoice})`);
          } else {
            addLog('warning', `-> Order #${item.order_id} failed: ${item.error}`);
          }
        });
      }
    } catch (err: any) {
      addLog('error', `Order sync error: ${err.message}`);
    } finally {
      setIsSyncingOrders(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/bridge/webhook/order`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">AutoMate Store Bridge</span>
              <span className="text-xs text-emerald-400 font-semibold ml-2 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">
                Stateless / Zero-DB Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Direct In-Memory Streaming
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Architecture Notice */}
        <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Direct E-Commerce to AutoMate Pipeline
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                This plugin does not require or touch any database. When an order or product event occurs, it transforms the data in memory and streams it directly to your AutoMate shop.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs bg-slate-950/60 px-4 py-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">AutoMate Target:</span>
              <span className="font-mono text-indigo-400 truncate max-w-xs">{automateBaseUrl}</span>
            </div>
          </div>
        </div>

        {/* Configuration Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: E-Commerce Store */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {platform === 'woocommerce' ? <StoreIcon className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white">1. E-Commerce Store Source</h3>
                  <p className="text-xs text-slate-400">Configure your WooCommerce or Shopify store</p>
                </div>
              </div>

              {/* Platform Switcher */}
              <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setPlatform('woocommerce');
                    setStoreStatus(null);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    platform === 'woocommerce' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WooCommerce
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlatform('shopify');
                    setStoreStatus(null);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    platform === 'shopify' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Shopify
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {platform === 'woocommerce' ? 'Store URL' : 'Shopify Domain'}
                </label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  placeholder={platform === 'woocommerce' ? 'https://example-shop.com' : 'my-store.myshopify.com'}
                />
              </div>

              {platform === 'woocommerce' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      value={consumerKey}
                      onChange={(e) => setConsumerKey(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      value={consumerSecret}
                      onChange={(e) => setConsumerSecret(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Admin API Access Token
                  </label>
                  <input
                    type="password"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="shpat_..."
                  />
                </div>
              )}

              {/* Store Status Message */}
              {storeStatus && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${
                    storeStatus.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {storeStatus.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{storeStatus.connected ? `Connected: ${storeStatus.name}` : `Error: ${storeStatus.error}`}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestStore}
                disabled={isStoreTesting}
                className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStoreTesting ? 'animate-spin' : ''}`} />
                {isStoreTesting ? 'Testing Store Connection...' : 'Test Store Connection'}
              </button>
            </div>
          </div>

          {/* Step 2: AutoMate Destination */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">2. AutoMate Destination</h3>
                <p className="text-xs text-slate-400">Settings &gt; Website stores in your AutoMate dashboard</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  AutoMate Base URL
                </label>
                <input
                  type="text"
                  value={automateBaseUrl}
                  onChange={(e) => setAutomateBaseUrl(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="https://api.example.com/v1/store"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  AutoMate Token (43 characters)
                </label>
                <input
                  type="password"
                  value={automateToken}
                  onChange={(e) => setAutomateToken(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Zf3q..."
                />
              </div>

              {/* AutoMate Status Message */}
              {automateStatus && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${
                    automateStatus.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {automateStatus.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>
                    {automateStatus.connected
                      ? `Verified AutoMate Shop: "${automateStatus.shop}" (${automateStatus.store})`
                      : `Error: ${automateStatus.error}`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestAutoMate}
                disabled={isAutomateTesting}
                className="w-full py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAutomateTesting ? 'animate-spin' : ''}`} />
                {isAutomateTesting ? 'Verifying with AutoMate...' : 'Test AutoMate Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Controls & Webhook Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Action 1: Batch Product Sync */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm mb-2">
                <Package className="w-4 h-4" />
                Push Catalog to AutoMate
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fetches products and clothing variants from your store and syncs them into AutoMate with rate-limit pacing (2 requests/sec).
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncProducts}
              disabled={isSyncingProducts}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingProducts ? 'animate-spin' : ''}`} />
              {isSyncingProducts ? 'Streaming Products...' : 'Sync Products to AutoMate'}
            </button>
          </div>

          {/* Action 2: Batch Order Sync */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm mb-2">
                <ShoppingCart className="w-4 h-4" />
                Push Orders to AutoMate
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fetches recent confirmed orders from your store, normalizes customer phones, and creates Pending orders in AutoMate.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncOrders}
              disabled={isSyncingOrders}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Send className={`w-4 h-4 ${isSyncingOrders ? 'animate-spin' : ''}`} />
              {isSyncingOrders ? 'Forwarding Orders...' : 'Sync Orders to AutoMate'}
            </button>
          </div>

          {/* Action 3: Real-Time Webhook Endpoint */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 text-purple-400 font-bold text-sm mb-2">
                <ExternalLink className="w-4 h-4" />
                Real-Time Webhook Target
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste this into WooCommerce (Settings &gt; Advanced &gt; Webhooks &gt; Topic: Order created) for instant live order dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="truncate text-slate-300 flex-1">{webhookUrl}</span>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Stream Terminal Console */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Bridge Activity Console (Zero DB / In-Memory Stream)
              </span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear Console
            </button>
          </div>

          <div className="h-64 overflow-y-auto space-y-2 font-mono text-xs pr-2">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic py-8 text-center">No stream activity yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400 font-semibold'
                        : log.type === 'error'
                        ? 'text-rose-400 font-semibold'
                        : log.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

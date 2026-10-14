import { useState, useEffect } from 'react';
import { api, Store } from './api.ts';
import { ConnectStoreModal } from './components/ConnectStoreModal.tsx';
import { StoreDetail } from './components/StoreDetail.tsx';
import {
  ShoppingBag,
  Store as StoreIcon,
  Plus,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const res = await api.listStores();
      setStores(res.stores);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedStoreId(null)}>
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">E-Commerce Sync</span>
              <span className="text-xs text-slate-400 ml-2 border border-slate-700 rounded px-1.5 py-0.5">PostgreSQL Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" /> Connect Store
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedStoreId ? (
          <StoreDetail storeId={selectedStoreId} onBack={() => { setSelectedStoreId(null); loadStores(); }} />
        ) : (
          <div className="space-y-8">
            {/* Hero / Value Banner */}
            <div className="rounded-3xl p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
                  <Zap className="w-3.5 h-3.5" /> Two-Phase Sync Engine
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                  Unified Customer Data Pipeline
                </h1>
                <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
                  Seamlessly sync historical customers, orders, and products from <strong>Shopify</strong> and <strong>WooCommerce</strong> into your PostgreSQL database, and keep everything in real-time sync with automated webhooks.
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> HMAC-SHA256 Signed
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-400" /> Automatic Webhook Dispatch
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-purple-400" /> PostgreSQL Persistence
                  </div>
                </div>
              </div>
            </div>

            {/* Stores List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Connected Stores ({stores.length})</h2>
                <button
                  onClick={loadStores}
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoading && stores.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading connected stores...
                </div>
              ) : stores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">No stores connected yet</h3>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
                    Connect your first Shopify or WooCommerce store to start synchronizing customer records into PostgreSQL.
                  </p>
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20"
                  >
                    <Plus className="w-4 h-4" /> Connect Your First Store
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stores.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStoreId(s.id)}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/40 hover:border-slate-700 p-6 transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`p-2.5 rounded-xl ${
                              s.platform === 'shopify'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-purple-500/10 text-purple-400'
                            }`}
                          >
                            {s.platform === 'shopify' ? (
                              <ShoppingBag className="w-6 h-6" />
                            ) : (
                              <StoreIcon className="w-6 h-6" />
                            )}
                          </div>
                          <span
                            className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${
                              s.platform === 'shopify'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {s.platform}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition">
                          {s.storeName || s.storeDomain}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{s.storeDomain}</p>

                        <div className="grid grid-cols-3 gap-2 mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                          <div>
                            <div className="text-lg font-bold text-white">{s._count?.customers || 0}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">Customers</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">{s._count?.orders || 0}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">Orders</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">{s._count?.products || 0}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">Products</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {s.lastSyncedAt ? `Synced ${new Date(s.lastSyncedAt).toLocaleDateString()}` : 'Not synced yet'}
                        </span>
                        <span className="flex items-center font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                          Open <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <ConnectStoreModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={() => loadStores()}
      />
    </div>
  );
}

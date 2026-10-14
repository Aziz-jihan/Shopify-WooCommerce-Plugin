import React, { useState, useEffect } from 'react';
import { api, Store } from '../api.ts';
import { CustomersTable } from './CustomersTable.tsx';
import { OrdersTable } from './OrdersTable.tsx';
import { ProductsTable } from './ProductsTable.tsx';
import { WebhookLogs } from './WebhookLogs.tsx';
import {
  ShoppingBag,
  Store as StoreIcon,
  RefreshCw,
  Users,
  ShoppingCart,
  Package,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface Props {
  storeId: string;
  onBack: () => void;
}

export const StoreDetail: React.FC<Props> = ({ storeId, onBack }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<'customers' | 'orders' | 'products' | 'webhooks'>('customers');
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchStore = async () => {
    try {
      const res = await api.getStore(storeId);
      setStore(res.store);
      if (res.store.syncStatus === 'in_progress') {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStore();
    const interval = setInterval(fetchStore, 4000);
    return () => clearInterval(interval);
  }, [storeId]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await api.triggerSync(storeId);
      await fetchStore();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger sync');
      setIsSyncing(false);
    }
  };

  if (!store) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading store details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Store Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Stores
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
          <div className="flex items-center gap-4">
            <div
              className={`p-3.5 rounded-xl ${
                store.platform === 'shopify'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}
            >
              {store.platform === 'shopify' ? (
                <ShoppingBag className="w-7 h-7" />
              ) : (
                <StoreIcon className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white">{store.storeName || store.storeDomain}</h1>
                <span
                  className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${
                    store.platform === 'shopify'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {store.platform}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{store.storeDomain}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync Status Badge */}
            <div className="text-right">
              <div className="text-xs text-slate-400">Sync Status</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {store.syncStatus === 'completed' && (
                  <span className="flex items-center text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Synced
                  </span>
                )}
                {store.syncStatus === 'in_progress' && (
                  <span className="flex items-center text-xs font-medium text-amber-400">
                    <Clock className="w-3.5 h-3.5 mr-1 animate-spin" /> Syncing...
                  </span>
                )}
                {store.syncStatus === 'failed' && (
                  <span className="flex items-center text-xs font-medium text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Sync Failed
                  </span>
                )}
                {store.syncStatus === 'idle' && (
                  <span className="flex items-center text-xs font-medium text-slate-400">
                    Not Synced Yet
                  </span>
                )}
              </div>
            </div>

            {/* Run Sync Button */}
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Run Historical Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'customers'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Customers
          {store._count?.customers !== undefined && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">
              {store._count.customers}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'orders'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Orders
          {store._count?.orders !== undefined && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">
              {store._count.orders}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'products'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Products
          {store._count?.products !== undefined && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">
              {store._count.products}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'webhooks'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          Real-time Webhook Logs
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === 'customers' && <CustomersTable storeId={store.id} />}
        {activeTab === 'orders' && <OrdersTable storeId={store.id} />}
        {activeTab === 'products' && <ProductsTable storeId={store.id} />}
        {activeTab === 'webhooks' && <WebhookLogs storeId={store.id} />}
      </div>
    </div>
  );
};

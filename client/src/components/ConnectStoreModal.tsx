import React, { useState } from 'react';
import { api } from '../api.ts';
import { X, CheckCircle2, AlertCircle, ShoppingBag, Store as StoreIcon, HelpCircle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConnectStoreModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [platform, setPlatform] = useState<'shopify' | 'woocommerce'>('shopify');
  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await api.connectStore({
        platform,
        storeDomain,
        accessToken: platform === 'shopify' ? accessToken : undefined,
        apiKey: platform === 'woocommerce' ? apiKey : undefined,
        apiSecret: platform === 'woocommerce' ? apiSecret : undefined,
      });

      setSuccessInfo(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to connect store');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Connect Store</h2>
        <p className="text-sm text-slate-400 mb-6">
          Link your store to import historical customer data and activate real-time webhooks.
        </p>

        {/* Platform Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => { setPlatform('shopify'); setError(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
              platform === 'shopify'
                ? 'border-emerald-500 bg-emerald-500/10 text-white'
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-white">Shopify</div>
              <div className="text-xs text-slate-400">Admin GraphQL API</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setPlatform('woocommerce'); setError(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
              platform === 'woocommerce'
                ? 'border-purple-500 bg-purple-500/10 text-white'
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <StoreIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-white">WooCommerce</div>
              <div className="text-xs text-slate-400">REST API v3</div>
            </div>
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {platform === 'shopify' ? 'Shopify Domain' : 'Store Website URL'}
            </label>
            <input
              type="text"
              required
              placeholder={platform === 'shopify' ? 'my-store.myshopify.com' : 'https://example-store.com'}
              value={storeDomain}
              onChange={(e) => setStoreDomain(e.target.value)}
              className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          {platform === 'shopify' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Admin API Access Token
                </label>
                <div className="group relative">
                  <span className="flex items-center text-xs text-slate-400 cursor-pointer hover:text-slate-200">
                    <HelpCircle className="w-3.5 h-3.5 mr-1" /> Where to find?
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 hidden w-64 rounded-lg bg-slate-800 p-3 text-xs text-slate-300 shadow-xl border border-slate-700 group-hover:block z-10">
                    In Shopify Admin: Settings &gt; Apps &gt; Develop apps &gt; Create app &gt; Configure scopes (<code className="text-emerald-400">read_customers, read_orders, read_products</code>) &gt; Install app &gt; Reveal token.
                  </div>
                </div>
              </div>
              <input
                type="password"
                required
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-sm font-mono"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Consumer Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-sm font-mono"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Consumer Secret
                  </label>
                  <div className="group relative">
                    <span className="flex items-center text-xs text-slate-400 cursor-pointer hover:text-slate-200">
                      <HelpCircle className="w-3.5 h-3.5 mr-1" /> Where to find?
                    </span>
                    <div className="absolute right-0 bottom-full mb-2 hidden w-64 rounded-lg bg-slate-800 p-3 text-xs text-slate-300 shadow-xl border border-slate-700 group-hover:block z-10">
                      In WP Admin: WooCommerce &gt; Settings &gt; Advanced &gt; REST API &gt; Add Key with Read/Write permissions.
                    </div>
                  </div>
                </div>
                <input
                  type="password"
                  required
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-sm font-mono"
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition ${
                platform === 'shopify'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-purple-600 hover:bg-purple-500'
              } disabled:opacity-50`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Verifying & Connecting...' : 'Connect & Register Webhooks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

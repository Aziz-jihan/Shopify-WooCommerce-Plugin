import React, { useState, useEffect } from 'react';
import { api, Order } from '../api.ts';
import { ShoppingCart, RefreshCw, Package } from 'lucide-react';

interface Props {
  storeId: string;
}

export const OrdersTable: React.FC<Props> = ({ storeId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getStoreOrders(storeId);
      setOrders(res.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Total Orders: <strong className="text-white">{orders.length}</strong></span>
        <button
          onClick={loadOrders}
          disabled={isLoading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Order #</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Financial Status</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-mono font-medium text-white">
                    {o.orderNumber || o.platformOrderId}
                  </td>
                  <td className="px-6 py-4">
                    {o.customer ? (
                      <div>
                        <div className="font-medium text-white">{o.customer.firstName} {o.customer.lastName}</div>
                        <div className="text-xs text-slate-400">{o.customer.email}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Guest Checkout</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {o.financialStatus || 'Completed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {Array.isArray(o.lineItems) ? o.lineItems.length : 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    ${Number(o.totalPrice).toFixed(2)} {o.currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

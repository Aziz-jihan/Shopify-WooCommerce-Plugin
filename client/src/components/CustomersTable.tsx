import React, { useState, useEffect } from 'react';
import { api, Customer } from '../api.ts';
import { Search, Users, RefreshCw, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';

interface Props {
  storeId: string;
}

export const CustomersTable: React.FC<Props> = ({ storeId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getStoreCustomers(storeId, page, search);
      setCustomers(res.customers);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [storeId, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Total: <strong className="text-white">{total}</strong></span>
          <button
            onClick={loadCustomers}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4">Total Spent</th>
              <th className="px-6 py-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading customers...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No customer records found. Run initial sync to fetch historical customers.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {c.firstName || c.lastName ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Guest Customer'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {c.platformCustomerId}</div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    {c.email && (
                      <div className="flex items-center text-xs text-slate-300">
                        <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        {c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center text-xs text-slate-400">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                      <ShoppingBag className="w-3 h-3 text-indigo-400" />
                      {c.ordersCount} orders
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-emerald-400">
                    ${Number(c.totalSpent).toFixed(2)} {c.currency}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {c.platformCreatedAt ? new Date(c.platformCreatedAt).toLocaleDateString() : new Date(c.createdAt).toLocaleDateString()}
                    </div>
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

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Store,
  Package,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../../shared/calculations.js';

export default function DashboardPage({ onNavigate, onSelectInvoice }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'this-month', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      let fDate = '';
      let tDate = '';

      if (dateFilter === 'this-month') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        fDate = `${year}-${month}-01`;
        // Last day of month
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        tDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      } else if (dateFilter === 'custom') {
        fDate = fromDate;
        tDate = toDate;
      }

      if (window.electronAPI) {
        const res = await window.electronAPI.getDashboardMetrics({ fromDate: fDate, toDate: tDate });
        setMetrics(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, fromDate, toDate]);

  if (loading && !metrics) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        <span>Loading dashboard data...</span>
      </div>
    );
  }

  const hasData = metrics && (metrics.totalInvoices > 0 || metrics.activeProducts > 0);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Controls & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-semibold text-slate-800">Period Filter:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'all' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('this-month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'this-month' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'custom' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Dates
            </button>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}

        <button
          onClick={loadData}
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors self-end sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Welcome to Billing-Soft</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            No sales or invoices recorded yet. Start by setting up your products and retailers, or load sample FMCG demonstration data in Settings to explore features.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => onNavigate('new-invoice')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Invoice</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Load Demo Data
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Sales */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>NET REVENUE</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-numbers tracking-tight">
                {formatINR(metrics?.netSales || 0)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Gross: {formatINR(metrics?.grossSales || 0)}</span>
                {metrics?.returnsAmount > 0 && (
                  <span className="text-rose-600 font-medium">Ret: -{formatINR(metrics.returnsAmount)}</span>
                )}
              </div>
            </div>

            {/* Invoices Count */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>INVOICES ISSUED</span>
                <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-numbers tracking-tight">
                {metrics?.totalInvoices || 0}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Taxable: {formatINR(metrics?.taxableSales || 0)}
              </p>
            </div>

            {/* Total GST Collected */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>GST COLLECTED</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-numbers tracking-tight">
                {formatINR(metrics?.totalTax || 0)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex gap-2">
                <span>CGST: {formatINR(metrics?.totalCgst || 0)}</span>
                <span>SGST: {formatINR(metrics?.totalSgst || 0)}</span>
              </div>
            </div>

            {/* Master Counts */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>MASTER DIRECTORY</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <span className="text-xl font-bold text-slate-900 font-mono-numbers">
                    {metrics?.activeRetailers || 0}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Retailers</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 font-mono-numbers">
                    {metrics?.activeProducts || 0}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Products</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs font-medium text-brand-600">
                <button onClick={() => onNavigate('retailers')} className="hover:underline">
                  View Retailers
                </button>
                <button onClick={() => onNavigate('products')} className="hover:underline">
                  View Products
                </button>
              </div>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recent Invoices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Most recent sales transactions recorded</p>
              </div>
              <button
                onClick={() => onNavigate('invoices')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
              >
                <span>All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!metrics?.recentInvoices || metrics.recentInvoices.length === 0) ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No recent invoices recorded for this period.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatIndianDate(inv.invoice_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {inv.retailer_name || 'Cash Customer'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono-numbers">
                        {formatINR(inv.grand_total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            inv.status === 'finalized'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 transition-colors"
                        >
                          View Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

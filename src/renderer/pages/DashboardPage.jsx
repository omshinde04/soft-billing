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
  RefreshCw,
  RotateCcw,
  Eye
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../../shared/calculations.js';

export default function DashboardPage({ onNavigate, onSelectInvoice, onSelectReturn }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'this-month', 'last-month', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const applyPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this-month') {
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
      setFromDate(startStr);
      setToDate(endStr);
    } else if (preset === 'last-month') {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const startStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const endStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(new Date(prevYear, prevMonth + 1, 0).getDate()).padStart(2, '0')}`;
      setFromDate(startStr);
      setToDate(endStr);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getDashboardMetrics({ fromDate, toDate });
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
  }, [fromDate, toDate]);

  if (loading && !metrics) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        <span>Loading dashboard figures...</span>
      </div>
    );
  }

  const hasData = metrics && (metrics.totalInvoices > 0 || metrics.activeProducts > 0 || metrics.totalReturns > 0);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-bold text-slate-700 mr-1">Period:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => applyPreset('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'all' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => applyPreset('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'today' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyPreset('this-month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'this-month' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset('last-month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'last-month' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'custom' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Dates
            </button>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
            />
          </div>
        )}

        <button
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors self-end lg:self-auto"
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
            No sales or invoices recorded yet. Start by creating bills or load sample FMCG demonstration data in Settings to explore all features.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Net Revenue */}
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
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                <div>Gross: <span className="font-semibold text-slate-700">{formatINR(metrics?.grossSales || 0)}</span></div>
                {metrics?.returnsAmount > 0 && (
                  <div className="text-rose-600 font-semibold">Returns: -{formatINR(metrics.returnsAmount)}</div>
                )}
              </div>
            </div>

            {/* 2. Invoices Issued */}
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
                Taxable: <span className="font-semibold text-slate-700">{formatINR(metrics?.taxableSales || 0)}</span>
              </p>
            </div>

            {/* 3. Sales Returns / Credit Notes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>SALES RETURNS</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-rose-700 mt-2 font-mono-numbers tracking-tight">
                {metrics?.returnsAmount > 0 ? `-${formatINR(metrics.returnsAmount)}` : '₹0.00'}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{metrics?.totalReturns || 0} Credit Notes</span>
                <button
                  onClick={() => onNavigate('returns')}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  View Returns
                </button>
              </div>
            </div>

            {/* 4. GST Collected */}
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

            {/* 5. Master Directory */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>DIRECTORY</span>
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
                  Retailers
                </button>
                <button onClick={() => onNavigate('products')} className="hover:underline">
                  Products
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

          {/* Recent Sales Returns Section */}
          {metrics?.recentReturns && metrics.recentReturns.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/30">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <h3 className="text-sm font-bold text-slate-800">Recent Sales Returns / Credit Notes</h3>
                </div>
                <button
                  onClick={() => onNavigate('returns')}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <span>All Returns</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Return Doc #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Original Invoice</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Refund Total</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                        {ret.return_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatIndianDate(ret.return_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-brand-700 font-mono-numbers">
                        {ret.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {ret.retailer_name || 'Cash Customer'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                        {ret.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700 font-mono-numbers">
                        {formatINR(ret.total_refund_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectReturn && onSelectReturn(ret.id)}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 font-semibold text-rose-700 transition-colors border border-rose-200"
                        >
                          View Credit Note
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  RefreshCw,
  Plus,
  MessageCircle
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../../shared/calculations.js';
import { generateInvoiceWhatsAppText, openWhatsAppShare } from '../../shared/whatsapp.js';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function InvoicesPage({ businessSettings, onSelectInvoice, onNavigate, onShowToast }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedInvoiceToCancel, setSelectedInvoiceToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

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
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getInvoices({
          search,
          status,
          fromDate,
          toDate
        });
        setInvoices(res);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      onShowToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, status, fromDate, toDate]);

  const handleOpenCancel = (inv) => {
    setSelectedInvoiceToCancel(inv);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedInvoiceToCancel) return;
    try {
      await window.electronAPI.cancelInvoice(selectedInvoiceToCancel.id, cancelReason || 'Mistake in billing');
      onShowToast(`Invoice ${selectedInvoiceToCancel.invoice_number} cancelled`, 'success');
      setCancelModalOpen(false);
      loadInvoices();
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      onShowToast(err.message || 'Failed to cancel invoice', 'error');
    }
  };

  const handleWhatsApp = async (inv) => {
    try {
      if (window.electronAPI) {
        const fullInv = await window.electronAPI.getInvoiceById(inv.id);
        const text = generateInvoiceWhatsAppText(fullInv, businessSettings || fullInv.seller);
        const phone = fullInv.retailer?.whatsapp_number || fullInv.retailer?.phone || fullInv.retailer_phone || '';
        openWhatsAppShare(phone, text);
      }
    } catch (err) {
      console.error('WhatsApp error:', err);
      onShowToast('Could not open WhatsApp', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Invoice #, Retailer, City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Quick Presets */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'all' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => applyPreset('this-month')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'this-month' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                datePreset === 'custom' ? 'bg-white shadow-sm text-brand-700 font-bold' : 'text-slate-600'
              }`}
            >
              Custom
            </button>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1.5 rounded-lg bg-slate-50 text-slate-600 font-mono-numbers text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={() => onNavigate('new-invoice')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-all shadow-brand-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading invoice records...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || status || fromDate
                ? 'Try adjusting your search or period filters.'
                : 'Click "Create Invoice" to issue your first bill.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Retailer</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">GST (₹)</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const totalGst = inv.total_cgst + inv.total_sgst + inv.total_igst;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatIndianDate(inv.invoice_date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{inv.retailer_name || 'Cash Customer'}</div>
                      {inv.retailer_city && (
                        <div className="text-[10px] text-slate-400">{inv.retailer_city}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                      {formatINR(inv.subtotal_taxable, false)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                      {formatINR(totalGst, false)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono-numbers">
                      {formatINR(inv.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleWhatsApp(inv)}
                          className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Send Bill via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-brand-600 transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {inv.status === 'finalized' && (
                          <button
                            onClick={() => handleOpenCancel(inv)}
                            className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Cancel Invoice (Audit preserved)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoice Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900">
              Cancel Invoice {selectedInvoiceToCancel?.invoice_number}?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              This invoice will be marked as cancelled in your GST documents summary and sales registers. The audit trail will be preserved.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation:
              </label>
              <input
                type="text"
                placeholder="e.g. Wrong items billed, Order rejected"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 text-xs">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

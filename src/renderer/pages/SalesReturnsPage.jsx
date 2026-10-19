import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Plus, Calendar, AlertCircle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { formatINR, formatIndianDate, roundTo } from '../../shared/calculations.js';

export default function SalesReturnsPage({ onShowToast }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [finalizedInvoices, setFinalizedInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [returnableItems, setReturnableItems] = useState([]);
  const [returnQtys, setReturnQtys] = useState({});
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Damaged goods / Expiry near');
  const [submitting, setSubmitting] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getSalesReturns({ fromDate, toDate });
        setReturns(res);
      }
    } catch (err) {
      console.error('Failed to load returns:', err);
      onShowToast('Failed to load sales returns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [fromDate, toDate]);

  const handleOpenCreateModal = async () => {
    try {
      if (window.electronAPI) {
        const invs = await window.electronAPI.getInvoices({ status: 'finalized' });
        setFinalizedInvoices(invs);
        setSelectedInvoiceId('');
        setReturnableItems([]);
        setReturnQtys({});
        setModalOpen(true);
      }
    } catch (err) {
      onShowToast('Failed to load finalized invoices', 'error');
    }
  };

  const handleInvoiceSelect = async (invId) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setReturnableItems([]);
      setReturnQtys({});
      return;
    }

    try {
      if (window.electronAPI) {
        const items = await window.electronAPI.getInvoiceReturnableItems(invId);
        setReturnableItems(items);
        const initialQtys = {};
        items.forEach((item) => {
          initialQtys[item.id] = 0;
        });
        setReturnQtys(initialQtys);
      }
    } catch (err) {
      onShowToast('Failed to load invoice items', 'error');
    }
  };

  const handleQtyChange = (itemId, val, maxQty) => {
    const num = Math.min(Math.max(0, Number(val) || 0), maxQty);
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: num
    }));
  };

  // Live refund calculations for selected return quantities
  let totalRefundTaxable = 0;
  let totalRefundTax = 0;
  let totalRefundAmount = 0;

  for (const item of returnableItems) {
    const retQty = returnQtys[item.id] || 0;
    if (retQty > 0 && item.quantity > 0) {
      const ratio = retQty / item.quantity;
      const refTaxable = roundTo(item.taxable_amount * ratio, 2);
      const refTax = roundTo((item.cgst_amount + item.sgst_amount + item.igst_amount) * ratio, 2);
      const refTotal = roundTo(refTaxable + refTax, 2);

      totalRefundTaxable = roundTo(totalRefundTaxable + refTaxable, 2);
      totalRefundTax = roundTo(totalRefundTax + refTax, 2);
      totalRefundAmount = roundTo(totalRefundAmount + refTotal, 2);
    }
  }

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      onShowToast('Please select an invoice', 'error');
      return;
    }

    const itemsToReturn = Object.entries(returnQtys)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({
        invoice_item_id: Number(itemId),
        return_qty: Number(qty)
      }));

    if (itemsToReturn.length === 0) {
      onShowToast('Please specify return quantity for at least one item', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await window.electronAPI.createSalesReturn({
        invoice_id: Number(selectedInvoiceId),
        return_date: returnDate,
        reason: reason,
        items: itemsToReturn
      });

      onShowToast(`Sales Return ${result.return_number} recorded successfully!`, 'success');
      setModalOpen(false);
      loadReturns();
    } catch (err) {
      console.error('Failed to create sales return:', err);
      onShowToast(err.message || 'Failed to create sales return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Dates:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Sales Return</span>
        </button>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading sales returns...</span>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No sales returns recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Sales returns reduce taxable revenue and adjust GST reporting without altering original invoices.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Return Doc #</th>
                <th className="py-3 px-4">Return Date</th>
                <th className="py-3 px-4">Original Invoice</th>
                <th className="py-3 px-4">Retailer</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Refund Taxable</th>
                <th className="py-3 px-4 text-right">Refund Tax</th>
                <th className="py-3 px-4 text-right">Refund Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                    {r.return_number}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatIndianDate(r.return_date)}
                  </td>
                  <td className="py-3 px-4 font-mono-numbers font-semibold text-brand-700">
                    {r.invoice_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {r.retailer_name || 'Cash Customer'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    {r.reason || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                    {formatINR(r.total_refund_taxable)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                    {formatINR(r.total_refund_tax)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 font-mono-numbers">
                    {formatINR(r.total_refund_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Return Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Sales Return</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Finalized Invoice <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white font-medium"
                    required
                  >
                    <option value="">-- Choose Invoice --</option>
                    {finalizedInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} • {formatIndianDate(inv.invoice_date)} • {inv.retailer_name} (₹{inv.grand_total})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Broken packages, leakage, near expiry"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Items Table for Return */}
              {returnableItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700">
                    Select Items to Return
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-right">Billed Qty</th>
                        <th className="py-2 px-3 text-right">Remaining</th>
                        <th className="py-2 px-3 text-right w-28">Return Qty</th>
                        <th className="py-2 px-3 text-right">Refund (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnableItems.map((item) => {
                        const curRetQty = returnQtys[item.id] || 0;
                        const ratio = item.quantity > 0 ? curRetQty / item.quantity : 0;
                        const lineRefund = roundTo(item.total_amount * ratio, 2);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {item.item_name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers text-slate-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers font-semibold text-emerald-700">
                              {item.remaining_qty} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={item.remaining_qty}
                                disabled={item.remaining_qty === 0}
                                value={curRetQty || ''}
                                onChange={(e) => handleQtyChange(item.id, e.target.value, item.remaining_qty)}
                                placeholder="0"
                                className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono-numbers font-bold text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                              {formatINR(lineRefund)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total Summary */}
              {totalRefundAmount > 0 && (
                <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-200 text-xs font-mono-numbers space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>Refund Taxable Value:</span>
                    <span>{formatINR(totalRefundTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Refund Tax Amount:</span>
                    <span>{formatINR(totalRefundTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-rose-700 pt-1 border-t border-rose-200">
                    <span>Total Refund Credit:</span>
                    <span>{formatINR(totalRefundAmount)}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || totalRefundAmount === 0}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

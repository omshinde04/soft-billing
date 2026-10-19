import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Store,
  Calendar,
  CheckCircle2,
  Save,
  Search,
  Calculator,
  Percent,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { calculateInvoiceTotals, formatINR } from '../../shared/calculations.js';
import { INDIAN_STATES, UNITS } from '../../shared/constants.js';

export default function NewInvoicePage({ businessSettings, onInvoiceCreated, onShowToast }) {
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [pricingMode, setPricingMode] = useState(businessSettings?.default_pricing_mode || 'exclusive');
  const [placeOfSupply, setPlaceOfSupply] = useState('27-Maharashtra');
  const [notes, setNotes] = useState(businessSettings?.invoice_footer_notes || '');
  const [saving, setSaving] = useState(false);

  // Line Items State
  const [items, setItems] = useState([
    {
      id: 1,
      product_id: null,
      name: '',
      brand: '',
      hsn_code: '',
      unit: 'PCS',
      pack_size: 1,
      mrp: 0,
      quantity: 1,
      rate: 0,
      discount: 0,
      taxRate: 5
    }
  ]);

  // Load Retailers and Products
  useEffect(() => {
    async function loadMasters() {
      setLoading(true);
      try {
        if (window.electronAPI) {
          const [rets, prods] = await Promise.all([
            window.electronAPI.getRetailers({ activeOnly: true }),
            window.electronAPI.getProducts({ activeOnly: true })
          ]);
          setRetailers(rets);
          setProducts(prods);

          if (rets.length > 0 && !selectedRetailerId) {
            handleRetailerChange(rets[0].id, rets);
          }
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, []);

  const handleRetailerChange = (id, retList = retailers) => {
    setSelectedRetailerId(id);
    const ret = retList.find((r) => String(r.id) === String(id));
    if (ret) {
      setSelectedRetailer(ret);
      const stateObj = INDIAN_STATES.find((s) => s.code === ret.state_code);
      setPlaceOfSupply(stateObj ? stateObj.label : '27-Maharashtra');
    } else {
      setSelectedRetailer(null);
    }
  };

  const handleProductSelect = (rowId, productId) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          return {
            ...item,
            product_id: prod.id,
            name: prod.name,
            brand: prod.brand || '',
            hsn_code: prod.hsn_code || '',
            unit: prod.unit || 'PCS',
            pack_size: prod.pack_size || 1,
            mrp: prod.mrp || 0,
            rate: prod.selling_rate || 0,
            taxRate: prod.tax_rate !== undefined ? prod.tax_rate : 5,
            quantity: item.quantity > 0 ? item.quantity : prod.pack_size || 1
          };
        }
        return item;
      })
    );
  };

  const handleItemChange = (rowId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          return {
            ...item,
            [field]: value
          };
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    setItems((prev) => [
      ...prev,
      {
        id: nextId,
        product_id: null,
        name: '',
        brand: '',
        hsn_code: '',
        unit: 'PCS',
        pack_size: 1,
        mrp: 0,
        quantity: 1,
        rate: 0,
        discount: 0,
        taxRate: 5
      }
    ]);
  };

  const handleRemoveItem = (rowId) => {
    if (items.length === 1) {
      onShowToast('Invoice must contain at least one line item', 'error');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== rowId));
  };

  // Check whether inter-state IGST applies
  const sellerStateCode = businessSettings?.state_code || '27';
  const supplierStateCode = placeOfSupply.split('-')[0] || '27';
  const isInterState = sellerStateCode !== supplierStateCode;

  // Real-time invoice totals calculation
  const invoiceTotals = calculateInvoiceTotals(items, pricingMode, isInterState);

  const handleSaveInvoice = async (status = 'finalized') => {
    if (!selectedRetailer) {
      onShowToast('Please select a retailer', 'error');
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      onShowToast('Please enter at least one valid item with a quantity', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        retailer_id: selectedRetailer.id,
        invoice_date: invoiceDate,
        due_date: dueDate,
        pricing_mode: pricingMode,
        place_of_supply: placeOfSupply,
        is_inter_state: isInterState ? 1 : 0,
        subtotal_taxable: invoiceTotals.subtotalTaxable,
        total_cgst: invoiceTotals.totalCgst,
        total_sgst: invoiceTotals.totalSgst,
        total_igst: invoiceTotals.totalIgst,
        round_off: invoiceTotals.roundOff,
        grand_total: invoiceTotals.grandTotal,
        status: status,
        notes: notes,
        items: invoiceTotals.items.map((it) => ({
          product_id: it.product_id,
          name: it.name,
          hsn_code: it.hsn_code,
          unit: it.unit,
          quantity: it.quantity,
          mrp: it.mrp,
          rate: it.rate,
          gross_rate: it.grossRate,
          discount_amount: it.discountAmount,
          taxable_amount: it.taxableAmount,
          tax_rate: it.taxRate,
          cgst_amount: it.cgstAmount,
          sgst_amount: it.sgstAmount,
          igst_amount: it.igstAmount,
          total_amount: it.totalAmount
        }))
      };

      const savedInvoice = await window.electronAPI.createInvoice(payload);
      onShowToast(`Invoice ${savedInvoice.invoice_number} created successfully!`, 'success');
      onInvoiceCreated(savedInvoice);
    } catch (err) {
      console.error('Invoice creation failed:', err);
      onShowToast(err.message || 'Failed to create invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">New Sales Tax Invoice</h3>
            <p className="text-xs text-slate-500">Create an invoice for FMCG distribution</p>
          </div>
        </div>

        {/* Pricing Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <span className="font-semibold text-slate-600 px-2">Pricing Mode:</span>
          <button
            type="button"
            onClick={() => setPricingMode('exclusive')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              pricingMode === 'exclusive'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tax Exclusive
          </button>
          <button
            type="button"
            onClick={() => setPricingMode('inclusive')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              pricingMode === 'inclusive'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tax Inclusive
          </button>
        </div>
      </div>

      {/* Retailer & Invoice Meta Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs">
        {/* Retailer Selection */}
        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">
            Retailer / Customer <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedRetailerId}
            onChange={(e) => handleRetailerChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white font-medium"
          >
            <option value="">-- Select Retailer --</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.shop_name} {r.city ? `(${r.city})` : ''} {r.gstin ? '• GST' : ''}
              </option>
            ))}
          </select>
          {selectedRetailer && (
            <div className="mt-2 text-slate-500 space-y-0.5 text-[11px]">
              <p className="font-medium text-slate-800">{selectedRetailer.shop_name}</p>
              {selectedRetailer.address && <p>{selectedRetailer.address}, {selectedRetailer.city}</p>}
              {selectedRetailer.gstin ? (
                <p className="text-emerald-700 font-semibold">GSTIN: {selectedRetailer.gstin}</p>
              ) : (
                <p className="italic text-slate-400">Unregistered Consumer (B2C)</p>
              )}
            </div>
          )}
        </div>

        {/* Invoice Date */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Bill Items ({items.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            {pricingMode === 'inclusive' ? 'Rates entered include GST' : 'Rates entered exclude GST'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                <th className="py-2.5 px-3 w-24">HSN</th>
                <th className="py-2.5 px-3 w-20">Unit</th>
                <th className="py-2.5 px-3 w-20 text-right">MRP</th>
                <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                <th className="py-2.5 px-3 w-24 text-right">
                  {pricingMode === 'inclusive' ? 'Gross Rate' : 'Rate'}
                </th>
                <th className="py-2.5 px-3 w-20 text-right">Disc (₹)</th>
                <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                <th className="py-2.5 px-3 w-28 text-right">Taxable</th>
                <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                <th className="py-2.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoiceTotals.items.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-slate-400 font-medium">{idx + 1}</td>
                  
                  {/* Item Selector or Custom Input */}
                  <td className="py-2 px-3">
                    <select
                      value={row.product_id || ''}
                      onChange={(e) => handleProductSelect(row.id, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.brand ? `[${p.brand}]` : ''} - ₹{p.selling_rate}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="HSN"
                      value={row.hsn_code || ''}
                      onChange={(e) => handleItemChange(row.id, 'hsn_code', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
                    />
                  </td>

                  <td className="py-2 px-3">
                    <select
                      value={row.unit || 'PCS'}
                      onChange={(e) => handleItemChange(row.id, 'unit', e.target.value)}
                      className="w-full px-1.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    >
                      {UNITS.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.code}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.mrp || ''}
                      onChange={(e) => handleItemChange(row.id, 'mrp', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-right font-mono-numbers focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>

                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={row.quantity || ''}
                      onChange={(e) => handleItemChange(row.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-right font-bold font-mono-numbers focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>

                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={row.rate || ''}
                      onChange={(e) => handleItemChange(row.id, 'rate', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-right font-bold font-mono-numbers focus:outline-none focus:ring-1 focus:ring-brand-500 text-brand-700"
                    />
                  </td>

                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={row.discount || ''}
                      onChange={(e) => handleItemChange(row.id, 'discount', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-right font-mono-numbers focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>

                  <td className="py-2 px-3 text-center">
                    <select
                      value={row.taxRate !== undefined ? row.taxRate : 5}
                      onChange={(e) => handleItemChange(row.id, 'taxRate', Number(e.target.value))}
                      className="px-1.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white font-mono-numbers"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>

                  <td className="py-2 px-3 text-right font-mono-numbers text-slate-700 font-medium">
                    {formatINR(row.taxableAmount)}
                  </td>

                  <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                    {formatINR(row.totalAmount)}
                  </td>

                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-brand-600" />
            <span>Add Item Row</span>
          </button>

          <span className="text-xs text-slate-500">
            Total Items: <strong className="text-slate-800">{invoiceTotals.itemCount}</strong> | Total Quantity: <strong className="text-slate-800">{invoiceTotals.totalQuantity}</strong>
          </span>
        </div>
      </div>

      {/* Bottom Summary & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Notes & Terms */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs space-y-3">
          <label className="block font-semibold text-slate-700">Invoice Terms & Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment instructions, credit terms, or return policies"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
          ></textarea>
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed">
            <span className="font-semibold text-slate-700">Amount in Words: </span>
            <span className="italic">{invoiceTotals.amountInWords}</span>
          </div>
        </div>

        {/* Right: Calculations Breakdown Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs font-mono-numbers space-y-2.5">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal (Taxable Value):</span>
            <span className="font-semibold">{formatINR(invoiceTotals.subtotalTaxable)}</span>
          </div>

          {isInterState ? (
            <div className="flex justify-between text-slate-600">
              <span>Integrated Tax (IGST):</span>
              <span className="font-semibold">{formatINR(invoiceTotals.totalIgst)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Central Tax (CGST):</span>
                <span className="font-semibold">{formatINR(invoiceTotals.totalCgst)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State Tax (SGST):</span>
                <span className="font-semibold">{formatINR(invoiceTotals.totalSgst)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Total GST Amount:</span>
            <span>{formatINR(invoiceTotals.totalTax)}</span>
          </div>

          {invoiceTotals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Round Off:</span>
              <span>{invoiceTotals.roundOff > 0 ? `+${invoiceTotals.roundOff}` : invoiceTotals.roundOff}</span>
            </div>
          )}

          <div className="pt-3 border-t-2 border-slate-800 flex justify-between items-center text-slate-900">
            <span className="text-sm font-bold">Grand Total Payable:</span>
            <span className="text-xl font-extrabold text-brand-700">
              {formatINR(invoiceTotals.grandTotal)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 font-sans">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveInvoice('draft')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveInvoice('finalized')}
              className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold transition-all shadow-md shadow-brand-600/30 flex items-center gap-2 active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>{saving ? 'Finalizing...' : 'Finalize & Generate Bill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { X, Printer, Download, RotateCcw, MessageCircle } from 'lucide-react';
import { formatINR, formatIndianDate, numberToWordsINR } from '../../shared/calculations.js';
import { generateReturnWhatsAppText, openWhatsAppShare } from '../../shared/whatsapp.js';

export default function CreditNotePrintModal({ returnDoc, businessSettings, isOpen, onClose }) {
  if (!isOpen || !returnDoc) return null;

  const seller = businessSettings || {};
  const items = returnDoc.items || [];
  const retailerPhone = returnDoc.retailer_phone || returnDoc.phone || '';

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    if (window.electronAPI && window.electronAPI.saveInvoicePDF) {
      await window.electronAPI.saveInvoicePDF(`CreditNote_${returnDoc.return_number}`);
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const text = generateReturnWhatsAppText(returnDoc, businessSettings);
    openWhatsAppShare(retailerPhone, text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Controls Toolbar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <span className="font-semibold text-sm">
              Credit Note Preview — {returnDoc.return_number} (Against {returnDoc.invoice_number})
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              title="Send Credit Note on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Send WhatsApp</span>
            </button>
            <button
              onClick={handleSavePDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Save Credit Note as PDF"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors cursor-pointer"
              title="Print Credit Note"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Credit Note Container */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-invoice-container"
            className="bg-white border border-slate-300 shadow-md p-8 w-full max-w-[800px] text-slate-800 text-xs leading-relaxed"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
              <div>
                <span className="font-extrabold tracking-wider text-sm uppercase text-rose-700">
                  CREDIT NOTE / SALES RETURN
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                  ORIGINAL FOR RECIPIENT
                </span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {seller.legal_name || 'MAHALAXMI ENTERPRISES'}
              </h2>
              {seller.gstin && (
                <p className="font-bold text-slate-800 text-[11px] mt-0.5">GSTIN {seller.gstin}</p>
              )}
              {seller.address && <p className="text-slate-600 text-[11px] mt-0.5">{seller.address}</p>}
              <p className="text-slate-600 text-[11px]">
                {seller.city ? `${seller.city}, ` : ''}{seller.state || 'MAHARASHTRA'}, {seller.pincode}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {seller.phone && <span>Mobile +91 {seller.phone} </span>}
                {seller.email && <span>Email {seller.email}</span>}
              </p>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 mb-3 text-[11px]">
              <div>
                <span className="text-slate-600">Credit Note #: </span>
                <span className="font-bold text-rose-800 font-mono-numbers">{returnDoc.return_number}</span>
              </div>
              <div>
                <span className="text-slate-600">Return Date: </span>
                <span className="font-bold text-slate-900">{formatIndianDate(returnDoc.return_date)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Against Invoice #: </span>
                <span className="font-bold text-blue-700 font-mono-numbers">{returnDoc.invoice_number}</span>
              </div>
            </div>

            {/* Customer Details & Reason */}
            <div className="mb-4 text-[11px] space-y-0.5">
              <p className="text-slate-500 text-[10px]">Customer Details:</p>
              <p className="font-bold text-slate-900 text-xs">{returnDoc.retailer_name || 'Cash Customer'}</p>
              {retailerPhone && <p className="text-slate-600">Phone: {retailerPhone}</p>}
              {returnDoc.reason && (
                <div className="pt-1 text-slate-600">
                  <span className="text-slate-500 text-[10px]">Reason: </span>
                  <span className="italic">{returnDoc.reason}</span>
                </div>
              )}
            </div>

            {/* Returned Items Table */}
            <table className="w-full border-collapse mb-4 text-[11px]">
              <thead>
                <tr className="border-t-2 border-b-2 border-rose-500 text-slate-800 font-bold bg-rose-50/40">
                  <th className="py-2 px-1 text-left w-8">#</th>
                  <th className="py-2 px-2 text-left">Item Description</th>
                  <th className="py-2 px-2 text-right w-24">Return Qty</th>
                  <th className="py-2 px-2 text-right w-24">Refund Taxable</th>
                  <th className="py-2 px-2 text-right w-24">Refund Tax</th>
                  <th className="py-2 px-2 text-right w-24">Total Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-900">
                      {item.item_name}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers font-bold text-rose-700">
                      {item.return_qty}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers text-slate-700">
                      {formatINR(item.refund_taxable)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers text-slate-700">
                      {formatINR((item.refund_cgst || 0) + (item.refund_sgst || 0) + (item.refund_igst || 0))}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers font-bold text-slate-900">
                      {formatINR(item.refund_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Numerical Totals (Right-aligned) */}
            <div className="flex justify-end mb-3">
              <div className="w-64 space-y-1 font-mono-numbers text-xs">
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Refund Taxable</span>
                  <span className="font-semibold">{formatINR(returnDoc.total_refund_taxable)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Refund Tax</span>
                  <span className="font-semibold">{formatINR(returnDoc.total_refund_tax)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-t border-slate-300 text-sm font-bold text-rose-700">
                  <span>Total Credit</span>
                  <span>{formatINR(returnDoc.total_refund_amount)}</span>
                </div>
              </div>
            </div>

            {/* Summary Divider Bar */}
            <div className="py-2 border-y border-rose-400 bg-rose-50/20 text-[11px] flex justify-between items-center mb-6">
              <div className="text-slate-700">
                <span className="font-semibold">Credit amount (in words): </span>
                <span className="italic font-medium text-slate-900">INR {numberToWordsINR(returnDoc.total_refund_amount)}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-rose-700 font-mono-numbers text-sm">{formatINR(returnDoc.total_refund_amount)}</span>
              </div>
            </div>

            {/* Footer Signatory */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-4">
              <div className="text-[10px] text-slate-500 max-w-sm">
                <p className="font-bold text-slate-700 mb-0.5">Note to Customer:</p>
                <p>This credit note amount has been credited to your retailer ledger and deducted from outstanding billings.</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-700">
                  For {seller.legal_name || 'MAHALAXMI ENTERPRISES'}
                </p>
                <div className="h-10"></div>
                <p className="text-[10px] text-slate-500">Authorized Signatory</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-[9px] text-slate-400">
              <span>Page 1 / 1 • This is a computer generated document and requires no signature.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

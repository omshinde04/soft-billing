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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Send Credit Note on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleSavePDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
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
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
              <div>
                <span className="font-bold tracking-wider text-sm uppercase text-rose-700">
                  CREDIT NOTE / SALES RETURN
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  ORIGINAL FOR RECIPIENT
                </span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {seller.legal_name || 'DISTRIBUTOR ENTERPRISES'}
              </h2>
              {seller.gstin && (
                <p className="font-semibold text-slate-800 mt-0.5">GSTIN {seller.gstin}</p>
              )}
              <p className="text-slate-600 mt-0.5">{seller.address}</p>
              <p className="text-slate-600">
                {seller.city ? `${seller.city}, ` : ''}{seller.state || 'MAHARASHTRA'}, {seller.pincode}
              </p>
              <p className="text-slate-600 mt-0.5">
                {seller.phone && <span>Mobile +91 {seller.phone} </span>}
                {seller.email && <span>Email {seller.email}</span>}
              </p>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200 mb-4 bg-rose-50/30 px-3 rounded">
              <div>
                <p>
                  <span className="font-bold text-slate-700">Credit Note #: </span>
                  <span className="font-bold text-rose-800">{returnDoc.return_number}</span>
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-700">Against Invoice #: </span>
                  <span className="font-semibold text-brand-700">{returnDoc.invoice_number}</span>
                  {returnDoc.invoice_date && (
                    <span className="text-slate-500 text-[10px] ml-1">
                      (dated {formatIndianDate(returnDoc.invoice_date)})
                    </span>
                  )}
                </p>
                <div className="mt-2">
                  <span className="font-bold text-slate-700">Retailer / Customer:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {returnDoc.retailer_name || 'Cash Customer'}
                  </p>
                  {retailerPhone && <p className="text-slate-600">Phone: {retailerPhone}</p>}
                </div>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-bold text-slate-700">Return Date: </span>
                  <span>{formatIndianDate(returnDoc.return_date)}</span>
                </p>
                {returnDoc.reason && (
                  <div className="mt-2">
                    <span className="font-bold text-slate-700">Reason for Return:</span>
                    <p className="text-slate-700 italic mt-0.5">{returnDoc.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Returned Items Table */}
            <table className="w-full border-collapse mb-4 text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-400 text-slate-700 font-bold bg-slate-100">
                  <th className="py-2 px-1 text-left w-8">#</th>
                  <th className="py-2 px-2 text-left">Item Description</th>
                  <th className="py-2 px-2 text-right w-20">Return Qty</th>
                  <th className="py-2 px-2 text-right w-24">Refund Taxable</th>
                  <th className="py-2 px-2 text-right w-24">Refund Tax</th>
                  <th className="py-2 px-2 text-right w-24">Total Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-1 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-slate-900">
                      {item.item_name}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers font-bold text-rose-700">
                      {item.return_qty}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers">
                      {formatINR(item.refund_taxable)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers">
                      {formatINR(item.refund_cgst + item.refund_sgst + item.refund_igst)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers font-bold text-slate-900">
                      {formatINR(item.refund_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Block */}
            <div className="flex justify-between items-start pt-2 border-t border-slate-300">
              <div className="w-1/2 pr-4 space-y-2">
                <p className="text-[11px] leading-snug">
                  <span className="font-semibold text-slate-700">Total Credit (in words): </span>
                  <span className="italic">{numberToWordsINR(returnDoc.total_refund_amount)}</span>
                </p>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                  <p className="font-semibold text-slate-800 mb-0.5">Note to Customer:</p>
                  <p>This credit note amount has been credited to your account and deducted from outstanding billings.</p>
                </div>
              </div>

              <div className="w-1/2 pl-4 border-l border-slate-200 space-y-1.5 font-mono-numbers">
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>Refund Taxable Value:</span>
                  <span>{formatINR(returnDoc.total_refund_taxable)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>Refund Tax Amount:</span>
                  <span>{formatINR(returnDoc.total_refund_tax)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y-2 border-slate-800 text-sm font-bold text-rose-700">
                  <span>Total Credit Amount:</span>
                  <span>{formatINR(returnDoc.total_refund_amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatory */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="text-[9px] text-slate-400">
                <p>This is a computer generated document and requires no signature.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-700">
                  For {seller.legal_name || 'DISTRIBUTOR ENTERPRISES'}
                </p>
                <div className="h-10"></div>
                <p className="text-[10px] text-slate-500">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

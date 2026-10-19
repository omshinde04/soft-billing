import React from 'react';
import { X, Printer, Download, FileText, MessageCircle } from 'lucide-react';
import { formatINR, formatIndianDate, numberToWordsINR } from '../../shared/calculations.js';
import { generateInvoiceWhatsAppText, openWhatsAppShare } from '../../shared/whatsapp.js';

export default function InvoicePrintModal({ invoice, businessSettings, isOpen, onClose }) {
  if (!isOpen || !invoice) return null;

  const seller = invoice.seller || businessSettings || {};
  const retailer = invoice.retailer || {};
  const items = invoice.items || [];
  const retailerPhone = retailer.whatsapp_number || retailer.phone || invoice.retailer_phone || '';

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    if (window.electronAPI && window.electronAPI.saveInvoicePDF) {
      await window.electronAPI.saveInvoicePDF(invoice.invoice_number);
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const text = generateInvoiceWhatsAppText(invoice, seller);
    openWhatsAppShare(retailerPhone, text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Controls Toolbar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-sm">Invoice Preview — {invoice.invoice_number}</span>
            {invoice.status === 'cancelled' && (
              <span className="ml-3 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CANCELLED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              title="Send Text Bill to Retailer on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Send WhatsApp</span>
            </button>
            <button
              onClick={handleSavePDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Save Invoice as PDF file"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors cursor-pointer"
              title="Print Invoice"
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

        {/* Printable Invoice Container (Visible in Modal & on Print) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-invoice-container"
            className="bg-white border border-slate-300 shadow-md p-8 w-full max-w-[800px] text-slate-800 text-xs leading-relaxed"
          >
            {/* Invoice Top Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
              <div>
                <span className="font-extrabold tracking-wider text-sm uppercase text-blue-600">
                  TAX INVOICE
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

            {/* Meta Row (Horizontal 3-column) */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 mb-3 text-[11px]">
              <div>
                <span className="text-slate-600">Invoice #: </span>
                <span className="font-bold text-slate-900 font-mono-numbers">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-slate-600">Invoice Date: </span>
                <span className="font-bold text-slate-900">{formatIndianDate(invoice.invoice_date)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Due Date: </span>
                <span className="font-bold text-slate-900">{formatIndianDate(invoice.due_date || invoice.invoice_date)}</span>
              </div>
            </div>

            {/* Customer Details & Place of Supply */}
            <div className="mb-4 text-[11px] space-y-0.5">
              <p className="text-slate-500 text-[10px]">Customer Details:</p>
              <p className="font-bold text-slate-900 text-xs">{retailer.shop_name || 'Cash Customer'}</p>
              {retailer.address && <p className="text-slate-600">{retailer.address}, {retailer.city}</p>}
              {retailer.gstin && <p className="font-semibold text-slate-700">GSTIN: {retailer.gstin}</p>}
              <div className="pt-1">
                <span className="text-slate-500 text-[10px]">Place of Supply: </span>
                <span className="font-bold text-slate-900">{invoice.place_of_supply || '27-MAHARASHTRA'}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-4 text-[11px]">
              <thead>
                <tr className="border-t-2 border-b-2 border-blue-500 text-slate-800 font-bold bg-blue-50/40">
                  <th className="py-2 px-1 text-left w-8">#</th>
                  <th className="py-2 px-2 text-left">Item</th>
                  <th className="py-2 px-2 text-right w-24">Rate / Item</th>
                  <th className="py-2 px-2 text-right w-20">Qty</th>
                  <th className="py-2 px-2 text-right w-24">Taxable Value</th>
                  <th className="py-2 px-2 text-right w-24">Tax Amount</th>
                  <th className="py-2 px-2 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-900">
                      {item.item_name}
                      {item.hsn_code && (
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono-numbers">[{item.hsn_code}]</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers font-semibold text-slate-800">
                      {Number(item.rate || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers whitespace-nowrap text-slate-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers text-slate-700">
                      {Number(item.taxable_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers text-slate-700">
                      {Number((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0)).toFixed(2)} ({item.tax_rate}%)
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers font-medium text-slate-900">
                      {Number(item.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Numerical Totals (Right-aligned) */}
            <div className="flex justify-end mb-3">
              <div className="w-64 space-y-1 font-mono-numbers text-xs">
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Taxable Amount</span>
                  <span className="font-semibold">{formatINR(invoice.subtotal_taxable)}</span>
                </div>

                {invoice.is_inter_state ? (
                  <div className="flex justify-between py-0.5 text-slate-700">
                    <span>IGST</span>
                    <span>{formatINR(invoice.total_igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>CGST 2.5%</span>
                      <span>{formatINR(invoice.total_cgst)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>SGST 2.5%</span>
                      <span>{formatINR(invoice.total_sgst)}</span>
                    </div>
                  </>
                )}

                {invoice.round_off !== 0 && (
                  <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                    <span>Round Off</span>
                    <span>{invoice.round_off > 0 ? `+${invoice.round_off.toFixed(2)}` : invoice.round_off.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-t border-slate-300 text-sm font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatINR(invoice.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Summary Divider Bar (Matching Swipe reference) */}
            <div className="py-2 border-y border-blue-400 bg-blue-50/20 text-[11px] flex justify-between items-center mb-3">
              <div>
                <span className="font-semibold text-slate-700">Total Items / Qty : </span>
                <span className="font-mono-numbers font-bold text-slate-900">{items.length} / {totalQty}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700">Total amount (in words): </span>
                <span className="italic font-medium text-slate-800">INR {numberToWordsINR(invoice.grand_total)}</span>
              </div>
            </div>

            <div className="flex justify-end text-xs font-bold text-slate-900 mb-6">
              <span className="mr-6">Amount Payable:</span>
              <span className="font-mono-numbers text-sm">{formatINR(invoice.grand_total)}</span>
            </div>

            {/* Bank Details & Signature Section */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-4">
              <div className="text-[10px] space-y-0.5 text-slate-700">
                <p className="font-bold text-slate-900 mb-1">Bank Details:</p>
                <p><span className="text-slate-500">Bank:</span> <span className="font-semibold">{seller.bank_name || 'HDFC Bank'}</span></p>
                <p><span className="text-slate-500">Account #:</span> <span className="font-mono-numbers font-semibold">{seller.bank_account_no || '50200120068000'}</span></p>
                <p><span className="text-slate-500">IFSC Code:</span> <span className="font-mono-numbers font-semibold">{seller.bank_ifsc || 'HDFC0002544'}</span></p>
                <p><span className="text-slate-500">Branch:</span> <span className="font-semibold">{seller.bank_branch || 'GHOTI BUDRUK'}</span></p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-700">
                  For {seller.legal_name || 'MAHALAXMI ENTERPRISES'}
                </p>
                <div className="h-10"></div>
                <p className="text-[10px] text-slate-500">Authorized Signatory</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between text-[9px] text-slate-400">
              <span>Page 1 / 1 • This is a computer generated document and requires no signature.</span>
              {invoice.notes && <span>Note: {invoice.notes}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

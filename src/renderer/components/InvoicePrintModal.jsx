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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Send Bill to Retailer on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Send WhatsApp</span>
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

        {/* Printable Invoice Container (Visible in Modal & on Print) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-invoice-container"
            className="bg-white border border-slate-300 shadow-md p-8 w-full max-w-[800px] text-slate-800 text-xs leading-relaxed"
          >
            {/* Invoice Top Header */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
              <div>
                <span className="font-bold tracking-wider text-sm uppercase text-slate-900">TAX INVOICE</span>
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

            {/* Meta Row (Invoice #, Date, Customer, Place of supply) */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200 mb-4 bg-slate-50/50 px-2 rounded">
              <div>
                <p>
                  <span className="font-bold text-slate-700">Invoice #: </span>
                  <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
                </p>
                <div className="mt-2">
                  <span className="font-bold text-slate-700">Customer Details:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{retailer.shop_name || 'Cash Customer'}</p>
                  {retailer.address && <p className="text-slate-600">{retailer.address}</p>}
                  {retailer.city && <p className="text-slate-600">{retailer.city}</p>}
                  {retailer.gstin && <p className="font-semibold text-slate-700">GSTIN: {retailer.gstin}</p>}
                </div>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-bold text-slate-700">Invoice Date: </span>
                  <span>{formatIndianDate(invoice.invoice_date)}</span>
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-700">Due Date: </span>
                  <span>{formatIndianDate(invoice.due_date || invoice.invoice_date)}</span>
                </p>
                <div className="mt-2">
                  <span className="font-bold text-slate-700">Place of Supply:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {invoice.place_of_supply || '27-MAHARASHTRA'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-4 text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-400 text-slate-700 font-bold bg-slate-100">
                  <th className="py-2 px-1 text-left w-8">#</th>
                  <th className="py-2 px-2 text-left">Item</th>
                  <th className="py-2 px-2 text-right w-20">Rate / Item</th>
                  <th className="py-2 px-2 text-right w-16">Qty</th>
                  <th className="py-2 px-2 text-right w-20">Taxable Value</th>
                  <th className="py-2 px-2 text-right w-24">Tax Amount</th>
                  <th className="py-2 px-2 text-right w-20">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-900">
                      {item.item_name}
                      {item.hsn_code && (
                        <span className="text-[10px] text-slate-400 ml-1.5">[{item.hsn_code}]</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers">{item.rate.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers">
                      {item.taxable_amount.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers">
                      {(item.cgst_amount + item.sgst_amount + item.igst_amount).toFixed(2)} ({item.tax_rate}%)
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono-numbers font-medium">
                      {item.total_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary & Tax Breakdown Box */}
            <div className="flex justify-between items-start pt-2 border-t border-slate-300">
              <div className="w-1/2 pr-4">
                <div className="text-[11px] space-y-1 mb-4">
                  <p>
                    <span className="font-semibold text-slate-700">Total Items / Qty: </span>
                    <span className="font-mono-numbers">{items.length} / {totalQty}</span>
                  </p>
                  <p className="leading-snug">
                    <span className="font-semibold text-slate-700">Total amount (in words): </span>
                    <span className="italic">{numberToWordsINR(invoice.grand_total)}</span>
                  </p>
                </div>

                {/* Bank Details */}
                {seller.bank_name && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[10px] leading-tight space-y-0.5">
                    <p className="font-bold text-slate-800">Bank Details:</p>
                    <p><span className="font-medium text-slate-600">Bank:</span> {seller.bank_name}</p>
                    {seller.bank_account_no && (
                      <p><span className="font-medium text-slate-600">Account #:</span> {seller.bank_account_no}</p>
                    )}
                    {seller.bank_ifsc && (
                      <p><span className="font-medium text-slate-600">IFSC Code:</span> {seller.bank_ifsc}</p>
                    )}
                    {seller.bank_branch && (
                      <p><span className="font-medium text-slate-600">Branch:</span> {seller.bank_branch}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Numerical Totals (Right Column) */}
              <div className="w-1/2 pl-4 border-l border-slate-200 space-y-1.5 font-mono-numbers">
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Taxable Amount</span>
                  <span>{formatINR(invoice.subtotal_taxable)}</span>
                </div>

                {invoice.is_inter_state ? (
                  <div className="flex justify-between py-0.5 text-slate-700">
                    <span>IGST</span>
                    <span>{formatINR(invoice.total_igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>CGST</span>
                      <span>{formatINR(invoice.total_cgst)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>SGST</span>
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

                <div className="flex justify-between py-1.5 border-y-2 border-slate-800 text-sm font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatINR(invoice.grand_total)}</span>
                </div>

                <div className="flex justify-between pt-1 text-xs font-bold text-slate-900">
                  <span>Amount Payable:</span>
                  <span>{formatINR(invoice.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Footer & Signature Section */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="text-[9px] text-slate-400">
                <p>This is a computer generated document and requires no signature.</p>
                {invoice.notes && <p className="mt-1 text-slate-500">Note: {invoice.notes}</p>}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-700">
                  For {seller.legal_name || 'DISTRIBUTOR ENTERPRISES'}
                </p>
                <div className="h-12"></div>
                <p className="text-[10px] text-slate-500">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

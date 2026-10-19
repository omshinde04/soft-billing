import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ShoppingBag,
  Store,
  ShieldCheck,
  FileText,
  RefreshCw
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../../shared/calculations.js';

export default function ReportsPage({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'products', 'retailers', 'gst', 'docs'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Report Data States
  const [invoiceReport, setInvoiceReport] = useState({ rows: [], summary: {} });
  const [productReport, setProductReport] = useState([]);
  const [retailerReport, setRetailerReport] = useState([]);
  const [gstReport, setGstReport] = useState([]);
  const [docsReport, setDocsReport] = useState({});

  const loadAllReports = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const filter = { fromDate, toDate };
        const [invs, prods, rets, gst, docs] = await Promise.all([
          window.electronAPI.getInvoiceWiseReport(filter),
          window.electronAPI.getProductWiseReport(filter),
          window.electronAPI.getRetailerWiseReport(filter),
          window.electronAPI.getGSTSummaryReport(filter),
          window.electronAPI.getDocsSummaryReport(filter)
        ]);

        setInvoiceReport(invs);
        setProductReport(prods);
        setRetailerReport(rets);
        setGstReport(gst);
        setDocsReport(docs);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      onShowToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [fromDate, toDate]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.exportExcel({ fromDate, toDate });
        if (result.success) {
          onShowToast(`GSTR-1 Excel exported successfully to ${result.filePath}`, 'success');
        } else if (!result.canceled) {
          onShowToast('Export cancelled or failed', 'error');
        }
      }
    } catch (err) {
      console.error('Excel export error:', err);
      onShowToast(err.message || 'Failed to export Excel report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'invoices', label: 'Invoice-wise Ledger', icon: Layers },
    { id: 'products', label: 'Product-wise Turnover', icon: ShoppingBag },
    { id: 'retailers', label: 'Retailer-wise Turnover', icon: Store },
    { id: 'gst', label: 'GST Summary (Slabs)', icon: ShieldCheck },
    { id: 'docs', label: 'Document Summary (docs)', icon: FileText }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Filter & Excel Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">GST & Sales Reports</h3>
            <p className="text-xs text-slate-500">
              Generate monthly sales reconciliations and Swipe-compatible GSTR-1 Excel workbooks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Period selector */}
          <div className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg bg-slate-50 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
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

          <button
            onClick={loadAllReports}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating Excel...' : 'Export GSTR-1 Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Invoices</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-numbers">
            {invoiceReport.summary.activeCount || 0}
            {invoiceReport.summary.cancelledCount > 0 && (
              <span className="text-xs text-rose-500 font-semibold ml-2">
                ({invoiceReport.summary.cancelledCount} cancelled)
              </span>
            )}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Taxable Value</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-numbers">
            {formatINR(invoiceReport.summary.totalTaxable || 0)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total GST Tax</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-numbers">
            {formatINR(invoiceReport.summary.totalTax || 0)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Invoice Value</p>
          <p className="text-xl font-extrabold text-brand-700 mt-1 font-mono-numbers">
            {formatINR(invoiceReport.summary.totalAmount || 0)}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl gap-2 text-xs font-semibold overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content Panel */}
      <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm overflow-hidden p-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
            <span>Calculating report data...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: Invoice-wise Ledger */}
            {activeTab === 'invoices' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {invoiceReport.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">{row.invoice_number}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{formatIndianDate(row.invoice_date)}</td>
                        <td className="py-2 px-3 font-sans text-slate-800 font-medium">{row.retailer_name || 'Cash Customer'}</td>
                        <td className="py-2 px-3 text-slate-500">{row.retailer_gstin || '—'}</td>
                        <td className="py-2 px-3 text-right">{formatINR(row.subtotal_taxable, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(row.total_cgst, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(row.total_sgst, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(row.total_igst, false)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(row.grand_total, false)}</td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.status === 'finalized'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Product-wise Turnover */}
            {activeTab === 'products' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3">UQC</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-center">Tax %</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {productReport.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">{p.item_name}</td>
                        <td className="py-2 px-3 text-slate-500">{p.hsn_code || '—'}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{p.uqc}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{p.total_quantity}</td>
                        <td className="py-2 px-3 text-center">{p.tax_rate}%</td>
                        <td className="py-2 px-3 text-right">{formatINR(p.total_taxable, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(p.total_cgst, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(p.total_sgst, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(p.total_igst, false)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(p.total_amount, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Retailer-wise Turnover */}
            {activeTab === 'retailers' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Retailer / Firm</th>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-center">Bills Count</th>
                      <th className="py-2.5 px-3 text-right">Taxable Sales</th>
                      <th className="py-2.5 px-3 text-right">Total GST</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {retailerReport.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">{r.retailer_name}</td>
                        <td className="py-2 px-3 text-slate-500">{r.retailer_gstin || 'B2C (Unregistered)'}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{r.city || '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{r.invoice_count}</td>
                        <td className="py-2 px-3 text-right">{formatINR(r.total_taxable, false)}</td>
                        <td className="py-2 px-3 text-right">{formatINR(r.total_tax, false)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(r.total_sales, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: GST Summary */}
            {activeTab === 'gst' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Tax Slab Rate (%)</th>
                      <th className="py-2.5 px-4 text-right">Taxable Turnover</th>
                      <th className="py-2.5 px-4 text-right">Central Tax (CGST)</th>
                      <th className="py-2.5 px-4 text-right">State Tax (SGST)</th>
                      <th className="py-2.5 px-4 text-right">Integrated Tax (IGST)</th>
                      <th className="py-2.5 px-4 text-right">Total GST Collected</th>
                      <th className="py-2.5 px-4 text-right">Gross Total Turnover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {gstReport.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{s.tax_rate}% GST</td>
                        <td className="py-2.5 px-4 text-right">{formatINR(s.taxable_value)}</td>
                        <td className="py-2.5 px-4 text-right">{formatINR(s.central_tax)}</td>
                        <td className="py-2.5 px-4 text-right">{formatINR(s.state_tax)}</td>
                        <td className="py-2.5 px-4 text-right">{formatINR(s.integrated_tax)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">{formatINR(s.total_tax)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatINR(s.total_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: Document Summary (docs) */}
            {activeTab === 'docs' && (
              <div className="p-4">
                <div className="max-w-xl mx-auto bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                    Summary of Documents Issued (GSTR-1 Table 13)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono-numbers">
                    <div>
                      <span className="text-slate-500 block font-sans">Document Type:</span>
                      <strong className="text-slate-900 font-sans">{docsReport.docType || 'Invoices for outward supply'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Total Count:</span>
                      <strong className="text-slate-900">{docsReport.totalCount || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Serial Number From:</span>
                      <strong className="text-slate-900">{docsReport.srFrom || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Serial Number To:</span>
                      <strong className="text-slate-900">{docsReport.srTo || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Total Cancelled:</span>
                      <strong className="text-rose-600">{docsReport.cancelledCount || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

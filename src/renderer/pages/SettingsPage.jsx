import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  CreditCard,
  FileText,
  Database,
  Save,
  Download,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { INDIAN_STATES } from '../../shared/constants.js';
import { validateGSTIN } from '../../shared/calculations.js';

export default function SettingsPage({ businessSettings, onSettingsUpdated, onShowToast }) {
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '',
    phone: '',
    email: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_branch: '',
    invoice_prefix: 'INV-',
    next_invoice_number: 1001,
    invoice_footer_notes: '',
    default_pricing_mode: 'exclusive'
  });

  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [gstinValidation, setGstinValidation] = useState({ valid: true, error: null });

  useEffect(() => {
    if (businessSettings) {
      setFormData({
        legal_name: businessSettings.legal_name || '',
        trade_name: businessSettings.trade_name || '',
        gstin: businessSettings.gstin || '',
        address: businessSettings.address || '',
        city: businessSettings.city || '',
        state: businessSettings.state || 'Maharashtra',
        state_code: businessSettings.state_code || '27',
        pincode: businessSettings.pincode || '',
        phone: businessSettings.phone || '',
        email: businessSettings.email || '',
        bank_name: businessSettings.bank_name || '',
        bank_account_no: businessSettings.bank_account_no || '',
        bank_ifsc: businessSettings.bank_ifsc || '',
        bank_branch: businessSettings.bank_branch || '',
        invoice_prefix: businessSettings.invoice_prefix || 'INV-',
        next_invoice_number: businessSettings.next_invoice_number || 1001,
        invoice_footer_notes: businessSettings.invoice_footer_notes || '',
        default_pricing_mode: businessSettings.default_pricing_mode || 'exclusive'
      });
      setGstinValidation(validateGSTIN(businessSettings.gstin));
    }
  }, [businessSettings]);

  const handleGstinChange = (val) => {
    const upper = val.toUpperCase().trim();
    setFormData({ ...formData, gstin: upper });
    setGstinValidation(validateGSTIN(upper));
  };

  const handleStateChange = (code) => {
    const s = INDIAN_STATES.find((item) => item.code === code);
    if (s) {
      setFormData({
        ...formData,
        state: s.name,
        state_code: s.code
      });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) {
      onShowToast('Legal business name is required', 'error');
      return;
    }

    if (formData.gstin && !gstinValidation.valid) {
      onShowToast('Please provide a valid 15-character GSTIN or leave blank', 'error');
      return;
    }

    setSaving(true);
    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateSettings(formData);
        onSettingsUpdated(updated);
        onShowToast('Business settings saved successfully', 'success');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      onShowToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDatabase = async () => {
    setBackingUp(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.backupDatabase();
        if (res.success) {
          onShowToast(`Database backup created at ${res.filePath}`, 'success');
        }
      }
    } catch (err) {
      console.error('Backup error:', err);
      onShowToast(err.message || 'Failed to backup database', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.seedDemoData();
        onShowToast(
          `Demo data seeded! (${res.productsCount} products, ${res.retailersCount} retailers, ${res.invoicesCount} invoices)`,
          'success'
        );
        window.location.reload();
      }
    } catch (err) {
      console.error('Seed demo error:', err);
      onShowToast(err.message || 'Failed to seed demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Business & System Settings</h3>
            <p className="text-xs text-slate-500">
              Configure your distributor profile, GST details, bank accounts, and database maintenance
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm transition-all shadow-brand-600/20 active:scale-95 disabled:opacity-50 text-xs"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Section 1: Business Profile */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Distributor Profile
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Legal Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MAHALAXMI ENTERPRISES"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trade Name (Optional)</label>
              <input
                type="text"
                placeholder="Trade / Brand name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">GSTIN</label>
                {formData.gstin && (
                  <span
                    className={`text-[10px] font-semibold ${
                      gstinValidation.valid ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {gstinValidation.valid ? 'Valid format' : 'Invalid format'}
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 27EBYPB2347Q1ZT"
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="Mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="distributor@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
              <input
                type="text"
                placeholder="Shop No., Apartment, Street, Locality"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">City / Town</label>
              <input
                type="text"
                placeholder="e.g. Nashik"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <select
                value={formData.state_code}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                placeholder="e.g. 422001"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Numbering & Pricing Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Invoice Numbering & Default Pricing
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="e.g. INV-"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Next Serial Number</label>
              <input
                type="number"
                min="1"
                value={formData.next_invoice_number}
                onChange={(e) => setFormData({ ...formData, next_invoice_number: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Pricing Mode</label>
              <select
                value={formData.default_pricing_mode}
                onChange={(e) => setFormData({ ...formData, default_pricing_mode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="exclusive">Tax Exclusive (Base rate + GST)</option>
                <option value="inclusive">Tax Inclusive (Wholesale rate includes GST)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Default Terms & Invoice Footer Notes
              </label>
              <textarea
                rows={2}
                value={formData.invoice_footer_notes}
                onChange={(e) => setFormData({ ...formData, invoice_footer_notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Section 3: Bank Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Bank Details (For Invoice Footer)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                placeholder="Account #"
                value={formData.bank_account_no}
                onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                placeholder="e.g. HDFC0002544"
                value={formData.bank_ifsc}
                onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                placeholder="Branch location"
                value={formData.bank_branch}
                onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Maintenance & Demo Tools */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Database className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Database Maintenance & Demonstration
            </h4>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Local SQLite Backup</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Create an instant, safe snapshot of your local database before updates or migrations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBackupDatabase}
              disabled={backingUp}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-300 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{backingUp ? 'Backing up...' : 'Backup Database'}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Seed FMCG Demo Data</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Quickly load realistic sample FMCG biscuits, wafers, local retailers, and trial bills for testing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{seeding ? 'Seeding...' : 'Load FMCG Demo Data'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

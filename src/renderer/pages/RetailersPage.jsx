import React, { useState, useEffect } from 'react';
import { Store, Search, Plus, Edit2, CheckCircle2, XCircle, RefreshCw, X, AlertCircle } from 'lucide-react';
import { INDIAN_STATES } from '../../shared/constants.js';
import { validateGSTIN } from '../../shared/calculations.js';

export default function RetailersPage({ onShowToast }) {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [formData, setFormData] = useState({
    shop_name: '',
    contact_person: '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '',
    gstin: '',
    notes: '',
    is_active: true
  });
  const [gstinValidation, setGstinValidation] = useState({ valid: true, error: null });

  const loadRetailers = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getRetailers({ search, activeOnly });
        setRetailers(res);
      }
    } catch (err) {
      console.error('Failed to load retailers:', err);
      onShowToast('Failed to load retailers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetailers();
  }, [search, activeOnly]);

  const handleOpenModal = (ret = null) => {
    if (ret) {
      setEditingRetailer(ret);
      setFormData({
        shop_name: ret.shop_name,
        contact_person: ret.contact_person || '',
        phone: ret.phone || '',
        address: ret.address || '',
        city: ret.city || '',
        state: ret.state || 'Maharashtra',
        state_code: ret.state_code || '27',
        pincode: ret.pincode || '',
        gstin: ret.gstin || '',
        notes: ret.notes || '',
        is_active: Boolean(ret.is_active)
      });
      setGstinValidation(validateGSTIN(ret.gstin));
    } else {
      setEditingRetailer(null);
      setFormData({
        shop_name: '',
        contact_person: '',
        phone: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        state_code: '27',
        pincode: '',
        gstin: '',
        notes: '',
        is_active: true
      });
      setGstinValidation({ valid: true, error: null });
    }
    setModalOpen(true);
  };

  const handleGstinChange = (val) => {
    const upper = val.toUpperCase().trim();
    setFormData({ ...formData, gstin: upper });
    setGstinValidation(validateGSTIN(upper));
  };

  const handleStateChange = (stateCode) => {
    const selected = INDIAN_STATES.find((s) => s.code === stateCode);
    if (selected) {
      setFormData({
        ...formData,
        state: selected.name,
        state_code: selected.code
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.shop_name.trim()) {
      onShowToast('Shop name is required', 'error');
      return;
    }

    if (formData.gstin && !gstinValidation.valid) {
      onShowToast('Please correct the invalid GSTIN format before saving', 'error');
      return;
    }

    try {
      if (editingRetailer) {
        await window.electronAPI.updateRetailer(editingRetailer.id, formData);
        onShowToast('Retailer updated successfully', 'success');
      } else {
        await window.electronAPI.createRetailer(formData);
        onShowToast('Retailer added successfully', 'success');
      }
      setModalOpen(false);
      loadRetailers();
    } catch (err) {
      console.error('Error saving retailer:', err);
      onShowToast(err.message || 'Error saving retailer', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await window.electronAPI.toggleRetailerStatus(id);
      loadRetailers();
      onShowToast('Retailer status updated', 'success');
    } catch (err) {
      onShowToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by shop name, contact person, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Active only</span>
          </label>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Retailer</span>
          </button>
        </div>
      </div>

      {/* Retailers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading retailers...</span>
          </div>
        ) : retailers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No retailers found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Click "Add Retailer" to register your local kirana store accounts.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Shop Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">City / Area</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {retailers.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{r.shop_name}</div>
                    {r.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.address}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{r.contact_person || '—'}</td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-700">{r.phone || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.city ? `${r.city}, ${r.state}` : r.state}
                  </td>
                  <td className="py-3 px-4 font-mono-numbers">
                    {r.gstin ? (
                      <span className="font-semibold text-slate-800">{r.gstin}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unregistered (B2C)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(r.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                        r.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {r.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{r.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenModal(r)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                      title="Edit Retailer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRetailer ? 'Edit Retailer' : 'Add New Retailer'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shop / Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avinash Kirana Stores"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Avinash Patil"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9822334455"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono-numbers"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    placeholder="Shop No., Market Yard, Street"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Village / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Nandgaon, Sinnar"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State / Place of Supply</label>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">GSTIN (Optional)</label>
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 font-mono-numbers uppercase ${
                      formData.gstin && !gstinValidation.valid
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-brand-500'
                    }`}
                  />
                  {formData.gstin && !gstinValidation.valid && (
                    <p className="text-[10px] text-rose-500 mt-1">{gstinValidation.error}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Payment terms, delivery route, or credit limit"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm"
                >
                  {editingRetailer ? 'Save Changes' : 'Create Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

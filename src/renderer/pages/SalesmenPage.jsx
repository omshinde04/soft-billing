import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  AlertCircle,
  Key,
  Phone,
  MapPin,
  ShieldCheck,
  Lock,
  Smartphone
} from 'lucide-react';

const COMMON_BEATS = [
  'Nandgaon Main Market',
  'Station Road Beat',
  'Old Agra Road Beat',
  'Yeola Naka Route',
  'Market Yard & Bazaar Peth'
];

export default function SalesmenPage({ onShowToast }) {
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    login_id: '',
    password: '',
    assigned_beat: 'Nandgaon Main Market',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);

  const loadSalesmen = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getSalesmen({ search, activeOnly });
        setSalesmen(res || []);
      }
    } catch (err) {
      console.error('Failed to load salesmen:', err);
      if (onShowToast) onShowToast('Failed to load salesmen records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesmen();
  }, [search, activeOnly]);

  const handleOpenModal = (salesman = null) => {
    if (salesman) {
      setEditingSalesman(salesman);
      setFormData({
        name: salesman.name,
        phone: salesman.phone || '',
        login_id: salesman.login_id || salesman.phone || '',
        password: salesman.password || '1234',
        assigned_beat: salesman.assigned_beat || 'Nandgaon Main Market',
        is_active: Boolean(salesman.is_active)
      });
    } else {
      setEditingSalesman(null);
      setFormData({
        name: '',
        phone: '',
        login_id: '',
        password: '123',
        assigned_beat: 'Nandgaon Main Market',
        is_active: true
      });
    }
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      if (onShowToast) onShowToast('Salesman full name is required', 'error');
      return;
    }
    if (!formData.phone.trim()) {
      if (onShowToast) onShowToast('Phone number is required for login', 'error');
      return;
    }
    if (!formData.password.trim()) {
      if (onShowToast) onShowToast('Password / PIN is required', 'error');
      return;
    }

    try {
      if (editingSalesman) {
        await window.electronAPI.updateSalesman(editingSalesman.id, formData);
        if (onShowToast) onShowToast(`Updated credentials for ${formData.name}`, 'success');
      } else {
        await window.electronAPI.createSalesman(formData);
        if (onShowToast) onShowToast(`Created login for ${formData.name}`, 'success');
      }
      setModalOpen(false);
      await loadSalesmen();

      // Automatically sync updated credentials to cloud
      handleSyncToMobile();
    } catch (err) {
      console.error('Error saving salesman:', err);
      if (onShowToast) onShowToast(err.message || 'Failed to save salesman', 'error');
    }
  };

  const handleToggleStatus = async (id, name, currentStatus) => {
    try {
      await window.electronAPI.toggleSalesmanStatus(id);
      if (onShowToast) {
        onShowToast(`${name} marked as ${currentStatus ? 'Inactive' : 'Active'}`, 'success');
      }
      await loadSalesmen();
      handleSyncToMobile();
    } catch (err) {
      console.error('Status toggle error:', err);
      if (onShowToast) onShowToast('Failed to update status', 'error');
    }
  };

  const handleSyncToMobile = async () => {
    setIsSyncing(true);
    try {
      if (window.electronAPI?.syncCatalogToCloud) {
        const res = await window.electronAPI.syncCatalogToCloud();
        if (res.success) {
          if (onShowToast) {
            onShowToast(`☁️ Salesmen logins & catalog pushed to Mobile App! (${res.salesmenCount} salesmen)`, 'success');
          }
        }
      }
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Salesmen Master & Mobile RBAC
              </h2>
              <p className="text-xs text-slate-500">
                Manage field sales personnel logins, passwords, and assigned market beats
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncToMobile}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Push updated credentials directly to salesman mobile phones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Logins to Mobile'}</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-brand-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Salesman Login</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search salesman by name, phone, login ID, or beat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/20"
            />
            <span>Active Logins Only</span>
          </label>

          <button
            onClick={loadSalesmen}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Salesmen Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">SALESMAN</th>
                <th className="py-3 px-4">MOBILE PHONE</th>
                <th className="py-3 px-4">LOGIN ID</th>
                <th className="py-3 px-4">PASSWORD / PIN</th>
                <th className="py-3 px-4">ASSIGNED BEAT</th>
                <th className="py-3 px-4 text-center">ACCESS STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading field personnel...</span>
                  </td>
                </tr>
              ) : salesmen.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p className="font-medium text-slate-700">No salesmen logins found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Salesman Login" above to create mobile credentials.
                    </p>
                  </td>
                </tr>
              ) : (
                salesmen.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <span className="text-[10px] text-slate-400">ID #{s.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-brand-600">
                      @{s.login_id || s.phone}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded inline-block">
                        <Lock className="w-3 h-3 text-slate-400 inline" />
                        <span>{s.password}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 font-medium text-[11px]">
                        <MapPin className="w-3 h-3 text-sky-500" />
                        <span>{s.assigned_beat || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(s.id, s.name, s.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {s.is_active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenModal(s)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Edit Credentials"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Salesman Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingSalesman ? 'Edit Salesman Credentials' : 'Create New Salesman Login'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Credentials will sync to the mobile app for salesman login
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salesman Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Shinde"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9822012345"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({
                        ...formData,
                        phone: val,
                        login_id: formData.login_id || val
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login ID (Username)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rahul"
                    value={formData.login_id}
                    onChange={(e) => setFormData({ ...formData, login_id: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Password / PIN *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="e.g. 1234"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Simple 4-digit PIN (e.g. 1234) recommended for easy mobile market entry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Market Beat *
                </label>
                <select
                  value={formData.assigned_beat}
                  onChange={(e) => setFormData({ ...formData, assigned_beat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  {COMMON_BEATS.map((beat) => (
                    <option key={beat} value={beat}>
                      {beat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/20"
                />
                <label htmlFor="is_active" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Allow salesman to log in & book orders on mobile app
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  {editingSalesman ? 'Save Changes' : 'Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

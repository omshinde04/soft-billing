import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Package,
  Store,
  RotateCcw,
  FileSpreadsheet,
  Settings,
  Boxes
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-invoice', label: 'Create Invoice', icon: PlusCircle, highlight: true },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'products', label: 'Products Master', icon: Package },
  { id: 'retailers', label: 'Retailers Master', icon: Store },
  { id: 'returns', label: 'Sales Returns', icon: RotateCcw },
  { id: 'reports', label: 'Reports & GSTR-1', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, businessSettings }) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Boxes className="w-6 h-6" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-base font-bold text-white tracking-tight truncate">
            {businessSettings?.trade_name || businessSettings?.legal_name || 'Billing-Soft'}
          </h1>
          <p className="text-xs text-slate-400 font-medium">FMCG Distribution</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-brand-600/30'
                    : 'bg-brand-600/10 text-brand-400 hover:bg-brand-600/20 border border-brand-500/30'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status / Mode */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span>Mode:</span>
          <span className="text-emerald-400 font-medium">Offline SQLite</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>State:</span>
          <span className="text-slate-300 font-medium truncate max-w-[120px]">
            {businessSettings?.state || 'Maharashtra'} ({businessSettings?.state_code || '27'})
          </span>
        </div>
      </div>
    </aside>
  );
}

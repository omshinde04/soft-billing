import React from 'react';
import { formatIndianDate } from '../../shared/calculations.js';
import { Calendar, Building2, Plus, ShieldCheck } from 'lucide-react';

export default function Header({ pageTitle, businessSettings, onNewInvoice }) {
  const today = formatIndianDate(new Date().toISOString().split('T')[0]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 select-none">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Date indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{today}</span>
        </div>

        {/* GSTIN badge */}
        {businessSettings?.gstin ? (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GSTIN: {businessSettings.gstin}</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
            <span>Unregistered / Composite</span>
          </div>
        )}

        {/* Quick New Invoice CTA */}
        {onNewInvoice && (
          <button
            onClick={onNewInvoice}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shadow-brand-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill</span>
          </button>
        )}
      </div>
    </header>
  );
}

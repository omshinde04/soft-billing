import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  UserCheck,
  MapPin,
  PlusCircle,
  AlertCircle,
  Truck,
  Sparkles,
  Phone
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../../shared/calculations.js';

export default function OrdersPage({ onSelectInvoice, onInvoiceCreated, onShowToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'converted'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const list = await window.electronAPI.getOrders({
          status: statusFilter,
          search: searchTerm
        });
        setOrders(list || []);
      }
    } catch (err) {
      console.error('Failed to load mobile orders:', err);
      if (onShowToast) onShowToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live real-time listener for incoming orders from mobile salesman
  useEffect(() => {
    let unsubscribe = null;
    if (window.electronAPI?.onLiveOrderReceived) {
      unsubscribe = window.electronAPI.onLiveOrderReceived(() => {
        loadOrders();
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSyncCatalog = async () => {
    setIsSyncingCatalog(true);
    try {
      if (window.electronAPI?.syncCatalogToCloud) {
        const res = await window.electronAPI.syncCatalogToCloud();
        if (res.success) {
          if (onShowToast) {
            onShowToast(`☁️ Catalog pushed to mobile app! (${res.productsCount} products, ${res.retailersCount} retailers)`, 'success');
          }
        } else {
          if (onShowToast) onShowToast(res.error || 'Sync failed', 'error');
        }
      }
    } catch (e) {
      if (onShowToast) onShowToast('Failed to sync catalog: ' + e.message, 'error');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const handleOpenDetails = async (orderId) => {
    try {
      if (window.electronAPI) {
        const fullOrder = await window.electronAPI.getOrderById(orderId);
        setSelectedOrder(fullOrder);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
      if (onShowToast) onShowToast('Failed to fetch order details', 'error');
    }
  };

  const handleConvertOrder = async (orderId) => {
    if (convertingId) return;
    setConvertingId(orderId);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.convertOrderToInvoice(orderId);
        if (result && result.success) {
          if (onShowToast) {
            onShowToast(`Order converted successfully to ${result.invoice.invoice_number}!`, 'success');
          }
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(null);
          }
          await loadOrders();
          if (onInvoiceCreated) {
            onInvoiceCreated(result.invoice);
          }
        }
      }
    } catch (err) {
      console.error('Failed to convert order to invoice:', err);
      if (onShowToast) onShowToast(err.message || 'Conversion failed', 'error');
    } finally {
      setConvertingId(null);
    }
  };

  // Simulate a new incoming order from a mobile salesman app
  const handleSimulateMobileOrder = async () => {
    setIsSimulating(true);
    try {
      if (window.electronAPI) {
        const products = await window.electronAPI.getProducts({ activeOnly: true });
        const retailers = await window.electronAPI.getRetailers({ activeOnly: true });

        if (!products || products.length === 0 || !retailers || retailers.length === 0) {
          if (onShowToast) onShowToast('Please seed demo products and retailers first', 'error');
          return;
        }

        const randomRetailer = retailers[Math.floor(Math.random() * retailers.length)];
        const beats = ['Nandgaon Market Beat', 'Station Road & Bus Stand', 'Yeola Naka Route', 'Old Agra Road'];
        const salesmen = [
          { name: 'Rahul Shinde (Field Salesman)', phone: '9822998811' },
          { name: 'Sanjay Patil (Order Booker)', phone: '9822776655' },
          { name: 'Amit Deshmukh (Beat Salesman)', phone: '9822668844' }
        ];
        const randomSalesman = salesmen[Math.floor(Math.random() * salesmen.length)];
        const randomBeat = beats[Math.floor(Math.random() * beats.length)];

        // Select 2-4 random items
        const numItems = Math.floor(Math.random() * 3) + 2;
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, numItems).map(p => ({
          product_id: p.id,
          item_name: p.name,
          hsn_code: p.hsn_code,
          unit: p.unit,
          quantity: (Math.floor(Math.random() * 4) + 1) * (p.pack_size || 24),
          mrp: p.mrp,
          rate: p.selling_rate,
          tax_rate: p.tax_rate
        }));

        const newOrder = await window.electronAPI.createOrder({
          order_number: `MOB-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          order_date: new Date().toISOString().split('T')[0],
          salesman_name: randomSalesman.name,
          salesman_phone: randomSalesman.phone,
          beat_name: randomBeat,
          retailer_id: randomRetailer.id,
          retailer_name: randomRetailer.shop_name,
          retailer_phone: randomRetailer.phone,
          retailer_address: randomRetailer.address,
          retailer_gstin: randomRetailer.gstin || '',
          notes: 'Received live via Android Order Booking App. Urgent delivery requested.',
          items: selectedItems
        });

        if (newOrder) {
          if (onShowToast) {
            onShowToast(`New mobile order #${newOrder.order_number} received from ${randomSalesman.name}!`, 'success');
          }
          await loadOrders();
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
      if (onShowToast) onShowToast('Failed to simulate order', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const convertedOrders = orders.filter(o => o.status === 'converted');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const pendingTotalValue = pendingOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Mobile Field Orders
              </h2>
              <p className="text-xs text-slate-500">
                Incoming orders booked by salespersons in the field via Android Mobile App
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCatalog}
            disabled={isSyncingCatalog}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Push active products & retailers master from SQLite to salesman mobile app"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
            <span>{isSyncingCatalog ? 'Syncing Catalog...' : 'Sync Catalog to Mobile'}</span>
          </button>
          <button
            onClick={handleSimulateMobileOrder}
            disabled={isSimulating}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-sky-600 to-brand-600 hover:from-sky-700 hover:to-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-brand-500/20 active:scale-95 disabled:opacity-50"
            title="Simulate an incoming order from a salesman's Android app"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSimulating ? 'Receiving Order...' : '+ Simulate Mobile App Order'}</span>
          </button>
          <button
            onClick={loadOrders}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>PENDING BILLING</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono-numbers">
            {pendingOrders.length} Orders
          </div>
          <div className="text-xs text-amber-700 font-semibold mt-1">
            Value: {formatINR(pendingTotalValue)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>CONVERTED TO INVOICES</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono-numbers">
            {convertedOrders.length} Billed
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            Successfully Invoiced & Synced
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>ACTIVE FIELD SALESMEN</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono-numbers">
            {new Set(orders.map(o => o.salesman_name)).size} Salesmen
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Booking orders on field routes
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>SALES BEATS / ROUTES</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 font-semibold">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono-numbers">
            {new Set(orders.map(o => o.beat_name).filter(Boolean)).size || 1} Beats
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Nandgaon, Station Rd, Old Agra Rd
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Pending ({pendingOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('converted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'converted'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Converted ({convertedOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Replaced / Cancelled ({cancelledOrders.length})
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search retailer, order #, salesman, beat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
            <span>Loading mobile field orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-slate-600">No mobile orders found</p>
            <p className="mt-1 text-slate-400">Click "+ Simulate Mobile App Order" to test order sync</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order # & Source</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Salesman & Beat</th>
                  <th className="py-3 px-4">Retailer Shop</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Order Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const isPending = ord.status === 'pending';
                  const isCancelled = ord.status === 'cancelled';
                  const isConverting = convertingId === ord.id;
                  const revisedFrom = ord.replaces_order_number || (ord.notes && ord.notes.match(/#(ORD-[0-9A-Za-z_-]+)/)?.[1]);

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelled ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* Order Number */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-md ${
                              isCancelled ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-sky-700'
                            }`}
                            title="From Android Sales App"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span
                              className={`font-bold font-mono-numbers ${
                                isCancelled ? 'text-slate-500 line-through' : 'text-slate-900'
                              }`}
                            >
                              {ord.order_number}
                            </span>
                            <div className="text-[10px] text-slate-400">Field App</div>
                            {revisedFrom && (
                              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                ✏️ Revised #{revisedFrom}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 font-mono-numbers">
                        {formatIndianDate(ord.order_date)}
                      </td>

                      {/* Salesman & Beat */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{ord.salesman_name}</div>
                        {ord.beat_name && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ord.beat_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Retailer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ord.retailer_name}</div>
                        {ord.retailer_address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{ord.retailer_address}</div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold font-mono-numbers">
                          {ord.item_count || 1} items ({ord.total_quantity || ord.item_count || 1} pcs)
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono-numbers text-sm">
                        {formatINR(ord.grand_total)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Replaced / Cancelled</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Billing</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Invoiced ({ord.converted_invoice_number || 'Billed'})</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(ord.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                            title="View Full Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isCancelled ? (
                            <span className="text-[11px] text-slate-400 italic px-2">Superseded</span>
                          ) : isPending ? (
                            <button
                              onClick={() => handleConvertOrder(ord.id)}
                              disabled={isConverting}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                              title="Generate Official Tax Invoice from this Order"
                            >
                              <span>{isConverting ? 'Billing...' : '⚡ Convert to Invoice'}</span>
                            </button>
                          ) : (
                            ord.converted_invoice_id && onSelectInvoice && (
                              <button
                                onClick={() => onSelectInvoice(ord.converted_invoice_id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 underline"
                              >
                                <span>View Bill</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mobile Order Details: {selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Booked by {selectedOrder.salesman_name} • {formatIndianDate(selectedOrder.order_date)}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedOrder.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : selectedOrder.status === 'cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {selectedOrder.status === 'pending'
                  ? 'Pending Conversion'
                  : selectedOrder.status === 'cancelled'
                  ? 'Replaced / Superseded'
                  : `Converted (${selectedOrder.converted_invoice_number})`}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Retailer / Customer</div>
                  <div className="font-bold text-slate-900 text-sm">{selectedOrder.retailer_name}</div>
                  {selectedOrder.retailer_phone && (
                    <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{selectedOrder.retailer_phone}</span>
                    </div>
                  )}
                  {selectedOrder.retailer_address && (
                    <div className="text-slate-500 mt-1">{selectedOrder.retailer_address}</div>
                  )}
                  {selectedOrder.retailer_gstin && (
                    <div className="text-emerald-700 font-semibold mt-1 font-mono">
                      GSTIN: {selectedOrder.retailer_gstin}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sales Route / Beat</div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>{selectedOrder.beat_name || 'General Market'}</span>
                  </div>
                  <div className="text-slate-600 mt-1">Booked by: <span className="font-semibold text-slate-800">{selectedOrder.salesman_name}</span></div>
                  {selectedOrder.notes && (
                    <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded border border-amber-200 text-[11px] italic">
                      "{selectedOrder.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="font-bold text-slate-800 mb-2">Booked Line Items</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 text-center">GST %</th>
                        <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono-numbers">
                      {selectedOrder.items?.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                            {it.item_name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans text-slate-500">
                            {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {it.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {formatINR(it.rate, false)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {it.tax_rate}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatINR(it.total_amount, false)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 font-mono-numbers">
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right font-sans">
                          Taxable Subtotal:
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatINR(selectedOrder.subtotal_taxable, false)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-right font-sans text-slate-600">
                          Total GST Amount:
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatINR(selectedOrder.total_tax, false)}
                        </td>
                      </tr>
                      <tr className="bg-amber-100/70 text-sm font-bold text-slate-900">
                        <td colSpan={5} className="py-3 px-3 text-right font-sans uppercase">
                          Grand Total Payable:
                        </td>
                        <td className="py-3 px-3 text-right text-brand-900">
                          {formatINR(selectedOrder.grand_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>

              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => handleConvertOrder(selectedOrder.id)}
                  disabled={convertingId === selectedOrder.id}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{convertingId === selectedOrder.id ? 'Generating Invoice...' : 'Convert to Official Tax Invoice'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

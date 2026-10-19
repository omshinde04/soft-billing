import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import NotificationToast from './components/NotificationToast.jsx';
import InvoicePrintModal from './components/InvoicePrintModal.jsx';
import CreditNotePrintModal from './components/CreditNotePrintModal.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import NewInvoicePage from './pages/NewInvoicePage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import RetailersPage from './pages/RetailersPage.jsx';
import SalesReturnsPage from './pages/SalesReturnsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [businessSettings, setBusinessSettings] = useState(null);
  const [notification, setNotification] = useState(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Invoice Preview Modal State
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Credit Note / Return Preview Modal State
  const [previewReturn, setPreviewReturn] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Load Settings and Pending Orders Count on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        if (window.electronAPI) {
          const s = await window.electronAPI.getSettings();
          setBusinessSettings(s);

          const metrics = await window.electronAPI.getDashboardMetrics();
          if (metrics && metrics.pendingOrdersCount !== undefined) {
            setPendingOrdersCount(metrics.pendingOrdersCount);
          }
        }
      } catch (err) {
        console.error('Failed to load initial settings:', err);
      }
    }
    loadSettings();
  }, [activePage]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const handleOpenInvoicePreview = async (invoiceId) => {
    try {
      if (window.electronAPI) {
        const inv = await window.electronAPI.getInvoiceById(invoiceId);
        if (inv) {
          setPreviewInvoice(inv);
          setIsPrintModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load invoice for preview:', err);
      showToast('Could not load invoice details', 'error');
    }
  };

  const handleOpenReturnPreview = async (returnId) => {
    try {
      if (window.electronAPI) {
        const ret = await window.electronAPI.getSalesReturnById(returnId);
        if (ret) {
          setPreviewReturn(ret);
          setIsReturnModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load sales return for preview:', err);
      showToast('Could not load credit note details', 'error');
    }
  };

  const handleInvoiceCreated = (invoice) => {
    setPreviewInvoice(invoice);
    setIsPrintModalOpen(true);
    setActivePage('invoices');
  };

  const pageTitles = {
    dashboard: 'Dashboard',
    orders: 'Mobile Field Orders (Android Sync)',
    'new-invoice': 'Create Tax Invoice',
    invoices: 'Invoice Records & History',
    products: 'Products Master',
    retailers: 'Retailers Master',
    returns: 'Sales Returns',
    reports: 'Reports & GSTR-1',
    settings: 'Settings'
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        businessSettings={businessSettings}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          pageTitle={pageTitles[activePage] || 'Billing-Soft'}
          businessSettings={businessSettings}
          onNewInvoice={activePage !== 'new-invoice' ? () => setActivePage('new-invoice') : null}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {activePage === 'dashboard' && (
            <DashboardPage
              onNavigate={setActivePage}
              onSelectInvoice={handleOpenInvoicePreview}
              onSelectReturn={handleOpenReturnPreview}
            />
          )}

          {activePage === 'orders' && (
            <OrdersPage
              onSelectInvoice={handleOpenInvoicePreview}
              onInvoiceCreated={handleInvoiceCreated}
              onShowToast={showToast}
            />
          )}

          {activePage === 'new-invoice' && (
            <NewInvoicePage
              businessSettings={businessSettings}
              onInvoiceCreated={handleInvoiceCreated}
              onShowToast={showToast}
            />
          )}

          {activePage === 'invoices' && (
            <InvoicesPage
              onSelectInvoice={handleOpenInvoicePreview}
              onNavigate={setActivePage}
              onShowToast={showToast}
            />
          )}

          {activePage === 'products' && (
            <ProductsPage onShowToast={showToast} />
          )}

          {activePage === 'retailers' && (
            <RetailersPage onShowToast={showToast} />
          )}

          {activePage === 'returns' && (
            <SalesReturnsPage
              businessSettings={businessSettings}
              onSelectReturn={handleOpenReturnPreview}
              onShowToast={showToast}
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage onShowToast={showToast} />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              businessSettings={businessSettings}
              onSettingsUpdated={setBusinessSettings}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Printable Invoice Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        invoice={previewInvoice}
        businessSettings={businessSettings}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Printable Credit Note Modal */}
      <CreditNotePrintModal
        isOpen={isReturnModalOpen}
        returnDoc={previewReturn}
        businessSettings={businessSettings}
        onClose={() => setIsReturnModalOpen(false)}
      />

      {/* Floating Notifications */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}


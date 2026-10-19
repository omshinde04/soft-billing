const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  // Products
  getProducts: (filter) => ipcRenderer.invoke('products:get', filter),
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  createProduct: (product) => ipcRenderer.invoke('products:create', product),
  updateProduct: (id, product) => ipcRenderer.invoke('products:update', { id, product }),
  toggleProductStatus: (id) => ipcRenderer.invoke('products:toggleStatus', id),

  // Retailers
  getRetailers: (filter) => ipcRenderer.invoke('retailers:get', filter),
  getRetailerById: (id) => ipcRenderer.invoke('retailers:getById', id),
  createRetailer: (retailer) => ipcRenderer.invoke('retailers:create', retailer),
  updateRetailer: (id, retailer) => ipcRenderer.invoke('retailers:update', { id, retailer }),
  toggleRetailerStatus: (id) => ipcRenderer.invoke('retailers:toggleStatus', id),

  // Invoices
  getInvoices: (filter) => ipcRenderer.invoke('invoices:get', filter),
  getInvoiceById: (id) => ipcRenderer.invoke('invoices:getById', id),
  createInvoice: (invoiceData) => ipcRenderer.invoke('invoices:create', invoiceData),
  cancelInvoice: (id, reason) => ipcRenderer.invoke('invoices:cancel', { id, reason }),
  getInvoiceReturnableItems: (invoiceId) => ipcRenderer.invoke('invoices:getReturnableItems', invoiceId),

  // Sales Returns
  getSalesReturns: (filter) => ipcRenderer.invoke('returns:get', filter),
  getSalesReturnById: (id) => ipcRenderer.invoke('returns:getById', id),
  createSalesReturn: (returnData) => ipcRenderer.invoke('returns:create', returnData),

  // Dashboard & Reports
  getDashboardMetrics: (filter) => ipcRenderer.invoke('dashboard:getMetrics', filter),
  getInvoiceWiseReport: (filter) => ipcRenderer.invoke('reports:getInvoiceWise', filter),
  getProductWiseReport: (filter) => ipcRenderer.invoke('reports:getProductWise', filter),
  getRetailerWiseReport: (filter) => ipcRenderer.invoke('reports:getRetailerWise', filter),
  getGSTSummaryReport: (filter) => ipcRenderer.invoke('reports:getGSTSummary', filter),
  getDocsSummaryReport: (filter) => ipcRenderer.invoke('reports:getDocsSummary', filter),
  getReturnsReport: (filter) => ipcRenderer.invoke('reports:getReturns', filter),
  exportExcel: (filter) => ipcRenderer.invoke('reports:exportExcel', filter),

  // Database Backup & Demo
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  seedDemoData: () => ipcRenderer.invoke('db:seedDemo'),

  // Print & PDF
  printInvoice: () => ipcRenderer.invoke('print:trigger'),
  saveInvoicePDF: (invoiceNumber) => ipcRenderer.invoke('print:savePDF', invoiceNumber)
});

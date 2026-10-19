import { ipcMain, dialog } from 'electron';
import path from 'path';
import {
  getBusinessSettings,
  updateBusinessSettings,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  getRetailers,
  getRetailerById,
  createRetailer,
  updateRetailer,
  toggleRetailerStatus,
  createInvoice,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  getInvoiceReturnableItems,
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  getDashboardMetrics
} from '../database/queries.js';
import {
  getInvoiceWiseReport,
  getProductWiseReport,
  getRetailerWiseReport,
  getGSTSummaryReport,
  getDocumentsSummaryReport,
  getSalesReturnReport
} from '../services/reportsService.js';
import { generateGSTR1Workbook } from '../services/excelExportService.js';
import { backupDatabase } from '../database/db.js';
import { seedDemoData } from '../services/sampleDataService.js';

export function registerIpcHandlers(mainWindow) {
  // ==========================================
  // Business Settings
  // ==========================================
  ipcMain.handle('settings:get', async () => {
    return getBusinessSettings();
  });

  ipcMain.handle('settings:update', async (_event, settings) => {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }
    return updateBusinessSettings(settings);
  });

  // ==========================================
  // Products
  // ==========================================
  ipcMain.handle('products:get', async (_event, filter = {}) => {
    return getProducts(filter);
  });

  ipcMain.handle('products:getById', async (_event, id) => {
    return getProductById(id);
  });

  ipcMain.handle('products:create', async (_event, product) => {
    if (!product || !product.name || !product.name.trim()) {
      throw new Error('Product name is required');
    }
    return createProduct(product);
  });

  ipcMain.handle('products:update', async (_event, { id, product }) => {
    if (!id || !product) throw new Error('Product ID and data required');
    return updateProduct(id, product);
  });

  ipcMain.handle('products:toggleStatus', async (_event, id) => {
    if (!id) throw new Error('Product ID required');
    return toggleProductStatus(id);
  });

  // ==========================================
  // Retailers
  // ==========================================
  ipcMain.handle('retailers:get', async (_event, filter = {}) => {
    return getRetailers(filter);
  });

  ipcMain.handle('retailers:getById', async (_event, id) => {
    return getRetailerById(id);
  });

  ipcMain.handle('retailers:create', async (_event, retailer) => {
    if (!retailer || !retailer.shop_name || !retailer.shop_name.trim()) {
      throw new Error('Retailer shop name is required');
    }
    return createRetailer(retailer);
  });

  ipcMain.handle('retailers:update', async (_event, { id, retailer }) => {
    if (!id || !retailer) throw new Error('Retailer ID and data required');
    return updateRetailer(id, retailer);
  });

  ipcMain.handle('retailers:toggleStatus', async (_event, id) => {
    if (!id) throw new Error('Retailer ID required');
    return toggleRetailerStatus(id);
  });

  // ==========================================
  // Invoices
  // ==========================================
  ipcMain.handle('invoices:get', async (_event, filter = {}) => {
    return getInvoices(filter);
  });

  ipcMain.handle('invoices:getById', async (_event, id) => {
    return getInvoiceById(id);
  });

  ipcMain.handle('invoices:create', async (_event, invoiceData) => {
    if (!invoiceData || !invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('Invoice must contain at least one item');
    }
    return createInvoice(invoiceData);
  });

  ipcMain.handle('invoices:cancel', async (_event, { id, reason }) => {
    if (!id) throw new Error('Invoice ID required');
    return cancelInvoice(id, reason || 'Cancelled by user');
  });

  ipcMain.handle('invoices:getReturnableItems', async (_event, invoiceId) => {
    if (!invoiceId) throw new Error('Invoice ID required');
    return getInvoiceReturnableItems(invoiceId);
  });

  // ==========================================
  // Sales Returns
  // ==========================================
  ipcMain.handle('returns:get', async (_event, filter = {}) => {
    return getSalesReturns(filter);
  });

  ipcMain.handle('returns:getById', async (_event, id) => {
    return getSalesReturnById(id);
  });

  ipcMain.handle('returns:create', async (_event, returnData) => {
    if (!returnData || !returnData.invoice_id || !returnData.items) {
      throw new Error('Invalid return data');
    }
    return createSalesReturn(returnData);
  });

  // ==========================================
  // Dashboard & Reports
  // ==========================================
  ipcMain.handle('dashboard:getMetrics', async (_event, filter = {}) => {
    return getDashboardMetrics(filter);
  });

  ipcMain.handle('reports:getInvoiceWise', async (_event, filter = {}) => {
    return getInvoiceWiseReport(filter);
  });

  ipcMain.handle('reports:getProductWise', async (_event, filter = {}) => {
    return getProductWiseReport(filter);
  });

  ipcMain.handle('reports:getRetailerWise', async (_event, filter = {}) => {
    return getRetailerWiseReport(filter);
  });

  ipcMain.handle('reports:getGSTSummary', async (_event, filter = {}) => {
    return getGSTSummaryReport(filter);
  });

  ipcMain.handle('reports:getDocsSummary', async (_event, filter = {}) => {
    return getDocumentsSummaryReport(filter);
  });

  ipcMain.handle('reports:getReturns', async (_event, filter = {}) => {
    return getSalesReturnReport(filter);
  });

  // ==========================================
  // Excel Export
  // ==========================================
  ipcMain.handle('reports:exportExcel', async (_event, filter = {}) => {
    const defaultFilename = `GSTR_1_Report_${filter.fromDate || 'start'}_to_${filter.toDate || 'end'}.xlsx`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export GSTR-1 Excel Report',
      defaultPath: defaultFilename,
      filters: [{ name: 'Excel Workbook (*.xlsx)', extensions: ['xlsx'] }]
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await generateGSTR1Workbook({
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      filePath: filePath
    });

    return { canceled: false, success: true, filePath };
  });

  // ==========================================
  // Database Backup & Demo Data
  // ==========================================
  ipcMain.handle('db:backup', async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup SQLite Database',
      defaultPath: `billing_soft_backup_${timestamp}.db`,
      filters: [{ name: 'SQLite Database (*.db)', extensions: ['db'] }]
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await backupDatabase(filePath);
    return { canceled: false, success: true, filePath };
  });

  ipcMain.handle('db:seedDemo', async () => {
    return seedDemoData();
  });

  // ==========================================
  // Printing & PDF Generation
  // ==========================================
  ipcMain.handle('print:trigger', async () => {
    if (mainWindow) {
      mainWindow.webContents.print({ silent: false, printBackground: true });
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('print:savePDF', async (_event, invoiceNumber = 'Invoice') => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice as PDF',
      defaultPath: `${invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) return { canceled: true };

    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'printableArea' }
    });

    const fs = await import('fs');
    fs.writeFileSync(filePath, data);
    return { canceled: false, success: true, filePath };
  });
}

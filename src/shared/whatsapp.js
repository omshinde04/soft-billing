import { formatIndianDate, formatINR } from './calculations.js';

/**
 * WhatsApp Integration Utilities for FMCG Billing-Soft.
 * Formats structured business messages and opens WhatsApp Desktop / Web.
 */

export function generateInvoiceWhatsAppText(invoice, businessSettings) {
  const sellerName = businessSettings?.trade_name || businessSettings?.legal_name || 'Distributor';
  const retailer = invoice?.retailer || {};
  const items = invoice?.items || [];

  let text = `*TAX INVOICE — ${sellerName.toUpperCase()}*\n`;
  text += `-------------------------------------------\n`;
  text += `*Bill No:* ${invoice.invoice_number}\n`;
  text += `*Date:* ${formatIndianDate(invoice.invoice_date)}\n`;
  text += `*Customer:* ${retailer.shop_name || 'Cash Customer'}\n`;
  if (invoice.place_of_supply) {
    text += `*Place of Supply:* ${invoice.place_of_supply}\n`;
  }
  text += `-------------------------------------------\n`;
  text += `*ITEMS BILLED:*\n`;

  items.forEach((item, idx) => {
    const rateFormatted = Number(item.rate || 0).toFixed(2);
    const lineTotal = Number(item.total_amount || 0).toFixed(2);
    text += `${idx + 1}. *${item.item_name}*\n`;
    text += `   Qty: ${item.quantity} ${item.unit} @ Rs. ${rateFormatted} = *Rs. ${lineTotal}*\n`;
  });

  text += `-------------------------------------------\n`;
  text += `*Taxable Value:* ${formatINR(invoice.subtotal_taxable)}\n`;

  if (invoice.is_inter_state) {
    text += `*IGST:* ${formatINR(invoice.total_igst)}\n`;
  } else {
    text += `*CGST:* ${formatINR(invoice.total_cgst)}\n`;
    text += `*SGST:* ${formatINR(invoice.total_sgst)}\n`;
  }

  if (invoice.round_off !== 0) {
    const ro = invoice.round_off > 0 ? `+${invoice.round_off.toFixed(2)}` : invoice.round_off.toFixed(2);
    text += `*Round Off:* ${ro}\n`;
  }

  text += `-------------------------------------------\n`;
  text += `*TOTAL PAYABLE: ${formatINR(invoice.grand_total)}*\n`;
  text += `-------------------------------------------\n`;

  if (businessSettings?.bank_name && businessSettings?.bank_account_no) {
    text += `*Bank Details for Payment:*\n`;
    text += `Bank: ${businessSettings.bank_name}\n`;
    text += `A/C: ${businessSettings.bank_account_no}\n`;
    if (businessSettings.bank_ifsc) text += `IFSC: ${businessSettings.bank_ifsc}\n`;
    if (businessSettings.bank_branch) text += `Branch: ${businessSettings.bank_branch}\n`;
    text += `-------------------------------------------\n`;
  }

  text += `_Thank you for your business!_`;
  return text;
}

export function generateReturnWhatsAppText(returnDoc, businessSettings) {
  const sellerName = businessSettings?.trade_name || businessSettings?.legal_name || 'Distributor';
  const items = returnDoc?.items || [];

  let text = `*CREDIT NOTE / SALES RETURN — ${sellerName.toUpperCase()}*\n`;
  text += `-------------------------------------------\n`;
  text += `*Credit Note No:* ${returnDoc.return_number}\n`;
  text += `*Date:* ${formatIndianDate(returnDoc.return_date)}\n`;
  text += `*Against Invoice:* ${returnDoc.invoice_number}\n`;
  text += `*Customer:* ${returnDoc.retailer_name || 'Valued Retailer'}\n`;
  if (returnDoc.reason) {
    text += `*Reason:* ${returnDoc.reason}\n`;
  }
  text += `-------------------------------------------\n`;
  text += `*RETURNED ITEMS:*\n`;

  items.forEach((item, idx) => {
    text += `${idx + 1}. *${item.item_name}*\n`;
    text += `   Return Qty: ${item.return_qty} | Refund: *Rs. ${Number(item.refund_total || 0).toFixed(2)}*\n`;
  });

  text += `-------------------------------------------\n`;
  text += `*TOTAL REFUND CREDIT: ${formatINR(returnDoc.total_refund_amount)}*\n`;
  text += `-------------------------------------------\n`;
  text += `_This credit has been adjusted against your ledger._`;
  return text;
}

export function generateInvoicePDFWhatsAppText(invoice, businessSettings) {
  const sellerName = businessSettings?.trade_name || businessSettings?.legal_name || 'Distributor';
  const retailer = invoice?.retailer || {};
  let text = `*TAX INVOICE — ${sellerName.toUpperCase()}*\n`;
  text += `-------------------------------------------\n`;
  text += `*Bill No:* ${invoice.invoice_number}\n`;
  text += `*Date:* ${formatIndianDate(invoice.invoice_date)}\n`;
  text += `*Customer:* ${retailer.shop_name || 'Cash Customer'}\n`;
  text += `*Total Amount:* ${formatINR(invoice.grand_total)}\n`;
  text += `-------------------------------------------\n`;
  text += `*Tax Invoice Document:* ${invoice.invoice_number}.pdf\n`;
  text += `(Please find your GST Tax Invoice PDF attached)\n`;
  if (businessSettings?.bank_name && businessSettings?.bank_account_no) {
    text += `\n*Payment Details:*\n`;
    text += `Bank: ${businessSettings.bank_name}\n`;
    text += `A/C: ${businessSettings.bank_account_no} (IFSC: ${businessSettings.bank_ifsc || 'N/A'})\n`;
  }
  text += `\n_Thank you for your business!_`;
  return text;
}

export function generateReturnPDFWhatsAppText(returnDoc, businessSettings) {
  const sellerName = businessSettings?.trade_name || businessSettings?.legal_name || 'Distributor';
  let text = `*CREDIT NOTE / SALES RETURN — ${sellerName.toUpperCase()}*\n`;
  text += `-------------------------------------------\n`;
  text += `*Credit Note No:* ${returnDoc.return_number}\n`;
  text += `*Date:* ${formatIndianDate(returnDoc.return_date)}\n`;
  text += `*Against Invoice:* ${returnDoc.invoice_number}\n`;
  text += `*Customer:* ${returnDoc.retailer_name || 'Valued Retailer'}\n`;
  text += `*Total Refund Credit:* ${formatINR(returnDoc.total_refund_amount)}\n`;
  text += `-------------------------------------------\n`;
  text += `*Credit Note Document:* ${returnDoc.return_number}.pdf\n`;
  text += `(Please find your Credit Note PDF attached)\n`;
  text += `\n_This credit has been adjusted against your ledger._`;
  return text;
}

export function openWhatsAppShare(phoneNumber, text, mode = 'universal') {
  const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  // Format Indian mobile number to 91XXXXXXXXXX if 10 digits
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(text);

  let url;
  if (mode === 'desktop') {
    url = targetPhone
      ? `whatsapp://send?phone=${targetPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
  } else if (mode === 'web') {
    url = targetPhone
      ? `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
  } else {
    url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
  }

  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

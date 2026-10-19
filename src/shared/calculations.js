// Financial Calculation Engine for Billing-Soft
// Pure, deterministic, independently testable JavaScript calculation module.

/**
 * Rounds a number reliably to specified decimal places.
 * Avoids common binary floating-point representation quirks.
 */
export function roundTo(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a number to 2 decimal places string: "1234.50"
 */
export function formatDecimal(num, decimals = 2) {
  return roundTo(num, decimals).toFixed(decimals);
}

/**
 * Formats a number in Indian Rupee format (e.g., ₹1,23,456.78)
 */
export function formatINR(amount, includeSymbol = true) {
  const rounded = roundTo(amount, 2);
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);
  const parts = absVal.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian numbering system: 3 digits rightmost, then groups of 2
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const sign = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';
  return `${sign}${symbol}${formattedInt}.${decPart}`;
}

/**
 * Formats date from YYYY-MM-DD to DD-MM-YYYY (Indian format)
 */
export function formatIndianDate(dateString) {
  if (!dateString) return '';
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Validates the GSTIN format using standard Indian GSTIN regex.
 * Format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 entity digit + 'Z' + 1 checksum
 * Note: Syntax validation does NOT guarantee registration or legal validity.
 */
export function validateGSTIN(gstin) {
  if (!gstin) return { valid: true, error: null }; // Optional field
  const trimmed = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid GSTIN format. Expected: 15 alphanumeric characters (e.g., 27ABCDE1234F1Z5)'
    };
  }
  return { valid: true, error: null, formatted: trimmed };
}

/**
 * Calculates line-level financials for an invoice item.
 *
 * @param {Object} params
 * @param {number} params.quantity - Quantity sold
 * @param {number} params.rate - Unit selling rate (tax-exclusive or tax-inclusive depending on pricingMode)
 * @param {number} params.taxRate - GST rate % (e.g., 5, 12, 18, 28)
 * @param {number} [params.discount=0] - Total line discount amount in INR
 * @param {string} [params.pricingMode='exclusive'] - 'exclusive' or 'inclusive'
 * @param {boolean} [params.isInterState=false] - True if IGST applies (supplier state != customer state)
 */
export function calculateLineItem({
  quantity = 1,
  rate = 0,
  taxRate = 5,
  discount = 0,
  pricingMode = 'exclusive',
  isInterState = false
}) {
  const qty = Number(quantity) || 0;
  const unitRate = Number(rate) || 0;
  const gstRate = Number(taxRate) || 0;
  const disc = Number(discount) || 0;

  if (qty <= 0 || unitRate < 0) {
    return {
      quantity: qty,
      rate: unitRate,
      grossRate: unitRate,
      discountAmount: 0,
      taxableAmount: 0,
      taxRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: 0
    };
  }

  let taxableAmount = 0;
  let grossRate = unitRate;
  let baseRate = unitRate;

  if (pricingMode === 'inclusive') {
    grossRate = unitRate;
    const grossTotal = roundTo(qty * grossRate - disc, 2);
    // Back-calculate taxable value: Gross / (1 + GST% / 100)
    taxableAmount = roundTo(grossTotal / (1 + gstRate / 100), 2);
    baseRate = qty > 0 ? roundTo(taxableAmount / qty, 2) : 0;
  } else {
    // Exclusive pricing: Base rate entered, taxes added on top
    baseRate = unitRate;
    taxableAmount = roundTo(qty * baseRate - disc, 2);
    grossRate = roundTo(baseRate * (1 + gstRate / 100), 2);
  }

  // Calculate tax breakdown
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = roundTo((taxableAmount * gstRate) / 100, 2);
  } else {
    // Intra-state: Split equally between CGST and SGST
    const halfRate = gstRate / 2;
    cgstAmount = roundTo((taxableAmount * halfRate) / 100, 2);
    sgstAmount = roundTo((taxableAmount * halfRate) / 100, 2);
  }

  const totalTax = roundTo(cgstAmount + sgstAmount + igstAmount, 2);
  const totalAmount = roundTo(taxableAmount + totalTax, 2);

  return {
    quantity: qty,
    rate: baseRate,
    grossRate: grossRate,
    discountAmount: disc,
    taxableAmount: taxableAmount,
    taxRate: gstRate,
    cgstAmount: cgstAmount,
    sgstAmount: sgstAmount,
    igstAmount: igstAmount,
    totalTax: totalTax,
    totalAmount: totalAmount
  };
}

/**
 * Calculates entire invoice totals from an array of calculated line items.
 *
 * @param {Array<Object>} items - Array of line items
 * @param {string} [pricingMode='exclusive']
 * @param {boolean} [isInterState=false]
 */
export function calculateInvoiceTotals(items = [], pricingMode = 'exclusive', isInterState = false) {
  let subtotalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQuantity = 0;

  const processedItems = items.map(item => {
    const calc = calculateLineItem({
      quantity: item.quantity,
      rate: item.rate !== undefined ? item.rate : item.selling_rate,
      taxRate: item.taxRate !== undefined ? item.taxRate : item.tax_rate,
      discount: item.discount || item.discount_amount || 0,
      pricingMode: pricingMode,
      isInterState: isInterState
    });

    subtotalTaxable = roundTo(subtotalTaxable + calc.taxableAmount, 2);
    totalCgst = roundTo(totalCgst + calc.cgstAmount, 2);
    totalSgst = roundTo(totalSgst + calc.sgstAmount, 2);
    totalIgst = roundTo(totalIgst + calc.igstAmount, 2);
    totalQuantity += calc.quantity;

    return {
      ...item,
      ...calc
    };
  });

  const totalTax = roundTo(totalCgst + totalSgst + totalIgst, 2);
  const rawTotal = roundTo(subtotalTaxable + totalTax, 2);
  const grandTotal = Math.round(rawTotal);
  const roundOff = roundTo(grandTotal - rawTotal, 2);

  return {
    items: processedItems,
    itemCount: processedItems.length,
    totalQuantity: totalQuantity,
    subtotalTaxable: subtotalTaxable,
    totalCgst: totalCgst,
    totalSgst: totalSgst,
    totalIgst: totalIgst,
    totalTax: totalTax,
    rawTotal: rawTotal,
    roundOff: roundOff,
    grandTotal: grandTotal,
    amountInWords: numberToWordsINR(grandTotal)
  };
}

/**
 * Converts integer INR amount to standard Indian English words.
 * e.g., 4227 -> "INR Four Thousand Two Hundred Twenty-Seven Only"
 */
export function numberToWordsINR(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return 'INR Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unitPart = n % 10 > 0 ? '-' + units[n % 10] : '';
    return tens[Math.floor(n / 10)] + unitPart;
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += units[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  const parts = [];
  if (crores > 0) parts.push(convertTwoDigits(crores) + ' Crore');
  if (lakhs > 0) parts.push(convertTwoDigits(lakhs) + ' Lakh');
  if (thousands > 0) parts.push(convertTwoDigits(thousands) + ' Thousand');
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  return 'INR ' + parts.join(' ') + ' Only';
}

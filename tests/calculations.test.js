import { describe, it, expect } from 'vitest';
import {
  roundTo,
  formatINR,
  calculateLineItem,
  calculateInvoiceTotals,
  numberToWordsINR,
  validateGSTIN
} from '../src/shared/calculations.js';

describe('Financial Calculation Engine', () => {
  describe('roundTo', () => {
    it('accurately rounds floating point numbers without quirks', () => {
      expect(roundTo(1.005, 2)).toBe(1.01);
      expect(roundTo(1.004, 2)).toBe(1.00);
      expect(roundTo(4226.52, 2)).toBe(4226.52);
    });
  });

  describe('formatINR', () => {
    it('formats Indian numbering with appropriate commas and symbols', () => {
      expect(formatINR(4227)).toBe('₹4,227.00');
      expect(formatINR(1504227.5)).toBe('₹15,04,227.50');
      expect(formatINR(618.51, false)).toBe('618.51');
    });
  });

  describe('validateGSTIN', () => {
    it('validates standard 15-character Indian GSTIN syntax', () => {
      expect(validateGSTIN('27EBYPB2347Q1ZT').valid).toBe(true);
      expect(validateGSTIN('27AAPCA1234F1Z5').valid).toBe(true);
      expect(validateGSTIN('INVALID_GSTIN').valid).toBe(false);
      expect(validateGSTIN('').valid).toBe(true); // Optional
    });
  });

  describe('calculateLineItem - Tax Exclusive Mode', () => {
    it('calculates 5% intra-state GST correctly', () => {
      // 10 items at 100 base rate = 1000 taxable. 2.5% CGST (25), 2.5% SGST (25). Total = 1050
      const result = calculateLineItem({
        quantity: 10,
        rate: 100,
        taxRate: 5,
        discount: 0,
        pricingMode: 'exclusive',
        isInterState: false
      });

      expect(result.taxableAmount).toBe(1000);
      expect(result.cgstAmount).toBe(25);
      expect(result.sgstAmount).toBe(25);
      expect(result.igstAmount).toBe(0);
      expect(result.totalAmount).toBe(1050);
    });

    it('calculates 18% inter-state IGST correctly', () => {
      const result = calculateLineItem({
        quantity: 5,
        rate: 200,
        taxRate: 18,
        discount: 50,
        pricingMode: 'exclusive',
        isInterState: true
      });

      // 5 * 200 - 50 = 950 taxable
      expect(result.taxableAmount).toBe(950);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(171); // 950 * 18% = 171
      expect(result.totalAmount).toBe(1121);
    });

    it('handles 0% exempt tax correctly', () => {
      const result = calculateLineItem({
        quantity: 20,
        rate: 15,
        taxRate: 0,
        pricingMode: 'exclusive'
      });

      expect(result.taxableAmount).toBe(300);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.totalAmount).toBe(300);
    });
  });

  describe('calculateLineItem - Tax Inclusive Mode (FMCG Wholesale pricing)', () => {
    it('decomposes inclusive gross price into taxable value and 5% GST', () => {
      // Line: Qty 72, Gross Rate 9.02 => Gross Total = 649.44
      // Taxable = 649.44 / 1.05 = 618.51
      // Tax = 618.51 * 5% = 30.93 (CGST 15.46 + SGST 15.46 = 30.92/30.93)
      const result = calculateLineItem({
        quantity: 72,
        rate: 9.02,
        taxRate: 5,
        discount: 0,
        pricingMode: 'inclusive',
        isInterState: false
      });

      expect(result.taxableAmount).toBe(618.51);
      expect(result.totalAmount).toBe(649.43); // 618.51 + 15.46 + 15.46
      expect(result.rate).toBe(8.59); // Base rate displayed
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('calculates entire invoice with multiple items, round-off and Indian words', () => {
      const items = [
        { name: 'Item 1', quantity: 10, rate: 100, taxRate: 5 },
        { name: 'Item 2', quantity: 4, rate: 250, taxRate: 12 },
        { name: 'Item 3', quantity: 2, rate: 500, taxRate: 18 }
      ];

      const invoice = calculateInvoiceTotals(items, 'exclusive', false);

      // Item 1: 1000 taxable + 25 CGST + 25 SGST = 1050
      // Item 2: 1000 taxable + 60 CGST + 60 SGST = 1120
      // Item 3: 1000 taxable + 90 CGST + 90 SGST = 1180
      // Subtotal Taxable = 3000
      // Total CGST = 175, SGST = 175
      // Raw Total = 3350
      // Round Off = 0.00
      // Grand Total = 3350
      expect(invoice.subtotalTaxable).toBe(3000);
      expect(invoice.totalCgst).toBe(175);
      expect(invoice.totalSgst).toBe(175);
      expect(invoice.totalTax).toBe(350);
      expect(invoice.grandTotal).toBe(3350);
      expect(invoice.roundOff).toBe(0);
      expect(invoice.amountInWords).toBe('INR Three Thousand Three Hundred Fifty Only');
    });

    it('calculates round-off correctly when total has paise', () => {
      const items = [
        { name: 'Item', quantity: 1, rate: 100.45, taxRate: 5 }
      ];

      // Taxable: 100.45, CGST: 2.51, SGST: 2.51 -> Total: 105.47
      // Grand Total rounds to 105. Round off = -0.47
      const invoice = calculateInvoiceTotals(items, 'exclusive', false);
      expect(invoice.rawTotal).toBe(105.47);
      expect(invoice.grandTotal).toBe(105);
      expect(invoice.roundOff).toBe(-0.47);
    });
  });

  describe('numberToWordsINR', () => {
    it('converts amounts to standard Indian English words', () => {
      expect(numberToWordsINR(4227)).toBe('INR Four Thousand Two Hundred Twenty-Seven Only');
      expect(numberToWordsINR(100000)).toBe('INR One Lakh Only');
      expect(numberToWordsINR(12500000)).toBe('INR One Crore Twenty-Five Lakh Only');
      expect(numberToWordsINR(0)).toBe('INR Zero Only');
    });
  });
});

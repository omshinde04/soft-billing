// System Constants for Billing-Soft FMCG Billing

export const GST_RATES = [0, 5, 12, 18, 28];

export const UNITS = [
  { code: 'PCS', name: 'Pieces' },
  { code: 'BOX', name: 'Boxes' },
  { code: 'PACK', name: 'Packs' },
  { code: 'KG', name: 'Kilograms' },
  { code: 'CASE', name: 'Cases / Cartons' },
  { code: 'OTH', name: 'Others' }
];

export const UQC_MAPPING = {
  'PCS': 'PCS-PIECES',
  'BOX': 'BOX-BOXES',
  'PACK': 'PAC-PACKETS',
  'KG': 'KGS-KILOGRAMS',
  'CASE': 'CAS-CASES',
  'OTH': 'OTH-OTHERS'
};

export const INDIAN_STATES = [
  { code: '27', name: 'Maharashtra', label: '27-Maharashtra' },
  { code: '24', name: 'Gujarat', label: '24-Gujarat' },
  { code: '23', name: 'Madhya Pradesh', label: '23-Madhya Pradesh' },
  { code: '29', name: 'Karnataka', label: '29-Karnataka' },
  { code: '28', name: 'Andhra Pradesh', label: '28-Andhra Pradesh' },
  { code: '36', name: 'Telangana', label: '36-Telangana' },
  { code: '32', name: 'Kerala', label: '32-Kerala' },
  { code: '33', name: 'Tamil Nadu', label: '33-Tamil Nadu' },
  { code: '07', name: 'Delhi', label: '07-Delhi' },
  { code: '08', name: 'Rajasthan', label: '08-Rajasthan' },
  { code: '09', name: 'Uttar Pradesh', label: '09-Uttar Pradesh' }
];

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  CANCELLED: 'cancelled'
};

export const PRICING_MODES = {
  EXCLUSIVE: 'exclusive',
  INCLUSIVE: 'inclusive'
};

export interface FuelRecord {
  id: string;
  date: string; // YYYY-MM-DD
  state: string; // e.g. "IL"
  gallons: number; // e.g. 59.812
  fuelType: 'D' | 'G'; // 'D' for Diesel, 'G' for Gas
  purchasedFrom: string; // e.g. "QUICK TRIP ADDISON"
  invoiceNumber: string; // e.g. "93285"
  amount: number; // e.g. 354.01
  receiptImage?: string; // base64 data URL
  receiptFileName?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReportMeta {
  driverName?: string;
  driverSignature?: string; // base64 canvas data URL or text
  date?: string;
  carrierName?: string;
  unitNumber?: string;
}

export interface OCRResult {
  date?: string;
  state?: string;
  gallons?: number;
  fuelType?: 'D' | 'G';
  purchasedFrom?: string;
  invoiceNumber?: string;
  amount?: number;
  pricePerGallon?: number;
  notes?: string;
}

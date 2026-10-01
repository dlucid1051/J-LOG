import { FuelRecord, ReportMeta } from '../types/fuel';

const DB_NAME = 'FuelPurchaseLogDB';
const DB_VERSION = 1;
const RECORDS_STORE = 'fuel_records';
const META_STORE = 'report_meta';

// Initial handwritten records from the paper log image
export const INITIAL_RECORDS: Omit<FuelRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    date: '2026-09-04',
    state: 'IL',
    gallons: 59.812,
    fuelType: 'D',
    purchasedFrom: 'QUICK TRIP ADDISON',
    invoiceNumber: '93285',
    amount: 354.01,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-08',
    state: 'IL',
    gallons: 61.027,
    fuelType: 'D',
    purchasedFrom: 'SHELL GILBERTS',
    invoiceNumber: '19163',
    amount: 360.0,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-10',
    state: 'IL',
    gallons: 40.996,
    fuelType: 'D',
    purchasedFrom: 'QUICK TRIP ADDISON',
    invoiceNumber: '93413',
    amount: 245.94,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-15',
    state: 'IL',
    gallons: 54.176,
    fuelType: 'D',
    purchasedFrom: 'THORNTONS N. AURORA',
    invoiceNumber: 'E2V5YZ',
    amount: 325.0,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-17',
    state: 'IL',
    gallons: 49.649,
    fuelType: 'D',
    purchasedFrom: 'SHELL GILBERTS',
    invoiceNumber: '725557',
    amount: 317.7,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-18',
    state: 'IL',
    gallons: 48.872,
    fuelType: 'D',
    purchasedFrom: 'SHELL GILBERTS',
    invoiceNumber: '19750',
    amount: 312.73,
    notes: 'Recreated from original fuel log',
  },
  {
    date: '2026-09-25',
    state: 'IL',
    gallons: 29.633,
    fuelType: 'D',
    purchasedFrom: 'QUICK TRIP ADDISON',
    invoiceNumber: '',
    amount: 199.99,
    notes: 'Recreated from original fuel log (Receipt pending)',
  },
  {
    date: '2026-09-30',
    state: 'IL',
    gallons: 60.259,
    fuelType: 'D',
    purchasedFrom: 'QUICK TRIP ADDISON',
    invoiceNumber: '',
    amount: 385.6,
    notes: 'Recreated from original fuel log (End of month fuel)',
  },
];

class IndexedDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create records object store with indexes
        if (!db.objectStoreNames.contains(RECORDS_STORE)) {
          const recordStore = db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
          recordStore.createIndex('date', 'date', { unique: false });
          recordStore.createIndex('state', 'state', { unique: false });
          recordStore.createIndex('fuelType', 'fuelType', { unique: false });
          recordStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
          recordStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create meta/settings store
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Initialize DB and seed initial records if empty
  async init(): Promise<FuelRecord[]> {
    const db = await this.openDB();
    const existing = await this.getAllRecords();

    if (existing.length === 0) {
      // Seed records from image
      const seeded: FuelRecord[] = [];
      const now = Date.now();

      const tx = db.transaction(RECORDS_STORE, 'readwrite');
      const store = tx.objectStore(RECORDS_STORE);

      for (let i = 0; i < INITIAL_RECORDS.length; i++) {
        const item = INITIAL_RECORDS[i];
        const record: FuelRecord = {
          ...item,
          id: `seed-record-${i + 1}-${now}`,
          createdAt: now + i * 1000,
          updatedAt: now + i * 1000,
        };
        store.put(record);
        seeded.push(record);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      return seeded;
    }

    return existing;
  }

  async getAllRecords(): Promise<FuelRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readonly');
      const store = tx.objectStore(RECORDS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as FuelRecord[]) || [];
        // Sort by date ascending, then by createdAt
        records.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.createdAt - b.createdAt;
        });
        resolve(records);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getRecordById(id: string): Promise<FuelRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readonly');
      const store = tx.objectStore(RECORDS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async addRecord(recordData: Omit<FuelRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<FuelRecord> {
    const db = await this.openDB();
    const now = Date.now();
    const newRecord: FuelRecord = {
      ...recordData,
      id: recordData.id || `fuel-${now}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readwrite');
      const store = tx.objectStore(RECORDS_STORE);
      const request = store.add(newRecord);

      request.onsuccess = () => resolve(newRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async updateRecord(record: FuelRecord): Promise<FuelRecord> {
    const db = await this.openDB();
    const updatedRecord: FuelRecord = {
      ...record,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readwrite');
      const store = tx.objectStore(RECORDS_STORE);
      const request = store.put(updatedRecord);

      request.onsuccess = () => resolve(updatedRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readwrite');
      const store = tx.objectStore(RECORDS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async resetToSeedData(): Promise<FuelRecord[]> {
    const db = await this.openDB();
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.clear();

    const seeded: FuelRecord[] = [];
    const now = Date.now();

    for (let i = 0; i < INITIAL_RECORDS.length; i++) {
      const item = INITIAL_RECORDS[i];
      const record: FuelRecord = {
        ...item,
        id: `seed-record-${i + 1}-${now}`,
        createdAt: now + i * 1000,
        updatedAt: now + i * 1000,
      };
      store.put(record);
      seeded.push(record);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return seeded;
  }

  async getMeta(key: string): Promise<any> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async setMeta(key: string, value: any): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const fuelDb = new IndexedDBManager();

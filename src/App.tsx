import React, { useState, useEffect, useMemo } from 'react';
import { fuelDb, INITIAL_RECORDS } from './db/indexedDB';
import { FuelRecord } from './types/fuel';
import { RecordCard } from './components/RecordCard';
import { RecordModal } from './components/RecordModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { FuelReportModal } from './components/FuelReportModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  Plus,
  FileText,
  Fuel,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  Receipt,
  Layers,
  ChevronDown,
  Camera,
  Calendar,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelFilter, setFuelFilter] = useState<'ALL' | 'D' | 'G'>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FuelRecord | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [receiptToView, setReceiptToView] = useState<FuelRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FuelRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize DB and load records
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await fuelDb.init();
        setRecords(data);
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Add / Edit Record handler
  const handleSaveRecord = async (
    recordData: Omit<FuelRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    if (recordData.id) {
      // Editing existing
      const existing = records.find((r) => r.id === recordData.id);
      if (existing) {
        const updated = await fuelDb.updateRecord({
          ...existing,
          ...recordData,
        });
        setRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        showToast('Fuel purchase updated successfully.');
      }
    } else {
      // New record
      const created = await fuelDb.addRecord(recordData);
      setRecords((prev) => [created, ...prev]);
      showToast('New fuel record added with receipt.');
    }
  };

  // Delete Record handler
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      await fuelDb.deleteRecord(recordToDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      showToast('Record deleted.');
    } catch (err: any) {
      showToast('Error deleting record: ' + err.message);
    }
  };

  // Reset to the original 8 records from the photo
  const handleResetToSeed = async () => {
    try {
      setIsLoading(true);
      const seeded = await fuelDb.resetToSeedData();
      setRecords(seeded);
      setIsResetModalOpen(false);
      showToast('Reset to original 8 handwritten fuel log records.');
    } catch (err: any) {
      showToast('Failed to reset: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchFuel = fuelFilter === 'ALL' || r.fuelType === fuelFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.purchasedFrom.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q)) ||
        (r.state && r.state.toLowerCase().includes(q));

      return matchFuel && matchQuery;
    });
  }, [records, fuelFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalGal = records.reduce((sum, r) => sum + r.gallons, 0);
    const totalSpent = records.reduce((sum, r) => sum + r.amount, 0);
    const avgPrice = totalGal > 0 ? totalSpent / totalGal : 0;
    const receiptsCount = records.filter((r) => r.receiptImage).length;

    return {
      totalGal,
      totalSpent,
      avgPrice,
      receiptsCount,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none flex items-center gap-2">
              <span>J-LOG</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                FUEL
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Fuel Purchases & Receipt OCR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-200 transition cursor-pointer"
            title="Generate & Print Official Form Report"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Report Sheet</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Dashboard Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Gallons
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
                {metrics.totalGal.toFixed(3)}
              </span>
              <span className="text-xs text-slate-500">gal</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Purchases
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                ${metrics.totalSpent.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Unit Price
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-200 font-mono">
                ${metrics.avgPrice.toFixed(3)}
              </span>
              <span className="text-xs text-slate-500">/gal</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Receipts Attached
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {metrics.receiptsCount}
              </span>
              <span className="text-xs text-slate-500">/ {records.length} logs</span>
            </div>
          </div>
        </section>

        {/* Action & Filter Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search station, date, invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filter & Add Actions */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                onClick={() => setFuelFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  fuelFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({records.length})
              </button>
              <button
                onClick={() => setFuelFilter('D')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  fuelFilter === 'D'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Diesel
              </button>
              <button
                onClick={() => setFuelFilter('G')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  fuelFilter === 'G'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gas
              </button>
            </div>

            <button
              onClick={() => {
                setRecordToEdit(null);
                setIsRecordModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </button>
          </div>
        </section>

        {/* Record Cards Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {filteredRecords.length} of {records.length} Fuel Purchase Entries
            </span>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 transition cursor-pointer"
              title="Reload original records from handwritten log photo"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Sample Log</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-300">Loading Fuel Purchase Records from IndexedDB...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-14 px-4 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Fuel className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Fuel Records Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No purchases matched "${searchQuery}". Clear your search query or add a new record.`
                  : 'Start recording fuel purchases by tapping "+ Add Record" and snapping receipt photos.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFuelFilter('ALL');
                  setRecordToEdit(null);
                  setIsRecordModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onEdit={(r) => {
                    setRecordToEdit(r);
                    setIsRecordModalOpen(true);
                  }}
                  onDelete={(r) => setRecordToDelete(r)}
                  onViewReceipt={(r) => setReceiptToView(r)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-5 right-5 sm:hidden z-30">
        <button
          onClick={() => {
            setRecordToEdit(null);
            setIsRecordModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/40 flex items-center justify-center transition active:scale-90 cursor-pointer"
          title="Add Fuel Purchase"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={handleSaveRecord}
        recordToEdit={recordToEdit}
      />

      <ReceiptViewerModal
        isOpen={!!receiptToView}
        onClose={() => setReceiptToView(null)}
        record={receiptToView}
      />

      <FuelReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        records={records}
      />

      <DeleteConfirmationModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteConfirm}
        record={recordToDelete}
      />

      {/* Reset to Sample Log Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Reset to Sample Log?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will restore the 8 original handwritten entries from the fuel log photo. Any newly added entries will be replaced.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToSeed}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition cursor-pointer active:scale-95"
              >
                Reset Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white border border-slate-700 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

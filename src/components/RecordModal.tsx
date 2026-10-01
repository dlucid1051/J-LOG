import React, { useState, useEffect, useRef } from 'react';
import { FuelRecord } from '../types/fuel';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Fuel,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  Receipt,
} from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Omit<FuelRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  recordToEdit?: FuelRecord | null;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
}) => {
  const isEditing = !!recordToEdit;

  // Form states
  const [date, setDate] = useState('');
  const [state, setState] = useState('IL');
  const [gallons, setGallons] = useState<string>('');
  const [fuelType, setFuelType] = useState<'D' | 'G'>('D');
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>(undefined);

  // OCR state
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrSuccessMessage, setOcrSuccessMessage] = useState<string | null>(null);
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (recordToEdit) {
        setDate(recordToEdit.date || '');
        setState(recordToEdit.state || 'IL');
        setGallons(recordToEdit.gallons ? recordToEdit.gallons.toString() : '');
        setFuelType(recordToEdit.fuelType || 'D');
        setPurchasedFrom(recordToEdit.purchasedFrom || '');
        setInvoiceNumber(recordToEdit.invoiceNumber || '');
        setAmount(recordToEdit.amount ? recordToEdit.amount.toString() : '');
        setNotes(recordToEdit.notes || '');
        setReceiptImage(recordToEdit.receiptImage);
        setReceiptFileName(recordToEdit.receiptFileName);
        setOcrSuccessMessage(null);
        setOcrErrorMessage(null);
      } else {
        // Defaults for new entry
        const todayStr = new Date().toISOString().split('T')[0];
        setDate(todayStr);
        setState('IL');
        setGallons('');
        setFuelType('D');
        setPurchasedFrom('');
        setInvoiceNumber('');
        setAmount('');
        setNotes('');
        setReceiptImage(undefined);
        setReceiptFileName(undefined);
        setOcrSuccessMessage(null);
        setOcrErrorMessage(null);
      }
    }
  }, [isOpen, recordToEdit]);

  if (!isOpen) return null;

  // Calculated price per gallon
  const numGallons = parseFloat(gallons) || 0;
  const numAmount = parseFloat(amount) || 0;
  const ppg = numGallons > 0 && numAmount > 0 ? (numAmount / numGallons).toFixed(3) : null;

  // Process chosen receipt image and invoke server OCR
  const handleImageSelected = async (file: File) => {
    try {
      setOcrErrorMessage(null);
      setOcrSuccessMessage(null);
      setIsScanningOCR(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        setReceiptImage(base64Data);
        setReceiptFileName(file.name);

        // Run OCR with server
        try {
          const res = await fetch('/api/ocr-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Data,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          if (!res.ok) {
            if (res.status === 404) {
              setOcrErrorMessage('Receipt attached to record. Note: On static GitHub Pages hosting, receipt photos are stored directly in your log & audit PDFs. Enter field values manually.');
              return;
            }
            const errorJson = await res.json().catch(() => null);
            throw new Error(errorJson?.error || `Server responded with ${res.status}`);
          }

          const json = await res.json();
          if (json.success && json.data) {
            const data = json.data;
            const prefilled: string[] = [];

            if (data.date) {
              setDate(data.date);
              prefilled.push('Date');
            }
            if (data.state) {
              setState(data.state.toUpperCase().trim().slice(0, 2));
              prefilled.push('State');
            }
            if (data.gallons !== undefined && data.gallons !== null) {
              setGallons(data.gallons.toString());
              prefilled.push('Gallons');
            }
            if (data.fuelType) {
              const ft = data.fuelType.toUpperCase().includes('G') ? 'G' : 'D';
              setFuelType(ft);
              prefilled.push('Type');
            }
            if (data.purchasedFrom) {
              setPurchasedFrom(data.purchasedFrom);
              prefilled.push('Station');
            }
            if (data.invoiceNumber) {
              setInvoiceNumber(data.invoiceNumber);
              prefilled.push('Invoice #');
            }
            if (data.amount !== undefined && data.amount !== null) {
              setAmount(data.amount.toString());
              prefilled.push('Amount');
            }

            setOcrSuccessMessage(
              prefilled.length > 0
                ? `Prefilled ${prefilled.join(', ')} from receipt!`
                : 'Receipt analyzed. Please confirm fields below.'
            );
          } else {
            setOcrErrorMessage(json.error || 'Could not parse receipt text. Please enter values manually.');
          }
        } catch (ocrErr: any) {
          console.warn('OCR request error:', ocrErr);
          setOcrErrorMessage('Receipt attached. Offline or network error scanning text; please type fields manually.');
        } finally {
          setIsScanningOCR(false);
        }
      };

      reader.onerror = () => {
        setIsScanningOCR(false);
        setOcrErrorMessage('Failed to read image file.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsScanningOCR(false);
      setOcrErrorMessage('Failed to process image: ' + err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelected(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!date) {
      setFormError('Please enter a purchase date.');
      return;
    }
    if (isNaN(numGallons) || numGallons <= 0) {
      setFormError('Please enter a valid fuel volume in gallons.');
      return;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setFormError('Please enter a valid dollar amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: recordToEdit?.id,
        date,
        state: state.toUpperCase().trim() || 'IL',
        gallons: numGallons,
        fuelType,
        purchasedFrom: purchasedFrom.trim() || 'UNKNOWN STATION',
        invoiceNumber: invoiceNumber.trim(),
        amount: numAmount,
        receiptImage,
        receiptFileName,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError('Failed to save record: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {isEditing ? 'Edit Fuel Record' : 'Add Fuel Purchase'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Update transaction details' : 'Capture receipt or enter details manually'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="mx-5 mt-4 flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Receipt Image Section / OCR Prompt */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                Receipt Image & AI OCR
              </span>
              {receiptImage && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptImage(undefined);
                    setReceiptFileName(undefined);
                    setOcrSuccessMessage(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove photo
                </button>
              )}
            </div>

            {receiptImage ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700 max-h-48 flex items-center justify-center">
                  <img
                    src={receiptImage}
                    alt="Captured Receipt"
                    className="object-contain max-h-48 w-full"
                  />
                  {isScanningOCR && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                      <p className="text-sm font-bold text-white">Scanning Receipt with AI OCR...</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Extracting date, gallons, station, invoice # and amount
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isScanningOCR}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Retake Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningOCR}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-3">
                  Capture receipt with camera or upload a photo to automatically OCR and prefill the record fields.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-3 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-xs font-bold text-blue-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition active:scale-98"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition active:scale-98"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden native inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* OCR Success / Error Feedback */}
            {ocrSuccessMessage && (
              <div className="mt-3 flex items-start gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{ocrSuccessMessage}</span>
              </div>
            )}

            {ocrErrorMessage && (
              <div className="mt-3 flex items-start gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 p-2.5 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{ocrErrorMessage}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form id="recordForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Date & State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  State (2-Letter) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="IL"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white uppercase font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Fuel Type & Gallons */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-blue-400" />
                  Fuel Type *
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFuelType('D')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      fuelType === 'D'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Diesel (D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFuelType('G')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      fuelType === 'G'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gas (G)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gallons * (e.g. 59.812)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0.000"
                  value={gallons}
                  onChange={(e) => setGallons(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 3: Station / Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Purchased From and Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. QUICK TRIP ADDISON or SHELL GILBERTS"
                value={purchasedFrom}
                onChange={(e) => setPurchasedFrom(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white uppercase tracking-wide focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Row 4: Invoice # and Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-400" />
                  Invoice / Receipt #
                </label>
                <input
                  type="text"
                  placeholder="e.g. 93285"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Live Calculation Banner */}
            {ppg && (
              <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Calculated Unit Price:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${ppg} / gallon
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Pump number, odometer, or extra notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2.5 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            form="recordForm"
            type="submit"
            disabled={isSubmitting || isScanningOCR}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save Changes' : 'Add Record'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

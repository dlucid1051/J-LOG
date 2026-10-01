import React from 'react';
import { FuelRecord } from '../types/fuel';
import { X, Download, Calendar, MapPin, Hash, DollarSign } from 'lucide-react';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: FuelRecord | null;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record || !record.receiptImage) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = record.receiptImage!;
    a.download = `receipt-${record.date}-${record.invoiceNumber || 'fuel'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Receipt Attachment</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-blue-400 font-mono">
                {record.invoiceNumber ? `#${record.invoiceNumber}` : record.date}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {record.purchasedFrom} • {record.state}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/70">
          <img
            src={record.receiptImage}
            alt={`Receipt for ${record.purchasedFrom}`}
            className="max-h-[62vh] max-w-full rounded-lg object-contain shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer info pills */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {record.date}
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {record.purchasedFrom}
            </span>
            <span className="flex items-center gap-1.5 text-slate-300 font-mono">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              ${record.amount.toFixed(2)} ({record.gallons.toFixed(3)} gal)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { FuelRecord } from '../types/fuel';
import { Edit2, Trash2, Image as ImageIcon, MapPin, Hash, Fuel, Receipt } from 'lucide-react';

interface RecordCardProps {
  record: FuelRecord;
  onEdit: (record: FuelRecord) => void;
  onDelete: (record: FuelRecord) => void;
  onViewReceipt: (record: FuelRecord) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  onEdit,
  onDelete,
  onViewReceipt,
}) => {
  const ppg = record.gallons > 0 ? (record.amount / record.gallons).toFixed(3) : '0.000';

  // Format date display (handle both YYYY-MM-DD and MM-DD-YY)
  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(`${dateStr}T12:00:00Z`);
          return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } else {
          // M-D-YY
          return `${parts[0]}/${parts[1]}/20${parts[2]}`;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="group relative rounded-2xl bg-slate-800/90 border border-slate-700/80 p-4 shadow-lg hover:border-slate-600 transition-all hover:shadow-slate-900/40">
      {/* Header Row: Date, State, Fuel Type, and Action Icons */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-white text-base">
            <span>{formatDate(record.date)}</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-700 text-blue-300 border border-slate-600">
              {record.state || 'IL'}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              record.fuelType === 'D'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Fuel className="w-3 h-3" />
            {record.fuelType === 'D' ? 'Diesel (D)' : 'Gas (G)'}
          </span>
        </div>

        {/* Action buttons: Edit, Delete */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(record)}
            aria-label="Edit Record"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/70 transition cursor-pointer"
            title="Edit record"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(record)}
            aria-label="Delete Record"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            title="Delete record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Row: Station Location */}
      <div className="mt-3 flex items-start gap-2 text-slate-200">
        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <span className="font-medium text-sm tracking-wide uppercase">
          {record.purchasedFrom || 'Unknown Station'}
        </span>
      </div>

      {/* Key Metrics: Gallons, Amount, Price per Gallon */}
      <div className="mt-3.5 grid grid-cols-3 gap-2 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
            Gallons
          </span>
          <span className="text-base font-extrabold text-blue-400">
            {record.gallons.toFixed(3)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
            Total Paid
          </span>
          <span className="text-base font-extrabold text-emerald-400">
            ${record.amount.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
            $/Gal
          </span>
          <span className="text-sm font-bold text-slate-300">
            ${ppg}
          </span>
        </div>
      </div>

      {/* Footer Row: Invoice # & Receipt Attachment */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/40">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {record.invoiceNumber ? (
              <span className="font-mono text-slate-300 font-medium">#{record.invoiceNumber}</span>
            ) : (
              <span className="italic text-slate-500">No invoice #</span>
            )}
          </span>
        </div>

        {record.receiptImage ? (
          <button
            onClick={() => onViewReceipt(record)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer font-medium"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>View Receipt</span>
          </button>
        ) : (
          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
            <ImageIcon className="w-3 h-3" />
            <span>No receipt image</span>
          </span>
        )}
      </div>
    </div>
  );
};

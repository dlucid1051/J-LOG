import React from 'react';
import { FuelRecord } from '../types/fuel';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  record: FuelRecord | null;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!isOpen || !record) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3.5">
          <h3 className="text-base font-bold text-white">Delete Fuel Record?</h3>
          <p className="mt-1.5 text-xs text-slate-300">
            Are you sure you want to delete the entry for{' '}
            <strong className="text-white">{record.purchasedFrom}</strong> on{' '}
            <span className="font-mono text-blue-400">{record.date}</span> (${record.amount.toFixed(2)})?
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            This action cannot be undone and will remove attached receipt photos.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

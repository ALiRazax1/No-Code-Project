import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-mica-700 bg-mica-850 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warn-soft">
            <AlertTriangle size={20} className="text-warn" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-mica-500">{message}</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-mica-700 bg-mica-800/60 px-4 py-2 text-sm font-medium text-mica-500 transition-colors hover:bg-mica-700 hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-warn/20 transition-colors hover:bg-warn-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <span className="h-3.5 w-3.5 spin rounded-full border-2 border-white border-t-transparent" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

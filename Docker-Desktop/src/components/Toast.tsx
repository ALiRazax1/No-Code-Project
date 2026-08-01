import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface Props {
  toast: ToastData;
  onClose: (id: number) => void;
}

export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  return (
    <div className="animate-fade-in flex items-center gap-2.5 rounded-lg border border-mica-700 bg-mica-800 px-4 py-2.5 shadow-xl">
      {toast.type === 'success' ? (
        <CheckCircle2 size={16} className="text-success" />
      ) : (
        <XCircle size={16} className="text-danger" />
      )}
      <span className="text-sm text-white">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-2 text-mica-500 transition-colors hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { X, Loader2, Terminal } from 'lucide-react';
import type { DockerContainer } from '../lib/docker';
import { getContainerLogs } from '../lib/docker';

interface Props {
  container: DockerContainer;
  onClose: () => void;
}

export default function LogsModal({ container, onClose }: Props) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const name = (container.Names[0] || 'unknown').replace(/^\//, '');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getContainerLogs(container.Id)
      .then((l) => !cancelled && setLogs(l || 'No log output.'))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load logs'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [container.Id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-mica-700 bg-mica-850 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-mica-700/60 bg-mica-900/50 px-4 py-3">
          <Terminal size={17} className="text-accent" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">Logs — {name}</div>
            <div className="truncate text-[11px] text-mica-500">{container.Image}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-black/50 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-mica-500">
              <Loader2 size={20} className="spin" />
            </div>
          ) : error ? (
            <div className="text-sm text-danger">{error}</div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-mica-500">
              {logs}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-mica-700/60 bg-mica-900/50 px-4 py-2 text-[11px] text-mica-600">
          last 50 lines · stdout + stderr
        </div>
      </div>
    </div>
  );
}

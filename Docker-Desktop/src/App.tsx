import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, PackageOpen } from 'lucide-react';
import ErrorScreen from './components/ErrorScreen';
import Header from './components/Header';
import ContainerCard from './components/ContainerCard';
import LogsModal from './components/LogsModal';
import ConfirmModal from './components/ConfirmModal';
import Toast, { type ToastData } from './components/Toast';
import {
  pingDocker,
  listContainers,
  pruneContainers,
  type DockerContainer,
  type HealthState,
} from './lib/docker';

export default function App() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [booting, setBooting] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');

  const [logsTarget, setLogsTarget] = useState<DockerContainer | null>(null);
  const [pruneOpen, setPruneOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((type: ToastData['type'], message: string) => {
    setToasts((t) => [...t, { id: ++toastId.current, type, message }]);
  }, []);
  const closeToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listContainers(true);
      setContainers(list);
    } catch {
      setHealth({ connected: false, error: 'Lost connection while listing containers' });
    } finally {
      setLoadingList(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    const h = await pingDocker();
    setHealth(h);
    if (h.connected) {
      await refreshList();
    }
    return h;
  }, [refreshList]);

  // Startup connection bridge
  useEffect(() => {
    (async () => {
      await checkHealth();
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await checkHealth();
    setRetrying(false);
  };

  const handlePrune = async () => {
    const res = await pruneContainers();
    pushToast('success', `Removed ${res.ContainersDeleted} stopped container(s)`);
    await refreshList();
  };

  const filtered = containers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (c.Names[0] || '').replace(/^\//, '').toLowerCase();
    return name.includes(q) || c.Image.toLowerCase().includes(q);
  });

  // --- render states ---

  if (booting) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-mica-950">
        <div className="flex flex-col items-center gap-3 text-mica-500">
          <Loader2 size={28} className="spin text-accent" />
          <span className="text-sm">Connecting to Docker daemon…</span>
        </div>
      </div>
    );
  }

  if (!health?.connected) {
    return <ErrorScreen onRetry={handleRetry} retrying={retrying} />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-mica-950">
      <Header
        search={search}
        onSearch={setSearch}
        onPrune={() => setPruneOpen(true)}
        onRefresh={refreshList}
        loading={loadingList}
        version={health.version}
      />

      <main className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-mica-600">
            <PackageOpen size={40} strokeWidth={1.2} />
            <p className="text-sm">
              {containers.length === 0
                ? 'No containers found on this daemon.'
                : 'No containers match your search.'}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-2.5">
            {filtered.map((c) => (
              <ContainerCard
                key={c.Id}
                container={c}
                onActioned={refreshList}
                onShowLogs={setLogsTarget}
              />
            ))}
          </div>
        )}
      </main>

      {pruneOpen && (
        <ConfirmModal
          title="Clean stopped containers?"
          message="This will permanently remove all stopped containers. Running containers are not affected. This cannot be undone."
          confirmLabel="Clean System"
          onConfirm={handlePrune}
          onClose={() => setPruneOpen(false)}
        />
      )}

      {logsTarget && (
        <LogsModal container={logsTarget} onClose={() => setLogsTarget(null)} />
      )}

      {/* Toast stack */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onClose={closeToast} />
          </div>
        ))}
      </div>
    </div>
  );
}

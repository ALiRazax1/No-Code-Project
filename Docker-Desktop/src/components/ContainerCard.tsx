import { useEffect, useState } from 'react';
import { Play, Square, Terminal, Cpu, MemoryStick } from 'lucide-react';
import type { DockerContainer, ContainerStats } from '../lib/docker';
import { getContainerStats, startContainer, stopContainer } from '../lib/docker';

interface Props {
  container: DockerContainer;
  onActioned: () => void;
  onShowLogs: (c: DockerContainer) => void;
}

export default function ContainerCard({ container, onActioned, onShowLogs }: Props) {
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [acting, setActing] = useState(false);
  const running = container.State === 'running';

  useEffect(() => {
    let cancelled = false;
    if (running) {
      getContainerStats(container.Id)
        .then((s) => !cancelled && setStats(s))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [container.Id, running]);

  const name = (container.Names[0] || 'unknown').replace(/^\//, '');
  const handleAction = async () => {
    setActing(true);
    try {
      if (running) {
        await stopContainer(container.Id);
      } else {
        await startContainer(container.Id);
      }
      onActioned();
    } catch {
      onActioned();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-mica-700/70 bg-mica-850/60 px-4 py-3 transition-all hover:border-mica-600 hover:bg-mica-800/70">
      {/* Status dot */}
      <div className="flex-shrink-0">
        <span
          className={
            'block h-3 w-3 rounded-full ' +
            (running
              ? 'bg-success dot-running'
              : 'bg-danger shadow-[0_0_6px_0_rgba(239,68,68,0.6)]')
          }
        />
      </div>

      {/* Name + image */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{name}</div>
        <div className="truncate text-xs text-mica-500">{container.Image}</div>
      </div>

      {/* Status text */}
      <div className="hidden flex-shrink-0 md:block">
        <span
          className={
            'rounded-md px-2 py-0.5 text-[11px] font-medium ' +
            (running ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')
          }
        >
          {container.Status}
        </span>
      </div>

      {/* Resource stats */}
      <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
        {running && stats ? (
          <>
            <div className="flex items-center gap-1 rounded-md bg-mica-800/80 px-2 py-1 text-[11px] text-mica-500">
              <Cpu size={11} className="text-accent" />
              <span className="font-mono">{stats.cpuPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-mica-800/80 px-2 py-1 text-[11px] text-mica-500">
              <MemoryStick size={11} className="text-warn" />
              <span className="font-mono">
                {stats.memUsageMB.toFixed(0)}/{stats.memLimitMB.toFixed(0)}MB
              </span>
            </div>
          </>
        ) : (
          <span className="text-[11px] text-mica-600/60">—</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={handleAction}
          disabled={acting}
          className={
            'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ' +
            (running
              ? 'bg-danger-soft text-danger hover:bg-danger hover:text-white'
              : 'bg-success-soft text-success hover:bg-success hover:text-white')
          }
        >
          {acting ? (
            <span className="h-3.5 w-3.5 spin rounded-full border-2 border-current border-t-transparent" />
          ) : running ? (
            <Square size={13} />
          ) : (
            <Play size={13} />
          )}
          <span className="hidden sm:inline">{running ? 'Stop' : 'Start'}</span>
        </button>

        <button
          onClick={() => onShowLogs(container)}
          className="flex items-center justify-center rounded-lg bg-mica-800/80 p-1.5 text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
          title="View logs"
        >
          <Terminal size={15} />
        </button>
      </div>
    </div>
  );
}

import { Search, Trash2, RefreshCw, Container } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  onPrune: () => void;
  onRefresh: () => void;
  loading: boolean;
  version?: string;
}

export default function Header({ search, onSearch, onPrune, onRefresh, loading, version }: Props) {
  return (
    <header className="flex items-center gap-4 border-b border-mica-700/60 bg-mica-900/40 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
          <Container size={20} className="text-accent" />
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="text-[15px] font-bold tracking-tight text-white">
            Lightweight Docker Manager
          </h1>
          {version && (
            <span className="text-[11px] text-mica-500">Docker Engine v{version}</span>
          )}
        </div>
      </div>

      <div className="relative ml-auto w-64 max-w-[40vw]">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mica-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search containers…"
          className="w-full rounded-lg border border-mica-700 bg-mica-800/70 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-mica-500 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
      </div>

      <button
        onClick={onPrune}
        className="flex items-center gap-1.5 rounded-lg border border-mica-700 bg-mica-800/60 px-3 py-1.5 text-sm font-medium text-mica-500 transition-colors hover:border-warn/40 hover:bg-warn-soft hover:text-warn"
        title="Remove all stopped containers"
      >
        <Trash2 size={15} />
        <span className="hidden sm:inline">Clean System</span>
      </button>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-mica-700 bg-mica-800/60 px-3 py-1.5 text-sm font-medium text-mica-500 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        title="Refresh container list"
      >
        <RefreshCw size={15} className={loading ? 'spin' : ''} />
        <span className="hidden sm:inline">Refresh List</span>
      </button>
    </header>
  );
}

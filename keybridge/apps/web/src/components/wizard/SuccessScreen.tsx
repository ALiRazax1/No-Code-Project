'use client';

import { ProviderId, StorageMode } from '@/lib/types';
import providersJson from '@/lib/providers.json';

type ProvidersMap = Record<string, { name: string }>;
const providers = providersJson as ProvidersMap;

interface Props {
  providerId: ProviderId;
  storageMode: StorageMode;
  onGoToDashboard: () => void;
  onConnectAnother: () => void;
}

export default function SuccessScreen({ providerId, storageMode, onGoToDashboard, onConnectAnother }: Props) {
  const providerName = providers[providerId]?.name ?? 'Provider';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--bg)' }}>
      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
          🔑
        </div>
      </div>

      <div className="text-center max-w-sm mb-10">
        <h2 className="text-3xl font-semibold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          You're connected.
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Your {providerName} key is{' '}
          {storageMode === 'cloud' ? 'encrypted and stored in the cloud' : 'saved on this device only'}.
          Your tools can now use it automatically.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full px-4 py-2 mb-10" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        <span className="text-sm">{storageMode === 'cloud' ? '☁️' : '🔒'}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {storageMode === 'cloud' ? 'Cloud encrypted' : 'Local only — never sent to our servers'}
        </span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onGoToDashboard}
          className="w-full rounded-xl px-5 py-3.5 font-medium text-base text-white transition-all duration-150 focus:outline-none"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          View Security Dashboard
        </button>

        <button
          onClick={onConnectAnother}
          className="w-full rounded-xl px-5 py-3.5 font-medium text-base transition-all duration-150 focus:outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
        >
          Connect another key
        </button>
      </div>
    </div>
  );
}
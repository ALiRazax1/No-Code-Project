'use client';

import { useState } from 'react';
import { StorageMode, ProviderId } from '@/lib/types';
import providersJson from '@/lib/providers.json';

type ProvidersMap = Record<string, { name: string }>;
const providers = providersJson as ProvidersMap;

interface Props {
  providerId: ProviderId;
  onConfirm: (mode: StorageMode) => void;
}

export default function StorageChoice({ providerId, onConfirm }: Props) {
  const [selected, setSelected] = useState<StorageMode>('cloud');
  const providerName = providers[providerId]?.name ?? 'Provider';

  const options = [
    {
      mode: 'cloud' as StorageMode,
      title: 'Store securely in the cloud',
      description: 'Encrypted and synced across your devices.',
      detail: 'Your key is encrypted with AES-256 before it ever leaves your browser. Only you can decrypt it.',
      icon: '☁️',
    },
    {
      mode: 'local' as StorageMode,
      title: 'Keep on this device only',
      description: 'Nothing is sent to our servers — ever.',
      detail: "Your key stays in your browser, encrypted client-side. If you clear browser data or switch devices, you'll need to add it again.",
      icon: '🔒'
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--bg)' }}>
      <div className="mb-10 text-center max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
          <span style={{ color: 'var(--accent)' }}>✓</span>
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{providerName} key verified</span>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          How should we store it?
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Both options encrypt your key. The difference is where the encrypted copy lives.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
        {options.map((opt) => {
          const isSelected = selected === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => setSelected(opt.mode)}
              className="relative text-left rounded-2xl p-6 transition-all duration-200 focus:outline-none"
              style={{
                background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div
                className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                style={{
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-strong)',
                  background: isSelected ? 'var(--accent)' : 'transparent',
                }}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="text-2xl mb-4">{opt.icon}</div>
              <div className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>{opt.title}</div>
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{opt.description}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{opt.detail}</div>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-2xl">
        <button
          onClick={() => onConfirm(selected)}
          className="w-full rounded-xl px-5 py-4 font-medium text-base text-white transition-all duration-150 focus:outline-none"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          {selected === 'cloud' ? 'Save encrypted to cloud' : 'Save to this device only'}
        </button>
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          You can remove your key at any time from the Security Dashboard.
        </p>
      </div>
    </div>
  );
}
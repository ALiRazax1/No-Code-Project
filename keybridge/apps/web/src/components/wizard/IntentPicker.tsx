'use client';

import { Intent, IntentOption } from '@/lib/types';
import { INTENT_OPTIONS } from '@/lib/intentMap';

interface Props {
  onSelect: (intent: Intent) => void;
}

export default function IntentPicker({ onSelect }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--bg)' }}>
      <div className="mb-12 text-center">
        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          KeyBridge
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
          What do you want to build?
        </h1>
        <p className="mt-3 text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Pick a goal and we'll guide you to the right key — no technical knowledge needed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {INTENT_OPTIONS.map((opt: IntentOption) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="group relative text-left rounded-xl p-5 focus:outline-none transition-all duration-200"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
            }}
          >
            <div className="text-2xl mb-3">{opt.icon}</div>
            <div className="font-medium text-base mb-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</div>
            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{opt.description}</div>
            <div className="mt-4 text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              Get started <span>→</span>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-10 text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
        Your API key is encrypted and never shared. You can remove it any time.
      </p>
    </div>
  );
}
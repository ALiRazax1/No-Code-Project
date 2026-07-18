'use client';

import { useEffect, useRef, useState } from 'react';
import { ProviderId, Intent, ValidationResult } from '@/lib/types';
import { PROVIDER_REASON } from '@/lib/intentMap';
import { checkKeyFormat, validateKey } from '@/lib/validateKey';
import { translateError } from '@/lib/errorTranslation';
import providersJson from '@/lib/providers.json';

type ProvidersMap = Record<string, { name: string; key_page_url: string; signup_url: string }>;
const providers = providersJson as ProvidersMap;

interface Props {
  providerId: ProviderId;
  intent: Intent;
  onValidated: (key: string, result: ValidationResult) => void;
}

type PanelState = 'idle' | 'popup_opened' | 'validating' | 'success' | 'error';

export default function GuidancePanel({ providerId, intent, onValidated }: Props) {
  const provider = providers[providerId];
  const reason = PROVIDER_REASON[providerId]?.[intent] ?? `You need a ${provider.name} key for this.`;

  const [keyValue, setKeyValue] = useState('');
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [formatWarning, setFormatWarning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handleFocus = () => {
      if (panelState === 'popup_opened') inputRef.current?.focus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [panelState]);

  function openProviderPopup() {
    const w = 460, h = 680;
    const left = window.screen.width - w - 20;
    const top = Math.max(0, Math.floor((window.screen.height - h) / 2));
    popupRef.current = window.open(
      provider.key_page_url,
      'keybridge_provider',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    setPanelState('popup_opened');
    const pollClosed = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollClosed);
        inputRef.current?.focus();
      }
    }, 500);
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setKeyValue(val);
    setFormatWarning(false);
    if (validationResult) {
      setValidationResult(null);
      setPanelState(panelState === 'popup_opened' ? 'popup_opened' : 'idle');
    }
  }

  async function handleSubmit() {
    const trimmed = keyValue.trim();
    if (!trimmed) return;
    if (!checkKeyFormat(trimmed, providerId)) { setFormatWarning(true); return; }
    setFormatWarning(false);
    setPanelState('validating');
    setValidationResult(null);
    const result = await validateKey(trimmed, providerId);
    setValidationResult(result);
    setPanelState(result.success ? 'success' : 'error');
    if (result.success) {
      await new Promise((r) => setTimeout(r, 800));
      onValidated(trimmed, result);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const errorTranslation =
    validationResult && !validationResult.success && validationResult.errorCode
      ? translateError(validationResult.errorCode, provider.key_page_url)
      : null;

  const isSubmittable = keyValue.trim().length > 0 && panelState !== 'validating' && panelState !== 'success';

  const steps = [
    { num: '1', label: 'Open the provider page', done: panelState !== 'idle', active: panelState === 'idle' },
    { num: '2', label: 'Create & copy your key', done: panelState === 'validating' || panelState === 'success' || panelState === 'error', active: panelState === 'popup_opened' },
    { num: '3', label: 'Paste it here', done: panelState === 'success', active: panelState === 'popup_opened' || panelState === 'error' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg)' }}>
      {/* Left pane */}
      <div className="lg:w-[420px] lg:min-h-screen flex flex-col px-8 py-12" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="text-xs font-mono tracking-widest uppercase mb-10" style={{ color: 'var(--text-muted)' }}>
          KeyBridge / Connect
        </div>

        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 w-fit" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-strong)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{provider.name}</span>
        </div>

        <h2 className="text-2xl font-semibold leading-snug mb-3" style={{ color: 'var(--text-primary)' }}>
          You'll need a {provider.name} key for this
        </h2>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
          {reason}
        </p>

        <div className="space-y-4 mb-auto">
          {steps.map((s) => (
            <div key={s.num} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 transition-all duration-300"
                style={{
                  background: s.done ? 'var(--accent)' : 'transparent',
                  border: s.done ? 'none' : `2px solid ${s.active ? 'var(--accent)' : 'var(--border-strong)'}`,
                  color: s.done ? '#fff' : s.active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {s.done ? '✓' : s.num}
              </div>
              <span className="text-sm transition-colors duration-300" style={{
                color: s.done ? 'var(--text-muted)' : s.active ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: s.done ? 'line-through' : 'none',
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            🔒 Your key is encrypted before storage. We never log it in plaintext.
          </p>
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <button
              onClick={openProviderPopup}
              className="w-full flex items-center justify-between rounded-xl px-5 py-4 font-medium text-base text-white transition-all duration-150 focus:outline-none group"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <span>Get my {provider.name} key</span>
              <span className="opacity-70 group-hover:translate-x-0.5 transition-transform duration-150">↗</span>
            </button>

            {panelState === 'popup_opened' && (
              <p className="mt-2.5 text-xs text-center animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
                The {provider.name} page opened in a new window. Come back here once you've copied your key.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>then paste it here</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <div className="mb-4">
            <label htmlFor="api-key-input" className="block text-xs font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
              API Key
            </label>
            <input
              ref={inputRef}
              id="api-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keyValue}
              onChange={handleKeyChange}
              onKeyDown={handleKeyDown}
              placeholder="Paste your key here…"
              disabled={panelState === 'validating' || panelState === 'success'}
              className="w-full rounded-xl px-4 py-3.5 font-mono text-sm focus:outline-none transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${formatWarning || panelState === 'error' ? 'var(--danger)' : panelState === 'success' ? 'var(--success)' : 'var(--border-strong)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {formatWarning && (
              <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
                This doesn't match a {provider.name} key format. Check you copied the whole key.
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isSubmittable}
            className="w-full rounded-xl px-5 py-3.5 font-medium text-base transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
          >
            {panelState === 'validating' ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Checking key…
              </span>
            ) : panelState === 'success' ? '✓ Key verified' : 'Check this key'}
          </button>

          {panelState === 'success' && (
            <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
              <span className="text-lg" style={{ color: 'var(--accent)' }}>✓</span>
              <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Your key works.</span>
            </div>
          )}

          {panelState === 'error' && errorTranslation && (
            <div className="mt-4 rounded-xl px-4 py-3 animate-fade-in" style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)' }}>
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0" style={{ color: 'var(--danger)' }}>✕</span>
                <div>
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorTranslation.message}</p>
                  {errorTranslation.link && (
                    <a href={errorTranslation.link.href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs underline hover:opacity-80 transition-opacity" style={{ color: 'var(--danger)' }}>
                      {errorTranslation.link.label}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Do not have a {provider.name} account?{' '}
            <a href={provider.signup_url} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Create one free →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--bg)' }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
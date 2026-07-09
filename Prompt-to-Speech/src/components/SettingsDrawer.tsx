// ─────────────────────────────────────────────────────────
// components/SettingsDrawer.tsx
//
// Slide-in settings panel. Sections:
//   1. TTS Provider   — Mock | ElevenLabs | OpenAI
//   2. API Key        — password field, show/hide toggle
//   3. Voice IDs      — per-profile inputs (ElevenLabs only)
//   4. Language       — 15-language BCP-47 grid
//   5. Playback Speed — 0.75× / 1× / 1.25× / 1.5×
//   6. Subtitle Size  — font size slider
//
// All changes are applied immediately via the `patch` callback
// and persisted to localStorage by useSettings().
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { X, Settings, Eye, EyeOff, Info } from 'lucide-react'
import type { AppSettings } from '../types'
import { VOICE_PROFILES } from '../data/mockData'
import { DEFAULT_VOICE_IDS } from '../hooks/useSettings'

interface SettingsDrawerProps {
  settings: AppSettings
  patch:    (update: Partial<AppSettings>) => void
  onClose:  () => void
}

const PROVIDERS = [
  { id: 'mock',        label: 'Mock',       desc: 'No API key needed'         },
  { id: 'elevenlabs',  label: 'ElevenLabs', desc: 'Word-level timestamps'     },
  { id: 'openai',      label: 'OpenAI',     desc: 'tts-1-hd, no timestamps'   },
] as const

const SPEEDS = [
  { value: 0.75, label: '0.75×' },
  { value: 1,    label: '1×'    },
  { value: 1.25, label: '1.25×' },
  { value: 1.5,  label: '1.5×'  },
]

const FONT_SIZES = [
  { value: 14, label: 'S' },
  { value: 17, label: 'M' },
  { value: 20, label: 'L' },
  { value: 24, label: 'XL'},
]

const LANGUAGES = [
  { code: 'en', label: 'English'    },
  { code: 'es', label: 'Spanish'    },
  { code: 'fr', label: 'French'     },
  { code: 'de', label: 'German'     },
  { code: 'it', label: 'Italian'    },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch'      },
  { code: 'pl', label: 'Polish'     },
  { code: 'ru', label: 'Russian'    },
  { code: 'ja', label: 'Japanese'   },
  { code: 'ko', label: 'Korean'     },
  { code: 'zh', label: 'Chinese'    },
  { code: 'ar', label: 'Arabic'     },
  { code: 'hi', label: 'Hindi'      },
  { code: 'tr', label: 'Turkish'    },
] as const

export default function SettingsDrawer({ settings, patch, onClose }: SettingsDrawerProps) {
  const [showKey, setShowKey] = useState(false)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const isElevenLabs = settings.provider === 'elevenlabs'
  const needsKey     = settings.provider !== 'mock'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Settings"
        className="fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l border-[#1a1a2c] bg-[#07070f]"
        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#14142a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Settings size={14} color="#6366f1" />
            </div>
            <span className="text-[14px] font-semibold text-[#c0c0de]">Settings</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* ── Section 1: TTS Provider ── */}
          <Section label="TTS Provider">
            <div className="flex flex-col gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => patch({ provider: p.id })}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150"
                  style={{
                    borderColor: settings.provider === p.id
                      ? 'rgba(99,102,241,0.4)'
                      : '#14142a',
                    background: settings.provider === p.id
                      ? 'rgba(99,102,241,0.08)'
                      : '#0c0c18',
                  }}
                >
                  {/* Radio dot */}
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={{
                      borderColor: settings.provider === p.id ? '#6366f1' : '#8080b8',
                    }}
                  >
                    {settings.provider === p.id && (
                      <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
                    )}
                  </span>
                  <div>
                    <div className="text-[13px] font-medium text-[#c0c0de]">{p.label}</div>
                    <div className="text-[11px] text-[#7878b0]">{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* ── Section 2: API Key ── */}
          {needsKey && (
            <Section label="API Key">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={e => patch({ apiKey: e.target.value })}
                  placeholder={
                    settings.provider === 'elevenlabs'
                      ? 'sk_…  (ElevenLabs API key)'
                      : 'sk-…  (OpenAI API key)'
                  }
                  className="w-full rounded-xl border border-[#14142a] bg-[#060610] px-4 py-3 pr-10 font-mono text-[13px] text-[#c0c0de] placeholder-[#9090be] outline-none transition-all focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)]"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9090be] transition-colors hover:text-[#9898b8]"
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <InfoNote>
                Stored in <code className="rounded bg-[#14142a] px-1 py-[1px] text-[11px]">localStorage</code> only.
                Never sent anywhere except the TTS API directly from your browser.
              </InfoNote>
            </Section>
          )}

          {/* ── Section 3: Voice IDs (ElevenLabs only) ── */}
          {isElevenLabs && (
            <Section label="Voice IDs">
              <p className="mb-3 text-[12px] leading-relaxed text-[#7878b0]">
                Paste an ElevenLabs voice ID for each profile. Leave blank to use the default.
                Find IDs at{' '}
                <a
                  href="https://elevenlabs.io/app/voice-library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6366f1] underline-offset-2 hover:underline"
                >
                  elevenlabs.io/app/voice-library
                </a>
              </p>

              <div className="flex flex-col gap-2.5">
                {VOICE_PROFILES.map(vp => (
                  <div key={vp.id} className="flex items-center gap-3">
                    {/* Voice dot + name */}
                    <div className="flex w-[72px] shrink-0 items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: vp.color }}
                      />
                      <span className="text-[12px] text-[#9898b8]">{vp.name}</span>
                    </div>

                    {/* Voice ID input */}
                    <input
                      type="text"
                      value={settings.voiceIds[vp.id] ?? ''}
                      onChange={e =>
                        patch({ voiceIds: { [vp.id]: e.target.value } })
                      }
                      placeholder={DEFAULT_VOICE_IDS[vp.id]}
                      className="flex-1 rounded-lg border border-[#14142a] bg-[#060610] px-3 py-2 font-mono text-[11px] text-[#c0c0de] placeholder-[#8080b8] outline-none transition-all focus:border-[rgba(99,102,241,0.4)] focus:ring-1 focus:ring-[rgba(99,102,241,0.15)]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>

              <InfoNote>
                Your custom voice created on the free plan works here — just paste its ID above.
              </InfoNote>
            </Section>
          )}

          {/* ── Section 4: Language ── */}
          <Section label="Language">
            <p className="mb-3 text-[12px] leading-relaxed text-[#7878b0]">
              Forwarded to the TTS provider and SpeechSynthesis fallback.
              Selecting a non-English language auto-switches ElevenLabs to the
              multilingual v2 model.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {LANGUAGES.map(lang => {
                const active = settings.language === lang.code
                return (
                  <button
                    key={lang.code}
                    onClick={() => patch({ language: lang.code })}
                    className="flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-all duration-150"
                    style={{
                      borderColor: active ? 'rgba(99,102,241,0.4)' : '#14142a',
                      background:  active ? 'rgba(99,102,241,0.08)' : '#0c0c18',
                    }}
                  >
                    <span className="text-[12px] font-medium leading-tight"
                      style={{ color: active ? '#a5b4fc' : '#9898b8' }}>
                      {lang.label}
                    </span>
                    <span className="font-mono text-[9px] text-[#9090be]">
                      {lang.code}
                    </span>
                  </button>
                )
              })}
            </div>
            <InfoNote>
              Changing language here stays in sync with the input-card selector
              and the shareable URL — both read from{' '}
              <code className="rounded bg-[#14142a] px-1 py-[1px] text-[10px]">
                AppSettings.language
              </code>.
            </InfoNote>
          </Section>

          {/* ── Section 5: Playback Speed ── */}
          <Section label="Playback Speed">
            <div className="flex gap-2">
              {SPEEDS.map(s => (
                <button
                  key={s.value}
                  onClick={() => patch({ playbackRate: s.value })}
                  className="flex-1 rounded-lg border py-2 text-[13px] font-medium transition-all duration-150"
                  style={{
                    borderColor: settings.playbackRate === s.value
                      ? 'rgba(99,102,241,0.4)'
                      : '#14142a',
                    background: settings.playbackRate === s.value
                      ? 'rgba(99,102,241,0.1)'
                      : '#0c0c18',
                    color: settings.playbackRate === s.value ? '#a5b4fc' : '#7878b0',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <InfoNote>
              Speed applies on the next Play. Changing it mid-playback restarts the current word.
            </InfoNote>
          </Section>

          {/* ── Section 6: Subtitle Size ── */}
          <Section label="Subtitle Size">
            <div className="flex gap-2">
              {FONT_SIZES.map(f => (
                <button
                  key={f.value}
                  onClick={() => patch({ subtitleFontSize: f.value })}
                  className="flex-1 rounded-lg border py-2.5 font-medium transition-all duration-150"
                  style={{
                    fontSize:    f.value * 0.65,
                    borderColor: settings.subtitleFontSize === f.value
                      ? 'rgba(99,102,241,0.4)'
                      : '#14142a',
                    background: settings.subtitleFontSize === f.value
                      ? 'rgba(99,102,241,0.1)'
                      : '#0c0c18',
                    color: settings.subtitleFontSize === f.value ? '#a5b4fc' : '#7878b0',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="border-t border-[#14142a] px-5 py-3">
          <p className="text-[11px] text-[#8888b8]">
            Settings auto-save. Clearing browser storage resets to defaults.
          </p>
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  )
}

// ── Local sub-components ──────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9090be]">
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#0e0e22] bg-[#080812] p-3">
      <Info size={12} className="mt-[1px] shrink-0 text-[#9090be]" />
      <p className="text-[11px] leading-relaxed text-[#9090be]">{children}</p>
    </div>
  )
}

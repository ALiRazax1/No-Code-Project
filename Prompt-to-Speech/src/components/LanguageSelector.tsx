// ─────────────────────────────────────────────────────────
// components/LanguageSelector.tsx
//
// Compact language picker styled to match VoiceSelector.
// Passes the selected BCP-47 code up via onChange.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface Language {
  code:   string   // BCP-47, e.g. 'en', 'fr', 'ja'
  name:   string
  flag:   string
  elCode: string   // ElevenLabs language_code
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English',    flag: '🇺🇸', elCode: 'en'    },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸', elCode: 'es'    },
  { code: 'fr', name: 'French',     flag: '🇫🇷', elCode: 'fr'    },
  { code: 'de', name: 'German',     flag: '🇩🇪', elCode: 'de'    },
  { code: 'it', name: 'Italian',    flag: '🇮🇹', elCode: 'it'    },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', elCode: 'pt'    },
  { code: 'pl', name: 'Polish',     flag: '🇵🇱', elCode: 'pl'    },
  { code: 'nl', name: 'Dutch',      flag: '🇳🇱', elCode: 'nl'    },
  { code: 'tr', name: 'Turkish',    flag: '🇹🇷', elCode: 'tr'    },
  { code: 'ru', name: 'Russian',    flag: '🇷🇺', elCode: 'ru'    },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳', elCode: 'hi'    },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦', elCode: 'ar'    },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳', elCode: 'zh'    },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵', elCode: 'ja'    },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷', elCode: 'ko'    },
]

interface LanguageSelectorProps {
  value:    string
  onChange: (code: string) => void
  disabled?: boolean
}

export default function LanguageSelector({ value, onChange, disabled = false }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const selected        = LANGUAGES.find(l => l.code === value) ?? LANGUAGES[0]

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[44px] items-center gap-2 rounded-[10px] border border-[#14142a] bg-[#06060f] px-3 text-left text-[#c0c0de] outline-none transition-all hover:border-[rgba(99,102,241,0.35)] focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.15)] disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-[13px]">{selected.name}</span>
        <ChevronDown size={13} color="#3d3d58"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute bottom-[calc(100%+6px)] left-0 z-20 w-44 overflow-hidden rounded-xl border border-[#1e1e2c] bg-[#0e0e1a]"
          style={{ boxShadow: '0 -12px 32px rgba(0,0,0,.55)', maxHeight: 280, overflowY: 'auto' }}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === value}
              onClick={() => { onChange(lang.code); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-[rgba(99,102,241,0.08)]"
              style={{
                background: lang.code === value ? 'rgba(99,102,241,0.1)' : undefined,
                color:      lang.code === value ? '#e0e0f8' : '#9090a8',
              }}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === value && (
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

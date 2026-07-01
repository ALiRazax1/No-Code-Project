// ─────────────────────────────────────────────────────────
// components/VoiceSelector.tsx
//
// Animated custom dropdown for picking a voice profile.
// Fully accessible: keyboard navigable, closes on Escape
// and outside click.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { VOICE_PROFILES } from '../data/mockData'

interface VoiceSelectorProps {
  value:    string
  onChange: (id: string) => void
  disabled?: boolean
}

export default function VoiceSelector({
  value,
  onChange,
  disabled = false,
}: VoiceSelectorProps) {
  const [open, setOpen] = useState(false)
  const wrapRef         = useRef<HTMLDivElement>(null)

  const selected = VOICE_PROFILES.find(v => v.id === value) ?? VOICE_PROFILES[0]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function select(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative flex-1">

      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[44px] w-full items-center gap-2.5 rounded-[10px] border border-[#14142a] bg-[#06060f] px-3.5 text-left text-[#c0c0de] outline-none transition-all duration-200 focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.15)] hover:border-[rgba(99,102,241,0.35)] disabled:pointer-events-none disabled:opacity-50"
      >
        {/* Dot */}
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: selected.color }}
        />

        {/* Name */}
        <span className="flex-1 text-sm">{selected.name}</span>

        {/* Desc */}
        <span className="text-xs text-[#3d3d58]">{selected.desc}</span>

        {/* Chevron */}
        <ChevronDown
          size={14}
          color="#3d3d58"
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          role="listbox"
          aria-label="Voice profiles"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-[#1e1e2c] bg-[#0e0e1a] shadow-[0_12px_32px_rgba(0,0,0,.55)]"
        >
          {VOICE_PROFILES.map(vp => {
            const isSelected = vp.id === value
            return (
              <button
                key={vp.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => select(vp.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-[inherit] transition-colors duration-100 hover:bg-[rgba(99,102,241,0.08)]"
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.1)' : undefined,
                  color:      isSelected ? '#e0e0f8' : '#9090a8',
                }}
              >
                <span
                  className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: vp.color }}
                />
                <span>{vp.name}</span>
                <span className="ml-auto text-xs text-[#3d3d58]">{vp.desc}</span>

                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

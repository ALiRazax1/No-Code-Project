// ─────────────────────────────────────────────────────────
// components/LandingHero.tsx
// Fix: overflow:hidden on container prevents orb from
// causing horizontal scroll on mobile viewports.
// ─────────────────────────────────────────────────────────

import { Mic } from 'lucide-react'

const HERO_BARS = Array.from({ length: 40 }, (_, i) => ({
  height:   16 + Math.abs(Math.sin(i * 0.85 + 1.1) * Math.cos(i * 0.42)) * 52,
  duration: 1.4 + (i % 6) * 0.18,
  delay:    (i * 0.09) % 2.2,
}))

const FEATURES = [
  { icon: '⚡', label: 'Word-level sync'     },
  { icon: '🎙', label: '5 AI voices'         },
  { icon: '📄', label: 'SRT & MP3 export'    },
  { icon: '🔒', label: 'Key stays in browser'},
]

export default function LandingHero() {
  return (
    <div
      className="relative mb-10 text-center"
      style={{ overflow: 'hidden' }}  /* ← clips the orb so it never causes horizontal scroll */
    >
      {/* Background glow orb — constrained to viewport width */}
      <div
        aria-hidden
        style={{
          position:      'absolute',
          top:           '40%',
          left:          '50%',
          width:         'min(480px, 90vw)',   /* ← never wider than viewport */
          height:        220,
          background:    'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
          borderRadius:  '50%',
          animation:     'hero-orb 5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex:        0,
          transform:     'translate(-50%, -50%)',
        }}
      />

      {/* Waveform bars */}
      <div
        aria-hidden
        style={{
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'center',
          gap:            3,
          height:         72,
          marginBottom:   28,
          position:       'relative',
          zIndex:         1,
          padding:        '0 8px',  /* small padding so edge bars aren't clipped */
        }}
      >
        {HERO_BARS.map((bar, i) => (
          <div
            key={i}
            style={{
              width:           3,
              height:          bar.height,
              borderRadius:    2,
              transformOrigin: 'bottom',
              flexShrink:      0,
              background:
                i % 3 === 0 ? 'linear-gradient(to top, #6366f1, #a5b4fc)' :
                i % 3 === 1 ? 'linear-gradient(to top, #7c3aed, #c4b5fd)' :
                              'linear-gradient(to top, #4f46e5, #818cf8)',
              animation: `hero-wave ${bar.duration}s ${bar.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Badge */}
      <div
        style={{ position: 'relative', zIndex: 1 }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.22)] bg-[rgba(99,102,241,0.08)] py-[5px] pl-2 pr-3.5"
      >
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
          <Mic size={11} color="white" strokeWidth={2.5} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#a5b4fc]">
          AI Voice Studio
        </span>
      </div>

      {/* Title */}
      <h1
        className="hero-title mb-4 block font-extrabold leading-[1.05] tracking-[-0.04em]"
        style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(32px, 8vw, 54px)' }}
      >
        Prompt to Speech
      </h1>

      {/* Subtitle */}
      <p
        className="mx-auto mb-7 max-w-[420px] px-4 text-[15px] leading-relaxed text-[#3a3a58]"
        style={{ position: 'relative', zIndex: 1 }}
      >
        Transform any text into authentic AI voice —
        with <span className="text-[#6366f1]">word-level</span> subtitle sync in real time.
      </p>

      {/* Feature pills */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 px-4"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {FEATURES.map((f, i) => (
          <span
            key={f.label}
            className="flex items-center gap-1.5 rounded-full border border-[#16162a] bg-[#0a0a14] px-3.5 py-1.5 text-[12px] text-[#4a4a68]"
            style={{ animation: `pill-in 0.45s ${0.1 + i * 0.08}s ease both` }}
          >
            <span>{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>
    </div>
  )
}

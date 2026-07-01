// ─────────────────────────────────────────────────────────
// components/SubtitleCanvas.tsx
//
// Kinetic word-highlighting subtitle display.
// Auto-scrolls the current word into view as playback advances.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import type { WordTiming } from '../types'

interface SubtitleCanvasProps {
  words:          WordTiming[]
  currentWordIdx: number
}

export default function SubtitleCanvas({ words, currentWordIdx }: SubtitleCanvasProps) {
  const wordRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Auto-scroll current word into view ────────────────
  useEffect(() => {
    if (currentWordIdx < 0) return
    const el = wordRefs.current[currentWordIdx]
    if (!el || !containerRef.current) return

    // Scroll the word to the vertical centre of the container
    el.scrollIntoView({
      behavior: 'smooth',
      block:    'center',
    })
  }, [currentWordIdx])

  if (!words.length) return null

  return (
    <div
      ref={containerRef}
      className="fade-up relative overflow-hidden rounded-2xl border border-[#18182a] bg-[#080810]"
      style={{ maxHeight: 220 }}  /* fixed height → overflow scrolls */
    >
      {/* Radial haze */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 58%)' }}
      />

      {/* Top edge shine */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[15%] right-[15%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.28), transparent)' }}
      />

      {/* Fade-out at top and bottom so scrolling looks intentional */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10"
        style={{ background: 'linear-gradient(to bottom, #080810, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10"
        style={{ background: 'linear-gradient(to top, #080810, transparent)' }}
      />

      {/* Word stream — intentionally overflows; container clips it */}
      <p
        className="relative px-8 py-7 text-lg leading-[2.15] tracking-[0.005em] select-none"
        aria-label="Generated transcript"
        aria-live="polite"
      >
        {words.map((w, i) => {
          const state =
            i === currentWordIdx ? 'word-current' :
            i <  currentWordIdx ? 'word-past'    :
            'word-future'

          return (
            <span
              key={i}
              ref={el => { wordRefs.current[i] = el }}
              className={`word-token ${state}`}
            >
              {w.word}{' '}
            </span>
          )
        })}
      </p>
    </div>
  )
}

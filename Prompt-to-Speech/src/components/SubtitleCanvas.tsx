// ─────────────────────────────────────────────────────────
// components/SubtitleCanvas.tsx
//
// Kinetic subtitle display with two modes:
//
//   Word mode    — one word highlighted at a time, karaoke-
//                  style. Best for short, punchy scripts.
//
//   Sentence mode — the full sentence containing the current
//                  word lights up at once. Better for longer
//                  prose; easier to read in full.
//
// The mode toggle is owned internally — it's a pure display
// preference with no effect on playback state.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { SubtitleMode, WordTiming } from '../types'

interface SubtitleCanvasProps {
  words:          WordTiming[]
  currentWordIdx: number
}

// ── Group words into sentence indices ─────────────────────
// Returns a parallel array: sentenceMap[i] = sentence index of word i.
function buildSentenceMap(words: WordTiming[]): number[] {
  let idx = 0
  return words.map(w => {
    const current = idx
    if (/[.!?]$/.test(w.word)) idx++
    return current
  })
}

// ── CSS state per word in WORD mode ──────────────────────
function wordClass(i: number, currentWordIdx: number): string {
  if (i === currentWordIdx) return 'word-current'
  if (i <  currentWordIdx) return 'word-past'
  return 'word-future'
}

// ── CSS state per word in SENTENCE mode ──────────────────
function sentenceClass(
  i:              number,
  currentWordIdx: number,
  sentenceMap:    number[],
): string {
  const currentSentence = sentenceMap[Math.max(0, currentWordIdx)] ?? -1
  const wordSentence    = sentenceMap[i] ?? 0

  if (currentWordIdx < 0)                       return 'sentence-future'
  if (wordSentence === currentSentence)          return 'sentence-current'
  if (wordSentence <  currentSentence)           return 'sentence-past'
  return 'sentence-future'
}

// ─────────────────────────────────────────────────────────
export default function SubtitleCanvas({ words, currentWordIdx }: SubtitleCanvasProps) {
  const [mode, setMode] = useState<SubtitleMode>('word')

  const wordRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Pre-compute sentence map only when words change
  const [sentenceMap, setSentenceMap] = useState<number[]>([])
  useEffect(() => { setSentenceMap(buildSentenceMap(words)) }, [words])

  // ── Auto-scroll current word into view ────────────────
  useEffect(() => {
    if (currentWordIdx < 0) return
    const el = wordRefs.current[currentWordIdx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWordIdx])

  if (!words.length) return null

  return (
    <div className="fade-up flex flex-col overflow-hidden rounded-2xl border border-[#18182a] bg-[#080810]">

      {/* ── Mode toggle bar ── */}
      <div className="flex items-center justify-between border-b border-[#12122a] px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a2a40]">
          Subtitles
        </span>

        <div className="flex items-center gap-[2px] rounded-lg border border-[#16162a] bg-[#060610] p-[3px]">
          {(['word', 'sentence'] as SubtitleMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-all duration-200"
              style={{
                background: mode === m ? '#1a1a2e'  : 'transparent',
                color:      mode === m ? '#a5b4fc'  : '#3d3d58',
                boxShadow:  mode === m ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Word stream ── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ maxHeight: 200 }}
      >
        {/* Radial depth haze */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 55%)' }}
        />

        {/* Fade masks at top + bottom */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8"
          style={{ background: 'linear-gradient(to bottom, #080810, transparent)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8"
          style={{ background: 'linear-gradient(to top, #080810, transparent)' }} />

        <p
          className="relative z-0 px-7 py-6 leading-[2.15] tracking-[0.005em] select-none"
          style={{ fontSize: 17 }}
          aria-label="Generated transcript"
          aria-live="polite"
        >
          {words.map((w, i) => {
            const cls = mode === 'word'
              ? `word-token ${wordClass(i, currentWordIdx)}`
              : `word-token ${sentenceClass(i, currentWordIdx, sentenceMap)}`

            return (
              <span
                key={i}
                ref={el => { wordRefs.current[i] = el }}
                className={cls}
              >
                {w.word}{' '}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}

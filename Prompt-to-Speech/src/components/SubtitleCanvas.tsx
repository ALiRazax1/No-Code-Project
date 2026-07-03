// ─────────────────────────────────────────────────────────
// components/SubtitleCanvas.tsx — now accepts fontSize prop
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { SubtitleMode, WordTiming } from '../types'

interface SubtitleCanvasProps {
  words:          WordTiming[]
  currentWordIdx: number
  fontSize?:      number   // from settings.subtitleFontSize
}

function buildSentenceMap(words: WordTiming[]): number[] {
  let idx = 0
  return words.map(w => {
    const cur = idx
    if (/[.!?]$/.test(w.word)) idx++
    return cur
  })
}

function wordClass(i: number, cur: number): string {
  if (i === cur) return 'word-current'
  if (i <  cur)  return 'word-past'
  return 'word-future'
}

function sentenceClass(i: number, cur: number, map: number[]): string {
  const cs = map[Math.max(0, cur)] ?? -1
  const ws = map[i] ?? 0
  if (cur < 0)      return 'sentence-future'
  if (ws === cs)    return 'sentence-current'
  if (ws <  cs)     return 'sentence-past'
  return 'sentence-future'
}

export default function SubtitleCanvas({
  words,
  currentWordIdx,
  fontSize = 17,
}: SubtitleCanvasProps) {
  const [mode, setMode] = useState<SubtitleMode>('word')
  const [sentenceMap, setSentenceMap] = useState<number[]>([])
  const wordRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSentenceMap(buildSentenceMap(words)) }, [words])

  useEffect(() => {
    if (currentWordIdx < 0) return
    wordRefs.current[currentWordIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWordIdx])

  if (!words.length) return null

  return (
    <div className="fade-up flex flex-col overflow-hidden rounded-2xl border border-[#18182a] bg-[#080810]">

      {/* Mode toggle */}
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

      {/* Word stream */}
      <div ref={containerRef} className="relative overflow-hidden" style={{ maxHeight: 200 }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 55%)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8"
          style={{ background: 'linear-gradient(to bottom, #080810, transparent)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8"
          style={{ background: 'linear-gradient(to top, #080810, transparent)' }} />

        <p
          className="relative z-0 px-7 py-6 leading-[2.15] tracking-[0.005em] select-none transition-[font-size] duration-300"
          style={{ fontSize }}
          aria-label="Generated transcript"
          aria-live="polite"
        >
          {words.map((w, i) => {
            const cls = mode === 'word'
              ? `word-token ${wordClass(i, currentWordIdx)}`
              : `word-token ${sentenceClass(i, currentWordIdx, sentenceMap)}`
            return (
              <span key={i} ref={el => { wordRefs.current[i] = el }} className={cls}>
                {w.word}{' '}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}

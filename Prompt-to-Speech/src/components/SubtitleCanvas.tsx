// ─────────────────────────────────────────────────────────
// components/SubtitleCanvas.tsx
//
// New in this version:
//   • Clickable words — each word is a seek anchor.
//     When onWordClick is provided, clicking any word calls
//     it with the word index so the parent can seek the player.
//   • Copy transcript button — copies the full script text
//     to clipboard with a 2s checkmark confirmation.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { SubtitleMode, WordTiming } from '../types'

interface SubtitleCanvasProps {
  words:          WordTiming[]
  currentWordIdx: number
  fontSize?:      number
  onWordClick?:   (wordIdx: number) => void
}

function buildSentenceMap(words: WordTiming[]): number[] {
  let idx = 0
  return words.map(w => { const c = idx; if (/[.!?]$/.test(w.word)) idx++; return c })
}

function wordStateClass(i: number, cur: number): string {
  if (i === cur) return 'word-current'
  if (i <  cur)  return 'word-past'
  return 'word-future'
}

function sentenceStateClass(i: number, cur: number, map: number[]): string {
  const cs = map[Math.max(0, cur)] ?? -1
  const ws = map[i] ?? 0
  if (cur < 0)    return 'sentence-future'
  if (ws === cs)  return 'sentence-current'
  if (ws < cs)    return 'sentence-past'
  return 'sentence-future'
}

export default function SubtitleCanvas({
  words,
  currentWordIdx,
  fontSize = 17,
  onWordClick,
}: SubtitleCanvasProps) {
  const [mode,        setMode]        = useState<SubtitleMode>('word')
  const [sentenceMap, setSentenceMap] = useState<number[]>([])
  const [copied,      setCopied]      = useState(false)

  const wordRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSentenceMap(buildSentenceMap(words)) }, [words])

  // Auto-scroll current word into view
  useEffect(() => {
    if (currentWordIdx < 0) return
    wordRefs.current[currentWordIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWordIdx])

  async function handleCopy() {
    const text = words.map(w => w.word).join(' ')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  if (!words.length) return null

  const isClickable = Boolean(onWordClick)

  return (
    <div className="fade-up flex flex-col overflow-hidden rounded-2xl border border-[#18182a] bg-[#080810]">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between border-b border-[#12122a] px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a2a40]">
          Subtitles
        </span>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
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

          {/* Copy button */}
          <button
            onClick={handleCopy}
            aria-label="Copy transcript"
            title="Copy transcript"
            className="flex items-center gap-1.5 rounded-lg border border-[#16162a] bg-[#060610] px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200"
            style={{
              color:       copied ? '#34d399' : '#3d3d58',
              borderColor: copied ? 'rgba(52,211,153,0.25)' : '#16162a',
            }}
          >
            {copied
              ? <><Check size={12} />Copied</>
              : <><Copy size={12} />Copy</>
            }
          </button>
        </div>
      </div>

      {/* ── Word stream ── */}
      <div ref={containerRef} className="relative overflow-hidden" style={{ maxHeight: 200 }}>
        {/* Depth haze */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 55%)' }} />

        {/* Fade masks */}
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
            const stateClass = mode === 'word'
              ? wordStateClass(i, currentWordIdx)
              : sentenceStateClass(i, currentWordIdx, sentenceMap)

            return (
              <span
                key={i}
                ref={el => { wordRefs.current[i] = el }}
                className={`word-token ${stateClass}`}
                onClick={() => isClickable && onWordClick?.(i)}
                title={isClickable ? `Seek to "${w.word}"` : undefined}
                style={{
                  cursor:            isClickable ? 'pointer' : 'default',
                  // Subtle underline hint on hover for clickable words
                  textDecorationLine: isClickable && i !== currentWordIdx ? 'underline' : 'none',
                  textDecorationColor: 'rgba(99,102,241,0.25)',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px',
                }}
                onMouseEnter={e => {
                  if (isClickable) (e.currentTarget as HTMLElement).style.opacity = '0.75'
                }}
                onMouseLeave={e => {
                  if (isClickable) (e.currentTarget as HTMLElement).style.opacity = '1'
                }}
              >
                {w.word}{' '}
              </span>
            )
          })}
        </p>
      </div>

      {/* Clickable hint */}
      {isClickable && (
        <div className="border-t border-[#0e0e1e] px-5 py-2">
          <p className="text-[10px] text-[#1e1e30]">
            Click any word to jump to that moment
          </p>
        </div>
      )}
    </div>
  )
}

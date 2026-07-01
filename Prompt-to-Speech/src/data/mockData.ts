// ─────────────────────────────────────────────────────────
// data/mockData.ts
// Static configuration and client-side mock data helpers.
// Replace mockGenerateAudio() with your real API call
// once you have an ElevenLabs / OpenAI API key.
// ─────────────────────────────────────────────────────────

import type { VoiceProfile, WordTiming } from '../types'

// ── Voice roster ────────────────────────────────────────
export const VOICE_PROFILES: VoiceProfile[] = [
  { id: 'nova',    name: 'Nova',    desc: 'Warm · Friendly',      color: '#a78bfa' },
  { id: 'echo',    name: 'Echo',    desc: 'Deep · Authoritative', color: '#60a5fa' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Bright · Energetic',   color: '#f472b6' },
  { id: 'onyx',    name: 'Onyx',    desc: 'Rich · Velvety',       color: '#34d399' },
  { id: 'alloy',   name: 'Alloy',   desc: 'Neutral · Clear',      color: '#fbbf24' },
]

// ── Default demo prompt ──────────────────────────────────
export const DEFAULT_PROMPT =
  `Welcome to the future of voice synthesis. Every word you type transforms into rich, human-like audio in seconds. This is the power of modern artificial intelligence — crafting authentic voices from simple text, and opening new creative possibilities for developers and creators worldwide.`

// ── Waveform bar heights (pre-seeded, never recalculated) ──
export const WAVEFORM_BARS: number[] = Array.from(
  { length: 40 },
  (_, i) => 4 + Math.abs(Math.sin(i * 0.9 + 1.2) * Math.cos(i * 0.4)) * 18,
)

// ─────────────────────────────────────────────────────────
// buildWordTimings
// ─────────────────────────────────────────────────────────
/**
 * Generates per-word timestamps from plain text.
 *
 * IMPORTANT — mock mode only:
 * These timestamps drive the seek-bar progress display.
 * Word highlighting is driven by SpeechSynthesis `onboundary`
 * events in useAudioPlayer, so it stays in sync with the
 * actual voice regardless of these estimates.
 *
 * Calibrated to ~130 wpm to roughly match SpeechSynthesis at
 * rate=0.92. In production (ElevenLabs) these are replaced by
 * the character-level alignment data from the API response.
 */
export function buildWordTimings(text: string): WordTiming[] {
  const rawWords = text.trim().split(/\s+/)
  let cursor = 0.10 // seconds

  return rawWords.map((word): WordTiming => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, '')
    const syllables = Math.max(1, Math.ceil(clean.length / 3.0))

    // ~130 wpm at rate=0.92 → each syllable ≈ 0.14s
    const dur = 0.10 + syllables * 0.14

    // Pauses calibrated to match SpeechSynthesis inter-phrase gaps
    const pause =
      /[.!?]$/.test(word) ? 0.50 :
      /[,;:]$/.test(word) ? 0.22 :
      0.05

    const startTime = parseFloat(cursor.toFixed(3))
    const endTime   = parseFloat((cursor + dur).toFixed(3))
    cursor += dur + pause

    return { word, startTime, endTime }
  })
}

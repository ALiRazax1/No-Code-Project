// ─────────────────────────────────────────────────────────
// hooks/useWaveform.ts
//
// Returns per-frame bar heights (0–1 normalised) for the
// waveform visualiser in AudioPlayer.
//
// TWO MODES:
//
//   Real audio (ElevenLabs / OpenAI audioUrl)
//   → Connects the <audio> element to a Web Audio API
//     AnalyserNode and reads live frequency bin data.
//     The bars react to actual frequencies in the audio.
//
//   SpeechSynthesis (mock mode, no audioUrl)
//   → Browser SpeechSynthesis output cannot be tapped by
//     the Web Audio API, so we drive a procedural animation
//     that looks organic and reacts to "time" rather than
//     real frequency data. Looks great, clearly animated.
//
// The caller just consumes `bars: number[]` — mode is
// invisible from the outside.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

export const NUM_BARS = 40

// Idle bar heights — shown when not playing (static, seeded)
const IDLE_BARS: number[] = Array.from(
  { length: NUM_BARS },
  (_, i) => 0.04 + Math.abs(Math.sin(i * 0.9 + 1.2) * Math.cos(i * 0.4)) * 0.18,
)

interface UseWaveformProps {
  audioElRef:       React.RefObject<HTMLAudioElement | null>
  isPlaying:        boolean
  isUsingRealAudio: boolean
}

export function useWaveform({
  audioElRef,
  isPlaying,
  isUsingRealAudio,
}: UseWaveformProps): number[] {
  const [bars, setBars] = useState<number[]>(IDLE_BARS)

  // Web Audio API refs — created lazily, survive re-renders
  const ctxRef      = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef   = useRef<MediaElementAudioSourceNode | null>(null)
  const connectedEl = useRef<HTMLAudioElement | null>(null)

  const rafRef      = useRef<number | null>(null)

  function stopRaf() {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  // ── Lazy AudioContext + AnalyserNode setup ────────────
  function ensureAnalyser(): AnalyserNode {
    if (!ctxRef.current) {
      ctxRef.current      = new AudioContext()
      analyserRef.current = ctxRef.current.createAnalyser()
      analyserRef.current.fftSize                = 128  // 64 frequency bins
      analyserRef.current.smoothingTimeConstant  = 0.80 // smooth decay
      analyserRef.current.connect(ctxRef.current.destination)
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return analyserRef.current!
  }

  // ── Connect a new <audio> element (safe to call repeatedly) ──
  function connectAudioEl(el: HTMLAudioElement) {
    if (connectedEl.current === el) return  // already wired
    const analyser = ensureAnalyser()
    sourceRef.current?.disconnect()
    // createMediaElementSource can only be called once per element
    sourceRef.current = ctxRef.current!.createMediaElementSource(el)
    sourceRef.current.connect(analyser)
    connectedEl.current = el
  }

  useEffect(() => {
    stopRaf()

    if (!isPlaying) {
      // Smoothly decay to idle heights over ~20 frames
      let frame = 0
      const decay = () => {
        frame++
        const t = Math.min(frame / 20, 1)
        setBars(prev => prev.map((b, i) => b + (IDLE_BARS[i] - b) * t))
        if (frame < 20) rafRef.current = requestAnimationFrame(decay)
      }
      rafRef.current = requestAnimationFrame(decay)
      return () => stopRaf()
    }

    // ── Real audio mode ───────────────────────────────
    if (isUsingRealAudio) {
      const audioEl = audioElRef.current
      if (!audioEl) return

      try { connectAudioEl(audioEl) } catch { return }

      const analyser  = analyserRef.current!
      const dataArray = new Uint8Array(analyser.frequencyBinCount) // 64 bins

      const tick = () => {
        analyser.getByteFrequencyData(dataArray)

        // Map 64 frequency bins → NUM_BARS display bars
        // Weight toward lower frequencies (more musically interesting)
        const step = Math.floor(dataArray.length / NUM_BARS)
        const newBars = Array.from({ length: NUM_BARS }, (_, i) => {
          const binVal = dataArray[Math.min(i * step, dataArray.length - 1)]
          return binVal / 255   // normalise 0–1
        })

        setBars(newBars)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      return () => stopRaf()
    }

    // ── SpeechSynthesis procedural animation ──────────
    // Three overlapping sine waves at different frequencies
    // give an organic, speech-like envelope.
    let frame = 0
    const tick = () => {
      frame++
      const t = frame / 60  // time in seconds at 60fps

      const newBars = Array.from({ length: NUM_BARS }, (_, i) => {
        const norm = i / (NUM_BARS - 1)
        // Low-frequency envelope (slow swell)
        const env   = 0.3 + 0.35 * Math.abs(Math.sin(t * 1.8 + norm * Math.PI))
        // Mid speech rhythm (fast flutter)
        const rip   = 0.20 * Math.abs(Math.sin(t * 6.5 + i * 0.55))
        // High-frequency shimmer
        const shim  = 0.10 * Math.abs(Math.sin(t * 14 + i * 1.2))
        // Spectral shape: peak in mid-range like speech formants
        const shape = Math.exp(-Math.pow((norm - 0.35) * 3, 2)) * 0.25
        return Math.min(1, env + rip + shim + shape)
      })

      setBars(newBars)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => stopRaf()
  }, [isPlaying, isUsingRealAudio]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      stopRaf()
      // Don't close ctx — it may be reused if component remounts
    }
  }, [])

  return bars
}

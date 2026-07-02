// ─────────────────────────────────────────────────────────
// hooks/useAudioPlayer.ts
// Now also exposes audioElRef + isUsingRealAudio so
// useWaveform can tap into the audio pipeline.
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import type { AudioData, PlaybackStatus } from '../types'

export interface UseAudioPlayerReturn {
  playbackStatus:    PlaybackStatus
  currentTime:       number
  currentWordIdx:    number
  progress:          number
  volume:            number
  isUsingRealAudio:  boolean
  audioElRef:        React.RefObject<HTMLAudioElement | null>
  handlePlayPause:   () => void
  handleRestart:     () => void
  handleSeek:        (seconds: number) => void
  handleVolume:      (v: number) => void
  formatTime:        (s: number) => string
}

function getWordIdxAt(words: AudioData['words'], t: number): number {
  let lo = 0, hi = words.length - 1, result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (words[mid].startTime <= t) { result = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return result
}

function buildCharMap(words: AudioData['words'], fromIdx: number): number[] {
  const slice = words.slice(Math.max(0, fromIdx))
  const starts: number[] = []
  let pos = 0
  for (const w of slice) { starts.push(pos); pos += w.word.length + 1 }
  return starts
}

function fmt(s: number): string {
  const m   = Math.floor(Math.max(0, s) / 60)
  const sec = Math.floor(Math.max(0, s) % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function useAudioPlayer(audioData: AudioData | null): UseAudioPlayerReturn {
  const [playbackStatus,   setPlaybackStatus]   = useState<PlaybackStatus>('idle')
  const [currentTime,      setCurrentTime]      = useState(0)
  const [currentWordIdx,   setCurrentWordIdx]   = useState(-1)
  const [volume,           setVolume]           = useState(0.9)
  const [isUsingRealAudio, setIsUsingRealAudio] = useState(false)

  const rafRef        = useRef<number | null>(null)
  const wallStartRef  = useRef(0)
  const seekOffsetRef = useRef(0)
  const audioElRef    = useRef<HTMLAudioElement | null>(null)
  const speechFromRef = useRef(0)
  const charMapRef    = useRef<number[]>([])
  const volumeRef     = useRef(0.9)

  const duration = audioData?.duration ?? 0
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const startRaf = useCallback((fromSeconds: number) => {
    if (!audioData) return
    seekOffsetRef.current = fromSeconds
    wallStartRef.current  = performance.now()
    const tick = () => {
      const elapsed = seekOffsetRef.current + (performance.now() - wallStartRef.current) / 1000
      const t       = Math.min(elapsed, audioData.duration)
      setCurrentTime(t)
      if (audioData.audioUrl) setCurrentWordIdx(getWordIdxAt(audioData.words, t))
      if (t < audioData.duration) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [audioData])

  function stopSpeech() {
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.src = ''
      audioElRef.current = null
    }
    setIsUsingRealAudio(false)
  }

  function startSpeech(words: AudioData['words'], fromIdx: number, audioUrl: string | null) {
    stopSpeech()

    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.volume      = volumeRef.current
      audio.currentTime = words[Math.max(0, fromIdx)]?.startTime ?? 0
      audio.onended = () => {
        setCurrentWordIdx(words.length - 1)
        setPlaybackStatus('ended')
        setIsUsingRealAudio(false)
        stopRaf()
      }
      audio.play().catch(console.error)
      audioElRef.current = audio
      setIsUsingRealAudio(true)
      return
    }

    if (!window.speechSynthesis) return

    const slicedWords = words.slice(Math.max(0, fromIdx))
    const text        = slicedWords.map(w => w.word).join(' ')
    speechFromRef.current = Math.max(0, fromIdx)
    charMapRef.current    = buildCharMap(words, fromIdx)

    const utt  = new SpeechSynthesisUtterance(text)
    utt.rate   = 0.92
    utt.volume = volumeRef.current

    const voices = window.speechSynthesis.getVoices()
    const pick   =
      voices.find(v => v.lang.startsWith('en-') && v.localService) ??
      voices.find(v => v.lang.startsWith('en')) ??
      voices[0]
    if (pick) utt.voice = pick

    utt.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name !== 'word') return
      const starts = charMapRef.current
      let localIdx = 0
      for (let i = 1; i < starts.length; i++) {
        if (starts[i] <= e.charIndex) localIdx = i
        else break
      }
      setCurrentWordIdx(speechFromRef.current + localIdx)
    }

    utt.onend   = () => { setCurrentWordIdx(words.length - 1); setPlaybackStatus('ended'); stopRaf() }

    const watchdog = setTimeout(() => {
      if (window.speechSynthesis.speaking) return
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utt)
    }, 500)
    utt.onstart = () => clearTimeout(watchdog)

    setIsUsingRealAudio(false)
    window.speechSynthesis.speak(utt)
  }

  const handlePlayPause = useCallback(() => {
    if (!audioData) return
    if (playbackStatus === 'playing') {
      stopRaf(); stopSpeech()
      seekOffsetRef.current = currentTime
      setPlaybackStatus('paused')
      return
    }
    const from    = playbackStatus === 'ended' ? 0 : currentTime
    const fromIdx = getWordIdxAt(audioData.words, from)
    if (playbackStatus === 'ended') { setCurrentTime(0); setCurrentWordIdx(-1) }
    startSpeech(audioData.words, fromIdx, audioData.audioUrl)
    startRaf(from)
    setPlaybackStatus('playing')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData, playbackStatus, currentTime, startRaf, stopRaf])

  const handleRestart = useCallback(() => {
    stopRaf(); stopSpeech()
    seekOffsetRef.current = 0
    setCurrentTime(0); setCurrentWordIdx(-1); setPlaybackStatus('idle')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRaf])

  const handleSeek = useCallback((seconds: number) => {
    if (!audioData) return
    const wasPlaying = playbackStatus === 'playing'
    stopRaf(); stopSpeech()
    setCurrentTime(seconds)
    const wIdx = getWordIdxAt(audioData.words, seconds)
    setCurrentWordIdx(wIdx)
    if (wasPlaying) {
      startSpeech(audioData.words, wIdx, audioData.audioUrl)
      startRaf(seconds)
      setPlaybackStatus('playing')
    } else {
      seekOffsetRef.current = seconds
      setPlaybackStatus(seconds > 0 ? 'paused' : 'idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData, playbackStatus, startRaf, stopRaf])

  const handleVolume = useCallback((v: number) => {
    volumeRef.current = v
    setVolume(v)
    if (audioElRef.current) audioElRef.current.volume = v
  }, [])

  useEffect(() => {
    stopRaf(); stopSpeech()
    setPlaybackStatus('idle'); setCurrentTime(0); setCurrentWordIdx(-1)
    seekOffsetRef.current = 0
    try { window.speechSynthesis?.getVoices() } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData])

  useEffect(() => () => { stopRaf(); stopSpeech() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    playbackStatus, currentTime, currentWordIdx, progress,
    volume, isUsingRealAudio, audioElRef,
    handlePlayPause, handleRestart, handleSeek, handleVolume,
    formatTime: fmt,
  }
}

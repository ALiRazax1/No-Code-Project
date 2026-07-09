// ─────────────────────────────────────────────────────────
// components/AudioPlayer.tsx
// Mobile fix: icon button labels hidden on small screens.
// Timestamp hidden on mobile to prevent top-row overflow.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import {
  Pause, Play, RotateCcw, Volume2, VolumeX,
  Download, RefreshCw, FileText, Share2, Check,
  Keyboard, Scissors, X, Terminal, FileJson,
} from 'lucide-react'
import type { AudioData, WordTiming } from '../types'
import { VOICE_PROFILES }           from '../data/mockData'
import { useAudioPlayer }           from '../hooks/useAudioPlayer'
import { useWaveform, NUM_BARS }    from '../hooks/useWaveform'
import { exportTrimmedClip }        from '../utils/audioExport'
import MusicMixer               from './MusicMixer'

interface AudioPlayerProps {
  audioData:         AudioData
  onWordIndexChange: (idx: number) => void
  onRegenerate:      () => void
  playbackRate?:     number
  language?:         string
  onShareUrl:        () => Promise<void>
  externalSeekTo?:   { time: number } | null
  onOpenExplorer:    () => void
  onExportJson:      () => void
}

function toSRTTime(s: number): string {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(Math.round((s%1)*1000)).padStart(3,'0')}`
}
function generateSRT(words: WordTiming[]): string {
  const C = 5
  return Array.from({ length: Math.ceil(words.length/C) }, (_, ci) => {
    const chunk = words.slice(ci*C, ci*C+C)
    return `${ci+1}\n${toSRTTime(chunk[0].startTime)} --> ${toSRTTime(chunk[chunk.length-1].endTime)}\n${chunk.map(w=>w.word).join(' ')}`
  }).join('\n\n')
}
function downloadBlob(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'R',     desc: 'Restart'      },
  { key: '← →',  desc: 'Seek ± 5s'    },
  { key: 'M',     desc: 'Mute toggle'  },
]

export default function AudioPlayer({
  audioData, onWordIndexChange, onRegenerate,
  playbackRate = 1, language = 'en',
  onShareUrl, externalSeekTo,
  onOpenExplorer, onExportJson,
}: AudioPlayerProps) {
  const {
    playbackStatus, currentTime, currentWordIdx, progress,
    volume, isUsingRealAudio, audioElRef,
    handlePlayPause, handleRestart, handleSeek, handleVolume, formatTime,
  } = useAudioPlayer(audioData, playbackRate, language)

  const bars = useWaveform({ audioElRef, isPlaying: playbackStatus === 'playing', isUsingRealAudio })

  const [shared,         setShared]         = useState(false)
  const [showShortcuts,  setShowShortcuts]  = useState(false)
  const [trimMode,       setTrimMode]       = useState(false)
  const [trimStart,      setTrimStart]      = useState(0)
  const [trimEnd,        setTrimEnd]        = useState(0)
  const [trimExporting,  setTrimExporting]  = useState(false)
  const [trimError,      setTrimError]      = useState('')
  const [hoverFrac,      setHoverFrac]      = useState<number | null>(null)

  // Stable ref so the seek effect never needs handleSeek as a dependency.
  const handleSeekRef = useRef(handleSeek)
  useEffect(() => { handleSeekRef.current = handleSeek }, [handleSeek])

  // Sync word index to parent after render — never during render
  useEffect(() => {
    onWordIndexChange(currentWordIdx)
  }, [currentWordIdx, onWordIndexChange])

  const isPlaying = playbackStatus === 'playing'
  const isMuted   = volume === 0
  const { duration, words, voiceId } = audioData
  const profile = VOICE_PROFILES.find(v => v.id === voiceId) ?? VOICE_PROFILES[0]
  const barPx   = (v: number) => 3 + v * 23

  function openTrim() {
    setTrimStart(0); setTrimEnd(duration); setTrimError(''); setTrimMode(true)
  }

  // External seek — fires on every new seekSignal object (every word click).
  // Uses handleSeekRef so handleSeek identity changes never cause spurious runs.
  useEffect(() => {
    if (!externalSeekTo) return
    handleSeekRef.current(externalSeekTo.time)
  }, [externalSeekTo])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case ' ':           e.preventDefault(); handlePlayPause(); break
        case 'r': case 'R': e.preventDefault(); handleRestart(); break
        case 'ArrowLeft':   e.preventDefault(); handleSeek(Math.max(0, currentTime - 5)); break
        case 'ArrowRight':  e.preventDefault(); handleSeek(Math.min(duration, currentTime + 5)); break
        case 'm': case 'M': e.preventDefault(); handleVolume(isMuted ? 0.9 : 0); break
        case 'Escape':      setShowShortcuts(false); break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handlePlayPause, handleRestart, handleSeek, handleVolume, currentTime, duration, isMuted])

  async function handleShare() {
    await onShareUrl()
    setShared(true)
    setTimeout(() => setShared(false), 2200)
  }

  async function handleExportClip() {
    if (!audioData.audioUrl) return
    setTrimExporting(true); setTrimError('')
    try {
      await exportTrimmedClip(audioData.audioUrl, trimStart, trimEnd, `pts-clip-${voiceId}-${Date.now()}.wav`)
    } catch (err) {
      setTrimError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setTrimExporting(false)
    }
  }

  const trimStartFrac = trimMode ? trimStart / duration : 0
  const trimEndFrac   = trimMode ? trimEnd   / duration : 1

  return (
    <div className="fade-up rounded-2xl border border-[#1a1a28] bg-[#0c0c18] px-4 py-5 sm:px-6 sm:py-[22px]">

      {/* ── Top row ── */}
      <div className="mb-3.5 flex items-center justify-between gap-2 overflow-hidden">

        {/* Voice label — truncated on mobile */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-shadow duration-300"
            style={{ background: profile.color, boxShadow: isPlaying ? `0 0 8px ${profile.color}` : 'none' }} />
          <span className="truncate text-[12px] text-[#6b6b80] sm:text-[13px]">
            {profile.name}
          </span>
          {playbackStatus === 'playing' && (
            <span className="hidden shrink-0 rounded-full px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-wider sm:inline"
              style={{
                background: isUsingRealAudio ? 'rgba(52,211,153,0.12)' : 'rgba(99,102,241,0.12)',
                color:      isUsingRealAudio ? '#34d399' : '#818cf8',
              }}>
              {isUsingRealAudio ? 'Live' : 'Synth'}
            </span>
          )}
        </div>

        {/* Action buttons — labels hidden on mobile */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconButton onClick={handleShare}    title={shared ? '✓' : 'Share'} label="Share URL">
            {shared ? <Check size={13} className="text-[#34d399]" /> : <Share2 size={13} />}
          </IconButton>
          <IconButton onClick={onRegenerate}   title="New"  label="Regenerate"><RefreshCw size={13} /></IconButton>
          <IconButton
            onClick={() => downloadBlob(generateSRT(words), `pts-${voiceId}-${Date.now()}.srt`)}
            title=".srt" label="Download SRT"><FileText size={13} /></IconButton>
          <IconButton
            onClick={() => {
              if (!audioData.audioUrl) return
              Object.assign(document.createElement('a'),
                { href: audioData.audioUrl, download: `pts-${voiceId}-${Date.now()}.mp3` }).click()
            }}
            title=".mp3" label="Download MP3" disabled={!audioData.audioUrl}><Download size={13} /></IconButton>
          <IconButton onClick={onExportJson}    title=".json" label="Export JSON"><FileJson size={13} /></IconButton>
          <IconButton onClick={onOpenExplorer}  title="API"   label="API Explorer"><Terminal size={13} /></IconButton>
          <IconButton
            onClick={() => trimMode ? setTrimMode(false) : openTrim()}
            title="Trim" label="Trim" disabled={!audioData.audioUrl}>
            <Scissors size={13} style={{ color: trimMode ? '#a5b4fc' : undefined }} />
          </IconButton>

          {/* Timestamp — hidden on mobile */}
          <span className="ml-1 hidden font-mono text-[12px] tracking-wider text-[#2e2e48] sm:inline">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Timestamp row on mobile — shown below top row */}
      <div className="mb-2 text-right font-mono text-[11px] tracking-wider text-[#2e2e48] sm:hidden">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* ── Waveform (click or drag to seek) ── */}
      <div
        role="slider"
        aria-label="Audio waveform — click to seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(currentTime)}
        className="relative mb-3.5 flex cursor-pointer items-end justify-between gap-[2px]"
        style={{ height: 32 }}
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
          handleSeek(frac * duration)
        }}
        onMouseMove={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          setHoverFrac(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
        }}
        onMouseLeave={() => setHoverFrac(null)}
      >
        {/* Hover time tooltip */}
        {hoverFrac !== null && duration > 0 && (
          <div
            className="pointer-events-none absolute bottom-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              left:      `${hoverFrac * 100}%`,
              background: 'rgba(8,8,20,0.92)',
              border:    '1px solid #1e1e30',
              color:     '#a5b4fc',
              boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {formatTime(hoverFrac * duration)}
          </div>
        )}

        {bars.slice(0, NUM_BARS).map((v, i) => {
          const frac       = i / (NUM_BARS - 1)
          const inTrim     = trimMode && frac >= trimStartFrac && frac <= trimEndFrac
          const barT       = frac * duration
          const isCurrent  = Math.abs(barT - currentTime) < duration / NUM_BARS
          const isPast     = barT < currentTime
          const isHovered  = hoverFrac !== null && Math.abs(frac - hoverFrac) < 1.5 / NUM_BARS
          const isPreSeek  = hoverFrac !== null && frac <= hoverFrac

          const bg =
            inTrim && isCurrent ? '#8b5cf6' :
            inTrim && isPast    ? '#3d3d68' :
            inTrim              ? '#2a2a48' :
            isHovered           ? '#a5b4fc' :
            isCurrent           ? '#8b5cf6' :
            isPast              ? '#3d3d68' : '#16162a'

          const opacity =
            isHovered  ? 1 :
            isPreSeek  ? 0.65 :
            inTrim     ? 1 :
            isCurrent  ? 1 :
            isPast     ? 0.9 : 0.4

          return (
            <div key={i} className="flex-1 rounded-[1.5px]"
              style={{
                height:     barPx(v),
                background: bg,
                opacity,
                transition: 'height 0.05s ease, background 0.08s, opacity 0.08s',
              }} />
          )
        })}
      </div>

      {/* ── Seek bar ── */}
      <div className="mb-4">
        <input type="range" className="seek-bar"
          min={0} max={duration} step={0.05} value={currentTime}
          onChange={e => handleSeek(parseFloat(e.target.value))}
          aria-label="Seek audio position"
          style={{ background: `linear-gradient(to right, #6366f1 ${progress}%, #18182e ${progress}%)` }} />
      </div>

      {/* ── Trim controls ── */}
      {trimMode && (
        <div className="mb-4 rounded-xl border border-[#1a1a2c] bg-[#090914] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors size={13} color="#6366f1" />
              <span className="text-[12px] font-semibold text-[#6b6b80]">Trim Selection</span>
            </div>
            <button onClick={() => setTrimMode(false)} className="text-[#2e2e48] transition-colors hover:text-[#6b6b80]">
              <X size={14} />
            </button>
          </div>

          <div className="mb-2">
            <div className="mb-1 flex justify-between text-[11px] text-[#2e2e48]">
              <span>In point</span>
              <span className="font-mono text-[#6366f1]">{formatTime(trimStart)}</span>
            </div>
            <input type="range" className="seek-bar"
              min={0} max={duration} step={0.05} value={trimStart}
              onChange={e => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.1))}
              aria-label="Trim start"
              style={{ background: `linear-gradient(to right, #18182e ${(trimStart/duration)*100}%, #6366f1 ${(trimStart/duration)*100}%, #6366f1 ${(trimEnd/duration)*100}%, #18182e ${(trimEnd/duration)*100}%)` }} />
          </div>

          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[11px] text-[#2e2e48]">
              <span>Out point</span>
              <span className="font-mono text-[#6366f1]">{formatTime(trimEnd)}</span>
            </div>
            <input type="range" className="seek-bar"
              min={0} max={duration} step={0.05} value={trimEnd}
              onChange={e => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.1))}
              aria-label="Trim end"
              style={{ background: `linear-gradient(to right, #18182e ${(trimStart/duration)*100}%, #6366f1 ${(trimStart/duration)*100}%, #6366f1 ${(trimEnd/duration)*100}%, #18182e ${(trimEnd/duration)*100}%)` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#2e2e48]">
              Clip: <span className="font-mono text-[#a5b4fc]">{formatTime(trimEnd - trimStart)}</span>
            </span>
            <button onClick={handleExportClip} disabled={trimExporting || !audioData.audioUrl}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white transition-all disabled:pointer-events-none disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #5a5df0, #7c3aed)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
              {trimExporting
                ? <><span className="spin h-3 w-3 rounded-full border-2 border-white/30 border-t-white" />Exporting…</>
                : <><Download size={13} />Export .wav</>}
            </button>
          </div>

          {trimError && <p className="mt-2 text-[11px] text-[#f87171]">{trimError}</p>}
          {!audioData.audioUrl && (
            <p className="mt-2 text-[11px] text-[#2e2e48]">
              Trim export requires ElevenLabs or OpenAI audio.
            </p>
          )}
        </div>
      )}

      {/* ── Music Mixer ── */}
      <MusicMixer audioUrl={audioData.audioUrl} voiceId={voiceId} />

      {/* ── Controls ── */}
      <div className="flex items-center justify-between">

        {/* Left: restart + shortcuts */}
        <div className="flex w-[72px] items-center gap-0.5 sm:w-[80px] sm:gap-1">
          <button onClick={handleRestart} aria-label="Restart"
            className="flex items-center justify-center rounded-lg p-2 text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]">
            <RotateCcw size={17} />
          </button>
          <div className="relative">
            <button onClick={() => setShowShortcuts(v => !v)} aria-label="Keyboard shortcuts"
              className="flex items-center justify-center rounded-lg p-2 text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]">
              <Keyboard size={14} />
            </button>
            {showShortcuts && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-44 overflow-hidden rounded-xl border border-[#1a1a2c] bg-[#0a0a16]"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div className="border-b border-[#12122a] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2a2a42]">Shortcuts</span>
                </div>
                {SHORTCUTS.map(s => (
                  <div key={s.key} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[12px] text-[#4a4a68]">{s.desc}</span>
                    <kbd className="rounded border border-[#1a1a2c] bg-[#0e0e1a] px-1.5 py-0.5 font-mono text-[10px] text-[#3d3d58]">{s.key}</kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Play/Pause */}
        <button onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full transition-shadow duration-300 active:scale-95 sm:h-[54px] sm:w-[54px]"
          style={{
            background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
            boxShadow:  isPlaying ? '0 0 28px rgba(99,102,241,0.5)' : '0 0 10px rgba(99,102,241,0.22)',
          }}>
          {isPlaying
            ? <Pause size={20} fill="white" color="white" />
            : <Play  size={21} fill="white" color="white" className="translate-x-[1px]" />}
        </button>

        {/* Volume */}
        <div className="flex w-[72px] items-center justify-end gap-1 sm:w-[80px] sm:gap-1.5">
          <button onClick={() => handleVolume(isMuted ? 0.9 : 0)} aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="shrink-0 text-[#3d3d58] transition-colors hover:text-[#9ca3af]">
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => handleVolume(parseFloat(e.target.value))}
            aria-label="Volume" className="seek-bar"
            style={{ width: 48, background: `linear-gradient(to right, #6366f1 ${volume*100}%, #18182e ${volume*100}%)` }} />
        </div>
      </div>
    </div>
  )
}

// Icon buttons: labels visible only on sm+ screens
function IconButton({ onClick, label, title, disabled = false, children }: {
  onClick: () => void; label: string; title: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={label} disabled={disabled} title={title}
      className="flex items-center gap-0.5 rounded-md px-1.5 py-1.5 text-[11px] font-medium text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af] disabled:pointer-events-none disabled:opacity-25 sm:gap-1 sm:px-2">
      {children}
      {/* Label hidden on mobile, visible on sm+ */}
      <span className="hidden sm:inline">{title}</span>
    </button>
  )
}

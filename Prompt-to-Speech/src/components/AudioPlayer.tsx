// ─────────────────────────────────────────────────────────
// components/AudioPlayer.tsx
//
// Custom audio player UI.
// New in this version:
//   • Volume slider (wired to both real audio + SpeechSynthesis)
//   • Download MP3 button (enabled when audioUrl is available)
//   • Download SRT button (always available — built from word timings)
//   • Regenerate button
// ─────────────────────────────────────────────────────────

import { Pause, Play, RotateCcw, Volume2, VolumeX, Download, RefreshCw, FileText } from 'lucide-react'
import type { AudioData, WordTiming } from '../types'
import { VOICE_PROFILES, WAVEFORM_BARS } from '../data/mockData'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

interface AudioPlayerProps {
  audioData:         AudioData
  onWordIndexChange: (idx: number) => void
  onRegenerate:      () => void
}

// ─────────────────────────────────────────────────────────
// SRT helpers
// ─────────────────────────────────────────────────────────
function toSRTTime(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms  = Math.round((s % 1) * 1000)
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(sec).padStart(2, '0'),
  ].join(':') + ',' + String(ms).padStart(3, '0')
}

function generateSRT(words: WordTiming[]): string {
  // Group into ~5-word chunks so SRT lines feel natural
  const CHUNK = 5
  const lines: string[] = []

  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK)
    const idx   = Math.floor(i / CHUNK) + 1
    const start = toSRTTime(chunk[0].startTime)
    const end   = toSRTTime(chunk[chunk.length - 1].endTime)
    const text  = chunk.map(w => w.word).join(' ')
    lines.push(`${idx}\n${start} --> ${end}\n${text}`)
  }

  return lines.join('\n\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────
export default function AudioPlayer({ audioData, onWordIndexChange, onRegenerate }: AudioPlayerProps) {
  const {
    playbackStatus,
    currentTime,
    currentWordIdx,
    progress,
    volume,
    handlePlayPause,
    handleRestart,
    handleSeek,
    handleVolume,
    formatTime,
  } = useAudioPlayer(audioData)

  // Sync word index to parent (SubtitleCanvas)
  onWordIndexChange(currentWordIdx)

  const isPlaying = playbackStatus === 'playing'
  const isMuted   = volume === 0
  const { duration, words, voiceId, text } = audioData
  const profile = VOICE_PROFILES.find(v => v.id === voiceId) ?? VOICE_PROFILES[0]

  // ── Download handlers ─────────────────────────────────
  function handleDownloadMP3() {
    if (!audioData.audioUrl) return
    const a    = document.createElement('a')
    a.href     = audioData.audioUrl
    a.download = `pts-${voiceId}-${Date.now()}.mp3`
    a.click()
  }

  function handleDownloadSRT() {
    const content  = generateSRT(words)
    const filename = `pts-${voiceId}-${Date.now()}.srt`
    downloadBlob(content, filename, 'text/plain')
  }

  return (
    <div className="fade-up rounded-2xl border border-[#1a1a28] bg-[#0c0c18] px-6 py-[22px]">

      {/* ── Top row: voice label + action buttons ── */}
      <div className="mb-3.5 flex items-center justify-between gap-3">

        {/* Voice dot + label */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-shadow duration-300"
            style={{
              background: profile.color,
              boxShadow:  isPlaying ? `0 0 8px ${profile.color}` : 'none',
            }}
          />
          <span className="truncate text-[13px] text-[#6b6b80]">
            {profile.name} · {profile.desc}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Regenerate */}
          <IconButton
            onClick={onRegenerate}
            label="Regenerate with same prompt"
            title="Regenerate"
          >
            <RefreshCw size={14} />
          </IconButton>

          {/* Download SRT (always available) */}
          <IconButton
            onClick={handleDownloadSRT}
            label="Download SRT subtitles"
            title=".srt"
          >
            <FileText size={14} />
          </IconButton>

          {/* Download MP3 (only when real audioUrl exists) */}
          <IconButton
            onClick={handleDownloadMP3}
            label="Download MP3 audio"
            title=".mp3"
            disabled={!audioData.audioUrl}
          >
            <Download size={14} />
          </IconButton>

          {/* Timestamp */}
          <span className="ml-2 font-mono text-[12px] tracking-wider text-[#2e2e48]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* ── Waveform bars ── */}
      <div aria-hidden className="mb-3.5 flex items-center gap-[2px]" style={{ height: 26 }}>
        {WAVEFORM_BARS.map((h, i) => {
          const barT      = (i / (WAVEFORM_BARS.length - 1)) * duration
          const isCurrent = Math.abs(barT - currentTime) < duration / WAVEFORM_BARS.length
          const isPast    = barT < currentTime
          return (
            <div
              key={i}
              className="flex-1 rounded-[1px] transition-colors duration-100"
              style={{
                height:     h,
                background: isCurrent ? '#8b5cf6' : isPast ? '#3d3d58' : '#16162a',
                opacity:    isCurrent ? 1 : isPast ? 0.75 : 0.45,
              }}
            />
          )
        })}
      </div>

      {/* ── Seek bar ── */}
      <div className="mb-5">
        <input
          type="range"
          className="seek-bar"
          min={0}
          max={duration}
          step={0.05}
          value={currentTime}
          onChange={e => handleSeek(parseFloat(e.target.value))}
          aria-label="Seek audio position"
          style={{ background: `linear-gradient(to right, #6366f1 ${progress}%, #18182e ${progress}%)` }}
        />
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center justify-between">

        {/* Left: restart */}
        <div className="flex w-[80px] justify-start">
          <button
            onClick={handleRestart}
            aria-label="Restart"
            className="flex items-center justify-center rounded-lg p-2 text-[#3d3d58] transition-colors duration-200 hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Centre: play/pause */}
        <button
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-[54px] w-[54px] items-center justify-center rounded-full transition-shadow duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
            boxShadow:  isPlaying ? '0 0 28px rgba(99,102,241,0.5)' : '0 0 10px rgba(99,102,241,0.22)',
          }}
        >
          {isPlaying
            ? <Pause size={20} fill="white" color="white" />
            : <Play  size={22} fill="white" color="white" className="translate-x-[1px]" />
          }
        </button>

        {/* Right: volume */}
        <div className="flex w-[80px] items-center justify-end gap-1.5">
          <button
            onClick={() => handleVolume(isMuted ? 0.9 : 0)}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="shrink-0 text-[#3d3d58] transition-colors hover:text-[#9ca3af]"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Volume slider */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => handleVolume(parseFloat(e.target.value))}
            aria-label="Volume"
            className="seek-bar"
            style={{
              width: 56,
              background: `linear-gradient(to right, #6366f1 ${volume * 100}%, #18182e ${volume * 100}%)`,
            }}
          />
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// IconButton — small action button used in the top row
// ─────────────────────────────────────────────────────────
interface IconButtonProps {
  onClick:  () => void
  label:    string
  title:    string
  disabled?: boolean
  children: React.ReactNode
}

function IconButton({ onClick, label, title, disabled = false, children }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-[#3d3d58] transition-colors duration-150 hover:bg-[#16162a] hover:text-[#9ca3af] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
      <span>{title}</span>
    </button>
  )
}

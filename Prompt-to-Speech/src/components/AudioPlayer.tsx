// ─────────────────────────────────────────────────────────
// components/AudioPlayer.tsx
//
// Now drives waveform bars from useWaveform — real
// frequency data for ElevenLabs audio, procedural
// animation for SpeechSynthesis mode.
// ─────────────────────────────────────────────────────────

import { Pause, Play, RotateCcw, Volume2, VolumeX, Download, RefreshCw, FileText } from 'lucide-react'
import type { AudioData, WordTiming } from '../types'
import { VOICE_PROFILES } from '../data/mockData'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useWaveform, NUM_BARS } from '../hooks/useWaveform'

interface AudioPlayerProps {
  audioData:         AudioData
  onWordIndexChange: (idx: number) => void
  onRegenerate:      () => void
}

// ── SRT export ────────────────────────────────────────────
function toSRTTime(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms  = Math.round((s % 1) * 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`
}

function generateSRT(words: WordTiming[]): string {
  const CHUNK = 5
  return Array.from({ length: Math.ceil(words.length / CHUNK) }, (_, ci) => {
    const chunk = words.slice(ci * CHUNK, ci * CHUNK + CHUNK)
    return `${ci + 1}\n${toSRTTime(chunk[0].startTime)} --> ${toSRTTime(chunk[chunk.length - 1].endTime)}\n${chunk.map(w => w.word).join(' ')}`
  }).join('\n\n')
}

function downloadBlob(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────
export default function AudioPlayer({ audioData, onWordIndexChange, onRegenerate }: AudioPlayerProps) {
  const {
    playbackStatus, currentTime, currentWordIdx, progress,
    volume, isUsingRealAudio, audioElRef,
    handlePlayPause, handleRestart, handleSeek, handleVolume, formatTime,
  } = useAudioPlayer(audioData)

  // ── Real waveform / procedural animation ──────────────
  const bars = useWaveform({
    audioElRef,
    isPlaying:        playbackStatus === 'playing',
    isUsingRealAudio,
  })

  onWordIndexChange(currentWordIdx)

  const isPlaying = playbackStatus === 'playing'
  const isMuted   = volume === 0
  const { duration, words, voiceId } = audioData
  const profile = VOICE_PROFILES.find(v => v.id === voiceId) ?? VOICE_PROFILES[0]

  // Bar pixel height: normalised 0–1 → 3–26px
  const barPx = (v: number) => 3 + v * 23

  return (
    <div className="fade-up rounded-2xl border border-[#1a1a28] bg-[#0c0c18] px-6 py-[22px]">

      {/* ── Top row ── */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
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

          {/* Live / Procedural badge */}
          {playbackStatus === 'playing' && (
            <span
              className="shrink-0 rounded-full px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: isUsingRealAudio ? 'rgba(52,211,153,0.12)' : 'rgba(99,102,241,0.12)',
                color:      isUsingRealAudio ? '#34d399'                : '#818cf8',
              }}
            >
              {isUsingRealAudio ? 'Live' : 'Synth'}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton onClick={onRegenerate}         title="Regenerate" label="Regenerate"><RefreshCw size={14} /></IconButton>
          <IconButton onClick={() => downloadBlob(generateSRT(words), `pts-${voiceId}-${Date.now()}.srt`)} title=".srt" label="Download SRT"><FileText size={14} /></IconButton>
          <IconButton
            onClick={() => {
              if (!audioData.audioUrl) return
              Object.assign(document.createElement('a'), { href: audioData.audioUrl, download: `pts-${voiceId}-${Date.now()}.mp3` }).click()
            }}
            title=".mp3"
            label="Download MP3"
            disabled={!audioData.audioUrl}
          >
            <Download size={14} />
          </IconButton>

          <span className="ml-2 font-mono text-[12px] tracking-wider text-[#2e2e48]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* ── Waveform (live data) ── */}
      <div
        aria-hidden
        className="mb-3.5 flex items-end justify-between gap-[2px]"
        style={{ height: 32 }}
      >
        {bars.slice(0, NUM_BARS).map((v, i) => {
          const barT      = (i / (NUM_BARS - 1)) * duration
          const isCurrent = Math.abs(barT - currentTime) < duration / NUM_BARS
          const isPast    = barT < currentTime

          return (
            <div
              key={i}
              className="flex-1 rounded-[1.5px]"
              style={{
                height:     barPx(v),
                background: isCurrent ? '#8b5cf6' : isPast ? '#3d3d68' : '#16162a',
                opacity:    isCurrent ? 1 : isPast ? 0.9 : 0.5,
                transition: 'height 0.05s ease, background 0.1s',
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
          min={0} max={duration} step={0.05} value={currentTime}
          onChange={e => handleSeek(parseFloat(e.target.value))}
          aria-label="Seek audio position"
          style={{ background: `linear-gradient(to right, #6366f1 ${progress}%, #18182e ${progress}%)` }}
        />
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between">

        {/* Restart */}
        <div className="flex w-[80px] justify-start">
          <button onClick={handleRestart} aria-label="Restart"
            className="flex items-center justify-center rounded-lg p-2 text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]">
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Play / Pause */}
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
            : <Play  size={22} fill="white" color="white" className="translate-x-[1px]" />}
        </button>

        {/* Volume */}
        <div className="flex w-[80px] items-center justify-end gap-1.5">
          <button
            onClick={() => handleVolume(isMuted ? 0.9 : 0)}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="shrink-0 text-[#3d3d58] transition-colors hover:text-[#9ca3af]"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => handleVolume(parseFloat(e.target.value))}
            aria-label="Volume"
            className="seek-bar"
            style={{ width: 56, background: `linear-gradient(to right, #6366f1 ${volume * 100}%, #18182e ${volume * 100}%)` }}
          />
        </div>
      </div>
    </div>
  )
}

function IconButton({ onClick, label, title, disabled = false, children }: {
  onClick: () => void; label: string; title: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick} aria-label={label} disabled={disabled} title={title}
      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af] disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
      <span>{title}</span>
    </button>
  )
}

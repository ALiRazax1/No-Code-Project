// ─────────────────────────────────────────────────────────
// components/MusicMixer.tsx
//
// Expandable panel in AudioPlayer for blending a background
// music track with the generated voice.
//
// Features:
//   • File upload (MP3 / WAV / OGG)
//   • Voice volume slider
//   • Background volume slider
//   • Preview: shows track name and duration
//   • Mix & Export → stereo WAV download
//   • Cosine fade-out on the final 1.5s
// ─────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import { Music, Upload, X, Download, Volume2 } from 'lucide-react'
import { mixTracks } from '../utils/audioMixer'

interface MusicMixerProps {
  audioUrl: string | null   // null = mock mode, disable mix
  voiceId:  string
}

export default function MusicMixer({ audioUrl, voiceId }: MusicMixerProps) {
  const [open,        setOpen]        = useState(false)
  const [bgFile,      setBgFile]      = useState<File | null>(null)
  const [voiceVol,    setVoiceVol]    = useState(0.85)
  const [bgVol,       setBgVol]       = useState(0.30)
  const [mixing,      setMixing]      = useState(false)
  const [mixError,    setMixError]    = useState('')
  const [mixDone,     setMixDone]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setBgFile(file)
    setMixDone(false)
    setMixError('')
    e.target.value = ''
  }

  async function handleMix() {
    if (!audioUrl || !bgFile) return
    setMixing(true); setMixError(''); setMixDone(false)
    try {
      const wavBlob = await mixTracks({
        voiceUrl:    audioUrl,
        bgFile,
        voiceVolume: voiceVol,
        bgVolume:    bgVol,
      })
      const url = URL.createObjectURL(wavBlob)
      Object.assign(document.createElement('a'), {
        href: url, download: `pts-mix-${voiceId}-${Date.now()}.wav`,
      }).click()
      URL.revokeObjectURL(url)
      setMixDone(true)
    } catch (err) {
      setMixError(err instanceof Error ? err.message : 'Mix failed.')
    } finally {
      setMixing(false)
    }
  }

  return (
    <div className="border-t border-[#0e0e1e] pt-3 mt-1">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-[12px] font-medium transition-colors"
        style={{ color: open ? '#a5b4fc' : '#3d3d58' }}
      >
        <Music size={13} />
        <span>Background Music Mixer</span>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[10px]"
          style={{
            background: open ? 'rgba(99,102,241,0.15)' : 'transparent',
            color:      open ? '#6366f1' : '#2e2e48',
          }}
        >
          {open ? 'Close' : 'Open'}
        </span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-[#1a1a2c] bg-[#090914] p-4">

          {/* Not available in mock mode */}
          {!audioUrl && (
            <p className="text-[12px] leading-relaxed text-[#2e2e48]">
              Background mixing requires a real audio file.
              Switch to ElevenLabs or OpenAI in Settings.
            </p>
          )}

          {audioUrl && (
            <>
              {/* Background track upload */}
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2a2a42]">
                  Background Track
                </p>
                {bgFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#1a1a2c] bg-[#0c0c18] px-3 py-2">
                    <Music size={13} color="#6366f1" className="shrink-0" />
                    <span className="flex-1 truncate text-[12px] text-[#6b6b80]">{bgFile.name}</span>
                    <button
                      onClick={() => { setBgFile(null); setMixDone(false) }}
                      className="text-[#2e2e48] transition-colors hover:text-[#f87171]"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#1a1a2c] bg-[#06060f] py-4 text-[12px] text-[#2e2e48] transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#6366f1]">
                    <Upload size={14} />
                    Upload MP3 / WAV / OGG
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Volume controls */}
              <div className="mb-4 flex flex-col gap-3">
                <VolumeSlider
                  label="Voice"
                  value={voiceVol}
                  onChange={setVoiceVol}
                  color="#6366f1"
                />
                <VolumeSlider
                  label="Background"
                  value={bgVol}
                  onChange={setBgVol}
                  color="#8b5cf6"
                />
              </div>

              {/* Info note */}
              <p className="mb-3 text-[11px] leading-relaxed text-[#1e1e30]">
                Background loops to match voice length. A 1.5s cosine fade is applied at the end.
                Output: stereo WAV at original sample rate.
              </p>

              {/* Mix button */}
              <button
                onClick={handleMix}
                disabled={!bgFile || mixing}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all disabled:pointer-events-none disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #5a5df0, #7c3aed)',
                  boxShadow:  '0 3px 12px rgba(99,102,241,0.3)',
                }}
              >
                {mixing
                  ? <><span className="spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />Mixing…</>
                  : mixDone
                  ? <><Download size={14} />Mix Again</>
                  : <><Music size={14} />Mix & Export WAV</>}
              </button>

              {mixDone && !mixing && (
                <p className="mt-2 text-center text-[11px] text-[#34d399]">
                  ✓ Mixed track downloaded successfully
                </p>
              )}
              {mixError && (
                <p className="mt-2 text-[11px] text-[#f87171]">{mixError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Volume slider sub-component ───────────────────────────
function VolumeSlider({
  label, value, onChange, color,
}: {
  label: string; value: number; onChange: (v: number) => void; color: string
}) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-[#3d3d58]">
          <Volume2 size={11} color={color} />
          {label}
        </span>
        <span className="font-mono text-[11px]" style={{ color }}>{pct}%</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        aria-label={`${label} volume`}
        className="seek-bar"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, #18182e ${pct}%)`,
        }}
      />
    </div>
  )
}

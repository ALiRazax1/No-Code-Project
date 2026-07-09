// ─────────────────────────────────────────────────────────
// components/EmbedWidget.tsx
//
// Self-contained TTS widget designed to run inside a
// cross-origin <iframe>. Accepts apiKey / voiceId /
// defaultPrompt as props; communicates with the host page
// via window.postMessage.
//
// ── postMessage API ──────────────────────────────────────
//
//  INBOUND  (host → iframe)
//  { type: 'pts:play' }
//  { type: 'pts:pause' }
//  { type: 'pts:seek',     time: number }          // seconds
//  { type: 'pts:generate', prompt?: string }       // generates (optionally with a new prompt)
//
//  OUTBOUND  (iframe → host, via window.parent)
//  { type: 'pts:ready',      payload: { duration: number } }
//  { type: 'pts:status',     payload: { status, currentTime, duration, progress } }
//  { type: 'pts:ended' }
//  { type: 'pts:error',      payload: { message: string } }
//
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AudioData, AppStatus, AppSettings } from '../types'
import { generateAudio }                           from '../services/ttsService'
import { DEFAULT_SETTINGS, DEFAULT_VOICE_IDS }     from '../hooks/useSettings'
import { useAudioPlayer }                          from '../hooks/useAudioPlayer'

// ─────────────────────────────────────────────────────────
export interface EmbedWidgetProps {
  /** API key for the chosen provider. Omit (or leave empty) for mock mode. */
  apiKey?:        string
  /** Voice profile id ('nova' | 'echo' | 'shimmer' | 'onyx' | 'alloy'). Default: 'nova'. */
  voiceId?:       string
  /** Pre-filled prompt text shown in the textarea on mount. */
  defaultPrompt?: string
  /**
   * TTS backend. When omitted: 'elevenlabs' if apiKey is provided, 'mock' otherwise.
   * Pass 'openai' explicitly if using an OpenAI key.
   */
  provider?:      'mock' | 'elevenlabs' | 'openai'
  /** BCP-47 language code forwarded to the TTS provider. Default: 'en'. */
  language?:      string
}

// ─────────────────────────────────────────────────────────
export default function EmbedWidget({
  apiKey        = '',
  voiceId       = 'nova',
  defaultPrompt = '',
  provider,
  language      = 'en',
}: EmbedWidgetProps) {
  const [prompt,    setPrompt]    = useState(defaultPrompt)
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [appStatus, setAppStatus] = useState<AppStatus>('idle')
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)

  // Guard against concurrent generations
  const isGeneratingRef = useRef(false)

  // Resolved provider: explicit prop wins; otherwise key-based heuristic
  const resolvedProvider = provider ?? (apiKey ? 'elevenlabs' : 'mock')

  // ── Player ────────────────────────────────────────────
  const {
    playbackStatus,
    currentTime,
    progress,
    handlePlayPause,
    handleRestart,
    handleSeek,
    formatTime,
  } = useAudioPlayer(audioData, 1, language)

  const dur = audioData?.duration ?? 0

  // ── postMessage: outbound status (throttled to ~250 ms) ─
  const lastEmitMs = useRef(0)
  useEffect(() => {
    if (!audioData) return
    const now = Date.now()
    if (now - lastEmitMs.current < 250) return
    lastEmitMs.current = now
    window.parent?.postMessage(
      { type: 'pts:status', payload: { status: playbackStatus, currentTime, duration: dur, progress } },
      '*',
    )
  }, [currentTime, playbackStatus, audioData, dur, progress])

  // ── postMessage: lifecycle events ─────────────────────
  useEffect(() => {
    if (playbackStatus === 'ended') {
      window.parent?.postMessage({ type: 'pts:ended' }, '*')
    }
  }, [playbackStatus])

  // ── Generate ──────────────────────────────────────────
  const handleGenerate = useCallback(async (textOverride?: string) => {
    const raw = (textOverride ?? prompt).trim()
    if (!raw || isGeneratingRef.current) return
    isGeneratingRef.current = true

    setAppStatus('loading')
    setAudioData(null)
    setErrorMsg(null)

    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      provider: resolvedProvider,
      apiKey,
      voiceIds: { ...DEFAULT_VOICE_IDS },
      language,
    }

    try {
      const data = await generateAudio(raw, voiceId, settings, language)
      setAudioData(data)
      setAppStatus('ready')
      window.parent?.postMessage(
        { type: 'pts:ready', payload: { duration: data.duration } },
        '*',
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed.'
      setErrorMsg(msg)
      setAppStatus('error')
      window.parent?.postMessage(
        { type: 'pts:error', payload: { message: msg } },
        '*',
      )
    } finally {
      isGeneratingRef.current = false
    }
  }, [prompt, voiceId, apiKey, resolvedProvider, language])

  // ── postMessage: inbound commands ─────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const msg = e.data
      if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('pts:')) return
      switch (msg.type) {
        case 'pts:play':
        case 'pts:pause':
          handlePlayPause()
          break
        case 'pts:seek':
          if (typeof msg.time === 'number') handleSeek(msg.time)
          break
        case 'pts:generate':
          // Allow host to push a new prompt before triggering generation
          if (typeof msg.prompt === 'string') setPrompt(msg.prompt)
          handleGenerate(typeof msg.prompt === 'string' ? msg.prompt : undefined)
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handlePlayPause, handleSeek, handleGenerate])

  // ─────────────────────────────────────────────────────
  return (
    <>
      {/* Inject spinner keyframe once — safe to repeat; browser dedupes */}
      <style>{`@keyframes pts-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={styles.root}>
        {/* ── Prompt textarea ── */}
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your script…"
          rows={3}
          disabled={appStatus === 'loading'}
          style={{
            ...styles.textarea,
            opacity: appStatus === 'loading' ? 0.5 : 1,
          }}
        />

        {/* ── Generate button ── */}
        <button
          onClick={() => handleGenerate()}
          disabled={!prompt.trim() || appStatus === 'loading'}
          style={{
            ...styles.generateBtn,
            background:
              appStatus === 'loading'
                ? '#1a1a2c'
                : 'linear-gradient(135deg,#5a5df0,#7c3aed)',
            color:  appStatus === 'loading' ? '#6b6b8a' : 'white',
            opacity: !prompt.trim() || appStatus === 'loading' ? 0.45 : 1,
            marginBottom: appStatus !== 'idle' ? 12 : 0,
          }}
        >
          {appStatus === 'loading' ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            <>
              <WandIcon />
              Generate
            </>
          )}
        </button>

        {/* ── Error ── */}
        {appStatus === 'error' && errorMsg && (
          <p style={styles.errorText}>{errorMsg}</p>
        )}

        {/* ── Audio player ── */}
        {appStatus === 'ready' && audioData && (
          <div style={styles.player}>
            {/* Controls row */}
            <div style={styles.controlsRow}>
              <button
                onClick={handleRestart}
                title="Restart"
                style={styles.iconBtn}
              >
                <RestartIcon />
              </button>

              <button
                onClick={handlePlayPause}
                title={playbackStatus === 'playing' ? 'Pause' : 'Play'}
                style={styles.playBtn}
              >
                {playbackStatus === 'playing' ? <PauseIcon /> : <PlayIcon />}
              </button>

              <span style={styles.timeDisplay}>
                {formatTime(currentTime)}&thinsp;/&thinsp;{formatTime(dur)}
              </span>
            </div>

            {/* Seek bar */}
            <div
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={dur}
              aria-valuenow={currentTime}
              onClick={e => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                handleSeek(((e.clientX - rect.left) / rect.width) * dur)
              }}
              style={styles.seekTrack}
            >
              <div
                style={{
                  ...styles.seekFill,
                  width: `${Math.min(100, progress)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Micro icon components — no external icon lib dependency
// ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 13, height: 13,
        border: '2px solid #6b6b8a',
        borderTopColor: '#a5b4fc',
        borderRadius: '50%',
        animation: 'pts-spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

function WandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2m0 2a2 2 0 0 1 2 2m-2-2a2 2 0 0 0-2 2M3 13l9-9 5 5-9 9H3v-5Z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────
// Static style objects — all inline, no Tailwind dependency
// so the widget renders correctly in any host environment
// ─────────────────────────────────────────────────────────

const styles = {
  root: {
    background:  '#0a0a14',
    border:      '1px solid #16162a',
    borderRadius: 16,
    padding:     16,
    fontFamily:  "system-ui,-apple-system,'Segoe UI',sans-serif",
    color:       '#e0e0f0',
    minWidth:    280,
    maxWidth:    '100%',
    boxSizing:   'border-box' as const,
    display:     'flex',
    flexDirection: 'column' as const,
    gap:         10,
  },
  textarea: {
    width:       '100%',
    boxSizing:   'border-box' as const,
    background:  '#06060f',
    border:      '1px solid #14142a',
    borderRadius: 10,
    padding:     '10px 12px',
    color:       '#c0c0de',
    fontSize:    13,
    lineHeight:  1.65,
    resize:      'vertical' as const,
    outline:     'none',
    fontFamily:  'inherit',
    margin:      0,
  },
  generateBtn: {
    width:       '100%',
    boxSizing:   'border-box' as const,
    border:      'none',
    borderRadius: 10,
    padding:     '9px 16px',
    fontSize:    13,
    fontWeight:  600,
    cursor:      'pointer',
    display:     'flex' as const,
    alignItems:  'center',
    justifyContent: 'center',
    gap:         6,
    transition:  'opacity 0.15s',
    boxShadow:   '0 4px 14px rgba(99,102,241,0.3)',
  },
  errorText: {
    color:     '#f87171',
    fontSize:  12,
    margin:    0,
    lineHeight: 1.5,
  },
  player: {
    background:   '#06060f',
    border:       '1px solid #14142a',
    borderRadius: 12,
    padding:      '12px 14px',
    display:      'flex',
    flexDirection: 'column' as const,
    gap:          10,
  },
  controlsRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  },
  iconBtn: {
    background:     'transparent',
    border:         '1px solid #1e1e30',
    borderRadius:   7,
    width:          30,
    height:         30,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    cursor:         'pointer',
    color:          '#3d3d58',
    padding:        0,
    flexShrink:     0,
  } as React.CSSProperties,
  playBtn: {
    background:     'linear-gradient(135deg,#5a5df0,#7c3aed)',
    border:         'none',
    borderRadius:   8,
    width:          34,
    height:         34,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    cursor:         'pointer',
    color:          'white',
    padding:        0,
    flexShrink:     0,
    boxShadow:      '0 2px 10px rgba(99,102,241,0.4)',
  } as React.CSSProperties,
  timeDisplay: {
    marginLeft:          'auto',
    fontVariantNumeric:  'tabular-nums',
    fontSize:            11,
    color:               '#3d3d58',
    userSelect:          'none' as const,
  },
  seekTrack: {
    height:       4,
    background:   '#16162a',
    borderRadius: 4,
    cursor:       'pointer',
    position:     'relative' as const,
    overflow:     'hidden',
  },
  seekFill: {
    height:       '100%',
    borderRadius: 4,
    background:   'linear-gradient(90deg,#6366f1,#7c3aed)',
    transition:   'width 0.1s linear',
    pointerEvents: 'none' as const,
  },
} satisfies Record<string, React.CSSProperties | Record<string, React.CSSProperties>>

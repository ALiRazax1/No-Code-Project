// ─────────────────────────────────────────────────────────
// App.tsx
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Mic, Wand2, Volume2, History, Settings } from 'lucide-react'

import type { AppStatus, AudioData, HistoryEntry } from './types'
import { DEFAULT_PROMPT, VOICE_PROFILES } from './data/mockData'
import { generateAudio } from './services/ttsService'
import { useSettings } from './hooks/useSettings'
import VoiceSelector   from './components/VoiceSelector'
import SubtitleCanvas  from './components/SubtitleCanvas'
import AudioPlayer     from './components/AudioPlayer'
import HistoryPanel    from './components/HistoryPanel'
import SettingsDrawer  from './components/SettingsDrawer'

const CHAR_LIMIT  = 10_000
const MAX_HISTORY = 20

// ── URL hash helpers ──────────────────────────────────────
function encodeHash(prompt: string, voiceId: string): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify({ p: prompt, v: voiceId }))))
  } catch { return '' }
}

function decodeHash(hash: string): { prompt: string; voiceId: string } | null {
  try {
    const raw  = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw) return null
    const json = decodeURIComponent(escape(atob(raw)))
    const { p, v } = JSON.parse(json)
    if (typeof p === 'string' && typeof v === 'string') return { prompt: p, voiceId: v }
    return null
  } catch { return null }
}

// ─────────────────────────────────────────────────────────
export default function App() {
  const [settings, patchSettings] = useSettings()

  // ── Form — pre-populated from URL hash on mount ───────
  const [prompt,  setPrompt]  = useState<string>(() => {
    const decoded = decodeHash(window.location.hash)
    return decoded?.prompt ?? DEFAULT_PROMPT
  })
  const [voiceId, setVoiceId] = useState<string>(() => {
    const decoded = decodeHash(window.location.hash)
    return decoded?.voiceId ?? 'nova'
  })

  // ── App state machine ─────────────────────────────────
  const [appStatus, setAppStatus] = useState<AppStatus>('idle')
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  // ── Panels ────────────────────────────────────────────
  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ── Session history ───────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // ── If the URL has a valid hash on mount, show a hint ─
  useEffect(() => {
    const decoded = decodeHash(window.location.hash)
    if (decoded) {
      // Clear the hash visually without a page reload so it's not confusing
      // but keep the pre-populated form values (already set in useState init)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const charCount = prompt.length
  const charPct   = charCount / CHAR_LIMIT
  const counterColor =
    charPct >= 1    ? '#f87171' :
    charPct >= 0.85 ? '#fbbf24' :
    '#2e2e48'

  // ─────────────────────────────────────────────────────
  async function handleGenerate() {
    const text = prompt.trim()
    if (!text || appStatus === 'loading' || charCount > CHAR_LIMIT) return

    setAppStatus('loading')
    setAudioData(null)
    setCurrentWordIdx(-1)
    setErrorMsg(null)

    try {
      const data = await generateAudio(text, voiceId, settings)
      setAudioData(data)
      setAppStatus('ready')

      // Push to history
      setHistory(prev => [{
        id:            Date.now().toString(),
        audioData:     data,
        generatedAt:   new Date(),
        promptPreview: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
      }, ...prev].slice(0, MAX_HISTORY))

      // Update URL hash so current state is shareable
      const hash = encodeHash(text, voiceId)
      if (hash) window.history.replaceState(null, '', `#${hash}`)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed. Try again.'
      setErrorMsg(msg)
      setAppStatus('error')
    }
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setAudioData(entry.audioData)
    setPrompt(entry.audioData.text)
    setVoiceId(entry.audioData.voiceId)
    setCurrentWordIdx(-1)
    setAppStatus('ready')
  }

  // ── Share: write current URL to clipboard ─────────────
  async function handleShareUrl(): Promise<void> {
    const hash = encodeHash(prompt.trim(), voiceId)
    if (hash) window.history.replaceState(null, '', `#${hash}`)
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // Fallback: prompt the user to copy manually
      window.prompt('Copy this link:', window.location.href)
    }
  }

  const voiceName = VOICE_PROFILES.find(v => v.id === voiceId)?.name ?? 'Nova'

  return (
    <div className="min-h-screen bg-[#05050c] px-5 pb-24 pt-12 font-sans text-[#e0e0f0]">
      <div className="mx-auto max-w-[680px]">

        {/* ── Header ── */}
        <header className="mb-11 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.22)] bg-[rgba(99,102,241,0.08)] py-[5px] pl-2 pr-3.5">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
                <Mic size={11} color="white" strokeWidth={2.5} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#a5b4fc]">
                AI Voice Studio
              </span>
            </div>

            {/* History button */}
            <HeaderIconButton
              label="Open history"
              badge={history.length > 0 ? Math.min(history.length, 9) : undefined}
              onClick={() => setHistoryOpen(true)}
            >
              <History size={15} />
            </HeaderIconButton>

            {/* Settings button */}
            <HeaderIconButton label="Open settings" onClick={() => setSettingsOpen(true)}>
              <Settings size={15} />
            </HeaderIconButton>

          </div>

          <h1 className="gradient-text mb-3 text-[clamp(34px,6vw,50px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Prompt to Speech
          </h1>
          <p className="text-[15px] leading-relaxed text-[#2e2e48]">
            Type anything. Pick a voice. Hear it come alive.
          </p>
        </header>

        {/* ── Provider badge ── */}
        {settings.provider !== 'mock' && (
          <div className="mb-3 flex items-center justify-center gap-2">
            <span
              className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                borderColor: settings.provider === 'elevenlabs' ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)',
                background:  settings.provider === 'elevenlabs' ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                color:       settings.provider === 'elevenlabs' ? '#34d399'               : '#fbbf24',
              }}
            >
              {settings.provider === 'elevenlabs' ? '⚡ ElevenLabs' : '✦ OpenAI'} · {settings.playbackRate}× speed
            </span>
          </div>
        )}

        {/* ── Input card ── */}
        <section
          aria-label="Prompt input"
          className="card-top-shine relative mb-3.5 rounded-[20px] border border-[#16162a] bg-[#0a0a14] p-6"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <label htmlFor="prompt-textarea"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e2e48]">
              Script
            </label>
            <span className="font-mono text-[11px] tabular-nums transition-colors duration-300"
              style={{ color: counterColor }}>
              {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
            </span>
          </div>

          <textarea
            id="prompt-textarea"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter your script here…"
            disabled={appStatus === 'loading'}
            maxLength={CHAR_LIMIT}
            rows={5}
            className="mb-3 block w-full resize-y rounded-xl border border-[#14142a] bg-[#06060f] px-4 py-3.5 text-sm leading-[1.75] text-[#c0c0de] placeholder-[#1e1e30] outline-none transition-all duration-200 focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)] disabled:opacity-50"
          />

          {charCount > CHAR_LIMIT && (
            <p className="mb-3 text-[12px] text-[#f87171]">
              Script exceeds {CHAR_LIMIT.toLocaleString()} characters.
            </p>
          )}

          <div className="flex items-stretch gap-3">
            <VoiceSelector value={voiceId} onChange={setVoiceId} disabled={appStatus === 'loading'} />
            <GenerateButton
              status={appStatus}
              disabled={!prompt.trim() || appStatus === 'loading' || charCount > CHAR_LIMIT}
              onClick={handleGenerate}
            />
          </div>
        </section>

        {/* ── Loading ── */}
        {appStatus === 'loading' && (
          <div className="fade-up flex flex-col items-center gap-3.5 rounded-2xl border border-[#16162a] bg-[#0a0a14] px-6 py-9">
            <span aria-hidden className="spin h-8 w-8 rounded-full border-2 border-[#1a1a2c] border-t-[#6366f1]" />
            <span className="text-[13px] text-[#2e2e48]">
              Synthesising with <span className="text-[#6366f1]">{voiceName}</span>…
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {appStatus === 'error' && errorMsg && (
          <div className="fade-up rounded-2xl border border-[#2a1818] bg-[#120a0a] px-6 py-5 text-sm text-[#f87171]">
            <strong className="font-semibold">Error:</strong> {errorMsg}
          </div>
        )}

        {/* ── Ready ── */}
        {appStatus === 'ready' && audioData && (
          <div className="flex flex-col gap-3">
            <SubtitleCanvas
              words={audioData.words}
              currentWordIdx={currentWordIdx}
              fontSize={settings.subtitleFontSize}
            />
            <AudioPlayer
              audioData={audioData}
              onWordIndexChange={setCurrentWordIdx}
              onRegenerate={handleGenerate}
              playbackRate={settings.playbackRate}
              onShareUrl={handleShareUrl}
            />
          </div>
        )}

        {/* ── Idle ── */}
        {appStatus === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#14142a]">
              <Volume2 size={22} color="#1e1e32" />
            </div>
            <p className="text-sm text-[#1e1e32]">
              Enter a prompt and click Generate to begin
            </p>
          </div>
        )}
      </div>

      {/* ── Overlays ── */}
      {historyOpen && (
        <HistoryPanel
          entries={history}
          onSelect={handleHistorySelect}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          patch={patchSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Header icon button (history, settings)
// ─────────────────────────────────────────────────────────
function HeaderIconButton({
  label, badge, onClick, children,
}: {
  label: string; badge?: number; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#16162a] bg-[#0a0a14] text-[#3d3d58] transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#818cf8]"
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: '#6366f1' }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// Generate button
// ─────────────────────────────────────────────────────────
function GenerateButton({ status, disabled, onClick }: {
  status: AppStatus; disabled: boolean; onClick: () => void
}) {
  const isLoading = status === 'loading'
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="flex h-[44px] shrink-0 items-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 hover:-translate-y-px"
      style={{
        background: isLoading ? '#1a1a2c' : 'linear-gradient(135deg, #5a5df0, #7c3aed)',
        boxShadow:  isLoading ? 'none'    : '0 4px 16px rgba(99,102,241,0.35)',
        color:      isLoading ? '#6b6b8a' : 'white',
      }}>
      {isLoading
        ? <><span aria-hidden className="spin h-[14px] w-[14px] rounded-full border-2 border-[#6b6b8a] border-t-[#a5b4fc]" />Generating</>
        : <><Wand2 size={15} />Generate</>}
    </button>
  )
}

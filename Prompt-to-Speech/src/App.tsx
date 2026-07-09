// ─────────────────────────────────────────────────────────
// App.tsx
// New in this revision:
//   • AppSettings.language gap fully resolved
//   • Dark / light theme toggle (CSS var swap)
//   • Shareable preset library (localStorage + link copy)
//   • Webhook preview panel wired
//   • encodeHash / decodeHash extended with language + rate
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { Wand2, Volume2, History, Settings, Webhook, Bookmark, Link2, Check, X, Code2 } from 'lucide-react'

import type { AppStatus, AudioData, HistoryEntry, PronunciationEntry, APIRequestLog } from './types'
import { DEFAULT_PROMPT, VOICE_PROFILES } from './data/mockData'
import { generateAudio, getLastRequestLog } from './services/ttsService'
import { useSettings }       from './hooks/useSettings'
import VoiceSelector         from './components/VoiceSelector'
import LanguageSelector      from './components/LanguageSelector'
import SubtitleCanvas        from './components/SubtitleCanvas'
import AudioPlayer           from './components/AudioPlayer'
import HistoryPanel          from './components/HistoryPanel'
import SettingsDrawer        from './components/SettingsDrawer'
import LandingHero           from './components/LandingHero'
import DemoKeyGate           from './components/DemoKeyGate'
import ErrorCard             from './components/ErrorCard'
import SSMLToolbar           from './components/SSMLToolbar'
import PronunciationDict     from './components/PronunciationDict'
import APIExplorer           from './components/APIExplorer'
import BatchGenerator        from './components/BatchGenerator'
import WebhookPanel          from './components/WebhookPanel'
import EmbedPanel            from './components/EmbedPanel'

const CHAR_LIMIT  = 10_000
const MAX_HISTORY = 20
const GATE_KEY    = 'pts:gate-ok'

// ── Preset type ──────────────────────────────────────────
interface PtsPreset {
  id:           string
  name:         string
  prompt:       string
  voiceId:      string
  language:     string
  playbackRate: number
}

// ── URL hash helpers (extended: language + playbackRate) ─
function encodeHash(
  prompt:      string,
  voiceId:     string,
  language:    string,
  playbackRate: number,
): string {
  try {
    return btoa(unescape(encodeURIComponent(
      JSON.stringify({ p: prompt, v: voiceId, l: language, r: playbackRate }),
    )))
  } catch { return '' }
}

function decodeHash(hash: string): {
  prompt:       string
  voiceId:      string
  language?:    string
  playbackRate?: number
} | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw) return null
    const obj = JSON.parse(decodeURIComponent(escape(atob(raw))))
    if (typeof obj.p !== 'string' || typeof obj.v !== 'string') return null
    return {
      prompt:  obj.p,
      voiceId: obj.v,
      ...(typeof obj.l === 'string' ? { language:    obj.l } : {}),
      ...(typeof obj.r === 'number' ? { playbackRate: obj.r } : {}),
    }
  } catch { return null }
}

// ── Helpers ───────────────────────────────────────────────
function applyPronunciations(text: string, entries: PronunciationEntry[]): string {
  let result = text
  for (const e of entries) {
    if (!e.word.trim() || !e.replacement.trim()) continue
    const esc = e.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b${esc}\\b`, 'gi'), e.replacement)
  }
  return result
}

function exportAudioDataJson(audioData: AudioData) {
  const blob = new Blob([JSON.stringify(audioData, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), {
    href: url, download: `pts-${audioData.voiceId}-${Date.now()}.json`,
  }).click()
  URL.revokeObjectURL(url)
}

type InputMode = 'single' | 'batch'

// ─────────────────────────────────────────────────────────
export default function App() {
  const [settings, patchSettings] = useSettings()

  const [gateDismissed, setGateDismissed] = useState<boolean>(() => {
    if (settings.provider !== 'mock') return true
    return sessionStorage.getItem(GATE_KEY) === '1'
  })

  // Lazy-init from URL hash (hash is cleared in mount effect below)
  const [prompt,    setPrompt]    = useState<string>(() => decodeHash(window.location.hash)?.prompt  ?? DEFAULT_PROMPT)
  const [voiceId,   setVoiceId]   = useState<string>(() => decodeHash(window.location.hash)?.voiceId ?? 'nova')
  const [inputMode, setInputMode] = useState<InputMode>('single')

  const [ssmlMode,    setSsmlMode]    = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pronEntries, setPronEntries] = useState<PronunciationEntry[]>([])

  const [appStatus,      setAppStatus]      = useState<AppStatus>('idle')
  const [audioData,      setAudioData]      = useState<AudioData | null>(null)
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  // ── Panel open/close ──────────────────────────────────
  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [webhookOpen,  setWebhookOpen]  = useState(false)
  const [embedOpen,    setEmbedOpen]    = useState(false)
  const [explorerLog,  setExplorerLog]  = useState<APIRequestLog | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])

  // ── Presets ───────────────────────────────────────────
  const [presets, setPresets] = useState<PtsPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('pts:presets') ?? '[]') as PtsPreset[] }
    catch { return [] }
  })

  function savePreset(name: string) {
    const next = [{
      id:          Date.now().toString(),
      name:        name.trim(),
      prompt:      prompt.trim(),
      voiceId,
      language:    settings.language,
      playbackRate: settings.playbackRate,
    }, ...presets].slice(0, 20)
    setPresets(next)
    try { localStorage.setItem('pts:presets', JSON.stringify(next)) } catch {}
  }

  function applyPreset(p: PtsPreset) {
    setPrompt(p.prompt)
    setVoiceId(p.voiceId)
    patchSettings({ language: p.language, playbackRate: p.playbackRate })
  }

  function deletePreset(id: string) {
    const next = presets.filter(p => p.id !== id)
    setPresets(next)
    try { localStorage.setItem('pts:presets', JSON.stringify(next)) } catch {}
  }

  // ── Seek bridge (word click → AudioPlayer) ────────────
  const [seekSignal, setSeekSignal] = useState<{ time: number } | null>(null)
  function handleWordClick(wordIdx: number) {
    if (!audioData) return
    setSeekSignal({ time: audioData.words[wordIdx]?.startTime ?? 0 })
  }

  // ── Mount: apply hash overrides + clear hash ──────────
  useEffect(() => {
    const h = decodeHash(window.location.hash)
    if (h?.language)     patchSettings({ language:    h.language })
    if (h?.playbackRate) patchSettings({ playbackRate: h.playbackRate })
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, []) // eslint-disable-line

  function handleGateContinue(mode: 'demo' | 'key', apiKey?: string) {
    if (mode === 'key' && apiKey) patchSettings({ provider: 'elevenlabs', apiKey })
    sessionStorage.setItem(GATE_KEY, '1')
    setGateDismissed(true)
  }

  // ── Shared generate fn (Single + Batch) ──────────────
  // language is now settings.language — no standalone useState needed
  const batchGenerateFn = useCallback(async (text: string): Promise<AudioData> => {
    let processed = applyPronunciations(text.trim(), pronEntries)
    if (ssmlMode && !processed.trimStart().startsWith('<speak')) {
      processed = `<speak>\n${processed}\n</speak>`
    }
    return generateAudio(processed, voiceId, settings, settings.language)
  }, [pronEntries, ssmlMode, voiceId, settings])

  const charCount    = prompt.length
  const charPct      = charCount / CHAR_LIMIT
  const counterColor = charPct >= 1 ? '#f87171' : charPct >= 0.85 ? '#fbbf24' : '#9494c0'

  async function handleGenerate() {
    const rawText = prompt.trim()
    if (!rawText || appStatus === 'loading' || charCount > CHAR_LIMIT) return
    setAppStatus('loading'); setAudioData(null); setCurrentWordIdx(-1); setErrorMsg(null)
    try {
      const data = await batchGenerateFn(rawText)
      setAudioData(data); setAppStatus('ready')
      setHistory(prev => [{
        id:            Date.now().toString(),
        audioData:     data,
        generatedAt:   new Date(),
        promptPreview: rawText.slice(0, 80) + (rawText.length > 80 ? '…' : ''),
      }, ...prev].slice(0, MAX_HISTORY))
      const hash = encodeHash(rawText, voiceId, settings.language, settings.playbackRate)
      if (hash) window.history.replaceState(null, '', `#${hash}`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed.')
      setAppStatus('error')
    }
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setAudioData(entry.audioData); setPrompt(entry.audioData.text)
    setVoiceId(entry.audioData.voiceId); setCurrentWordIdx(-1); setAppStatus('ready')
  }

  async function handleShareUrl() {
    const hash = encodeHash(prompt.trim(), voiceId, settings.language, settings.playbackRate)
    if (hash) window.history.replaceState(null, '', `#${hash}`)
    try { await navigator.clipboard.writeText(window.location.href) }
    catch { window.prompt('Copy this link:', window.location.href) }
  }

  function handleOpenExplorer() {
    setExplorerLog(getLastRequestLog())
    setExplorerOpen(true)
  }

  const voiceName = VOICE_PROFILES.find(v => v.id === voiceId)?.name ?? 'Nova'

  // ─────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen overflow-x-hidden px-5 pb-24 pt-10 font-sans"
      style={{ background: 'var(--pts-bg-page)', color: 'var(--pts-text-1)' }}
    >
      {/* ── Top-right panel buttons ── */}
      <div className="fixed right-5 top-4 z-30 flex items-center gap-2">
        <PanelButton label="Open embed widget" onClick={() => setEmbedOpen(true)}>
          <Code2 size={15} />
        </PanelButton>
        <PanelButton label="Open webhook preview" onClick={() => setWebhookOpen(true)}>
          <Webhook size={15} />
        </PanelButton>
        <PanelButton
          label="Open history"
          badge={history.length > 0 ? Math.min(history.length, 9) : undefined}
          onClick={() => setHistoryOpen(true)}
        >
          <History size={15} />
        </PanelButton>
        <PanelButton label="Open settings" onClick={() => setSettingsOpen(true)}>
          <Settings size={15} />
        </PanelButton>
      </div>

      <div className="mx-auto max-w-[680px]">
        <LandingHero />

        {settings.provider !== 'mock' && (
          <div className="mb-3 flex items-center justify-center">
            <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                borderColor: settings.provider === 'elevenlabs' ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)',
                background:  settings.provider === 'elevenlabs' ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                color:       settings.provider === 'elevenlabs' ? '#34d399' : '#fbbf24',
              }}>
              {settings.provider === 'elevenlabs' ? '⚡ ElevenLabs' : '✦ OpenAI'} · {settings.playbackRate}× speed
            </span>
          </div>
        )}

        {/* ── Input card ── */}
        <section aria-label="Prompt input"
          className="card-top-shine relative mb-3.5 rounded-[20px] border border-[#16162a] bg-[#0a0a14] p-6">

          {/* Header: label + mode tabs + char counter */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9494c0]">
              Script
            </span>
            <div className="flex items-center gap-[2px] rounded-lg border border-[#16162a] bg-[#06060f] p-[3px]">
              {(['single', 'batch'] as InputMode[]).map(m => (
                <button key={m} type="button" onClick={() => setInputMode(m)}
                  className="rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-all duration-200"
                  style={{
                    background: inputMode === m ? '#1a1a2e' : 'transparent',
                    color:      inputMode === m ? '#a5b4fc' : '#7878b0',
                    boxShadow:  inputMode === m ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none',
                  }}>
                  {m}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[11px] tabular-nums transition-colors"
              style={{ color: counterColor }}>
              {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
            </span>
          </div>

          {inputMode === 'single' ? (
            <>
              <SSMLToolbar
                active={ssmlMode}
                onToggle={() => setSsmlMode(v => !v)}
                textareaRef={textareaRef}
                prompt={prompt}
                onPromptChange={setPrompt}
              />
              <textarea
                id="prompt-textarea"
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={ssmlMode ? '<speak>\n  Enter your SSML here…\n</speak>' : 'Enter your script here…'}
                disabled={appStatus === 'loading'}
                maxLength={CHAR_LIMIT}
                rows={5}
                className="mb-3 block w-full resize-y rounded-xl border border-[#14142a] bg-[#06060f] px-4 py-3.5 text-sm leading-[1.75] text-[#c0c0de] placeholder-[#8888b8] outline-none transition-all duration-200 focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)] disabled:opacity-50"
                style={{ fontFamily: ssmlMode ? "'JetBrains Mono','Fira Code',monospace" : 'inherit' }}
              />
              {charCount > CHAR_LIMIT && (
                <p className="mb-3 text-[12px] text-[#f87171]">
                  Script exceeds {CHAR_LIMIT.toLocaleString()} characters.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex flex-1 gap-2">
                  <VoiceSelector
                    value={voiceId}
                    onChange={setVoiceId}
                    disabled={appStatus === 'loading'} />
                  <LanguageSelector
                    value={settings.language}
                    onChange={(v) => patchSettings({ language: v })}
                    disabled={appStatus === 'loading'} />
                </div>
                <GenerateButton
                  status={appStatus}
                  disabled={!prompt.trim() || appStatus === 'loading' || charCount > CHAR_LIMIT}
                  onClick={handleGenerate}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex gap-2">
                <VoiceSelector value={voiceId} onChange={setVoiceId} disabled={false} />
                <LanguageSelector
                  value={settings.language}
                  onChange={(v) => patchSettings({ language: v })}
                  disabled={false} />
              </div>
              <BatchGenerator onGenerate={batchGenerateFn} />
            </>
          )}
        </section>

        {/* ── Preset library (single mode only) ── */}
        {inputMode === 'single' && (
          <div className="mb-3.5">
            <PresetLibrary
              presets={presets}
              currentState={{
                prompt,
                voiceId,
                language:    settings.language,
                playbackRate: settings.playbackRate,
              }}
              onSave={savePreset}
              onApply={applyPreset}
              onDelete={deletePreset}
            />
          </div>
        )}

        {/* Pronunciation dictionary — single mode only */}
        {inputMode === 'single' && (
          <div className="mb-3.5">
            <PronunciationDict entries={pronEntries} onChange={setPronEntries} />
          </div>
        )}

        {/* Loading */}
        {appStatus === 'loading' && inputMode === 'single' && (
          <div className="fade-up flex flex-col items-center gap-3.5 rounded-2xl border border-[#16162a] bg-[#0a0a14] px-6 py-9">
            <span aria-hidden className="spin h-8 w-8 rounded-full border-2 border-[#1a1a2c] border-t-[#6366f1]" />
            <span className="text-[13px] text-[#9494c0]">
              Synthesising with <span className="text-[#6366f1]">{voiceName}</span>…
            </span>
          </div>
        )}

        {/* Error */}
        {appStatus === 'error' && errorMsg && inputMode === 'single' && (
          <ErrorCard
            message={errorMsg}
            onRetry={handleGenerate}
            onOpenSettings={() => setSettingsOpen(true)} />
        )}

        {/* Ready */}
        {appStatus === 'ready' && audioData && inputMode === 'single' && (
          <div className="flex flex-col gap-3">
            <SubtitleCanvas
              words={audioData.words}
              currentWordIdx={currentWordIdx}
              fontSize={settings.subtitleFontSize}
              onWordClick={handleWordClick}
            />
            <AudioPlayer
              audioData={audioData}
              onWordIndexChange={setCurrentWordIdx}
              onRegenerate={handleGenerate}
              playbackRate={settings.playbackRate}
              language={settings.language}
              onShareUrl={handleShareUrl}
              externalSeekTo={seekSignal}
              onOpenExplorer={handleOpenExplorer}
              onExportJson={() => exportAudioDataJson(audioData)}
            />
          </div>
        )}

        {/* Idle */}
        {appStatus === 'idle' && inputMode === 'single' && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#14142a]">
              <Volume2 size={22} color="#8888b8" />
            </div>
            <p className="text-sm text-[#8888b8]">Enter a prompt and click Generate to begin</p>
          </div>
        )}
      </div>

      {/* ── Panels & modals ── */}
      {historyOpen  && <HistoryPanel entries={history} onSelect={handleHistorySelect} onClose={() => setHistoryOpen(false)} />}
      {settingsOpen && <SettingsDrawer settings={settings} patch={patchSettings} onClose={() => setSettingsOpen(false)} />}
      {explorerOpen && <APIExplorer log={explorerLog} onClose={() => setExplorerOpen(false)} />}
      {webhookOpen  && <WebhookPanel audioData={audioData} lastLog={getLastRequestLog()} onClose={() => setWebhookOpen(false)} />}
      {embedOpen    && <EmbedPanel settings={settings} onClose={() => setEmbedOpen(false)} />}
      {!gateDismissed && <DemoKeyGate onContinue={handleGateContinue} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Sub-components (file-private)
// ─────────────────────────────────────────────────────────

function PanelButton({ label, badge, onClick, children }: {
  label: string; badge?: number; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#16162a] bg-[#0a0a14] text-[#7878b0] shadow-lg transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#818cf8]">
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

function GenerateButton({ status, disabled, onClick }: {
  status: AppStatus; disabled: boolean; onClick: () => void
}) {
  const isLoading = status === 'loading'
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 hover:-translate-y-px sm:w-auto sm:justify-start"
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

// ── PresetLibrary ─────────────────────────────────────────
interface PresetLibraryProps {
  presets:      PtsPreset[]
  currentState: { prompt: string; voiceId: string; language: string; playbackRate: number }
  onSave:       (name: string) => void
  onApply:      (preset: PtsPreset) => void
  onDelete:     (id: string) => void
}

function PresetLibrary({ presets, currentState, onSave, onApply, onDelete }: PresetLibraryProps) {
  const [open,   setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [name,   setName]   = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saving) nameRef.current?.focus()
  }, [saving])

  function handleSave() {
    if (!name.trim()) return
    onSave(name)
    setName(''); setSaving(false)
  }

  function copyLink(p: PtsPreset) {
    const encoded = encodeHash(p.prompt, p.voiceId, p.language, p.playbackRate)
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(p.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-[20px] border border-[#16162a] bg-[#0a0a14]">

      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left"
      >
        <Bookmark size={13} className="shrink-0 text-[#7878b0]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9494c0]">
          Preset Library
        </span>
        {presets.length > 0 && (
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            {presets.length}
          </span>
        )}
        <span className="ml-1 text-[#9494c0]" style={{ fontSize: 9 }} aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#14142a] px-5 pb-5 pt-4">

          {/* Save form */}
          {!saving ? (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="mb-3.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
            >
              <Bookmark size={12} />
              Save current settings as preset
            </button>
          ) : (
            <div className="mb-3.5 flex items-center gap-2">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleSave()
                  if (e.key === 'Escape') { setSaving(false); setName('') }
                }}
                placeholder="Preset name…"
                maxLength={48}
                className="flex-1 rounded-lg border border-[#14142a] bg-[#06060f] px-3 py-1.5 text-[12px] text-[#c0c0de] placeholder-[#8888b8] outline-none transition-colors focus:border-[rgba(99,102,241,0.4)]"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim()}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#5a5df0,#7c3aed)' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setSaving(false); setName('') }}
                className="rounded-lg p-1.5 text-[#7878b0] transition-colors hover:bg-[#16162a]"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Current-state summary */}
          <p className="mb-3 text-[11px] text-[#8888b8]">
            Current:&ensp;
            <span className="text-[#9494c0]">
              {currentState.voiceId} · {currentState.language} · {currentState.playbackRate}× ·&ensp;
              {currentState.prompt.slice(0, 42)}{currentState.prompt.length > 42 ? '…' : ''}
            </span>
          </p>

          {/* Preset list */}
          {presets.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-[#8888b8]">
              No presets yet — save your current voice, language and prompt above.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {presets.map(p => (
                <div key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-[#16162a] bg-[#06060f] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#9ca3af]">{p.name}</p>
                    <p className="truncate text-[10px] text-[#9494c0]">
                      {p.voiceId} · {p.language} · {p.playbackRate}× · {p.prompt.slice(0, 38)}{p.prompt.length > 38 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onApply(p)}
                      className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#6366f1] transition-colors hover:bg-[#16162a]"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => copyLink(p)}
                      title="Copy shareable link"
                      className="rounded-md p-1.5 text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
                    >
                      {copied === p.id
                        ? <Check size={11} className="text-[#34d399]" />
                        : <Link2 size={11} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p.id)}
                      title="Delete preset"
                      className="rounded-md p-1.5 text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#f87171]"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

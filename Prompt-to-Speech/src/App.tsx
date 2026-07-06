// ─────────────────────────────────────────────────────────
// App.tsx — adds Batch mode tab + wires BatchGenerator
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { Wand2, Volume2, History, Settings } from 'lucide-react'

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

const CHAR_LIMIT  = 10_000
const MAX_HISTORY = 20
const GATE_KEY    = 'pts:gate-ok'

function encodeHash(prompt: string, voiceId: string): string {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify({ p: prompt, v: voiceId })))) }
  catch { return '' }
}
function decodeHash(hash: string): { prompt: string; voiceId: string } | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw) return null
    const { p, v } = JSON.parse(decodeURIComponent(escape(atob(raw))))
    if (typeof p === 'string' && typeof v === 'string') return { prompt: p, voiceId: v }
    return null
  } catch { return null }
}

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

export default function App() {
  const [settings, patchSettings] = useSettings()

  const [gateDismissed, setGateDismissed] = useState<boolean>(() => {
    if (settings.provider !== 'mock') return true
    return sessionStorage.getItem(GATE_KEY) === '1'
  })

  const [prompt,    setPrompt]    = useState<string>(() => decodeHash(window.location.hash)?.prompt  ?? DEFAULT_PROMPT)
  const [voiceId,   setVoiceId]   = useState<string>(() => decodeHash(window.location.hash)?.voiceId ?? 'nova')
  const [language,  setLanguage]  = useState<string>(settings.language ?? 'en')
  const [inputMode, setInputMode] = useState<InputMode>('single')

  const [ssmlMode,    setSsmlMode]    = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [pronEntries, setPronEntries] = useState<PronunciationEntry[]>([])

  const [appStatus,      setAppStatus]      = useState<AppStatus>('idle')
  const [audioData,      setAudioData]      = useState<AudioData | null>(null)
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [explorerLog,  setExplorerLog]  = useState<APIRequestLog | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [seekSignal, setSeekSignal] = useState<{ time: number } | null>(null)
  function handleWordClick(wordIdx: number) {
    if (!audioData) return
    setSeekSignal({ time: audioData.words[wordIdx]?.startTime ?? 0 })
  }

  useEffect(() => { patchSettings({ language }) }, [language]) // eslint-disable-line
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  function handleGateContinue(mode: 'demo' | 'key', apiKey?: string) {
    if (mode === 'key' && apiKey) patchSettings({ provider: 'elevenlabs', apiKey })
    sessionStorage.setItem(GATE_KEY, '1')
    setGateDismissed(true)
  }

  // ── Shared generate logic (used by both Single and Batch modes) ──
  const batchGenerateFn = useCallback(async (text: string): Promise<AudioData> => {
    let processed = applyPronunciations(text.trim(), pronEntries)
    if (ssmlMode && !processed.trimStart().startsWith('<speak')) {
      processed = `<speak>\n${processed}\n</speak>`
    }
    return generateAudio(processed, voiceId, settings, language)
  }, [pronEntries, ssmlMode, voiceId, settings, language])

  const charCount    = prompt.length
  const charPct      = charCount / CHAR_LIMIT
  const counterColor = charPct >= 1 ? '#f87171' : charPct >= 0.85 ? '#fbbf24' : '#2e2e48'

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
      const hash = encodeHash(rawText, voiceId)
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
    const hash = encodeHash(prompt.trim(), voiceId)
    if (hash) window.history.replaceState(null, '', `#${hash}`)
    try { await navigator.clipboard.writeText(window.location.href) }
    catch { window.prompt('Copy this link:', window.location.href) }
  }

  function handleOpenExplorer() {
    setExplorerLog(getLastRequestLog())
    setExplorerOpen(true)
  }

  const voiceName = VOICE_PROFILES.find(v => v.id === voiceId)?.name ?? 'Nova'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05050c] px-5 pb-24 pt-10 font-sans text-[#e0e0f0]">
      <div className="fixed right-5 top-4 z-30 flex items-center gap-2">
        <PanelButton label="Open history"
          badge={history.length > 0 ? Math.min(history.length, 9) : undefined}
          onClick={() => setHistoryOpen(true)}>
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

          {/* Header: label + mode tabs + counter */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e2e48]">
              Script
            </span>

            {/* Single / Batch tabs */}
            <div className="flex items-center gap-[2px] rounded-lg border border-[#16162a] bg-[#06060f] p-[3px]">
              {(['single', 'batch'] as InputMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInputMode(m)}
                  className="rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-all duration-200"
                  style={{
                    background: inputMode === m ? '#1a1a2e' : 'transparent',
                    color:      inputMode === m ? '#a5b4fc' : '#3d3d58',
                    boxShadow:  inputMode === m ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none',
                  }}
                >
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
                className="mb-3 block w-full resize-y rounded-xl border border-[#14142a] bg-[#06060f] px-4 py-3.5 text-sm leading-[1.75] text-[#c0c0de] placeholder-[#1e1e30] outline-none transition-all duration-200 focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)] disabled:opacity-50"
                style={{ fontFamily: ssmlMode ? "'JetBrains Mono','Fira Code',monospace" : 'inherit' }}
              />
              {charCount > CHAR_LIMIT && (
                <p className="mb-3 text-[12px] text-[#f87171]">
                  Script exceeds {CHAR_LIMIT.toLocaleString()} characters.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex flex-1 gap-2">
                  <VoiceSelector value={voiceId} onChange={setVoiceId} disabled={appStatus === 'loading'} />
                  <LanguageSelector value={language} onChange={setLanguage} disabled={appStatus === 'loading'} />
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
              {/* Batch mode: show voice/language, then BatchGenerator handles the rest */}
              <div className="mb-3 flex gap-2">
                <VoiceSelector value={voiceId} onChange={setVoiceId} disabled={false} />
                <LanguageSelector value={language} onChange={setLanguage} disabled={false} />
              </div>
              <BatchGenerator onGenerate={batchGenerateFn} />
            </>
          )}
        </section>

        {/* Pronunciation dictionary — only in single mode */}
        {inputMode === 'single' && (
          <div className="mb-3.5">
            <PronunciationDict entries={pronEntries} onChange={setPronEntries} />
          </div>
        )}

        {/* Loading */}
        {appStatus === 'loading' && inputMode === 'single' && (
          <div className="fade-up flex flex-col items-center gap-3.5 rounded-2xl border border-[#16162a] bg-[#0a0a14] px-6 py-9">
            <span aria-hidden className="spin h-8 w-8 rounded-full border-2 border-[#1a1a2c] border-t-[#6366f1]" />
            <span className="text-[13px] text-[#2e2e48]">
              Synthesising with <span className="text-[#6366f1]">{voiceName}</span>…
            </span>
          </div>
        )}

        {/* Error */}
        {appStatus === 'error' && errorMsg && inputMode === 'single' && (
          <ErrorCard message={errorMsg} onRetry={handleGenerate} onOpenSettings={() => setSettingsOpen(true)} />
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
              language={language}
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
              <Volume2 size={22} color="#1e1e32" />
            </div>
            <p className="text-sm text-[#1e1e32]">Enter a prompt and click Generate to begin</p>
          </div>
        )}
      </div>

      {historyOpen  && <HistoryPanel entries={history} onSelect={handleHistorySelect} onClose={() => setHistoryOpen(false)} />}
      {settingsOpen && <SettingsDrawer settings={settings} patch={patchSettings} onClose={() => setSettingsOpen(false)} />}
      {explorerOpen && <APIExplorer log={explorerLog} onClose={() => setExplorerOpen(false)} />}
      {!gateDismissed && <DemoKeyGate onContinue={handleGateContinue} />}
    </div>
  )
}

function PanelButton({ label, badge, onClick, children }: {
  label: string; badge?: number; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#16162a] bg-[#0a0a14] text-[#3d3d58] shadow-lg transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#818cf8]">
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

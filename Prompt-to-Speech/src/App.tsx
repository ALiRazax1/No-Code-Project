// ─────────────────────────────────────────────────────────
// App.tsx — Main layout and state orchestration
// ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { Mic, Wand2, Volume2, History } from 'lucide-react'

import type { AppStatus, AudioData, HistoryEntry } from './types'
import { DEFAULT_PROMPT, VOICE_PROFILES } from './data/mockData'
import { generateAudio } from './services/ttsService'
import VoiceSelector  from './components/VoiceSelector'
import SubtitleCanvas from './components/SubtitleCanvas'
import AudioPlayer    from './components/AudioPlayer'
import HistoryPanel   from './components/HistoryPanel'

const CHAR_LIMIT    = 10_000
const MAX_HISTORY   = 20

export default function App() {
  // ── Form ─────────────────────────────────────────────
  const [prompt,  setPrompt]  = useState<string>(DEFAULT_PROMPT)
  const [voiceId, setVoiceId] = useState<string>('nova')

  // ── App state machine ─────────────────────────────────
  const [appStatus, setAppStatus] = useState<AppStatus>('idle')
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)

  // ── Word sync bridge ──────────────────────────────────
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  // ── Session history ───────────────────────────────────
  const [history,     setHistory]     = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

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
      const data = await generateAudio(text, voiceId)
      setAudioData(data)
      setAppStatus('ready')

      // Prepend to history (cap at MAX_HISTORY)
      const entry: HistoryEntry = {
        id:            Date.now().toString(),
        audioData:     data,
        generatedAt:   new Date(),
        promptPreview: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
      }
      setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed. Try again.'
      setErrorMsg(msg)
      setAppStatus('error')
    }
  }

  // Restore a history entry without re-generating
  function handleHistorySelect(entry: HistoryEntry) {
    setAudioData(entry.audioData)
    setPrompt(entry.audioData.text)
    setVoiceId(entry.audioData.voiceId)
    setCurrentWordIdx(-1)
    setAppStatus('ready')
  }

  const voiceName = VOICE_PROFILES.find(v => v.id === voiceId)?.name ?? 'Nova'

  return (
    <div className="min-h-screen bg-[#05050c] px-5 pb-24 pt-12 font-sans text-[#e0e0f0]">
      <div className="mx-auto max-w-[680px]">

        {/* ── Header ── */}
        <header className="mb-11 text-center">

          {/* Badge row */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.22)] bg-[rgba(99,102,241,0.08)] py-[5px] pl-2 pr-3.5">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
                <Mic size={11} color="white" strokeWidth={2.5} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#a5b4fc]">
                AI Voice Studio
              </span>
            </div>

            {/* History trigger */}
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label="Open history"
              title="Generation history"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#16162a] bg-[#0a0a14] text-[#3d3d58] transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#818cf8]"
            >
              <History size={15} />
              {history.length > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: '#6366f1' }}
                >
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </button>
          </div>

          <h1 className="gradient-text mb-3 text-[clamp(34px,6vw,50px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Prompt to Speech
          </h1>
          <p className="text-[15px] leading-relaxed text-[#2e2e48]">
            Type anything. Pick a voice. Hear it come alive.
          </p>
        </header>

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
            <span
              className="font-mono text-[11px] tabular-nums transition-colors duration-300"
              style={{ color: counterColor }}
            >
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
              Script exceeds {CHAR_LIMIT.toLocaleString()} characters. Trim it to avoid API errors.
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
            <strong className="font-semibold">Generation failed:</strong> {errorMsg}
          </div>
        )}

        {/* ── Ready ── */}
        {appStatus === 'ready' && audioData && (
          <div className="flex flex-col gap-3">
            <SubtitleCanvas
              words={audioData.words}
              currentWordIdx={currentWordIdx}
            />
            <AudioPlayer
              audioData={audioData}
              onWordIndexChange={setCurrentWordIdx}
              onRegenerate={handleGenerate}
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

      {/* ── History panel ── */}
      {historyOpen && (
        <HistoryPanel
          entries={history}
          onSelect={handleHistorySelect}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
function GenerateButton({ status, disabled, onClick }: {
  status: AppStatus; disabled: boolean; onClick: () => void
}) {
  const isLoading = status === 'loading'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[44px] shrink-0 items-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 hover:-translate-y-px"
      style={{
        background: isLoading ? '#1a1a2c' : 'linear-gradient(135deg, #5a5df0, #7c3aed)',
        boxShadow:  isLoading ? 'none'    : '0 4px 16px rgba(99,102,241,0.35)',
        color:      isLoading ? '#6b6b8a' : 'white',
      }}
    >
      {isLoading ? (
        <><span aria-hidden className="spin h-[14px] w-[14px] rounded-full border-2 border-[#6b6b8a] border-t-[#a5b4fc]" />Generating</>
      ) : (
        <><Wand2 size={15} />Generate</>
      )}
    </button>
  )
}

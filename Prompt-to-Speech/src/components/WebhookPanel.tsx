// ─────────────────────────────────────────────────────────
// components/WebhookPanel.tsx
//
// Educational panel simulating what an async TTS webhook
// callback payload looks like. Lets developers inspect the
// JSON structure, configure a real endpoint URL, and fire
// a live test POST — useful as a portfolio demo showing
// production-ready TTS integration patterns.
//
// Panel pattern mirrors APIExplorer.tsx.
// ─────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react'
import { X, Webhook, Send, Check, Copy, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { AudioData, APIRequestLog } from '../types'

interface WebhookPanelProps {
  audioData: AudioData | null
  lastLog:   APIRequestLog | null
  onClose:   () => void
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error'

// ── Payload builder ──────────────────────────────────────
function buildPayload(audioData: AudioData, lastLog: APIRequestLog | null) {
  return {
    event:      'tts.generation.complete',
    timestamp:  new Date().toISOString(),
    request_id: `pts_${Date.now().toString(36)}`,
    provider:   (lastLog?.provider ?? 'mock').replace(' (simulated ElevenLabs)', ''),
    data: {
      voice_id:         audioData.voiceId,
      text_preview:     audioData.text.slice(0, 80) + (audioData.text.length > 80 ? '…' : ''),
      character_count:  audioData.text.length,
      word_count:       audioData.words.length,
      duration_seconds: Math.round(audioData.duration * 100) / 100,
      model:            (lastLog?.requestBody?.model_id as string) ?? 'eleven_turbo_v2',
      has_audio:        audioData.audioUrl !== null,
      latency_ms:       lastLog?.durationMs ?? null,
    },
    _meta: {
      sdk_version: '1.0.0',
      retry_count: 0,
      signature:   `sha256=pts_demo_${Math.random().toString(36).slice(2, 10)}`,
    },
  }
}

// ── Copyable code block ──────────────────────────────────
function CopyableBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="relative">
      <pre
        className="overflow-x-auto rounded-xl border border-[#0e0e1e] bg-[#06060f] p-3 text-[11px] leading-relaxed text-[#8080a0]"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", maxHeight: 260 }}
      >
        {content}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-[#1a1a2c] bg-[#0c0c18] px-1.5 py-1 text-[10px] text-[#7878b0] transition-colors hover:text-[#9ca3af]"
      >
        {copied ? <Check size={10} className="text-[#34d399]" /> : <Copy size={10} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9090be]">
      {children}
    </p>
  )
}

// ── Main component ───────────────────────────────────────
export default function WebhookPanel({ audioData, lastLog, onClose }: WebhookPanelProps) {
  const [url,        setUrl]        = useState('https://your-server.com/webhook/tts')
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [response,   setResponse]   = useState<string | null>(null)
  const [latencyMs,  setLatencyMs]  = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const payload     = audioData ? buildPayload(audioData, lastLog) : null
  const payloadJson = payload   ? JSON.stringify(payload, null, 2) : null

  async function handleSend() {
    if (!payload || !url.trim() || sendStatus === 'sending') return
    setSendStatus('sending')
    setResponse(null)
    const t0 = Date.now()
    try {
      const res = await fetch(url.trim(), {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-PTS-Signature': payload._meta.signature,
          'X-PTS-Event':     payload.event,
        },
        body: JSON.stringify(payload),
      })
      const ms = Date.now() - t0
      setLatencyMs(ms)
      const text = await res.text().catch(() => '')
      setSendStatus(res.ok ? 'success' : 'error')
      setResponse(
        res.ok
          ? `HTTP ${res.status} ${res.statusText}\n\n${text || '(empty body)'}`
          : `HTTP ${res.status} ${res.statusText}\n\n${text || '(empty body)'}`
      )
    } catch (err) {
      setLatencyMs(Date.now() - t0)
      setSendStatus('error')
      const msg = err instanceof Error ? err.message : 'Network error'
      const isCors = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('cors')
      setResponse(
        isCors
          ? `Network error: Failed to fetch\n\nThis is likely a CORS restriction — the server at\n"${url}" needs to allow cross-origin requests from\nthis origin, or include an\n"Access-Control-Allow-Origin: *" response header.\n\nIn production, your webhook receiver would accept\nPOST requests from the TTS provider's IP range.`
          : `Error: ${msg}`
      )
    }
  }

  const canSend = !!payload && url.trim().startsWith('http') && sendStatus !== 'sending'

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-[2px]"
        onClick={onClose} aria-hidden
      />

      <aside
        role="dialog"
        aria-label="Webhook Preview"
        className="fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-[100vw] flex-col border-l border-[#1a1a2c] bg-[#07070f]"
        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#14142a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Webhook size={14} color="#6366f1" />
            </div>
            <div>
              <span className="text-[14px] font-semibold text-[#c0c0de]">Webhook Preview</span>
              <p className="text-[10px] text-[#9090be]">Simulates async TTS callback delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!payload ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#14142a]">
                <Webhook size={20} color="#8888b8" />
              </div>
              <p className="text-[13px] text-[#9090be]">No generation yet</p>
              <p className="text-[12px] text-[#8080b8]">
                Generate audio first to preview what the webhook payload would look like.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Concept callout */}
              <div className="flex gap-2.5 rounded-xl border border-[#1a1a2c] bg-[#090912] p-3.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#818cf8]" />
                <p className="text-[11px] leading-relaxed text-[#8888b8]">
                  In production, your TTS provider POSTs this JSON to your server the moment
                  audio is ready — useful for long-running generations or queue-based workflows.
                  Enter your endpoint below to fire a real test.
                </p>
              </div>

              {/* Endpoint input */}
              <div>
                <Label>Endpoint URL</Label>
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setSendStatus('idle'); setResponse(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="https://your-server.com/webhook/tts"
                  className="w-full rounded-xl border border-[#0e0e1e] bg-[#06060f] px-3 py-2.5 font-mono text-[11px] text-[#8080a0] outline-none transition-colors focus:border-[rgba(99,102,241,0.35)]"
                />
              </div>

              {/* Headers that will be sent */}
              <div>
                <Label>Request Headers</Label>
                <div className="overflow-hidden rounded-xl border border-[#0e0e1e] bg-[#06060f]">
                  {[
                    ['Content-Type',    'application/json'],
                    ['X-PTS-Signature', payload._meta.signature],
                    ['X-PTS-Event',     payload.event],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3 border-b border-[#0a0a18] px-3 py-2 last:border-0">
                      <span className="w-[140px] shrink-0 text-[11px] text-[#8888b8]">{k}</span>
                      <span className="break-all font-mono text-[11px] text-[#9898b8]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payload preview */}
              <div>
                <Label>Payload (POST body)</Label>
                <CopyableBlock content={payloadJson!} />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all disabled:pointer-events-none disabled:opacity-40"
                style={{
                  background:  sendStatus === 'sending' ? '#1a1a2c' : 'linear-gradient(135deg,#5a5df0,#7c3aed)',
                  boxShadow:   sendStatus === 'sending' ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
                }}
              >
                {sendStatus === 'sending' ? (
                  <><span className="spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />Sending…</>
                ) : (
                  <><Send size={14} />Send test POST</>
                )}
              </button>

              {/* Response */}
              {response !== null && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {sendStatus === 'success' ? (
                      <CheckCircle size={13} className="text-[#34d399]" />
                    ) : (
                      <XCircle size={13} className="text-[#f87171]" />
                    )}
                    <span className="text-[12px] font-semibold"
                      style={{ color: sendStatus === 'success' ? '#34d399' : '#f87171' }}>
                      {sendStatus === 'success' ? 'Delivered' : 'Failed'}
                    </span>
                    {latencyMs !== null && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-[#9494c0]">
                        <Clock size={11} />{latencyMs}ms
                      </span>
                    )}
                  </div>
                  <pre
                    className="overflow-x-auto rounded-xl border border-[#0e0e1e] bg-[#06060f] p-3 text-[11px] leading-relaxed"
                    style={{
                      fontFamily: "'JetBrains Mono','Fira Code',monospace",
                      color: sendStatus === 'success' ? '#6b8a6b' : '#8a6b6b',
                      maxHeight: 180,
                    }}
                  >
                    {response}
                  </pre>
                </div>
              )}

            </div>
          )}
        </div>

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0.6; }
            to   { transform: translateX(0);    opacity: 1;   }
          }
        `}</style>
      </aside>
    </>
  )
}

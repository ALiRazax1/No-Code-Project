// ─────────────────────────────────────────────────────────
// components/APIExplorer.tsx
//
// Slide-in panel showing the last TTS API request.
// Useful for developers who want to see exactly what fetch()
// call was made — great for a portfolio demo.
//
// Shows: endpoint, method, headers (key masked), request
// body (formatted JSON), response status, and latency.
// ─────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { X, Terminal, Clock, CheckCircle, XCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { APIRequestLog } from '../types'

interface APIExplorerProps {
  log:     APIRequestLog | null
  onClose: () => void
}

function maskKey(val: string): string {
  if (val.length < 10) return '***'
  return val.slice(0, 5) + '***' + val.slice(-4)
}

function StatusBadge({ code }: { code: number }) {
  const ok = code >= 200 && code < 300
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
        color:      ok ? '#34d399' : '#f87171',
      }}
    >
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {code}
    </span>
  )
}

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
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", maxHeight: 200 }}
      >
        {content}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-[#1a1a2c] bg-[#0c0c18] px-1.5 py-1 text-[10px] text-[#3d3d58] transition-colors hover:text-[#9ca3af]"
      >
        {copied ? <Check size={10} className="text-[#34d399]" /> : <Copy size={10} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default function APIExplorer({ log, onClose }: APIExplorerProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-[2px]"
        onClick={onClose} aria-hidden
      />

      <aside
        role="dialog"
        aria-label="API Explorer"
        className="fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[100vw] flex-col border-l border-[#1a1a2c] bg-[#07070f]"
        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#14142a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Terminal size={14} color="#6366f1" />
            </div>
            <span className="text-[14px] font-semibold text-[#c0c0de]">API Explorer</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!log ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#14142a]">
                <Terminal size={20} color="#1e1e32" />
              </div>
              <p className="text-[13px] text-[#2a2a40]">No requests yet</p>
              <p className="text-[12px] text-[#1a1a28]">
                Generate audio to see the API call here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#1a1a2c] px-2 py-0.5 font-mono text-[11px] font-bold text-[#818cf8]">
                  {log.method}
                </span>
                <span className="rounded-md bg-[rgba(99,102,241,0.08)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#6366f1]">
                  {log.provider}
                </span>
                <StatusBadge code={log.responseStatus} />
                <span className="flex items-center gap-1 text-[11px] text-[#2e2e48]">
                  <Clock size={11} />
                  {log.durationMs}ms
                </span>
              </div>

              {/* Endpoint */}
              <div>
                <Label>Endpoint</Label>
                <CopyableBlock content={log.endpoint} />
              </div>

              {/* Headers */}
              <div>
                <Label>Headers</Label>
                <div className="overflow-hidden rounded-xl border border-[#0e0e1e] bg-[#06060f]">
                  {Object.entries(log.headers).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3 border-b border-[#0a0a18] px-3 py-2 last:border-0">
                      <span className="w-[130px] shrink-0 text-[11px] text-[#4a4a68]">{k}</span>
                      <span className="break-all font-mono text-[11px] text-[#6b6b80]">
                        {k.toLowerCase().includes('key') || k.toLowerCase().includes('auth')
                          ? maskKey(v)
                          : v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request body */}
              <div>
                <Label>Request Body</Label>
                <CopyableBlock content={JSON.stringify(log.requestBody, null, 2)} />
              </div>

              {/* Timestamp */}
              <p className="text-[11px] text-[#1e1e30]">
                {log.timestamp.toLocaleTimeString()} · {log.timestamp.toLocaleDateString()}
              </p>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2a2a42]">
      {children}
    </p>
  )
}

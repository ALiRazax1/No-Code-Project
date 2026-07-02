// ─────────────────────────────────────────────────────────
// components/HistoryPanel.tsx
//
// Slide-in overlay panel listing all generations from the
// current session. Click any entry to instantly restore it.
//
// Stores up to 20 entries. Each card shows:
//   • Voice indicator dot + name
//   • Prompt preview (first 80 chars)
//   • Relative timestamp ("Just now", "3m ago", etc.)
//   • Word count
// ─────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { X, Clock, Mic } from 'lucide-react'
import type { HistoryEntry } from '../types'
import { VOICE_PROFILES } from '../data/mockData'

interface HistoryPanelProps {
  entries:  HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClose:  () => void
}

function relativeTime(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs <  5)  return 'Just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export default function HistoryPanel({ entries, onSelect, onClose }: HistoryPanelProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Panel ── */}
      <aside
        role="dialog"
        aria-label="Generation history"
        className="fixed right-0 top-0 z-50 flex h-full w-[340px] flex-col border-l border-[#1a1a2c] bg-[#07070f] shadow-[−8px_0_40px_rgba(0,0,0,0.6)]"
        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#14142a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Clock size={14} color="#6366f1" />
            </div>
            <span className="text-[14px] font-semibold text-[#c0c0de]">History</span>
            <span className="rounded-full bg-[#16162a] px-2 py-0.5 text-[11px] font-medium text-[#4a4a68]">
              {entries.length}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close history"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3d3d58] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#14142a]">
                <Mic size={20} color="#1e1e32" />
              </div>
              <p className="text-[13px] text-[#2a2a40]">No generations yet</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry, idx) => {
                const profile = VOICE_PROFILES.find(v => v.id === entry.audioData.voiceId) ?? VOICE_PROFILES[0]
                const wordCount = entry.audioData.words.length
                const isLatest  = idx === 0

                return (
                  <li key={entry.id}>
                    <button
                      onClick={() => { onSelect(entry); onClose() }}
                      className="w-full rounded-xl border p-4 text-left transition-all duration-150 hover:-translate-y-[1px]"
                      style={{
                        background:   isLatest ? 'rgba(99,102,241,0.06)' : '#0c0c16',
                        borderColor:  isLatest ? 'rgba(99,102,241,0.2)'  : '#14142a',
                      }}
                    >
                      {/* Top row */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-[7px] w-[7px] rounded-full"
                            style={{ background: profile.color }}
                          />
                          <span className="text-[12px] font-medium text-[#7070a0]">
                            {profile.name}
                          </span>
                          {isLatest && (
                            <span className="rounded-full bg-[rgba(99,102,241,0.15)] px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider text-[#818cf8]">
                              Latest
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#2e2e48]">
                          {relativeTime(entry.generatedAt)}
                        </span>
                      </div>

                      {/* Prompt preview */}
                      <p className="mb-2.5 text-[13px] leading-relaxed text-[#5a5a78]"
                        style={{
                          display:            '-webkit-box',
                          WebkitLineClamp:    2,
                          WebkitBoxOrient:    'vertical',
                          overflow:           'hidden',
                        }}
                      >
                        {entry.promptPreview}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-[11px] text-[#2e2e48]">
                        <span>{wordCount} words</span>
                        <span>·</span>
                        <span>{Math.ceil(entry.audioData.duration)}s</span>
                        {entry.audioData.audioUrl && (
                          <>
                            <span>·</span>
                            <span className="text-[#34d399]">MP3</span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer note */}
        {entries.length > 0 && (
          <div className="border-t border-[#14142a] px-5 py-3">
            <p className="text-[11px] text-[#1e1e30]">
              History is session-only. Refreshing the page clears it.
            </p>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  )
}

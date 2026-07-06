// ─────────────────────────────────────────────────────────
// components/ErrorCard.tsx
//
// Parses raw error messages into human-readable titles,
// specific hints, and contextual action buttons.
// ─────────────────────────────────────────────────────────

import { AlertCircle, RefreshCw, Settings } from 'lucide-react'

interface ErrorCardProps {
  message:        string
  onRetry:        () => void
  onOpenSettings: () => void
}

interface ParsedError {
  title:       string
  hint:        string
  showSettings: boolean
}

function parseError(msg: string): ParsedError {
  const m = msg.toLowerCase()

  if (m.includes('api key is missing') || m.includes('not set')) {
    return {
      title:        'API key not configured',
      hint:         'Open Settings and paste your ElevenLabs or OpenAI key to use real voices.',
      showSettings: true,
    }
  }
  if (m.includes('401') || m.includes('invalid') || m.includes('rejected')) {
    return {
      title:        'API key rejected',
      hint:         'Your key was not accepted. Check it for typos or expiry in Settings.',
      showSettings: true,
    }
  }
  if (m.includes('429') || m.includes('rate limit') || m.includes('quota')) {
    return {
      title:        'Rate limit reached',
      hint:         'You\'ve hit the API rate limit. Wait a moment then try again — or shorten the script.',
      showSettings: false,
    }
  }
  if (m.includes('413') || m.includes('too long') || m.includes('maximum')) {
    return {
      title:        'Script too long',
      hint:         'This voice model has a character limit. Trim your script or split it into smaller sections.',
      showSettings: false,
    }
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return {
      title:        'Connection error',
      hint:         'Could not reach the API. Check your internet connection and try again.',
      showSettings: false,
    }
  }
  if (m.includes('500') || m.includes('502') || m.includes('503')) {
    return {
      title:        'API server error',
      hint:         'The TTS provider returned a server error. This is usually temporary — try again in a moment.',
      showSettings: false,
    }
  }

  // Fallback: show the raw message
  return { title: 'Generation failed', hint: msg, showSettings: false }
}

export default function ErrorCard({ message, onRetry, onOpenSettings }: ErrorCardProps) {
  const { title, hint, showSettings } = parseError(message)

  return (
    <div className="fade-up rounded-2xl border border-[#2a1818] bg-[#0e0808] px-6 py-5">

      {/* Header */}
      <div className="mb-2 flex items-center gap-2.5">
        <AlertCircle size={16} color="#f87171" className="shrink-0" />
        <span className="text-[14px] font-semibold text-[#f87171]">{title}</span>
      </div>

      {/* Hint */}
      <p className="mb-4 text-[13px] leading-relaxed text-[#7a4a4a]">{hint}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-[#3a1a1a] bg-[#1a0a0a] px-3.5 py-2 text-[12px] font-medium text-[#f87171] transition-colors hover:border-[#f87171]/30 hover:bg-[#200e0e]"
        >
          <RefreshCw size={13} />
          Retry
        </button>

        {showSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-lg border border-[#1a1a2c] bg-[#0c0c18] px-3.5 py-2 text-[12px] font-medium text-[#6b6b80] transition-colors hover:border-[rgba(99,102,241,0.3)] hover:text-[#a5b4fc]"
          >
            <Settings size={13} />
            Open Settings
          </button>
        )}
      </div>
    </div>
  )
}

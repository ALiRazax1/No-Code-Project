// ─────────────────────────────────────────────────────────
// components/DemoKeyGate.tsx
//
// Full-screen overlay shown once per session when no API
// key has been configured (provider === 'mock').
//
// Two paths:
//   1. Paste ElevenLabs key → sets provider to elevenlabs,
//      saves key, dismisses gate, jumps straight to live mode.
//   2. Try Demo Mode → keeps mock provider, dismisses gate.
//
// Dismissed state is stored in sessionStorage so the gate
// only shows once per browser session. Users who already
// configured a key via the Settings Drawer never see it.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Zap, Mic, ArrowRight, FlaskConical } from 'lucide-react'

interface DemoKeyGateProps {
  onContinue: (mode: 'demo' | 'key', apiKey?: string) => void
}

export default function DemoKeyGate({ onContinue }: DemoKeyGateProps) {
  const [apiKey,   setApiKey]   = useState('')
  const [showKey,  setShowKey]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mounted,  setMounted]  = useState(false)

  // Trigger entrance animation after first paint
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  function handleKeySubmit() {
    const trimmed = apiKey.trim()
    if (!trimmed) { setError('Please paste your ElevenLabs API key.'); return }
    if (!trimmed.startsWith('sk_')) {
      setError('ElevenLabs keys start with "sk_". Check and try again.')
      return
    }
    setError('')
    setLoading(true)
    // Brief delay so the loading state feels intentional
    setTimeout(() => onContinue('key', trimmed), 600)
  }

  function handleDemo() {
    onContinue('demo')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(3,3,10,0.92)', backdropFilter: 'blur(12px)' }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[#1a1a2c] bg-[#07070f]"
        style={{
          boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.7)',
          animation: mounted ? 'gate-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
          opacity:   mounted ? undefined : 0,
        }}
      >
        {/* Top accent line */}
        <div
          aria-hidden
          className="absolute top-0 left-[10%] right-[10%] h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }}
        />

        {/* Inner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 60%)' }}
        />

        <div className="relative px-8 pb-8 pt-9">

          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
                boxShadow:  '0 0 32px rgba(99,102,241,0.4)',
              }}
            >
              <Mic size={24} color="white" strokeWidth={2} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="mb-2 text-center text-[22px] font-bold tracking-tight text-[#e0e0f8]">
            Welcome to Prompt to Speech
          </h2>
          <p className="mb-7 text-center text-[14px] leading-relaxed text-[#3a3a58]">
            Paste your ElevenLabs key for real AI voices with word-level sync,
            or jump in with the demo to explore the interface.
          </p>

          {/* ── Option 1: ElevenLabs key ── */}
          <div
            className="mb-4 rounded-2xl border p-5"
            style={{ borderColor: '#1a1a2c', background: '#0c0c18' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: 'rgba(52,211,153,0.12)' }}>
                <Zap size={13} color="#34d399" />
              </div>
              <span className="text-[13px] font-semibold text-[#c0c0de]">
                Use your ElevenLabs key
              </span>
              <span className="ml-auto rounded-full bg-[rgba(52,211,153,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#34d399]">
                RECOMMENDED
              </span>
            </div>

            <div className="relative mb-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleKeySubmit()}
                placeholder="sk_…"
                className="w-full rounded-xl border border-[#14142a] bg-[#06060f] px-4 py-3 pr-10 font-mono text-[13px] text-[#c0c0de] placeholder-[#22223a] outline-none transition-all focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a2a42] transition-colors hover:text-[#6b6b80]"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <p className="mb-2 text-[12px] text-[#f87171]">{error}</p>
            )}

            <button
              onClick={handleKeySubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #5a5df0, #7c3aed)',
                boxShadow:  '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {loading ? (
                <span className="spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>Start with my key <ArrowRight size={15} /></>
              )}
            </button>

            <p className="mt-2.5 text-center text-[11px] text-[#2a2a42]">
              Free plan · 10,000 chars/month ·{' '}
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6366f1] hover:underline"
              >
                Get a key
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#12122a]" />
            <span className="text-[11px] text-[#2a2a42]">or</span>
            <div className="h-px flex-1 bg-[#12122a]" />
          </div>

          {/* ── Option 2: Demo mode ── */}
          <button
            onClick={handleDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1a1a2c] bg-[#0c0c18] py-2.5 text-[13px] font-medium text-[#6b6b80] transition-all duration-150 hover:border-[#242438] hover:text-[#9ca3af]"
          >
            <FlaskConical size={15} />
            Try demo mode — no key needed
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#1e1e30]">
            Demo uses your browser's built-in speech engine.
            Your key is stored locally and never leaves your browser.
          </p>

        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// components/EmbedPanel.tsx
//
// Slide-in panel that surfaces EmbedWidget as a drop-in
// integration. Three sections:
//
//   1. Live Preview   — renders EmbedWidget using current
//                       provider / API key from Settings
//   2. React Usage    — copyable component snippet + props table
//   3. postMessage API — inbound commands + outbound events
//                        + host-page integration snippet
//
// Panel pattern mirrors APIExplorer / WebhookPanel.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { X, Code2, Copy, Check } from 'lucide-react'
import type { AppSettings } from '../types'
import EmbedWidget from './EmbedWidget'

interface EmbedPanelProps {
  settings: AppSettings
  onClose:  () => void
}

// ── Shared sub-components ────────────────────────────────

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
        style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", maxHeight: 260 }}
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
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9090be]">
      {children}
    </p>
  )
}

function MsgRow({
  type, desc, extra,
}: {
  type:   string
  desc:   string
  extra?: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#0a0a18] px-3 py-2.5 last:border-0">
      <code className="mt-[1px] shrink-0 rounded bg-[#14142a] px-1.5 py-0.5 font-mono text-[10px] text-[#818cf8]">
        {type}
      </code>
      <div className="min-w-0">
        <p className="text-[11px] text-[#9898b8]">{desc}</p>
        {extra && (
          <p className="mt-0.5 font-mono text-[10px] text-[#9494c0]">{extra}</p>
        )}
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────

export default function EmbedPanel({ settings, onClose }: EmbedPanelProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Mask API key in the generated snippet
  const maskedKey = settings.apiKey
    ? settings.apiKey.slice(0, 5) + '••••••••••••'
    : 'YOUR_API_KEY'

  const reactSnippet =
`import EmbedWidget from './components/EmbedWidget'

<EmbedWidget
  provider="${settings.provider}"
  apiKey="${maskedKey}"
  voiceId="nova"
  defaultPrompt="Hello, welcome to our product."
  language="${settings.language ?? 'en'}"
/>`

  const hostSnippet =
`// Control the widget from the host page
const widget = document.getElementById('pts-widget')

// Trigger generation (optionally push a new prompt first)
widget.contentWindow.postMessage(
  { type: 'pts:generate', prompt: 'Hello world' }, '*',
)

// Transport controls
widget.contentWindow.postMessage({ type: 'pts:play' },  '*')
widget.contentWindow.postMessage({ type: 'pts:pause' }, '*')
widget.contentWindow.postMessage({ type: 'pts:seek', time: 10.5 }, '*')

// Listen for events from the widget
window.addEventListener('message', (e) => {
  if (!e.data?.type?.startsWith('pts:')) return
  switch (e.data.type) {
    case 'pts:ready':
      console.log('Generated. Duration:', e.data.payload.duration)
      break
    case 'pts:status':
      console.log('Time:', e.data.payload.currentTime,
                  '/ Progress:', e.data.payload.progress + '%')
      break
    case 'pts:ended':
      console.log('Playback finished')
      break
    case 'pts:error':
      console.error('Error:', e.data.payload.message)
      break
  }
})`

  // iframe snippet — points to the real /embed route
  const iframeSnippet =
`<iframe
  id="pts-widget"
  src="${window.location.origin}/embed?provider=${settings.provider}&apiKey=${maskedKey}&voiceId=nova&language=${settings.language ?? 'en'}&defaultPrompt=Hello%2C+welcome+to+our+product."
  width="100%"
  height="320"
  frameborder="0"
  allow="autoplay"
  style="border:none;border-radius:12px;"
></iframe>`

  const props = [
    { prop: 'provider',       type: 'string',  required: false, desc: '"mock" | "elevenlabs" | "openai". Defaults to "elevenlabs" when apiKey is set, "mock" otherwise.' },
    { prop: 'apiKey',         type: 'string',  required: false, desc: 'API key for the chosen provider. Omit for mock mode.' },
    { prop: 'voiceId',        type: 'string',  required: false, desc: 'nova | echo | shimmer | onyx | alloy. Defaults to "nova".' },
    { prop: 'defaultPrompt',  type: 'string',  required: false, desc: 'Pre-filled textarea value shown on mount.' },
    { prop: 'language',       type: 'string',  required: false, desc: 'BCP-47 code forwarded to the TTS API and SpeechSynthesis. Defaults to "en".' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — wider than other panels to fit the live preview */}
      <aside
        role="dialog"
        aria-label="Embed Widget"
        className="fixed right-0 top-0 z-50 flex h-full w-[460px] max-w-[100vw] flex-col border-l border-[#1a1a2c] bg-[#07070f]"
        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#14142a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)' }}
            >
              <Code2 size={14} color="#6366f1" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#c0c0de]">Embed Widget</p>
              <p className="text-[10px] text-[#9090be]">
                Drop-in React component · postMessage API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7878b0] transition-colors hover:bg-[#16162a] hover:text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

          {/* ── 1. Live Preview ── */}
          <div>
            <Label>Live Preview</Label>
            <div className="rounded-xl border border-[#0e0e1e] bg-[#05050d] p-4">
              <EmbedWidget
                provider={settings.provider}
                apiKey={settings.apiKey}
                voiceId="nova"
                defaultPrompt="Enter a script and click Generate."
                language={settings.language ?? 'en'}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[#8888b8]">
              Fully functional — uses your current provider &amp; API key from Settings.
            </p>
          </div>

          {/* ── 2. iFrame Embed snippet ── */}
          <div>
            <Label>iFrame Embed</Label>
            <CopyableBlock content={iframeSnippet} />
            <p className="mt-1.5 text-[10px] text-[#8888b8]">
              Drop this into any HTML page. The widget loads at{' '}
              <code className="rounded bg-[#14142a] px-1 py-0.5 font-mono text-[10px] text-[#818cf8]">
                /embed
              </code>{' '}
              and communicates via the postMessage API below.
            </p>
          </div>

          {/* ── 3. React component snippet ── */}
          <div>
            <Label>React Component</Label>
            <CopyableBlock content={reactSnippet} />
          </div>

          {/* ── 4. Props table ── */}
          <div>
            <Label>Props</Label>
            <div className="overflow-hidden rounded-xl border border-[#0e0e1e] bg-[#06060f]">
              {props.map(({ prop, type, required, desc }) => (
                <div
                  key={prop}
                  className="flex items-start gap-3 border-b border-[#0a0a18] px-3 py-2.5 last:border-0"
                >
                  <div className="flex w-[120px] shrink-0 flex-col gap-0.5">
                    <code className="font-mono text-[11px] text-[#818cf8]">{prop}</code>
                    <code className="font-mono text-[9px] text-[#9494c0]">
                      {type}{required ? '' : '?'}
                    </code>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#8888b8]">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. postMessage API ── */}
          <div>
            <Label>postMessage API</Label>

            <p className="mb-1.5 text-[11px] font-semibold text-[#7878b0]">
              Inbound — host page → widget
            </p>
            <div className="mb-4 overflow-hidden rounded-xl border border-[#0e0e1e] bg-[#06060f]">
              <MsgRow
                type="pts:generate"
                desc="Trigger audio generation, optionally pushing a new prompt"
                extra="{ prompt?: string }"
              />
              <MsgRow type="pts:play"  desc="Start or resume playback" />
              <MsgRow type="pts:pause" desc="Pause playback" />
              <MsgRow
                type="pts:seek"
                desc="Jump to a position in seconds"
                extra="{ time: number }"
              />
            </div>

            <p className="mb-1.5 text-[11px] font-semibold text-[#7878b0]">
              Outbound — widget → host page
            </p>
            <div className="overflow-hidden rounded-xl border border-[#0e0e1e] bg-[#06060f]">
              <MsgRow
                type="pts:ready"
                desc="Audio generated and ready to play"
                extra="{ duration: number }"
              />
              <MsgRow
                type="pts:status"
                desc="Time update emitted every ~250 ms during playback"
                extra="{ status, currentTime, duration, progress }"
              />
              <MsgRow type="pts:ended" desc="Playback reached the end" />
              <MsgRow
                type="pts:error"
                desc="Generation failed"
                extra="{ message: string }"
              />
            </div>
          </div>

          {/* ── 6. Host integration snippet ── */}
          <div>
            <Label>Host Page Integration</Label>
            <CopyableBlock content={hostSnippet} />
          </div>

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

// ─────────────────────────────────────────────────────────
// pages/EmbedPage.tsx
//
// Standalone route mounted at /embed.
// Reads all EmbedWidget props from URLSearchParams so the
// widget can be dropped into any <iframe src="/embed?...">
// with no host-page JS required.
//
// Supported params:
//   apiKey         — provider API key
//   voiceId        — voice ID (default: nova)
//   provider       — mock | elevenlabs | openai (default: mock)
//   defaultPrompt  — pre-filled textarea text
//   language       — BCP-47 code (default: en)
//
// The page is intentionally chrome-free: transparent background,
// no padding, no scroll — EmbedWidget fills the full iframe.
// ─────────────────────────────────────────────────────────

import { useSearchParams } from 'react-router-dom'
import EmbedWidget, { type EmbedWidgetProps } from '../components/EmbedWidget'

export default function EmbedPage() {
  const [params] = useSearchParams()

  const rawProvider = params.get('provider')
  const provider: EmbedWidgetProps['provider'] =
    rawProvider === 'elevenlabs' || rawProvider === 'openai' || rawProvider === 'mock'
      ? rawProvider
      : undefined

  return (
    <div
      style={{
        // Fill the iframe fully; EmbedWidget handles its own internal layout
        width:      '100%',
        minHeight:  '100vh',
        background: 'transparent',
        margin:     0,
        padding:    0,
      }}
    >
      <EmbedWidget
        apiKey={params.get('apiKey')        ?? undefined}
        voiceId={params.get('voiceId')      ?? undefined}
        provider={provider}
        defaultPrompt={params.get('defaultPrompt') ?? undefined}
        language={params.get('language')    ?? undefined}
      />
    </div>
  )
}

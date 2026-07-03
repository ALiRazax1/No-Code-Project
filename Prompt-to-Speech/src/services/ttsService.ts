// ─────────────────────────────────────────────────────────
// services/ttsService.ts
//
// Unified TTS service. Provider, API key, and voice IDs are
// now passed in at call time via AppSettings — no hardcoded
// constants and no environment variables required.
//
// Switch provider in the Settings Drawer at runtime.
// ─────────────────────────────────────────────────────────

import type { AudioData, AppSettings } from '../types'
import { buildWordTimings } from '../data/mockData'
import { DEFAULT_VOICE_IDS, DEFAULT_SETTINGS } from '../hooks/useSettings'

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/**
 * generateAudio — main entry point.
 *
 * @param text     The prompt / script text.
 * @param voiceId  One of: nova | echo | shimmer | onyx | alloy
 * @param settings Runtime settings from useSettings()
 */
export async function generateAudio(
  text:     string,
  voiceId:  string,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<AudioData> {
  switch (settings.provider) {
    case 'elevenlabs': return elevenlabsGenerate(text, voiceId, settings)
    case 'openai':     return openaiGenerate(text, voiceId, settings)
    default:           return mockGenerate(text, voiceId)
  }
}

// ─────────────────────────────────────────────────────────
// Mock provider
// ─────────────────────────────────────────────────────────
async function mockGenerate(text: string, voiceId: string): Promise<AudioData> {
  await sleep(1500 + Math.random() * 500)
  const words    = buildWordTimings(text)
  const duration = words.length ? words[words.length - 1].endTime + 0.35 : 5
  return { words, duration, voiceId, text, audioUrl: null }
}

// ─────────────────────────────────────────────────────────
// ElevenLabs provider
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
// ─────────────────────────────────────────────────────────
async function elevenlabsGenerate(
  text:     string,
  voiceId:  string,
  settings: AppSettings,
): Promise<AudioData> {
  if (!settings.apiKey) throw new Error('ElevenLabs API key is missing. Add it in Settings.')

  const elVoiceId = settings.voiceIds[voiceId] ?? DEFAULT_VOICE_IDS[voiceId] ?? DEFAULT_VOICE_IDS['nova']

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}/with-timestamps`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': settings.apiKey },
      body:    JSON.stringify({
        text,
        model_id:       'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${body || res.statusText}`)
  }

  const json = await res.json() as {
    audio_base64: string
    alignment: {
      characters:                      string[]
      character_start_times_seconds:   number[]
      character_end_times_seconds:     number[]
    }
  }

  const audioBlob = base64ToBlob(json.audio_base64, 'audio/mpeg')
  const audioUrl  = URL.createObjectURL(audioBlob)
  const words     = parseElevenLabsAlignment(json.alignment)
  const duration  = words.length ? words[words.length - 1].endTime : 0

  return { words, duration, voiceId, text, audioUrl }
}

function parseElevenLabsAlignment(alignment: {
  characters:                    string[]
  character_start_times_seconds: number[]
  character_end_times_seconds:   number[]
}) {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment
  const words: import('../types').WordTiming[] = []
  let current = '', wordStart = 0

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i]
    if (ch === ' ' || i === characters.length - 1) {
      if (ch !== ' ') current += ch
      if (current.trim()) {
        words.push({
          word:      current.trim(),
          startTime: wordStart,
          endTime:   character_end_times_seconds[i - 1] ?? character_end_times_seconds[i],
        })
      }
      current   = ''
      wordStart = character_start_times_seconds[i + 1] ?? 0
    } else {
      if (!current) wordStart = character_start_times_seconds[i]
      current += ch
    }
  }
  return words
}

// ─────────────────────────────────────────────────────────
// OpenAI provider
// Docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
// Note: no word-level timestamps — uses buildWordTimings estimate.
// ─────────────────────────────────────────────────────────
const OAI_VOICE_MAP: Record<string, string> = {
  nova:    'nova',
  echo:    'echo',
  shimmer: 'shimmer',
  onyx:    'onyx',
  alloy:   'alloy',
}

async function openaiGenerate(
  text:     string,
  voiceId:  string,
  settings: AppSettings,
): Promise<AudioData> {
  if (!settings.apiKey) throw new Error('OpenAI API key is missing. Add it in Settings.')

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body:    JSON.stringify({ model: 'tts-1-hd', input: text, voice: OAI_VOICE_MAP[voiceId] ?? 'nova', response_format: 'mp3' }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body || res.statusText}`)
  }

  const audioBlob = await res.blob()
  const audioUrl  = URL.createObjectURL(audioBlob)
  const words     = buildWordTimings(text)
  const duration  = words.length ? words[words.length - 1].endTime + 0.35 : 5

  return { words, duration, voiceId, text, audioUrl }
}

// ─────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────
function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes  = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

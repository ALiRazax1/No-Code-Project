// ─────────────────────────────────────────────────────────
// services/ttsService.ts
//
// Unified TTS service layer.
// ─── Switch between providers by changing TTS_PROVIDER. ───
//
// Supported:
//   'mock'       → Client-side simulation, no API key needed.
//   'elevenlabs' → ElevenLabs /v1/text-to-speech with timestamps.
//   'openai'     → OpenAI tts-1 / tts-1-hd model.
// ─────────────────────────────────────────────────────────

import type { AudioData } from '../types'
import { buildWordTimings } from '../data/mockData'

// ── Provider toggle ──────────────────────────────────────
type TTSProvider = 'mock' | 'elevenlabs' | 'openai'
const TTS_PROVIDER: TTSProvider = 'mock'

// ── API keys (set in .env) ───────────────────────────────
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined
const OPENAI_API_KEY     = import.meta.env.VITE_OPENAI_API_KEY     as string | undefined

// ── ElevenLabs voice ID map ──────────────────────────────
// Maps internal profile IDs → ElevenLabs voice IDs.
// Find yours at https://api.elevenlabs.io/v1/voices
const EL_VOICE_MAP: Record<string, string> = {
  nova:    'EXAVITQu4vr4xnSDxMaL', // Bella
  echo:    'VR6AewLTigWG4xSOukaG', // Arnold
  shimmer: 'MF3mGyEYCl7XYWbV9V6O', // Elli
  onyx:    'TxGEqnHWrfWFTfGW9XjX', // Josh
  alloy:   '21m00Tcm4TlvDq8ikWAM', // Rachel
}

// ── OpenAI voice map ─────────────────────────────────────
const OAI_VOICE_MAP: Record<string, string> = {
  nova:    'nova',
  echo:    'echo',
  shimmer: 'shimmer',
  onyx:    'onyx',
  alloy:   'alloy',
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/**
 * generateAudio — main entry point.
 *
 * @param text    The prompt / script text.
 * @param voiceId One of: nova | echo | shimmer | onyx | alloy
 * @returns       Resolved AudioData ready for the player.
 *
 * @example
 * const data = await generateAudio('Hello world', 'nova')
 */
export async function generateAudio(
  text: string,
  voiceId: string,
): Promise<AudioData> {
  switch (TTS_PROVIDER) {
    case 'elevenlabs': return elevenlabsGenerate(text, voiceId)
    case 'openai':     return openaiGenerate(text, voiceId)
    default:           return mockGenerate(text, voiceId)
  }
}

// ─────────────────────────────────────────────────────────
// Mock provider (no API key required)
// ─────────────────────────────────────────────────────────
async function mockGenerate(text: string, voiceId: string): Promise<AudioData> {
  // Simulate realistic network + model latency
  await sleep(1500 + Math.random() * 500)

  const words    = buildWordTimings(text)
  const duration = words.length
    ? words[words.length - 1].endTime + 0.35
    : 5

  return { words, duration, voiceId, text, audioUrl: null }
}

// ─────────────────────────────────────────────────────────
// ElevenLabs provider
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
// ─────────────────────────────────────────────────────────
async function elevenlabsGenerate(
  text: string,
  voiceId: string,
): Promise<AudioData> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Missing VITE_ELEVENLABS_API_KEY in .env')
  }

  const elVoiceId = EL_VOICE_MAP[voiceId] ?? EL_VOICE_MAP['nova']

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'xi-api-key':    ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  )

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status} ${res.statusText}`)

  const json = await res.json() as {
    audio_base64: string
    alignment: {
      characters: string[]
      character_start_times_seconds: number[]
      character_end_times_seconds: number[]
    }
  }

  // Convert base64 audio → object URL
  const audioBlob = base64ToBlob(json.audio_base64, 'audio/mpeg')
  const audioUrl  = URL.createObjectURL(audioBlob)

  // Parse character-level alignment into word-level timings
  const words    = parseElevenLabsAlignment(json.alignment)
  const duration = words.length
    ? words[words.length - 1].endTime
    : 0

  return { words, duration, voiceId, text, audioUrl }
}

function parseElevenLabsAlignment(alignment: {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}) {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment
  const words: import('../types').WordTiming[] = []
  let current = ''
  let wordStart = 0

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
// Note: OpenAI TTS does not return word-level timestamps.
// We fall back to buildWordTimings() for subtitle sync.
// ─────────────────────────────────────────────────────────
async function openaiGenerate(
  text: string,
  voiceId: string,
): Promise<AudioData> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing VITE_OPENAI_API_KEY in .env')
  }

  const oaiVoice = OAI_VOICE_MAP[voiceId] ?? 'nova'

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model:  'tts-1-hd',
      input:  text,
      voice:  oaiVoice,
      response_format: 'mp3',
    }),
  })

  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`)

  const audioBlob = await res.blob()
  const audioUrl  = URL.createObjectURL(audioBlob)

  // OpenAI doesn't return timestamps — use client-side estimation
  const words    = buildWordTimings(text)
  const duration = words.length
    ? words[words.length - 1].endTime + 0.35
    : 5

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

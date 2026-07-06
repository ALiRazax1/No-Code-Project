// ─────────────────────────────────────────────────────────
// services/ttsService.ts — captures APIRequestLog
// ─────────────────────────────────────────────────────────

import type { AudioData, AppSettings, APIRequestLog } from '../types'
import { buildWordTimings } from '../data/mockData'
import { DEFAULT_VOICE_IDS, DEFAULT_SETTINGS } from '../hooks/useSettings'

// Module-level log — read by APIExplorer via getLastRequestLog()
let _lastLog: APIRequestLog | null = null
export function getLastRequestLog(): APIRequestLog | null { return _lastLog }

function setLog(log: APIRequestLog) { _lastLog = log }

// ─────────────────────────────────────────────────────────
export async function generateAudio(
  text:     string,
  voiceId:  string,
  settings: AppSettings = DEFAULT_SETTINGS,
  language: string = 'en',
): Promise<AudioData> {
  switch (settings.provider) {
    case 'elevenlabs': return elevenlabsGenerate(text, voiceId, settings, language)
    case 'openai':     return openaiGenerate(text, voiceId, settings)
    default:           return mockGenerate(text, voiceId, settings, language)
  }
}

// ── Mock ─────────────────────────────────────────────────
async function mockGenerate(
  text:     string,
  voiceId:  string,
  settings: AppSettings,
  language: string,
): Promise<AudioData> {
  const elVoiceId = settings.voiceIds[voiceId] ?? DEFAULT_VOICE_IDS[voiceId] ?? DEFAULT_VOICE_IDS['nova']
  const model     = language === 'en' ? 'eleven_turbo_v2' : 'eleven_multilingual_v2'

  // Record what the ElevenLabs call *would* look like
  const t0 = Date.now()
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 500))
  setLog({
    provider:       'mock (simulated ElevenLabs)',
    endpoint:       `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}/with-timestamps`,
    method:         'POST',
    headers:        { 'Content-Type': 'application/json', 'xi-api-key': 'sk_demo_key_not_real' },
    requestBody:    { text, model_id: model, language_code: language, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    responseStatus: 200,
    durationMs:     Date.now() - t0,
    timestamp:      new Date(),
  })

  const words    = buildWordTimings(text)
  const duration = words.length ? words[words.length - 1].endTime + 0.35 : 5
  return { words, duration, voiceId, text, audioUrl: null }
}

// ── ElevenLabs ───────────────────────────────────────────
async function elevenlabsGenerate(
  text:     string,
  voiceId:  string,
  settings: AppSettings,
  language: string,
): Promise<AudioData> {
  if (!settings.apiKey) throw new Error('ElevenLabs API key is missing. Add it in Settings.')

  const elVoiceId = settings.voiceIds[voiceId] ?? DEFAULT_VOICE_IDS[voiceId] ?? DEFAULT_VOICE_IDS['nova']
  const model     = language === 'en' ? 'eleven_turbo_v2' : 'eleven_multilingual_v2'
  const endpoint  = `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}/with-timestamps`
  const headers   = { 'Content-Type': 'application/json', 'xi-api-key': settings.apiKey }
  const body      = { text, model_id: model, language_code: language, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }

  const t0  = Date.now()
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  const dur = Date.now() - t0

  setLog({
    provider: 'elevenlabs', endpoint, method: 'POST',
    headers, requestBody: body,
    responseStatus: res.status, durationMs: dur, timestamp: new Date(),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${txt || res.statusText}`)
  }

  const json = await res.json() as {
    audio_base64: string
    alignment: {
      characters:                    string[]
      character_start_times_seconds: number[]
      character_end_times_seconds:   number[]
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
        words.push({ word: current.trim(), startTime: wordStart, endTime: character_end_times_seconds[i - 1] ?? character_end_times_seconds[i] })
      }
      current = ''; wordStart = character_start_times_seconds[i + 1] ?? 0
    } else {
      if (!current) wordStart = character_start_times_seconds[i]
      current += ch
    }
  }
  return words
}

// ── OpenAI ───────────────────────────────────────────────
const OAI_VOICE_MAP: Record<string, string> = {
  nova: 'nova', echo: 'echo', shimmer: 'shimmer', onyx: 'onyx', alloy: 'alloy',
}

async function openaiGenerate(
  text:     string,
  voiceId:  string,
  settings: AppSettings,
): Promise<AudioData> {
  if (!settings.apiKey) throw new Error('OpenAI API key is missing. Add it in Settings.')

  const endpoint = 'https://api.openai.com/v1/audio/speech'
  const headers  = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` }
  const body     = { model: 'tts-1-hd', input: text, voice: OAI_VOICE_MAP[voiceId] ?? 'nova', response_format: 'mp3' }

  const t0  = Date.now()
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  const dur = Date.now() - t0

  setLog({
    provider: 'openai', endpoint, method: 'POST',
    headers, requestBody: body,
    responseStatus: res.status, durationMs: dur, timestamp: new Date(),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${txt || res.statusText}`)
  }

  const audioBlob = await res.blob()
  const audioUrl  = URL.createObjectURL(audioBlob)
  const words     = buildWordTimings(text)
  const duration  = words.length ? words[words.length - 1].endTime + 0.35 : 5
  return { words, duration, voiceId, text, audioUrl }
}

// ── Utilities ─────────────────────────────────────────────
function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes  = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}

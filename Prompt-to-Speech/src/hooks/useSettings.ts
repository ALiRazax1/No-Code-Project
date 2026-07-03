// ─────────────────────────────────────────────────────────
// hooks/useSettings.ts
//
// Manages AppSettings with localStorage persistence.
// Returns [settings, patch] where patch does a shallow
// merge so callers only have to specify what changed.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { AppSettings } from '../types'

const STORAGE_KEY = 'pts:settings'

export const DEFAULT_VOICE_IDS: Record<string, string> = {
  nova:    'EXAVITQu4vr4xnSDxMaL',
  echo:    'VR6AewLTigWG4xSOukaG',
  shimmer: 'MF3mGyEYCl7XYWbV9V6O',
  onyx:    'TxGEqnHWrfWFTfGW9XjX',
  alloy:   '21m00Tcm4TlvDq8ikWAM',
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider:         'mock',
  apiKey:           '',
  voiceIds:         { ...DEFAULT_VOICE_IDS },
  playbackRate:     1,
  subtitleFontSize: 17,
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Deep merge voiceIds so missing keys get defaults
      voiceIds: { ...DEFAULT_VOICE_IDS, ...(parsed.voiceIds ?? {}) },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function save(s: AppSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const [settings, setSettings] = useState<AppSettings>(load)

  const patch = useCallback((update: Partial<AppSettings>) => {
    setSettings(prev => {
      const next: AppSettings = {
        ...prev,
        ...update,
        // Deep merge voiceIds when present in patch
        voiceIds: update.voiceIds
          ? { ...prev.voiceIds, ...update.voiceIds }
          : prev.voiceIds,
      }
      save(next)
      return next
    })
  }, [])

  return [settings, patch]
}

// ─────────────────────────────────────────────────────────
// types.ts — Shared TypeScript interfaces & type aliases
// ─────────────────────────────────────────────────────────

/** A single word from the TTS response with its playback window. */
export interface WordTiming {
  /** The display word (may include punctuation). */
  word: string;
  /** Seconds from start when this word begins. */
  startTime: number;
  /** Seconds from start when this word ends. */
  endTime: number;
}

/** A voice profile available in the voice selector. */
export interface VoiceProfile {
  /** Stable identifier used when calling the TTS API. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Short descriptor shown in the selector (e.g. "Warm · Friendly"). */
  desc: string;
  /** Hex accent color used for the indicator dot. */
  color: string;
}

/** The resolved output from a TTS generation call. */
export interface AudioData {
  /** Word-level timing array aligned to the audio. */
  words: WordTiming[];
  /** Total duration of the audio clip in seconds. */
  duration: number;
  /** The voiceId used to generate this clip. */
  voiceId: string;
  /** The original prompt text. */
  text: string;
  /**
   * URL of the generated audio file.
   * Null when using the SpeechSynthesis fallback (mock mode).
   */
  audioUrl: string | null;
}

/** Top-level application states. */
export type AppStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Playback state managed by AudioPlayer. */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended';

/** A single entry in the session generation history. */
export interface HistoryEntry {
  id:            string;
  audioData:     AudioData;
  generatedAt:   Date;
  promptPreview: string;
}

/** SubtitleCanvas display modes. */
export type SubtitleMode = 'word' | 'sentence';

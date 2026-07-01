# Prompt to Speech · AI Voice Studio

A sleek, single-page Prompt-to-Speech web app built with React, TypeScript, and Tailwind CSS.

## Features

- **Custom Audio Player** — no native `<audio>` controls; fully bespoke seek bar, waveform visualiser, and transport buttons
- **Kinetic Subtitle Canvas** — word-level karaoke-style highlighting synced to playback at 60fps
- **Voice Profiles** — five selectable AI personas with accent colour indicators
- **TTS Service layer** — ships in mock mode; swap to ElevenLabs or OpenAI with a single constant change and an API key
- **SpeechSynthesis fallback** — works entirely in-browser without a backend

## Stack

| Tool | Version | Role |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5 | Dev server + bundler |
| Tailwind CSS | 3 | Utility styling |
| Lucide React | 0.383 | Icons |

## Quick start

```bash
# 1. Install
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

The app runs fully in **mock mode** by default — no API key needed.

## Connecting a real TTS provider

### ElevenLabs (recommended)
ElevenLabs returns character-level alignment data that gives precise word timestamps.

1. Copy `.env.example` → `.env`
2. Add your key: `VITE_ELEVENLABS_API_KEY=sk_...`
3. In `src/services/ttsService.ts`, set:
   ```ts
   const TTS_PROVIDER: TTSProvider = 'elevenlabs'
   ```

### OpenAI
OpenAI TTS does not return timestamps; the app uses client-side estimation instead.

1. Copy `.env.example` → `.env`
2. Add your key: `VITE_OPENAI_API_KEY=sk-...`
3. In `src/services/ttsService.ts`, set:
   ```ts
   const TTS_PROVIDER: TTSProvider = 'openai'
   ```

## Project structure

```
src/
├── types.ts                  # Shared TypeScript interfaces
├── main.tsx                  # Entry point
├── App.tsx                   # Root layout + state machine
├── index.css                 # Tailwind + global styles (seek bar, animations)
│
├── data/
│   └── mockData.ts           # Voice profiles, waveform seeds, buildWordTimings()
│
├── services/
│   └── ttsService.ts         # generateAudio() — mock / ElevenLabs / OpenAI
│
├── hooks/
│   └── useAudioPlayer.ts     # RAF timer, SpeechSynthesis, seek/restart logic
│
└── components/
    ├── AudioPlayer.tsx        # Custom transport controls
    ├── SubtitleCanvas.tsx     # Kinetic word-highlighting display
    └── VoiceSelector.tsx      # Animated voice dropdown
```

## Building for production

```bash
npm run build
# Output: dist/
```

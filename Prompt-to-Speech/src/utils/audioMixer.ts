// ─────────────────────────────────────────────────────────
// utils/audioMixer.ts
//
// Client-side stereo audio mixing using the Web Audio API.
// Decodes two audio sources, mixes them at specified
// volumes, loops the background track to match voice length,
// and returns a WAV Blob ready for download.
// ─────────────────────────────────────────────────────────

import { encodeWav } from './audioExport'

export interface MixOptions {
  voiceUrl:     string   // blob: URL from ElevenLabs / OpenAI
  bgFile:       File     // uploaded background audio file
  voiceVolume:  number   // 0–1
  bgVolume:     number   // 0–1
  fadeOutMs?:   number   // fade-out duration at end (default 1500ms)
}

/**
 * Mix voice + background into a stereo WAV Blob.
 * Background loops automatically if shorter than voice.
 * A cosine fade-out is applied to the final portion.
 */
export async function mixTracks(opts: MixOptions): Promise<Blob> {
  const { voiceUrl, bgFile, voiceVolume, bgVolume, fadeOutMs = 1500 } = opts

  const ctx = new AudioContext()

  // Decode both sources in parallel
  const [voiceAB, bgAB] = await Promise.all([
    fetch(voiceUrl).then(r => r.arrayBuffer()),
    bgFile.arrayBuffer(),
  ])

  const [voiceBuf, bgBuf] = await Promise.all([
    ctx.decodeAudioData(voiceAB),
    ctx.decodeAudioData(bgAB),
  ])

  const sr      = voiceBuf.sampleRate
  const outLen  = voiceBuf.length
  const numCh   = Math.max(voiceBuf.numberOfChannels, bgBuf.numberOfChannels)
  const fadeLen = Math.floor((fadeOutMs / 1000) * sr)
  const fadeStart = Math.max(0, outLen - fadeLen)

  const outBuf = ctx.createBuffer(numCh, outLen, sr)

  for (let ch = 0; ch < numCh; ch++) {
    // Clamp channel index to available channels in each source
    const vCh = Math.min(ch, voiceBuf.numberOfChannels - 1)
    const bCh = Math.min(ch, bgBuf.numberOfChannels - 1)

    const voiceData = voiceBuf.getChannelData(vCh)
    const bgData    = bgBuf.getChannelData(bCh)
    const out       = outBuf.getChannelData(ch)

    for (let i = 0; i < outLen; i++) {
      // Loop background
      const bgSample = bgData[i % bgData.length]
      const vSample  = voiceData[i] ?? 0

      // Cosine fade-out envelope over the last fadeLen samples
      let envelope = 1
      if (i >= fadeStart) {
        const t = (i - fadeStart) / fadeLen   // 0 → 1
        envelope = 0.5 * (1 + Math.cos(Math.PI * t))  // 1 → 0
      }

      const mixed = (vSample * voiceVolume + bgSample * bgVolume) * envelope
      out[i] = Math.max(-1, Math.min(1, mixed))
    }
  }

  await ctx.close()
  return encodeWav(outBuf)
}

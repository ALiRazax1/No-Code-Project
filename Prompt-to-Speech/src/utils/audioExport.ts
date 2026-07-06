// ─────────────────────────────────────────────────────────
// utils/audioExport.ts
// Client-side audio trimming, WAV encoding, and ZIP builder.
// No external dependencies.
// ─────────────────────────────────────────────────────────

// ── Trim + export ────────────────────────────────────────
export async function exportTrimmedClip(
  audioUrl:  string,
  startSec:  number,
  endSec:    number,
  filename?: string,
): Promise<void> {
  const response    = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const audioCtx    = new AudioContext()
  const fullBuffer  = await audioCtx.decodeAudioData(arrayBuffer)

  const sr          = fullBuffer.sampleRate
  const startSample = Math.floor(startSec * sr)
  const endSample   = Math.min(Math.floor(endSec * sr), fullBuffer.length)
  const trimLength  = Math.max(0, endSample - startSample)
  if (trimLength === 0) throw new Error('Trim region has zero length.')

  const trimmed = audioCtx.createBuffer(fullBuffer.numberOfChannels, trimLength, sr)
  for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
    trimmed.copyToChannel(
      fullBuffer.getChannelData(ch).slice(startSample, endSample), ch,
    )
  }

  const wavBlob = encodeWav(trimmed)
  const url     = URL.createObjectURL(wavBlob)
  Object.assign(document.createElement('a'), {
    href: url, download: filename ?? `pts-clip-${Date.now()}.wav`,
  }).click()
  URL.revokeObjectURL(url)
  await audioCtx.close()
}

// ── WAV encoder — 16-bit PCM ─────────────────────────────
export function encodeWav(buffer: AudioBuffer): Blob {
  const numCh      = buffer.numberOfChannels
  const numFrames  = buffer.length
  const sr         = buffer.sampleRate
  const blockAlign = numCh * 2
  const dataSize   = numFrames * blockAlign
  const ab         = new ArrayBuffer(44 + dataSize)
  const v          = new DataView(ab)
  const ws = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  ws(0,  'RIFF'); v.setUint32(4, 36 + dataSize, true)
  ws(8,  'WAVE'); ws(12, 'fmt ')
  v.setUint32(16, 16, true);   v.setUint16(20, 1, true)
  v.setUint16(22, numCh, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * blockAlign, true); v.setUint16(32, blockAlign, true)
  v.setUint16(34, 16, true);   ws(36, 'data'); v.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      v.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

// ── CRC-32 (required by ZIP format) ─────────────────────
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    let c = (crc ^ byte) & 0xff
    for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ── Minimal ZIP builder (STORE method, no compression) ───
export interface ZipEntry {
  name: string
  data: Uint8Array
}

export function buildZipBlob(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  const pu32 = (v: DataView, o: number, n: number) => v.setUint32(o, n, true)
  const pu16 = (v: DataView, o: number, n: number) => v.setUint16(o, n, true)

  for (const entry of entries) {
    const name = enc.encode(entry.name)
    const data = entry.data
    const crc  = crc32(data)
    const size = data.length

    // Local file header
    const lh = new DataView(new ArrayBuffer(30 + name.length))
    pu32(lh, 0,  0x04034b50); pu16(lh, 4, 20); pu16(lh, 6, 0)
    pu16(lh, 8,  0);           pu16(lh, 10, 0); pu16(lh, 12, 0)
    pu32(lh, 14, crc);         pu32(lh, 18, size); pu32(lh, 22, size)
    pu16(lh, 26, name.length); pu16(lh, 28, 0)
    new Uint8Array(lh.buffer, 30).set(name)
    localParts.push(new Uint8Array(lh.buffer), data)

    // Central directory entry
    const cd = new DataView(new ArrayBuffer(46 + name.length))
    pu32(cd, 0,  0x02014b50); pu16(cd, 4,  20); pu16(cd, 6,  20)
    pu16(cd, 8,  0);           pu16(cd, 10, 0);  pu16(cd, 12, 0)
    pu16(cd, 14, 0);           pu16(cd, 16, 0);  pu32(cd, 16, crc)
    pu32(cd, 20, size);        pu32(cd, 24, size)
    pu16(cd, 28, name.length); pu16(cd, 30, 0); pu16(cd, 32, 0)
    pu16(cd, 34, 0);           pu16(cd, 36, 0); pu32(cd, 38, 0)
    pu32(cd, 42, localOffset)
    new Uint8Array(cd.buffer, 46).set(name)
    centralParts.push(new Uint8Array(cd.buffer))

    localOffset += 30 + name.length + size
  }

  const cdSize   = centralParts.reduce((s, b) => s + b.length, 0)
  const eocd     = new DataView(new ArrayBuffer(22))
  pu32(eocd, 0, 0x06054b50);         pu16(eocd, 4, 0)
  pu16(eocd, 6, 0);                   pu16(eocd, 8,  entries.length)
  pu16(eocd, 10, entries.length);     pu32(eocd, 12, cdSize)
  pu32(eocd, 16, localOffset);        pu16(eocd, 20, 0)

  return new Blob(
  [...localParts, ...centralParts, new Uint8Array(eocd.buffer)] as BlobPart[],
  { type: 'application/zip' }
);
}

// ─────────────────────────────────────────────────────────
// components/BatchGenerator.tsx
//
// Generates multiple scripts sequentially.
// Each line of the textarea is treated as one script entry.
// Completed audio data (SRT + WAV if real provider) is
// bundled into a ZIP download using buildZipBlob().
//
// Props:
//   onGenerate — async function that calls ttsService with
//                the current voice/language/settings already
//                baked in. BatchGenerator just provides text.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
// @ts-ignore
import { Play, Download, X, CheckCircle, XCircle, Loader, FileText, Upload } from 'lucide-react'
import type { AudioData } from '../types'
import { buildZipBlob } from '../utils/audioExport'

interface BatchItem {
  id:        string
  text:      string
  status:    'pending' | 'generating' | 'done' | 'error'
  audioData?: AudioData
  error?:    string
}

interface BatchGeneratorProps {
  onGenerate: (text: string) => Promise<AudioData>
}

// Build SRT from word timings
function toSRTTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(Math.round((s%1)*1000)).padStart(3,'0')}`
}
function buildSRT(audioData: AudioData): string {
  const C = 5
  return Array.from({ length: Math.ceil(audioData.words.length / C) }, (_, ci) => {
    const chunk = audioData.words.slice(ci * C, ci * C + C)
    return `${ci + 1}\n${toSRTTime(chunk[0].startTime)} --> ${toSRTTime(chunk[chunk.length-1].endTime)}\n${chunk.map(w => w.word).join(' ')}`
  }).join('\n\n')
}

export default function BatchGenerator({ onGenerate }: BatchGeneratorProps) {
  const [rawText,  setRawText]  = useState('')
  const [items,    setItems]    = useState<BatchItem[]>([])
  const [running,  setRunning]  = useState(false)
  const [zipping,  setZipping]  = useState(false)

  // Parse non-empty lines into batch items
  const parsedLines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  function buildItems(): BatchItem[] {
    return parsedLines.map((text, i) => ({
      id: `${Date.now()}-${i}`, text, status: 'pending',
    }))
  }

  const updateItem = useCallback((id: string, patch: Partial<BatchItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  async function handleGenerateAll() {
    if (!parsedLines.length || running) return
    const freshItems = buildItems()
    setItems(freshItems)
    setRunning(true)

    for (const item of freshItems) {
      updateItem(item.id, { status: 'generating' })
      try {
        const audioData = await onGenerate(item.text)
        updateItem(item.id, { status: 'done', audioData })
      } catch (err) {
        updateItem(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed',
        })
      }
    }
    setRunning(false)
  }

  async function handleDownloadAll() {
    const doneItems = items.filter(it => it.status === 'done' && it.audioData)
    if (!doneItems.length) return
    setZipping(true)

    try {
      const enc     = new TextEncoder()
      const entries: import('../utils/audioExport').ZipEntry[] = []

      for (let i = 0; i < doneItems.length; i++) {
        const item = doneItems[i]
        const ad   = item.audioData!
        const slug = `line-${String(i + 1).padStart(2, '0')}`

        // Always include SRT
        entries.push({ name: `${slug}.srt`, data: enc.encode(buildSRT(ad)) })

        // Include WAV if real audio URL available
        if (ad.audioUrl) {
          const res = await fetch(ad.audioUrl)
          const ab  = await res.arrayBuffer()
          entries.push({ name: `${slug}.mp3`, data: new Uint8Array(ab) })
        }

        // Include transcript text
        entries.push({
          name: `${slug}.txt`,
          data: enc.encode(ad.text),
        })
      }

      // README
      const readme = `Prompt to Speech — Batch Export\nGenerated: ${new Date().toLocaleString()}\nLines: ${doneItems.length}\n`
      entries.unshift({ name: 'README.txt', data: enc.encode(readme) })

      const zip = buildZipBlob(entries)
      const url = URL.createObjectURL(zip)
      Object.assign(document.createElement('a'), {
        href: url, download: `pts-batch-${Date.now()}.zip`,
      }).click()
      URL.revokeObjectURL(url)
    } finally {
      setZipping(false)
    }
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setRawText(reader.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const doneCount    = items.filter(i => i.status === 'done').length
  const errorCount   = items.filter(i => i.status === 'error').length
  const hasRealAudio = items.some(i => i.audioData?.audioUrl)
  const allDone      = items.length > 0 && !running

  return (
    <div className="flex flex-col gap-4">
      {/* Instructions */}
      <p className="text-[12px] leading-relaxed text-[#2e2e48]">
        One script per line. Each line generates a separate audio clip.
        Blank lines are ignored.
      </p>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={"Welcome to our product.\nThis is the second clip.\nThank you for listening."}
          disabled={running}
          rows={6}
          className="block w-full resize-y rounded-xl border border-[#14142a] bg-[#06060f] px-4 py-3.5 text-sm leading-[1.75] text-[#c0c0de] placeholder-[#1a1a28] outline-none transition-all focus:border-[rgba(99,102,241,0.45)] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)] disabled:opacity-50"
        />
        {/* Line count badge */}
        {parsedLines.length > 0 && (
          <span className="absolute bottom-3 right-3 rounded-md bg-[#12122a] px-1.5 py-0.5 font-mono text-[10px] text-[#3d3d58]">
            {parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Upload .txt */}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a1a2c] bg-[#0c0c18] px-3 py-2 text-[12px] font-medium text-[#4a4a68] transition-colors hover:border-[#242438] hover:text-[#9ca3af]">
          <Upload size={13} />
          Upload .txt
          <input type="file" accept=".txt" className="hidden" onChange={handleUploadFile} />
        </label>

        {/* Generate All */}
        <button
          onClick={handleGenerateAll}
          disabled={!parsedLines.length || running}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #5a5df0, #7c3aed)',
            boxShadow:  '0 3px 12px rgba(99,102,241,0.3)',
          }}
        >
          {running
            ? <><span className="spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />Generating…</>
            : <><Play size={13} fill="white" />Generate All</>}
        </button>

        {/* Download ZIP */}
        {allDone && doneCount > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={zipping}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.08)] px-3 py-2 text-[12px] font-medium text-[#a5b4fc] transition-all hover:border-[rgba(99,102,241,0.5)]"
          >
            {zipping
              ? <><span className="spin h-3 w-3 rounded-full border-2 border-[#a5b4fc]/30 border-t-[#a5b4fc]" />Zipping…</>
              : <><Download size={13} />Download ZIP ({doneCount} {hasRealAudio ? '+ audio' : 'SRT'})</>}
          </button>
        )}
      </div>

      {/* Progress list */}
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* Summary bar */}
          <div className="mb-1 flex items-center gap-3 text-[11px] text-[#2e2e48]">
            <span className="text-[#34d399]">{doneCount} done</span>
            {errorCount > 0 && <span className="text-[#f87171]">{errorCount} failed</span>}
            {running && <span className="text-[#818cf8]">Generating…</span>}
          </div>

          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors"
              style={{
                borderColor:
                  item.status === 'done'       ? 'rgba(52,211,153,0.15)'  :
                  item.status === 'error'      ? 'rgba(248,113,113,0.15)' :
                  item.status === 'generating' ? 'rgba(99,102,241,0.25)'  :
                  '#0e0e1e',
                background:
                  item.status === 'done'       ? 'rgba(52,211,153,0.04)'  :
                  item.status === 'error'      ? 'rgba(248,113,113,0.04)' :
                  item.status === 'generating' ? 'rgba(99,102,241,0.06)'  :
                  '#0a0a14',
              }}
            >
              {/* Status icon */}
              <span className="mt-[2px] shrink-0">
                {item.status === 'done'       && <CheckCircle size={14} color="#34d399" />}
                {item.status === 'error'      && <XCircle    size={14} color="#f87171" />}
                {item.status === 'generating' && <Loader     size={14} color="#818cf8" className="spin" />}
                {item.status === 'pending'    && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#1a1a2c] text-[9px] font-bold text-[#2e2e48]">
                    {idx + 1}
                  </span>
                )}
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[#6b6b80]">{item.text}</p>
                {item.status === 'done' && item.audioData && (
                  <p className="mt-0.5 text-[11px] text-[#2e2e48]">
                    {item.audioData.words.length} words ·{' '}
                    {Math.ceil(item.audioData.duration)}s
                    {item.audioData.audioUrl && ' · MP3 ready'}
                  </p>
                )}
                {item.status === 'error' && (
                  <p className="mt-0.5 text-[11px] text-[#f87171]">{item.error}</p>
                )}
              </div>

              {/* Per-item SRT download when done */}
              {item.status === 'done' && item.audioData && (
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([buildSRT(item.audioData!)], { type: 'text/plain' })
                    )
                    Object.assign(document.createElement('a'), {
                      href: url, download: `pts-line-${idx + 1}.srt`,
                    }).click()
                    URL.revokeObjectURL(url)
                  }}
                  title="Download SRT"
                  className="shrink-0 text-[#2e2e48] transition-colors hover:text-[#6366f1]"
                >
                  <FileText size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

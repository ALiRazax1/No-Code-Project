// ─────────────────────────────────────────────────────────
// components/PronunciationDict.tsx
//
// Word → replacement substitution panel.
// Entries are applied client-side before the text is sent
// to the TTS API, letting users fix brand names, acronyms,
// or tricky pronunciations without touching SSML.
//
// Example: "API" → "A P I",  "Nguyen" → "Win"
// ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { Plus, X, BookOpen, ChevronDown } from 'lucide-react'
import type { PronunciationEntry } from '../types'

interface PronunciationDictProps {
  entries:   PronunciationEntry[]
  onChange:  (entries: PronunciationEntry[]) => void
}

export default function PronunciationDict({ entries, onChange }: PronunciationDictProps) {
  const [open,    setOpen]    = useState(false)
  const [word,    setWord]    = useState('')
  const [replace, setReplace] = useState('')
  const [error,   setError]   = useState('')

  function handleAdd() {
    const w = word.trim()
    const r = replace.trim()
    if (!w) { setError('Word is required.'); return }
    if (!r) { setError('Replacement is required.'); return }
    if (entries.some(e => e.word.toLowerCase() === w.toLowerCase())) {
      setError(`"${w}" already exists — remove it first.`)
      return
    }
    onChange([...entries, { id: Date.now().toString(), word: w, replacement: r }])
    setWord(''); setReplace(''); setError('')
  }

  function handleRemove(id: string) {
    onChange(entries.filter(e => e.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="rounded-[16px] border border-[#14142a] bg-[#08080f]">

      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={14} color="#3d3d58" />
          <span className="text-[12px] font-semibold text-[#3d3d58]">
            Pronunciation Dictionary
          </span>
          {entries.length > 0 && (
            <span className="rounded-full bg-[rgba(99,102,241,0.15)] px-1.5 py-[1px] text-[10px] font-semibold text-[#6366f1]">
              {entries.length}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          color="#2e2e48"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {open && (
        <div className="border-t border-[#0e0e1e] px-5 pb-4 pt-3">
          <p className="mb-3 text-[12px] leading-relaxed text-[#2e2e48]">
            Substitutions are applied before sending to the API.
            Matched as whole words, case-insensitive.
          </p>

          {/* Add entry form */}
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={word}
              onChange={e => { setWord(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Word or phrase"
              className="flex-1 rounded-lg border border-[#14142a] bg-[#06060f] px-3 py-2 text-[12px] text-[#c0c0de] placeholder-[#1e1e30] outline-none transition-all focus:border-[rgba(99,102,241,0.4)] focus:ring-1 focus:ring-[rgba(99,102,241,0.12)]"
            />
            <span className="shrink-0 text-[11px] text-[#1e1e30]">→</span>
            <input
              type="text"
              value={replace}
              onChange={e => { setReplace(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Replacement"
              className="flex-1 rounded-lg border border-[#14142a] bg-[#06060f] px-3 py-2 text-[12px] text-[#c0c0de] placeholder-[#1e1e30] outline-none transition-all focus:border-[rgba(99,102,241,0.4)] focus:ring-1 focus:ring-[rgba(99,102,241,0.12)]"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
              title="Add entry (Enter)"
            >
              <Plus size={15} />
            </button>
          </div>

          {error && <p className="mb-2 text-[11px] text-[#f87171]">{error}</p>}

          {/* Entry list */}
          {entries.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {entries.map(e => (
                <li key={e.id}
                  className="flex items-center gap-2 rounded-lg border border-[#0e0e1e] bg-[#0c0c18] px-3 py-2">
                  <code className="flex-1 text-[12px] text-[#6b6b80]">{e.word}</code>
                  <span className="text-[10px] text-[#1e1e30]">→</span>
                  <code className="flex-1 text-[12px] text-[#a5b4fc]">{e.replacement}</code>
                  <button
                    type="button"
                    onClick={() => handleRemove(e.id)}
                    className="shrink-0 text-[#2e2e48] transition-colors hover:text-[#f87171]"
                    aria-label={`Remove ${e.word}`}
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-[11px] text-[#1a1a28]">
              No entries yet. Add one above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// components/SSMLToolbar.tsx
//
// SSML mode toggle + tag-insertion helpers.
// When SSML mode is active the textarea accepts raw SSML
// markup and the toolbar provides one-click snippet buttons
// that insert (or wrap selected text) at the cursor.
//
// Cursor-aware insertion is handled here by reading
// selectionStart / selectionEnd from the passed textareaRef.
// ─────────────────────────────────────────────────────────

import type { RefObject } from 'react'
import { Code2 } from 'lucide-react'

interface SSMLToolbarProps {
  active:         boolean
  onToggle:       () => void
  textareaRef:    RefObject<HTMLTextAreaElement | null>
  prompt:         string
  onPromptChange: (text: string) => void
}

interface Snippet {
  label:  string
  title:  string
  before: string
  after:  string   // empty string = self-closing tag
}

const SNIPPETS: Snippet[] = [
  { label: '⏸ Break',    title: 'Insert 500ms pause',              before: '<break time="500ms"/>',                  after: ''   },
  { label: '💪 Strong',  title: 'Strong emphasis on selection',    before: '<emphasis level="strong">',              after: '</emphasis>'   },
  { label: '🐢 Slow',    title: 'Slow prosody on selection',       before: '<prosody rate="slow">',                  after: '</prosody>'    },
  { label: '🐇 Fast',    title: 'Fast prosody on selection',       before: '<prosody rate="fast">',                  after: '</prosody>'    },
  { label: '🔊 Loud',    title: 'Louder prosody on selection',     before: '<prosody volume="loud">',                after: '</prosody>'    },
  { label: '🔤 Spell',   title: 'Spell out characters in selection', before: '<say-as interpret-as="characters">',   after: '</say-as>'     },
]

export default function SSMLToolbar({
  active,
  onToggle,
  textareaRef,
  prompt,
  onPromptChange,
}: SSMLToolbarProps) {

  function insertSnippet(before: string, after: string) {
    const el = textareaRef.current
    if (!el) return

    const start    = el.selectionStart
    const end      = el.selectionEnd
    const selected = prompt.slice(start, end)

    // Self-closing tag: just insert at cursor (ignore selection)
    // Wrapper tag: wrap the selection (or insert both tags at cursor)
    const inserted =
      after === ''
        ? before
        : before + selected + after

    const newText = prompt.slice(0, start) + inserted + prompt.slice(end)
    onPromptChange(newText)

    // Restore cursor / selection after React updates the textarea
    requestAnimationFrame(() => {
      el.focus()
      if (after === '') {
        // Place cursor after the self-closing tag
        el.setSelectionRange(start + before.length, start + before.length)
      } else {
        // Select the wrapped text so the user can see what changed
        el.setSelectionRange(start + before.length, start + before.length + selected.length)
      }
    })
  }

  return (
    <div className="mb-2">
      {/* Mode toggle row */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150"
          style={{
            borderColor: active ? 'rgba(99,102,241,0.4)' : '#1a1a2c',
            background:  active ? 'rgba(99,102,241,0.1)' : '#0c0c18',
            color:       active ? '#a5b4fc'               : '#3d3d58',
          }}
        >
          <Code2 size={12} />
          SSML {active ? 'ON' : 'OFF'}
        </button>

        {active && (
          <span className="text-[11px] text-[#2e2e48]">
            Text will be wrapped in{' '}
            <code className="rounded bg-[#12122a] px-1 text-[#6366f1]">&lt;speak&gt;</code>
          </span>
        )}
      </div>

      {/* Tag insertion buttons — only visible when active */}
      {active && (
        <div className="flex flex-wrap gap-1.5">
          {SNIPPETS.map(s => (
            <button
              key={s.label}
              type="button"
              title={s.title}
              onClick={() => insertSnippet(s.before, s.after)}
              className="rounded-md border border-[#1a1a2c] bg-[#0c0c18] px-2.5 py-1 text-[11px] text-[#4a4a68] transition-colors hover:border-[rgba(99,102,241,0.3)] hover:bg-[rgba(99,102,241,0.06)] hover:text-[#a5b4fc]"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

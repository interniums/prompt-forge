'use client'

import Link from 'next/link'
import { useState } from 'react'

const textButtonClass =
  'cursor-pointer bg-transparent px-0 py-0 text-[11px] text-zinc-500 font-mono underline-offset-4 hover:text-zinc-100 hover:underline'

export function FastEasyShell() {
  const [value, setValue] = useState('')
  const [isListening, setIsListening] = useState(false)

  function submitCurrent() {
    const line = value.trim()
    if (!line) return
    // TODO: wire "line" into Fast & Easy pipeline
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      // Plain Enter submits instead of inserting a newline
      e.preventDefault()
      submitCurrent()
    }
    // Cmd/Ctrl+Enter: allow default newline behavior
  }

  function handleVoiceClick() {
    setIsListening((prev) => !prev)
  }

  return (
    <div className="mx-auto flex h-[60vh] w-[80vw] max-w-5xl flex-col gap-3 rounded-2xl border border-zinc-800/70 bg-[#020617] p-4 shadow-[0_0_140px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <Link
          href="/workspace"
          className={textButtonClass}
        >
          Workspace
        </Link>
      </div>

      <form onSubmit={handleFormSubmit} className="relative flex-1 text-[14px]">
        <div className="absolute inset-0 overflow-hidden border-t border-zinc-800 bg-[#020617] pt-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="give us context to create a prompt"
            className="h-full w-full resize-none bg-transparent px-3 pb-3 text-[15px] leading-relaxed text-zinc-50 outline-none placeholder:text-zinc-600 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleVoiceClick}
          aria-pressed={isListening}
          className={`absolute right-3 top-3 ${textButtonClass}`}
        >
          {isListening ? 'Listening' : 'Mic'}
        </button>

        <button
          type="submit"
          className={`absolute bottom-3 right-3 ${textButtonClass}`}
        >
          Press Enter or click here to submit
        </button>
      </form>
    </div>
  )
}

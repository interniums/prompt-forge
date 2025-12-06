'use client'

import React from 'react'

export type TerminalInputBarProps = {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  disabled?: boolean
}

export function TerminalInputBar({
  value,
  onChange,
  onKeyDown,
  placeholder,
  inputRef,
  disabled = false,
}: TerminalInputBarProps) {
  return (
    <div className="border-t border-slate-800 bg-[#050608]">
      <label htmlFor="terminal-input" className="sr-only">
        Terminal input - Enter commands or describe your task
      </label>
      <textarea
        id="terminal-input"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Terminal input"
        aria-describedby="terminal-input-hint"
        className="terminal-input h-16 w-full resize-none bg-transparent px-3 pb-3 pt-2 text-[17px] leading-relaxed text-slate-50 outline-none placeholder:text-slate-500 font-mono"
      />
      <span id="terminal-input-hint" className="sr-only">
        Press Enter to submit, Ctrl+Enter for a new line
      </span>
    </div>
  )
}

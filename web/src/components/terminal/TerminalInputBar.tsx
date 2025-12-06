'use client'

import React from 'react'

export type TerminalInputBarProps = {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  inputRef: React.RefObject<HTMLTextAreaElement>
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
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="terminal-input h-16 w-full resize-none bg-transparent px-3 pb-3 pt-2 text-[15px] leading-relaxed text-slate-50 outline-none placeholder:text-slate-500 font-mono"
      />
    </div>
  )
}

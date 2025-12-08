'use client'

import React from 'react'
import { terminalInputContainerClass } from '@/features/terminal/styles'

export type TerminalInputBarProps = {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  disabled?: boolean
  isGenerating: boolean
  onSubmit: () => void
  onStop: () => void
  onVoiceClick?: () => void
  voiceAvailable?: boolean
}

export function TerminalInputBar({
  value,
  onChange,
  onKeyDown,
  placeholder,
  inputRef,
  disabled = false,
  isGenerating,
  onSubmit,
  onStop,
  onVoiceClick,
  voiceAvailable = true,
}: TerminalInputBarProps) {
  return (
    <div className={terminalInputContainerClass}>
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
        className="terminal-input h-[44px] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[16px] leading-[1.4] text-slate-100 placeholder:text-slate-500 outline-none font-mono"
      />
      <span id="terminal-input-hint" className="sr-only">
        Enter to generate, Shift+Enter for a new line
      </span>
      <div className="flex items-center gap-2">
        {voiceAvailable && (
          <button
            type="button"
            aria-label="Voice input (coming soon)"
            title="Voice input (coming soon). Use typing for now."
            className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950 text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
            onClick={onVoiceClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" strokeWidth={1.6} strokeLinecap="round" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" strokeWidth={1.6} strokeLinecap="round" />
              <path d="M12 19v3" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          aria-busy={isGenerating}
          aria-label={isGenerating ? 'Stop' : 'Generate'}
          onClick={() => {
            if (isGenerating) {
              onStop()
            } else {
              onSubmit()
            }
          }}
          className={`inline-flex h-[44px] w-[48px] cursor-pointer items-center justify-center rounded-lg px-0 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
            isGenerating
              ? 'border border-slate-700/80 bg-slate-800 text-slate-50 hover:bg-slate-700'
              : 'border border-slate-700/80 bg-slate-950 text-slate-200 hover:border-slate-500 hover:text-slate-50'
          }`}
        >
          {isGenerating ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect x="7" y="7" width="10" height="10" rx="1.5" strokeWidth={1.6} />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 20l16-8L4 4v5l10 3-10 3v5z" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="sr-only">{isGenerating ? 'Stop' : 'Generate'}</span>
        </button>
      </div>
    </div>
  )
}

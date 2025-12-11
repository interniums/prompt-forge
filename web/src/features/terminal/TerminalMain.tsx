'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { TerminalInputBar } from '@/components/terminal/TerminalInputBar'
import { terminalMainSurfaceClass } from './styles'

const TerminalOutputAreaLazy = dynamic(
  () => import('@/components/terminal/TerminalOutputArea').then((m) => m.TerminalOutputArea),
  {
    ssr: false,
    loading: () => <div className="flex-1" />,
  }
)

type TerminalMainProps = {
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  outputProps: React.ComponentProps<typeof TerminalOutputAreaLazy>
  inputProps: {
    value: string
    onChange: (value: string) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => void
    placeholder: string
    inputRef: React.RefObject<HTMLTextAreaElement | null>
    disabled: boolean
    onBack?: () => void
    showBack?: boolean
  }
  onSubmit: () => void
  onStop: () => void
  isGenerating: boolean
  onVoiceClick?: () => void
  voiceAvailable?: boolean
}

export function TerminalMain({
  onFormSubmit,
  outputProps,
  inputProps,
  onSubmit,
  onStop,
  isGenerating,
  onVoiceClick,
  voiceAvailable = true,
}: TerminalMainProps) {
  return (
    <form onSubmit={onFormSubmit} className="relative flex-1 text-sm">
      <div className={terminalMainSurfaceClass}>
        <div className="mx-2">
          <div className="border-t border-slate-600" aria-hidden="true" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl">
          <TerminalOutputAreaLazy {...outputProps} />
          <div className="border-t border-slate-600 bg-slate-950 pt-3 px-2 rounded-b-2xl mx-2">
            <TerminalInputBar
              value={inputProps.value}
              onChange={inputProps.onChange}
              onKeyDown={inputProps.onKeyDown}
              placeholder={inputProps.placeholder}
              inputRef={inputProps.inputRef}
              disabled={inputProps.disabled}
              isGenerating={isGenerating}
              onSubmit={onSubmit}
              onStop={onStop}
              onVoiceClick={onVoiceClick}
              voiceAvailable={voiceAvailable}
              onBack={inputProps.onBack}
              showBack={inputProps.showBack}
            />
          </div>
        </div>
      </div>
    </form>
  )
}

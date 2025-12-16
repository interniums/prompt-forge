'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { TerminalInputBar } from '@/components/terminal/TerminalInputBar'

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
    onFocus?: () => void
    placeholder: string
    inputRef: React.RefObject<HTMLTextAreaElement | null>
    disabled: boolean
    onBack?: () => void
    showBack?: boolean
  }
  onSubmit: () => void
  onStop: () => void
  isGenerating: boolean
  /** Called when mic button is clicked while NOT listening (to start) */
  onVoiceStart?: () => void
  /** Called when stop button is clicked while listening (to stop) */
  onVoiceStop?: () => void
  /** Whether voice input is currently active (listening) */
  isVoiceListening?: boolean
  /** Whether voice input is supported in this browser */
  voiceSupported?: boolean
}

export function TerminalMain({
  onFormSubmit,
  outputProps,
  inputProps,
  onSubmit,
  onStop,
  isGenerating,
  onVoiceStart,
  onVoiceStop,
  isVoiceListening = false,
  voiceSupported = true,
}: TerminalMainProps) {
  return (
    <form onSubmit={onFormSubmit} className="relative h-full flex flex-col">
      {/* Scrollable content area - content scrolls behind header and input */}
      <div className="flex-1 overflow-hidden">
        <TerminalOutputAreaLazy {...outputProps} />
      </div>

      {/* Input bar - fixed at bottom, centered, floating, content scrolls behind */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none">
        {/* Bottom safe area - blocks scroll behind this zone */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-transparent" />
        <div
          className="pointer-events-auto w-full max-w-2xl safe-px relative z-10"
          style={{ paddingBottom: 'calc(1.5rem + var(--pf-safe-bottom))' }}
        >
          <TerminalInputBar
            value={inputProps.value}
            onChange={inputProps.onChange}
            onKeyDown={inputProps.onKeyDown}
            onFocus={inputProps.onFocus}
            placeholder={inputProps.placeholder}
            inputRef={inputProps.inputRef}
            disabled={inputProps.disabled}
            isGenerating={isGenerating}
            onSubmit={onSubmit}
            onStop={onStop}
            onVoiceStart={onVoiceStart}
            onVoiceStop={onVoiceStop}
            isVoiceListening={isVoiceListening}
            voiceSupported={voiceSupported}
            onBack={inputProps.onBack}
            showBack={inputProps.showBack}
          />
        </div>
      </div>
    </form>
  )
}

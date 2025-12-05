'use client'

import React from 'react'
import { textButtonClass } from './styles'

export type TerminalChromeButtonsProps = {
  isListening: boolean
  isGenerating: boolean
  onToggleListening: () => void
  onStop: () => void
  onSubmit: () => void
}

export function TerminalChromeButtons({
  isListening,
  isGenerating,
  onToggleListening,
  onStop,
  onSubmit,
}: TerminalChromeButtonsProps) {
  return (
    <>
      {/* Mic / listening button hidden for now; will be reintroduced later. */}

      <button
        type="button"
        onClick={() => {
          if (isGenerating) {
            onStop()
          } else {
            onSubmit()
          }
        }}
        className={`absolute bottom-3 right-3 ${textButtonClass} transition-colors duration-200 ${
          isGenerating ? 'text-emerald-300 hover:text-emerald-200 animate-pulse' : ''
        }`}
      >
        {isGenerating ? 'Stop AI' : 'Press Enter or click here to submit'}
      </button>
    </>
  )
}

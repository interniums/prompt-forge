'use client'

import { useMemo } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { TerminalShellView } from '@/features/terminal/TerminalShellView'
import { TerminalMain } from '@/features/terminal/TerminalMain'
import type { ToastType } from '@/hooks/useToast'

type UseTerminalLayoutDeps = {
  toastMessage: string | null
  toastType?: ToastType
  onToastClose?: () => void
  header: ReactNode
  panels: ReactNode
  outputProps: ComponentProps<typeof TerminalMain>['outputProps']
  inputProps: ComponentProps<typeof TerminalMain>['inputProps']
  onFormSubmit: ComponentProps<typeof TerminalMain>['onFormSubmit']
  onSubmit: ComponentProps<typeof TerminalMain>['onSubmit']
  onStop: ComponentProps<typeof TerminalMain>['onStop']
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

export function useTerminalLayout({
  toastMessage,
  toastType,
  onToastClose,
  header,
  panels,
  outputProps,
  inputProps,
  onFormSubmit,
  onSubmit,
  onStop,
  isGenerating,
  onVoiceStart,
  onVoiceStop,
  isVoiceListening = false,
  voiceSupported = true,
}: UseTerminalLayoutDeps): React.ReactNode {
  return useMemo(
    () => (
      <TerminalShellView
        toastMessage={toastMessage}
        toastType={toastType}
        onToastClose={onToastClose}
        header={header}
        panels={panels}
        main={
          <TerminalMain
            onFormSubmit={onFormSubmit}
            outputProps={outputProps}
            inputProps={inputProps}
            onSubmit={onSubmit}
            onStop={onStop}
            isGenerating={isGenerating}
            onVoiceStart={onVoiceStart}
            onVoiceStop={onVoiceStop}
            isVoiceListening={isVoiceListening}
            voiceSupported={voiceSupported}
          />
        }
      />
    ),
    [
      header,
      inputProps,
      isGenerating,
      isVoiceListening,
      onFormSubmit,
      onStop,
      onSubmit,
      onVoiceStart,
      onVoiceStop,
      outputProps,
      panels,
      toastMessage,
      toastType,
      onToastClose,
      voiceSupported,
    ]
  )
}

'use client'

import React from 'react'
import { CenteredToast } from '@/components/terminal/CenteredToast'
import type { ToastType } from '@/hooks/useToast'

type TerminalShellViewProps = {
  toastMessage: string | null
  toastType?: ToastType
  onToastClose?: () => void
  header: React.ReactNode
  panels: React.ReactNode
  main: React.ReactNode
}

export function TerminalShellView({
  toastMessage,
  toastType,
  onToastClose,
  header,
  panels,
  main,
}: TerminalShellViewProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden" role="main" aria-label="PromptForge">
      <CenteredToast message={toastMessage} type={toastType} onClose={onToastClose} />
      {/* Header - fixed at top, transparent, content scrolls behind */}
      <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="pointer-events-auto">{header}</div>
      </div>
      {/* Panels (modals, preferences, etc.) */}
      {panels}
      {/* Main content - fills entire screen, scrolls behind header and input */}
      <div className="h-full w-full">{main}</div>
    </div>
  )
}

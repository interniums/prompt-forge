'use client'

import React from 'react'
import { CenteredToast } from '@/components/terminal/CenteredToast'

type TerminalShellViewProps = {
  toastMessage: string | null
  header: React.ReactNode
  panels: React.ReactNode
  main: React.ReactNode
}

export function TerminalShellView({ toastMessage, header, panels, main }: TerminalShellViewProps) {
  return (
    <div
      className="relative mx-auto flex h-[70vh] w-[92vw] max-w-6xl flex-col gap-3 rounded-2xl bg-[#050608] p-4 shadow-[0_0_160px_rgba(15,23,42,0.95)]"
      role="region"
      aria-label="PromptForge Terminal"
    >
      <CenteredToast message={toastMessage} />
      {header}
      {panels}
      {main}
    </div>
  )
}

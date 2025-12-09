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
      className="relative mx-auto flex h-[78vh] w-[1280px] max-w-[1600px] flex-col items-stretch rounded-2xl bg-slate-950 shadow-[0_0_160px_rgba(15,23,42,0.95)]"
      role="region"
      aria-label="Prompt Terminal"
    >
      <CenteredToast message={toastMessage} />
      <div className="flex flex-1 min-h-0 w-full flex-col">
        {header}
        {panels}
        {main}
      </div>
    </div>
  )
}

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
      className="relative mx-auto flex h-[78vh] w-[1280px] max-w-[1600px] flex-col items-stretch rounded-2xl border border-slate-800/70 bg-slate-950 ring-1 ring-slate-900/60 shadow-[0_24px_70px_rgba(0,0,0,0.45),0_0_140px_rgba(15,23,42,0.8)]"
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

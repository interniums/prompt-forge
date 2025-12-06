'use client'

import React from 'react'
import { textButtonClass } from './styles'

export type TerminalHeaderProps = {
  headerHelpShown: boolean
  onHelpClick: () => void
}

export function TerminalHeader({ headerHelpShown, onHelpClick }: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between text-[13px] text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <button type="button" onClick={onHelpClick} disabled={headerHelpShown} className={textButtonClass}>
        Type /help to show available commands
      </button>
    </div>
  )
}

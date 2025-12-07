'use client'

import React from 'react'

export type TerminalHeaderProps = {
  onProfileClick: () => void
}

export function TerminalHeader({ onProfileClick }: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between text-[13px] text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <button
        type="button"
        onClick={onProfileClick}
        className="group flex items-center gap-1.5 cursor-pointer px-1.5 py-1 text-sm font-mono text-slate-300 underline-offset-4 transition-colors hover:text-slate-50 hover:underline"
        title="User profile"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>Account</span>
      </button>
    </div>
  )
}

'use client'

import type { ThemeName } from '@/lib/types'
import { Sun, Moon, CloudSun } from 'lucide-react'

export type TerminalHeaderProps = {
  onProfileClick: () => void
  onSettingsClick: () => void
  theme: ThemeName
  onThemeChange: (theme: ThemeName) => void
}

const headerButtonClass =
  'group inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg border border-slate-700/80 bg-slate-950 text-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950'

const themeOrder: ThemeName[] = ['light', 'dim', 'dark']

export function TerminalHeader({ onProfileClick, onSettingsClick, theme, onThemeChange }: TerminalHeaderProps) {
  return (
    <div className="flex flex-col gap-2 text-[13px] text-slate-400 sm:flex-row sm:items-center sm:justify-between pt-4 px-4 z-10 pb-4">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
          {themeOrder.map((option) => {
            const isActive = option === theme
            const label = option === 'light' ? 'Light' : option === 'dim' ? 'Dim' : 'Dark'
            return (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  isActive ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
                aria-label={`Switch to ${label} theme`}
              >
                {option === 'light' && <Sun className="h-3.5 w-3.5" />}
                {option === 'dim' && <CloudSun className="h-3.5 w-3.5" />}
                {option === 'dark' && <Moon className="h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={onSettingsClick} className={headerButtonClass} title="Preferences">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.997.608 2.296.07 2.573-1.065Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button type="button" onClick={onProfileClick} className={headerButtonClass} title="User profile">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

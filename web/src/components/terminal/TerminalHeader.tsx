'use client'

import Link from 'next/link'
import type { ThemeName } from '@/lib/types'
import { Sun, Moon, CloudSun, FileText } from 'lucide-react'

export type TerminalHeaderProps = {
  onProfileClick: () => void
  onSettingsClick: () => void
  onHistoryClick?: () => void
  historyOpen?: boolean
  theme: ThemeName
  onThemeChange: (theme: ThemeName) => void
}

const headerButtonClass =
  'group inline-flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-[color:var(--pf-foreground-muted)] transition hover:bg-[color-mix(in_oklab,var(--pf-background)_85%,var(--pf-foreground)_15%)] hover:text-[color:var(--pf-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pf-background)]'

const themeOrder: ThemeName[] = ['light', 'dim', 'dark']

export function TerminalHeader({
  onProfileClick,
  onSettingsClick,
  onHistoryClick,
  historyOpen = false,
  theme,
  onThemeChange,
}: TerminalHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 sm:px-6">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-cyan-500 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-lg font-semibold hidden sm:block text-[color:var(--pf-foreground)]">PromptForge</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Theme switcher */}
        <div
          className="flex items-center gap-0.5 rounded-full border border-[color:var(--pf-border)] px-1 py-1"
          style={{
            background: 'color-mix(in oklab, var(--pf-background) 90%, var(--pf-foreground) 10%)',
          }}
        >
          {themeOrder.map((option) => {
            const isActive = option === theme
            const label = option === 'light' ? 'Light' : option === 'dim' ? 'Dim' : 'Dark'
            return (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer shadow-sm`}
                style={{
                  color: isActive ? 'var(--pf-foreground)' : 'var(--pf-foreground-muted)',
                  backgroundColor: isActive
                    ? 'color-mix(in oklab, var(--accent) 18%, var(--pf-surface-strong))'
                    : 'transparent',
                  border: isActive ? '1px solid var(--pf-border-strong)' : '1px solid transparent',
                }}
                aria-label={`Switch to ${label} theme`}
              >
                {option === 'light' && <Sun className="h-3.5 w-3.5" />}
                {option === 'dim' && <CloudSun className="h-3.5 w-3.5" />}
                {option === 'dark' && <Moon className="h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>

        {onHistoryClick && (
          <button
            type="button"
            onClick={onHistoryClick}
            className={`${headerButtonClass} ${historyOpen ? 'bg-[color-mix(in_oklab,var(--pf-background)_80%,var(--pf-foreground)_20%)] text-[color:var(--pf-foreground)] shadow-[0_6px_16px_color-mix(in_oklab,#000_18%,transparent)]' : ''}`}
            aria-pressed={historyOpen}
            title="Prompt history"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M12 6v6l3 3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>
        )}

        {/* Legal */}
        <Link
          href="/legal"
          className={headerButtonClass}
          title="Legal & policies"
          aria-label="Open legal and policy links"
        >
          <FileText className="h-5 w-5" />
        </Link>

        {/* Settings */}
        <button type="button" onClick={onSettingsClick} className={headerButtonClass} title="Preferences">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.997.608 2.296.07 2.573-1.065Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {/* Profile */}
        <button type="button" onClick={onProfileClick} className={headerButtonClass} title="User profile">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

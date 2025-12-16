'use client'

import React from 'react'

type UnclearTaskModalProps = {
  open: boolean
  reason: string
  onEditButtonRef: (el: HTMLButtonElement | null) => void
  onContinueButtonRef: (el: HTMLButtonElement | null) => void
  onDismiss: () => void
  onEdit: () => void
  onContinue: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

export function UnclearTaskModal({
  open,
  reason,
  onEditButtonRef,
  onContinueButtonRef,
  onDismiss,
  onEdit,
  onContinue,
  onKeyDown,
}: UnclearTaskModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div
        className="relative w-full max-w-md space-y-5 rounded-2xl p-6 surface-card-strong ring-1 ring-[color:var(--pf-border-strong)]"
        role="dialog"
        aria-modal="true"
        aria-label="Task looks unclear"
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute right-3 top-3 h-8 w-8 cursor-pointer rounded-full text-[color:var(--pf-foreground-muted)] transition hover:bg-[color-mix(in_oklab,var(--pf-foreground)_12%,var(--pf-background))] hover:text-[color:var(--pf-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pf-background)]"
          onClick={onDismiss}
        >
          <span className="flex h-full w-full items-center justify-center text-lg">×</span>
        </button>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center text-amber-400" aria-hidden>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v4" strokeLinecap="round" />
              <path d="M12 17h.01" strokeLinecap="round" />
              <path
                d="M10.29 3.86 2.82 18a1 1 0 0 0 .87 1.5h16.62a1 1 0 0 0 .87-1.5l-7.47-14.14a1 1 0 0 0-1.78 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <div className="text-base font-semibold text-[color:var(--pf-foreground)]">Task looks unclear</div>
            <div className="text-sm text-[color:var(--pf-foreground-muted)]">{reason}</div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            autoFocus
            className="h-[44px] w-full max-w-[180px] cursor-pointer rounded-lg px-4 text-sm font-semibold surface-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--pf-background)]"
            ref={onEditButtonRef}
            onClick={onEdit}
          >
            Edit task
          </button>
          <button
            type="button"
            className="h-[44px] w-full max-w-[180px] cursor-pointer rounded-lg px-4 text-sm font-semibold surface-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--pf-background)]"
            ref={onContinueButtonRef}
            onClick={onContinue}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}

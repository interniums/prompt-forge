'use client'

import React from 'react'

const toastClassName =
  'rounded-lg border border-slate-700/70 bg-slate-950 px-6 py-3 text-sm text-slate-100 shadow-[0_0_10px_rgba(15,23,42,0.5)] font-mono flex items-center gap-2'

export type CenteredToastProps = {
  message: string | null
}

export function CenteredToast({ message }: CenteredToastProps) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
    >
      <div className={toastClassName}>
        <span className="text-slate-100 text-sm" aria-hidden="true">
          ✓
        </span>
        <span>{message}</span>
      </div>
    </div>
  )
}

'use client'

const toastClassName =
  'rounded-xl border border-slate-700/70 bg-slate-950/90 px-5 py-3 text-[15px] text-slate-100 shadow-[0_18px_50px_rgba(8,15,30,0.55)] backdrop-blur-sm font-mono flex items-center gap-3'

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

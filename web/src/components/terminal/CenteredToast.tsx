'use client'

import type { ToastType } from '@/hooks/useToast'

const toastClassName =
  'rounded-xl border border-slate-700/70 bg-slate-950/90 px-5 py-3 text-[15px] text-slate-100 shadow-[0_18px_50px_rgba(8,15,30,0.55)] backdrop-blur-sm font-mono flex items-center gap-3'

export type CenteredToastProps = {
  message: string | null
  type?: ToastType
  onClose?: () => void
}

const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case 'error':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 text-rose-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" strokeLinecap="round" />
          <path d="M12 16h.01" strokeLinecap="round" />
        </svg>
      )
    case 'warning':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      )
    case 'info':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 text-sky-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" strokeLinecap="round" />
          <path d="M12 8h.01" strokeLinecap="round" />
        </svg>
      )
    case 'success':
    default:
      return <span className="shrink-0 text-emerald-400 text-sm">✓</span>
  }
}

export function CenteredToast({ message, type = 'success', onClose }: CenteredToastProps) {
  if (!message) return null

  const isClosable = type === 'error' || type === 'warning'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed left-1/2 top-1/2 z-60 -translate-x-1/2 -translate-y-1/2 ${
        isClosable ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div className={toastClassName}>
        <ToastIcon type={type} />
        <span>{message}</span>
        {isClosable && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 shrink-0 cursor-pointer rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

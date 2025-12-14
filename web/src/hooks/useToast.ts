'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TOAST_DURATION_MS } from '@/lib/constants'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastMessage = {
  text: string
  type: ToastType
}

type UseToastReturn = {
  message: string | null
  /** @deprecated Use toast instead for type support */
  showToast: (message: string) => void
  hideToast: () => void
  /** Full toast data with type */
  toast: ToastMessage | null
  /** Show toast with specific type. Errors/warnings are persistent, others auto-dismiss. */
  showTypedToast: (message: string, type?: ToastType) => void
}

/**
 * A simple toast hook for displaying temporary messages.
 * Supports typed toasts (success, error, warning, info).
 * Error and warning toasts are persistent (require manual close).
 * Success and info toasts auto-dismiss after duration.
 */
export function useToast(duration = TOAST_DURATION_MS): UseToastReturn {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const showTypedToast = useCallback(
    (newMessage: string, type: ToastType = 'success') => {
      setToast({ text: newMessage, type })

      // Clear any existing timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Only auto-dismiss for success and info toasts
      // Error and warning toasts require manual close
      if (type === 'success' || type === 'info') {
        timeoutRef.current = window.setTimeout(() => {
          setToast(null)
          timeoutRef.current = null
        }, duration)
      }
    },
    [duration]
  )

  // Legacy showToast for backwards compatibility - defaults to success
  const showToast = useCallback(
    (newMessage: string) => {
      showTypedToast(newMessage, 'success')
    },
    [showTypedToast]
  )

  const hideToast = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setToast(null)
  }, [])

  return {
    message: toast?.text ?? null,
    showToast,
    hideToast,
    toast,
    showTypedToast,
  }
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TOAST_DURATION_MS } from '@/lib/constants'

type UseToastReturn = {
  message: string | null
  showToast: (message: string) => void
  hideToast: () => void
}

/**
 * A simple toast hook for displaying temporary messages.
 */
export function useToast(duration = TOAST_DURATION_MS): UseToastReturn {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const showToast = useCallback(
    (newMessage: string) => {
      setMessage(newMessage)

      // Clear any existing timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = window.setTimeout(() => {
        setMessage(null)
        timeoutRef.current = null
      }, duration)
    },
    [duration]
  )

  const hideToast = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setMessage(null)
  }, [])

  return { message, showToast, hideToast }
}

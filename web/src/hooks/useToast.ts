'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TOAST_DURATION_MS } from '@/lib/constants'

/**
 * A simple toast hook for displaying temporary messages.
 *
 * @returns {Object} Toast state and controls
 * @returns {string | null} message - Current toast message or null
 * @returns {Function} showToast - Function to display a toast message
 */
export function useToast(duration = TOAST_DURATION_MS) {
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

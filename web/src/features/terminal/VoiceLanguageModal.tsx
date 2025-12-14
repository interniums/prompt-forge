'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { VOICE_LANGUAGE_OPTIONS } from '@/lib/constants'

const modalBackdropClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm'
const modalCardClass =
  'w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
const buttonClass =
  'inline-flex h-[44px] items-center justify-center gap-2 rounded-lg border px-4 text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 cursor-pointer'
const primaryButtonClass = `${buttonClass} border-emerald-600 bg-emerald-600 text-slate-950 hover:bg-emerald-500 hover:border-emerald-500`
const secondaryButtonClass = `${buttonClass} border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-slate-50`

type VoiceLanguageModalProps = {
  open: boolean
  onConfirm: (language: string) => void
  onDismiss: () => void
}

/**
 * Detects the best default voice language based on browser settings.
 * Returns a BCP 47 language tag or 'auto' if we can't detect.
 */
function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'auto'

  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage

  if (!browserLang) return 'auto'

  // Check if we have an exact match in our options
  const exactMatch = VOICE_LANGUAGE_OPTIONS.find((opt) => opt.value === browserLang)
  if (exactMatch) return exactMatch.value

  // Check for base language match (e.g., 'en' matches 'en-US')
  const baseLang = browserLang.split('-')[0]
  const baseMatch = VOICE_LANGUAGE_OPTIONS.find((opt) => opt.value.startsWith(baseLang + '-'))
  if (baseMatch) return baseMatch.value

  return 'auto'
}

export function VoiceLanguageModal({ open, onConfirm, onDismiss }: VoiceLanguageModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => detectBrowserLanguage())
  const [isVisible, setIsVisible] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  // Animate in - sync visibility with open state
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setIsVisible(true))
    return () => {
      cancelAnimationFrame(id)
      setIsVisible(false)
    }
  }, [open])

  // Focus confirm button when modal opens
  useEffect(() => {
    if (open && confirmButtonRef.current) {
      confirmButtonRef.current.focus()
    }
  }, [open])

  const handleConfirm = useCallback(() => {
    onConfirm(selectedLanguage)
  }, [onConfirm, selectedLanguage])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onDismiss()
      }
    },
    [onDismiss]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      } else if (e.key === 'Enter') {
        handleConfirm()
      }
    },
    [handleConfirm, onDismiss]
  )

  if (!open) return null

  const detectedLanguage = detectBrowserLanguage()
  const detectedLabel =
    detectedLanguage === 'auto'
      ? 'Unknown'
      : VOICE_LANGUAGE_OPTIONS.find((opt) => opt.value === detectedLanguage)?.label || detectedLanguage

  return (
    <div
      className={modalBackdropClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-lang-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`${modalCardClass} transform-gpu transition-all duration-200 ease-out ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" strokeWidth={1.6} strokeLinecap="round" />
                  <path d="M12 19v3" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
              </div>
              <h2 id="voice-lang-title" className="text-lg font-semibold text-slate-100">
                Voice Input Language
              </h2>
            </div>
            <p className="text-[14px] text-slate-400">
              Which language will you speak? This helps voice recognition work accurately.
            </p>
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <label htmlFor="voice-language-select" className="text-[13px] font-medium text-slate-300">
              Select language
            </label>
            <select
              id="voice-language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 pr-10 py-2.5 text-[14px] text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[20px] bg-position-[right_0.75rem_center] bg-no-repeat"
            >
              {VOICE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {detectedLanguage !== 'auto' && (
              <p className="text-[12px] text-slate-500">
                Detected from browser: <span className="text-slate-400">{detectedLabel}</span>
              </p>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5">
            <p className="text-[13px] text-slate-400">
              💡 You can change this anytime in <span className="text-slate-300">Settings → Voice Language</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onDismiss} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="button" ref={confirmButtonRef} onClick={handleConfirm} className={primaryButtonClass}>
              Start Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Returns the resolved voice language (handles 'auto' fallback).
 */
export function resolveVoiceLanguage(configured: string | undefined): string {
  if (!configured || configured === 'auto') {
    if (typeof navigator === 'undefined') return 'en-US'
    return navigator.language || 'en-US'
  }
  return configured
}

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'

const inputButtonShadow = 'shadow-[0_4px_12px_rgba(0,0,0,0.18)]'

export type TerminalInputBarProps = {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  /** Called when input receives focus (for external state updates like selecting "my own answer") */
  onFocus?: () => void
  placeholder: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  disabled?: boolean
  isGenerating: boolean
  onSubmit: () => void
  onStop: () => void
  /** Called when mic button is clicked while NOT listening (to start) */
  onVoiceStart?: () => void
  /** Called when stop button is clicked while listening (to stop) */
  onVoiceStop?: () => void
  /** Whether voice input is currently active (listening) */
  isVoiceListening?: boolean
  /** Whether voice input is supported in this browser */
  voiceSupported?: boolean
  onBack?: () => void
  showBack?: boolean
}

// Base container styles (always applied)
const baseContainerClass =
  'input-bar-container relative flex items-center rounded-2xl px-4 border transition-[background-color,border-color,box-shadow,filter] duration-200 ease-out'

// Default (blurred) state styles - fixed height for 2-row placeholder
const defaultContainerClass = 'h-[85px] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'

// Focused state without resizing/shift; just a subtle ring.
const focusedContainerClass = 'focused h-[85px] ring-2 ring-slate-400/40'

export function TerminalInputBar({
  value,
  onChange,
  onKeyDown,
  onFocus: onFocusExternal,
  placeholder,
  inputRef,
  disabled = false,
  isGenerating,
  onSubmit,
  onStop,
  onVoiceStart,
  onVoiceStop,
  isVoiceListening = false,
  voiceSupported = true,
  onBack,
  showBack = false,
}: TerminalInputBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the maximum height reached while focused (input can only grow, not shrink, while focused)
  const maxHeightWhileFocusedRef = useRef<number>(0)

  // Track focus within the container (input or buttons)
  // Use a small delay on blur to prevent flicker when focus quickly returns
  const handleFocus = useCallback(() => {
    // Cancel any pending blur
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsFocused(true)
    // Call external onFocus handler (e.g., to select "my own answer" in questions flow)
    onFocusExternal?.()
  }, [onFocusExternal])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only blur if focus moves outside the container
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      // Delay blur to prevent flicker when focus returns quickly (e.g., clicking mode buttons)
      blurTimeoutRef.current = setTimeout(() => {
        setIsFocused(false)
        // Reset max height tracker on blur so input can shrink to natural size
        maxHeightWhileFocusedRef.current = 0
        blurTimeoutRef.current = null
      }, 100)
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // Handle programmatic blur - ensure container state is updated when input is blurred programmatically
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    const checkFocusState = () => {
      // Use requestAnimationFrame to check after React has processed the blur
      requestAnimationFrame(() => {
        // Check if neither the textarea nor any element in the container has focus
        const activeElement = document.activeElement
        if (activeElement !== textarea && containerRef.current && !containerRef.current.contains(activeElement)) {
          // Clear any pending blur timeout
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
          }
          // Immediately set focused state to false to return to default size
          setIsFocused(false)
          maxHeightWhileFocusedRef.current = 0
        }
      })
    }

    // Listen for blur events on the textarea
    textarea.addEventListener('blur', checkFocusState)
    return () => {
      textarea.removeEventListener('blur', checkFocusState)
    }
  }, [inputRef])

  // Auto-resize textarea based on content (max 9 rows, then scrollable)
  // While focused: can only grow, not shrink. Resets to natural size on blur.
  const MAX_HEIGHT = 216
  const MIN_HEIGHT = 24
  const textareaRef = inputRef
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to recalculate natural content height
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const naturalHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT)

    // While focused, only allow growing - use the max of natural height and previous max
    // On blur, maxHeightWhileFocusedRef is reset to 0, so natural height is used
    const newHeight = Math.max(naturalHeight, maxHeightWhileFocusedRef.current)
    maxHeightWhileFocusedRef.current = newHeight

    textarea.style.height = `${newHeight}px`
    // Enable scrolling only when content exceeds max height
    textarea.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value, textareaRef, isFocused])

  // Keep the action button enabled while generating so users can stop the run.
  const isActionDisabled = !isGenerating && (disabled || !value.trim())

  const containerClass = `${baseContainerClass} ${isFocused ? focusedContainerClass : defaultContainerClass}`

  // Calculate button area width for textarea padding (right-4 = 16px + buttons + gaps)
  const buttonCount = (showBack ? 1 : 0) + (voiceSupported ? 1 : 0) + 1 // back + voice + submit
  const buttonAreaWidth = buttonCount * 44 + (buttonCount - 1) * 8 + 20 // buttons + gaps + right padding

  return (
    <div ref={containerRef} className={containerClass} onFocus={handleFocus} onBlur={handleBlur}>
      <label htmlFor="terminal-input" className="sr-only">
        Terminal input - Enter commands or describe your task
      </label>
      <textarea
        id="terminal-input"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Terminal input"
        aria-describedby="terminal-input-hint"
        rows={1}
        style={{ paddingRight: buttonAreaWidth }}
        className="terminal-input min-h-[24px] max-h-[216px] w-full resize-none border-0 bg-transparent px-0 text-[16px] leading-normal text-slate-100 placeholder:text-slate-500 outline-none font-mono transition-[height] duration-150 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
      />
      <span id="terminal-input-hint" className="sr-only">
        Enter to generate, Shift+Enter for a new line
      </span>
      {/* Buttons positioned absolutely in bottom-right, static position regardless of textarea size */}
      <div className="absolute right-4 bottom-3 flex items-center gap-2">
        {showBack && (
          <button
            type="button"
            aria-label="Go back"
            title="Go back"
            className={`inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950 text-slate-200 ${inputButtonShadow} transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950`}
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M15 18l-6-6 6-6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {voiceSupported && (
          <button
            type="button"
            aria-label={isVoiceListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isVoiceListening}
            title={isVoiceListening ? 'Click to stop recording' : 'Click to start voice input'}
            className={`inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-lg border ${
              isVoiceListening
                ? 'border-rose-500/80 bg-rose-500/20 text-rose-400 animate-pulse'
                : 'border-slate-700/80 bg-slate-950 text-slate-200'
            } ${inputButtonShadow} transition hover:border-slate-500 hover:text-slate-50`}
            onClick={isVoiceListening ? onVoiceStop : onVoiceStart}
          >
            {isVoiceListening ? (
              /* Stop icon when recording */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect x="7" y="7" width="10" height="10" rx="1.5" strokeWidth={1.6} fill="currentColor" />
              </svg>
            ) : (
              /* Mic icon when idle */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
            )}
          </button>
        )}
        <button
          type="button"
          aria-busy={isGenerating}
          aria-label={isGenerating ? 'Stop' : 'Generate'}
          onClick={() => {
            if (isGenerating) {
              onStop()
            } else {
              onSubmit()
            }
          }}
          disabled={isActionDisabled}
          className={`inline-flex h-[44px] w-[44px] items-center justify-center rounded-lg px-0 text-[15px] font-semibold ${inputButtonShadow} transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
            isGenerating
              ? 'cursor-pointer border border-slate-700/80 bg-slate-800 text-slate-50 hover:bg-slate-700'
              : isActionDisabled
              ? 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
              : 'cursor-pointer border border-slate-700/80 bg-slate-950 text-slate-200 hover:border-slate-500 hover:text-slate-50'
          }`}
        >
          {isGenerating ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect x="7" y="7" width="10" height="10" rx="1.5" strokeWidth={1.6} />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 20l16-8L4 4v5l10 3-10 3v5z" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="sr-only">{isGenerating ? 'Stop' : 'Generate'}</span>
        </button>
      </div>
    </div>
  )
}

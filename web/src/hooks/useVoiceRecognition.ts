'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * Web Speech API type declarations for browsers that support it.
 * These are not included in standard TypeScript libs.
 */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onspeechend: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export type VoiceRecognitionState = 'idle' | 'listening' | 'processing' | 'error'

export type VoiceRecognitionError =
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'unknown'

export type UseVoiceRecognitionOptions = {
  /** Language code for recognition (default: 'en-US') */
  language?: string
  /** Whether to return interim results while speaking (default: true) */
  interimResults?: boolean
  /** Called when final transcript is available */
  onResult?: (transcript: string) => void
  /** Called when interim transcript changes */
  onInterimResult?: (transcript: string) => void
  /** Called when an error occurs */
  onError?: (error: VoiceRecognitionError, message?: string) => void
  /** Called when recording starts */
  onStart?: () => void
  /** Called when recording ends */
  onEnd?: () => void
}

export type UseVoiceRecognitionReturn = {
  /** Whether voice recognition is supported in this browser */
  isSupported: boolean
  /** Current state of voice recognition */
  state: VoiceRecognitionState
  /** Whether currently listening */
  isListening: boolean
  /** Current transcript (interim or final) */
  transcript: string
  /** Start voice recognition */
  startListening: () => void
  /** Stop voice recognition */
  stopListening: () => void
  /** Clear the current transcript */
  clearTranscript: () => void
  /** Last error that occurred */
  error: VoiceRecognitionError | null
}

/**
 * Hook for voice recognition using the Web Speech API.
 * Supports both interim and final results, with proper cleanup.
 */
export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const { language = 'en-US', interimResults = true, onResult, onInterimResult, onError, onStart, onEnd } = options

  const [state, setState] = useState<VoiceRecognitionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<VoiceRecognitionError | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isStoppingRef = useRef(false)
  const stateRef = useRef<VoiceRecognitionState>(state)

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Check browser support using useSyncExternalStore to avoid hydration mismatch
  // Server returns false, client returns actual support status
  const isSupported = useSyncExternalStore(
    // Subscribe function - speech recognition support doesn't change, so no-op
    () => () => {},
    // Client snapshot
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    // Server snapshot - always false to match initial client render
    () => false
  )

  // Store callbacks in refs to avoid recreating recognition on callback changes
  const callbacksRef = useRef({ onResult, onInterimResult, onError, onStart, onEnd })
  useEffect(() => {
    callbacksRef.current = { onResult, onInterimResult, onError, onStart, onEnd }
  }, [onResult, onInterimResult, onError, onStart, onEnd])

  // Initialize recognition instance - only recreate on language/interimResults change
  useEffect(() => {
    console.log('[Voice] Effect running, isSupported:', isSupported, 'language:', language)
    if (!isSupported) {
      console.log('[Voice] Not supported, skipping init')
      return
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      console.log('[Voice] No SpeechRecognition class found')
      return
    }

    console.log('[Voice] Creating new SpeechRecognition instance')
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false // Single utterance mode for better UX
    recognition.interimResults = interimResults
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('[Voice] onstart event')
      setState('listening')
      setError(null)
      callbacksRef.current.onStart?.()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // Update transcript with either final or interim
      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)

      if (finalTranscript) {
        setState('idle')
        callbacksRef.current.onResult?.(finalTranscript)
      } else if (interimTranscript) {
        callbacksRef.current.onInterimResult?.(interimTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('[Voice] onerror event:', event.error, event.message)
      let errorType: VoiceRecognitionError = 'unknown'
      let message = event.message

      switch (event.error) {
        case 'not-allowed':
          errorType = 'permission-denied'
          message = 'Microphone blocked. Click the lock/camera icon in your browser address bar to allow access.'
          break
        case 'no-speech':
          errorType = 'no-speech'
          message = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorType = 'audio-capture'
          message = 'No microphone found. Please connect a microphone.'
          break
        case 'network':
          errorType = 'network'
          message = 'Network error occurred. Please check your connection.'
          break
        case 'aborted':
          errorType = 'aborted'
          // Don't show error for user-initiated abort
          if (isStoppingRef.current) {
            isStoppingRef.current = false
            return
          }
          break
        default:
          errorType = 'unknown'
      }

      setState('error')
      setError(errorType)
      callbacksRef.current.onError?.(errorType, message)
    }

    recognition.onend = () => {
      // Only change state if not already handled by onresult or onerror
      if (stateRef.current === 'listening') {
        setState('idle')
      }
      isStoppingRef.current = false
      callbacksRef.current.onEnd?.()
    }

    recognitionRef.current = recognition
    console.log('[Voice] Recognition instance created and stored')

    return () => {
      console.log('[Voice] Cleanup - aborting recognition')
      recognition.abort()
      recognitionRef.current = null
    }
  }, [isSupported, language, interimResults])

  const startListening = useCallback(() => {
    console.log('[Voice] startListening called, isSupported:', isSupported, 'recognition:', !!recognitionRef.current)

    if (!isSupported) {
      console.log('[Voice] Not supported, showing error')
      setError('not-supported')
      callbacksRef.current.onError?.('not-supported', 'Voice recognition is not supported in this browser.')
      return
    }

    // If recognition instance isn't ready yet, show error
    // Note: We can't use setTimeout here as it breaks the user gesture context
    // which Chrome requires for Speech Recognition
    if (!recognitionRef.current) {
      console.warn('[Voice] Recognition not ready')
      callbacksRef.current.onError?.('unknown', 'Voice recognition not ready. Please try again.')
      return
    }

    // Clear previous state
    setTranscript('')
    setError(null)
    isStoppingRef.current = false

    try {
      recognitionRef.current.start()
      console.log('[Voice] Started successfully')
    } catch (err) {
      // Handle case where recognition is already started
      console.warn('[Voice] Start error:', err)
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    isStoppingRef.current = true
    setState('processing')

    try {
      recognitionRef.current.stop()
    } catch (err) {
      // Handle case where recognition is not started
      console.warn('Speech recognition stop error:', err)
      setState('idle')
    }
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isSupported,
    state,
    isListening: state === 'listening',
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    error,
  }
}

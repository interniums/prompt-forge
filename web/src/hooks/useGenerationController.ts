'use client'

import { useCallback, useRef, useEffect } from 'react'
import { generateFinalPrompt, editPrompt } from '@/services/promptService'
import { recordGeneration } from '@/services/historyService'
import { recordEvent } from '@/services/eventsService'
import { MESSAGE, ROLE } from '@/lib/constants'
import type { ClarifyingAnswer, Preferences } from '@/lib/types'

type GenDeps = {
  preferences: Preferences
  pendingTask: string | null
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  setIsGenerating: (value: boolean) => void
  setAnsweringQuestions: (value: boolean) => void
  setEditablePrompt: (value: string | null) => void
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  setLastApprovedPrompt: (value: string | null) => void
  setPendingTask: (value: string | null) => void
  setLoginRequiredOpen: (value: boolean) => void
  appendLine: (role: (typeof ROLE)[keyof typeof ROLE], text: string) => void
  showToast: (msg: string) => void
  user: { id: string; email?: string | null } | null
  preferenceSource: 'user' | 'session' | 'local' | 'none'
  hasAnyPreference: boolean
  awaitingQuestionConsent: boolean
  consentRequired: boolean
  hasConsent: boolean
}

export function useGenerationController({
  preferences,
  pendingTask,
  clarifyingAnswersRef,
  setIsGenerating,
  setAnsweringQuestions,
  setEditablePrompt,
  setIsPromptEditable,
  setIsPromptFinalized,
  setLastApprovedPrompt,
  setPendingTask,
  setLoginRequiredOpen,
  appendLine,
  showToast,
  user,
  preferenceSource,
  hasAnyPreference,
  awaitingQuestionConsent,
  consentRequired,
  hasConsent,
}: GenDeps) {
  const generationRunIdRef = useRef(0)
  const resumeRunTaskRef = useRef<string | null>(null)

  const generateFinalPromptForTask = useCallback(
    async (task: string, answers: ClarifyingAnswer[], options?: { skipConsentCheck?: boolean }) => {
      if (!options?.skipConsentCheck && consentRequired && (awaitingQuestionConsent || !hasConsent)) {
        return
      }
      if (!user) {
        setLoginRequiredOpen(true)
        setPendingTask(task)
        clarifyingAnswersRef.current = answers
        setAnsweringQuestions(false)
        return
      }

      const runId = (generationRunIdRef.current += 1)
      setIsGenerating(true)
      setAnsweringQuestions(false)
      appendLine(ROLE.APP, MESSAGE.CREATING_PROMPT)

      try {
        const prompt = await generateFinalPrompt({ task, preferences, answers })

        if (runId !== generationRunIdRef.current) {
          return
        }

        const finalPrompt = prompt.trim() || task
        setEditablePrompt(finalPrompt)
        setIsPromptEditable(true)
        setIsPromptFinalized(false)
        setLastApprovedPrompt(null)
        void recordEvent('prompt_vote', { vote: 'none', prompt: finalPrompt, runId })
        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(finalPrompt)
            showToast('Prompt copied')
          }
        } catch (err) {
          console.error('Auto-copy failed', err)
        }

        void recordGeneration({
          task,
          prompt: {
            id: 'final',
            label: 'Final prompt',
            body: finalPrompt,
          },
        })

        appendLine(ROLE.APP, MESSAGE.PROMPT_READY)
        setIsGenerating(false)

        if (!hasAnyPreference && preferenceSource !== 'user') {
          appendLine(
            ROLE.APP,
            'Would you like to set your preferences now? This will help us generate better prompts in the future. Type /preferences to open settings.'
          )
        }
      } catch (err) {
        if (runId === generationRunIdRef.current) {
          console.error('Failed to generate final prompt', err)
          appendLine(ROLE.APP, 'Something went wrong while generating the prompt. Try again in a moment.')
          setIsGenerating(false)
        }
      }
    },
    [
      appendLine,
      awaitingQuestionConsent,
      clarifyingAnswersRef,
      consentRequired,
      hasConsent,
      hasAnyPreference,
      preferenceSource,
      preferences,
      setAnsweringQuestions,
      setEditablePrompt,
      setIsGenerating,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLastApprovedPrompt,
      setLoginRequiredOpen,
      setPendingTask,
      showToast,
      user,
    ]
  )

  const handleStop = useCallback(() => {
    if (!generationRunIdRef.current) return
    generationRunIdRef.current += 1
    setIsGenerating(false)
    appendLine(ROLE.APP, MESSAGE.AI_STOPPED)
  }, [appendLine, setIsGenerating])

  const handleEditPrompt = useCallback(
    async (editablePrompt: string | null, editRequest: string, pendingTask: string | null) => {
      if (!editablePrompt) return

      const previousPrompt = editablePrompt
      const runId = (generationRunIdRef.current += 1)
      setIsGenerating(true)
      appendLine(ROLE.APP, MESSAGE.EDITING_PROMPT)

      try {
        const updated = await editPrompt({ currentPrompt: editablePrompt, editRequest, preferences })

        if (runId !== generationRunIdRef.current) {
          return
        }

        const finalPrompt = updated.trim() || editablePrompt
        setEditablePrompt(finalPrompt)
        setIsPromptEditable(true)
        setIsPromptFinalized(false)
        setLastApprovedPrompt(null)

        if (finalPrompt === previousPrompt) {
          appendLine(ROLE.APP, 'The AI could not apply your edit; the prompt is unchanged. Try again or edit manually.')
        }

        void recordGeneration({
          task: pendingTask ?? 'Edited prompt',
          prompt: {
            id: 'final',
            label: 'Final prompt',
            body: finalPrompt,
          },
        })

        setIsGenerating(false)
      } catch (err) {
        if (runId === generationRunIdRef.current) {
          console.error('Failed to edit prompt', err)
          appendLine(ROLE.APP, 'Something went wrong while editing the prompt. Try again in a moment.')
          setIsGenerating(false)
        }
      }
    },
    [
      appendLine,
      preferences,
      setEditablePrompt,
      setIsGenerating,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLastApprovedPrompt,
    ]
  )

  const resumePendingAfterLogin = useCallback(() => {
    if (!pendingTask || !user) return
    if (resumeRunTaskRef.current === pendingTask) return
    resumeRunTaskRef.current = pendingTask
    setLoginRequiredOpen(false)
    const answers = clarifyingAnswersRef.current
    void generateFinalPromptForTask(pendingTask, answers)
  }, [clarifyingAnswersRef, generateFinalPromptForTask, pendingTask, setLoginRequiredOpen, user])

  useEffect(() => {
    resumePendingAfterLogin()
  }, [resumePendingAfterLogin])

  return {
    generateFinalPromptForTask,
    handleEditPrompt,
    handleStop,
    generationRunIdRef,
  }
}

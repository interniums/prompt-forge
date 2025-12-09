'use client'

import { useCallback, useRef, useEffect } from 'react'
import { generateFinalPrompt, editPrompt } from '@/services/promptService'
import { recordGeneration } from '@/services/historyService'
import { recordEvent } from '@/services/eventsService'
import { MESSAGE, ROLE } from '@/lib/constants'
import type { ClarifyingAnswer, Preferences, TerminalStatus, TaskActivity } from '@/lib/types'

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
  setActivity: (activity: TaskActivity | null) => void
  appendLine: (role: (typeof ROLE)[keyof typeof ROLE], text: string | TerminalStatus) => void
  showToast: (msg: string) => void
  user: { id: string; email?: string | null } | null
  awaitingQuestionConsent: boolean
  consentRequired: boolean
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
  setActivity,
  appendLine,
  showToast,
  user,
  awaitingQuestionConsent,
  consentRequired,
}: GenDeps) {
  const generationRunIdRef = useRef(0)
  const resumeRunTaskRef = useRef<string | null>(null)

  const generateFinalPromptForTask = useCallback(
    async (
      task: string,
      answers: ClarifyingAnswer[],
      options?: { skipConsentCheck?: boolean; preferencesOverride?: Preferences }
    ) => {
      if (!options?.skipConsentCheck && consentRequired && awaitingQuestionConsent) {
        return
      }
      if (!user) {
        setLoginRequiredOpen(true)
        setPendingTask(task)
        clarifyingAnswersRef.current = answers
        setAnsweringQuestions(false)
        resumeRunTaskRef.current = task
        return
      }

      const runId = (generationRunIdRef.current += 1)
      const effectivePreferences = options?.preferencesOverride ?? preferences
      const hasAnyEffectivePreference = Object.values(effectivePreferences ?? {}).some(Boolean)
      setIsGenerating(true)
      setAnsweringQuestions(false)
      const hasAnswers = answers.length > 0
      const description = hasAnswers
        ? 'Drafting your prompt with your answers and preferences...'
        : hasAnyEffectivePreference
        ? 'Drafting your prompt with your preferences...'
        : 'Drafting your prompt...'
      setActivity({
        task,
        stage: 'generating',
        status: 'loading',
        message: 'Creating prompt',
        detail: description,
      })

      try {
        const prompt = await generateFinalPrompt({ task, preferences: effectivePreferences, answers })

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
          const canCopy =
            typeof document !== 'undefined' && typeof document.hasFocus === 'function' && document.hasFocus()
          if (canCopy && navigator?.clipboard?.writeText) {
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

        const readyDescription = hasAnswers
          ? 'Based on your answers and preferences. Copy or refine below.'
          : hasAnyEffectivePreference
          ? 'Based on your preferences. Copy or refine below.'
          : 'Copy or refine the prompt below.'

        setActivity({
          task,
          stage: 'ready',
          status: 'success',
          message: 'Prompt ready',
          detail: readyDescription,
        })
        setIsGenerating(false)

        // Do not auto-prompt for preferences here to keep the flow minimal.
      } catch (err) {
        if (runId !== generationRunIdRef.current) {
          return
        }

        const code = (err as { code?: string })?.code || (err as Error)?.message
        if (code === 'UNAUTHENTICATED') {
          setIsGenerating(false)
          setLoginRequiredOpen(true)
          setActivity({
            task,
            stage: 'error',
            status: 'error',
            message: 'Sign-in required',
            detail: 'Sign in to generate prompts, then try again.',
          })
          return
        }

        if (code === 'INVALID_INPUT') {
          const reason = (err as { reason?: string }).reason
          const message =
            reason === 'too_short'
              ? 'Describe the task in a bit more detail before generating.'
              : reason === 'too_long'
              ? 'Task is too long. Please trim it down and try again.'
              : 'Task input is invalid. Please adjust and try again.'
          setIsGenerating(false)
          setActivity({
            task,
            stage: 'error',
            status: 'error',
            message: 'Task needs attention',
            detail: message,
          })
          return
        }

        console.error('Failed to generate final prompt', err)
        setActivity({
          task,
          stage: 'error',
          status: 'error',
          message: 'Prompt generation failed',
          detail: 'Something went wrong. Please try again in a moment.',
        })
        setIsGenerating(false)
      }
    },
    [
      awaitingQuestionConsent,
      clarifyingAnswersRef,
      consentRequired,
      preferences,
      setAnsweringQuestions,
      setEditablePrompt,
      setIsGenerating,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLastApprovedPrompt,
      setLoginRequiredOpen,
      setPendingTask,
      setActivity,
      showToast,
      user,
    ]
  )

  const handleStop = useCallback(() => {
    if (!generationRunIdRef.current) return
    generationRunIdRef.current += 1
    setIsGenerating(false)
    setActivity({
      task: '',
      stage: 'stopped',
      status: 'success',
      message: 'Generation stopped',
      detail: MESSAGE.AI_STOPPED,
    })
  }, [setActivity, setIsGenerating])

  const handleEditPrompt = useCallback(
    async (editablePrompt: string | null, editRequest: string, pendingTask: string | null) => {
      if (!editablePrompt) return

      const previousPrompt = editablePrompt
      const runId = (generationRunIdRef.current += 1)
      setIsGenerating(true)
      setActivity({
        task: pendingTask ?? '',
        stage: 'generating',
        status: 'loading',
        message: 'Editing prompt',
        detail: 'Applying your changes...',
      })

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

        setActivity({
          task: pendingTask ?? '',
          stage: 'ready',
          status: 'success',
          message: 'Edit complete',
          detail:
            finalPrompt === previousPrompt
              ? 'Prompt unchanged. You can edit manually if needed.'
              : 'Your edits are applied.',
        })

        setIsGenerating(false)
      } catch (err) {
        if (runId === generationRunIdRef.current) {
          console.error('Failed to edit prompt', err)
          setActivity({
            task: pendingTask ?? '',
            stage: 'error',
            status: 'error',
            message: 'Edit failed',
            detail: 'Could not apply your changes. Please try again.',
          })
          setIsGenerating(false)
        }
      }
    },
    [
      appendLine,
      preferences,
      setActivity,
      setEditablePrompt,
      setIsGenerating,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLastApprovedPrompt,
    ]
  )

  const resumePendingAfterLogin = useCallback(() => {
    if (!pendingTask || !user) return
    if (resumeRunTaskRef.current !== pendingTask) return
    resumeRunTaskRef.current = null
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

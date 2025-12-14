'use client'

import { useCallback, useRef, useState } from 'react'
import type { ClarifyingAnswer, TaskActivity } from '@/lib/types'

type UnclearStage = 'clarifying' | 'generating'

type UnclearTaskInfo = {
  reason: string
  stage: UnclearStage
  task: string
  pendingAnswers?: ClarifyingAnswer[]
}

type UseUnclearTaskDeps = {
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  focusInputToEnd: () => void
  setValue: (value: string) => void
  setActivity: (activity: TaskActivity | null) => void
  startClarifyingQuestionsRef: React.MutableRefObject<
    ((task: string, options?: { allowUnclear?: boolean }) => Promise<void>) | null
  >
  guardedGenerateFinalPromptForTaskRef: React.MutableRefObject<
    | ((
        task: string,
        answers: ClarifyingAnswer[],
        options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
      ) => Promise<void>)
    | null
  >
}

export function useUnclearTask({
  clarifyingAnswersRef,
  focusInputToEnd,
  setValue,
  setActivity,
  startClarifyingQuestionsRef,
  guardedGenerateFinalPromptForTaskRef,
}: UseUnclearTaskDeps) {
  const [unclearTaskModal, setUnclearTaskModal] = useState<UnclearTaskInfo | null>(null)
  const unclearOverrideRef = useRef(false)
  const [allowUnclearFlag, setAllowUnclearFlag] = useState(false)
  const unclearButtonRefsInternal = useRef<Array<HTMLButtonElement | null>>([])

  const setEditButtonRef = useCallback((el: HTMLButtonElement | null) => {
    unclearButtonRefsInternal.current[0] = el
  }, [])

  const setContinueButtonRef = useCallback((el: HTMLButtonElement | null) => {
    unclearButtonRefsInternal.current[1] = el
  }, [])

  const clearUnclearButtonRefs = useCallback(() => {
    unclearButtonRefsInternal.current = []
  }, [])

  const setAllowUnclear = useCallback((value: boolean, _task?: string | null) => {
    void _task
    unclearOverrideRef.current = value
    setAllowUnclearFlag(value)
  }, [])

  const shouldAllowUnclearForTask = useCallback(() => allowUnclearFlag, [allowUnclearFlag])
  const ensureAllowUnclearForTask = useCallback(() => {}, [])

  const handleUnclearTask = useCallback(
    (info: UnclearTaskInfo) => {
      const pendingAnswers = info.pendingAnswers ?? clarifyingAnswersRef.current
      if (unclearOverrideRef.current) {
        if (info.stage === 'clarifying') {
          void startClarifyingQuestionsRef.current?.(info.task, { allowUnclear: true })
        } else {
          void guardedGenerateFinalPromptForTaskRef.current?.(info.task, pendingAnswers ?? [], {
            allowUnclear: true,
            skipConsentCheck: true,
          })
        }
        return
      }

      setUnclearTaskModal({
        reason: info.reason,
        stage: info.stage,
        task: info.task,
        pendingAnswers,
      })

      if (info.stage === 'generating') {
        setActivity({
          task: info.task,
          stage: info.stage,
          status: 'error',
          message: 'Task unclear',
          detail: info.reason,
        })
      }
    },
    [clarifyingAnswersRef, guardedGenerateFinalPromptForTaskRef, setActivity, startClarifyingQuestionsRef]
  )

  const handleGeneratingUnclear = useCallback(
    ({ reason, stage, task }: { reason: string; stage: 'generating'; task: string }) =>
      handleUnclearTask({ reason, stage, task, pendingAnswers: clarifyingAnswersRef.current }),
    [clarifyingAnswersRef, handleUnclearTask]
  )

  const handleClarifyingUnclear = useCallback(
    ({ reason, stage, task }: { reason: string; stage: 'clarifying'; task: string }) =>
      handleUnclearTask({ reason, stage, task }),
    [handleUnclearTask]
  )

  const handleUnclearDismiss = useCallback(() => {
    setUnclearTaskModal(null)
  }, [])

  const handleUnclearKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!unclearTaskModal) return
      const buttons = unclearButtonRefsInternal.current.filter(Boolean) as HTMLButtonElement[]
      if (!buttons.length) return

      const active = document.activeElement
      const currentIndex = buttons.findIndex((btn) => btn === active)

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        const next = (currentIndex + 1 + buttons.length) % buttons.length
        buttons[next]?.focus()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        const prev = (currentIndex - 1 + buttons.length) % buttons.length
        buttons[prev]?.focus()
        return
      }

      if ((event.key === 'Enter' || event.key === ' ') && currentIndex >= 0) {
        event.preventDefault()
        buttons[currentIndex]?.click()
      }
    },
    [unclearTaskModal]
  )

  const handleUnclearEdit = useCallback(() => {
    if (!unclearTaskModal) return
    setAllowUnclear(true, unclearTaskModal.task)
    setValue(unclearTaskModal.task)
    setUnclearTaskModal(null)
    focusInputToEnd()
  }, [focusInputToEnd, setAllowUnclear, setValue, unclearTaskModal])

  const handleUnclearContinue = useCallback(async () => {
    const modal = unclearTaskModal
    if (!modal) return
    setAllowUnclear(true, modal.task)
    setUnclearTaskModal(null)
    if (modal.stage === 'clarifying') {
      await startClarifyingQuestionsRef.current?.(modal.task, { allowUnclear: true })
      return
    }
    await guardedGenerateFinalPromptForTaskRef.current?.(modal.task, modal.pendingAnswers ?? [], {
      allowUnclear: true,
      skipConsentCheck: true,
    })
  }, [
    guardedGenerateFinalPromptForTaskRef,
    setAllowUnclear,
    setUnclearTaskModal,
    startClarifyingQuestionsRef,
    unclearTaskModal,
  ])

  const resetAllowUnclear = useCallback(() => setAllowUnclear(false), [setAllowUnclear])

  return {
    allowUnclearFlag,
    unclearTaskModal,
    setEditButtonRef,
    setContinueButtonRef,
    clearUnclearButtonRefs,
    setAllowUnclear,
    shouldAllowUnclearForTask,
    ensureAllowUnclearForTask,
    handleUnclearTask,
    handleGeneratingUnclear,
    handleClarifyingUnclear,
    handleUnclearDismiss,
    handleUnclearKeyDown,
    handleUnclearEdit,
    handleUnclearContinue,
    resetAllowUnclear,
  }
}

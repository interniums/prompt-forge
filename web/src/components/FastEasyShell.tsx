'use client'

import { useEffect, useRef, useState } from 'react'
import {
  generateClarifyingQuestions,
  generateFinalPrompt,
  editPrompt,
  savePreferences,
  recordGeneration,
  listHistory,
  type ClarifyingQuestion,
  type ClarifyingAnswer,
} from '@/app/terminalActions'
import { CenteredToast } from './terminal/CenteredToast'
import { TerminalHeader } from './terminal/TerminalHeader'
import { TerminalOutputArea } from './terminal/TerminalOutputArea'
import { TerminalInputBar } from './terminal/TerminalInputBar'
import { TerminalChromeButtons } from './terminal/TerminalChromeButtons'

type TerminalRole = 'system' | 'user' | 'app'

export type TerminalLine = {
  id: number
  role: TerminalRole
  text: string
}

export type Preferences = {
  tone?: string
  audience?: string
  domain?: string
}

type PreferencesStep = 'tone' | 'audience' | 'domain' | null

type FastEasyShellProps = {
  initialLines?: TerminalLine[]
  initialPreferences?: Preferences
}

export function FastEasyShell({ initialLines, initialPreferences }: FastEasyShellProps) {
  const [value, setValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(window.navigator.userAgent)
  const [editablePrompt, setEditablePrompt] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [pendingTask, setPendingTask] = useState<string | null>(null)
  const [awaitingQuestionConsent, setAwaitingQuestionConsent] = useState(false)
  const [isPromptEditable, setIsPromptEditable] = useState(false)
  const [isPromptFinalized, setIsPromptFinalized] = useState(false)
  const [hasRunInitialTask, setHasRunInitialTask] = useState(false)
  const [consentSelectedIndex, setConsentSelectedIndex] = useState<number | null>(null)
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[] | null>(null)
  const clarifyingAnswersRef = useRef<ClarifyingAnswer[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answeringQuestions, setAnsweringQuestions] = useState(false)
  const [clarifyingSelectedOptionIndex, setClarifyingSelectedOptionIndex] = useState<number | null>(null)
  const generationRunIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const editablePromptRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const [lines, setLines] = useState<TerminalLine[]>(
    initialLines && initialLines.length
      ? initialLines
      : [
          {
            id: 0,
            role: 'system',
            text: 'Describe your task and what kind of AI answer you expect.',
          },
        ]
  )
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences ?? {})
  const [preferencesStep, setPreferencesStep] = useState<PreferencesStep>(null)
  const [headerHelpShown, setHeaderHelpShown] = useState(false)
  const [lastClearedLines, setLastClearedLines] = useState<TerminalLine[] | null>(null)
  const [lastHistory, setLastHistory] = useState<Array<{
    id: string
    task: string
    label: string
    body: string
    created_at: string
  }> | null>(null)

  useEffect(() => {
    if (editablePrompt !== null) {
      if (editablePromptRef.current) {
        const el = editablePromptRef.current
        // Autosize to content so the terminal scroll container, not the textarea, handles overflow.
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
      if (scrollRef.current) {
        const el = scrollRef.current
        el.scrollTop = el.scrollHeight
      }
    }
  }, [editablePrompt])

  function autosizeEditablePrompt() {
    if (!editablePromptRef.current) return
    const el = editablePromptRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function showToast(message: string) {
    setToastMessage(message)
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimeoutRef.current = null
    }, 2000)
  }

  async function copyEditablePrompt() {
    if (!editablePrompt) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(editablePrompt)
        showToast('Prompt copied')
      } else {
        appendLine('app', 'Clipboard is not available in this environment.')
      }
    } catch (err) {
      console.error('Failed to copy editable prompt', err)
      appendLine('app', 'Could not copy to clipboard. You can still select and copy manually.')
    }
  }

  function handleApprovePrompt() {
    if (!editablePrompt) {
      appendLine('app', 'There is no prompt to approve yet. Generate one first.')
      return
    }

    void copyEditablePrompt()
    setIsPromptFinalized(true)
    setIsPromptEditable(false)
    appendLine(
      'app',
      'Prompt approved and copied. You can now start a new task or type /discard to reset everything.'
    )
  }

  function appendLine(role: TerminalRole, text: string) {
    setLines((prev) => {
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 0
      return [...prev, { id: nextId, role, text }]
    })
  }

  function formatPreferencesSummary(next?: Preferences) {
    const prefs = next ?? preferences
    const parts: string[] = []
    if (prefs.tone) parts.push(`tone=${prefs.tone}`)
    if (prefs.audience) parts.push(`audience=${prefs.audience}`)
    if (prefs.domain) parts.push(`domain=${prefs.domain}`)
    if (parts.length === 0) return 'no preferences set yet'
    return parts.join(', ')
  }

  function startPreferencesFlow() {
    appendLine('app', `Current preferences: ${formatPreferencesSummary()}`)
    appendLine('app', 'First, what tone do you prefer? (for example: casual, neutral, or formal?)')
    setPreferencesStep('tone')
  }

  function advancePreferences(answer: string) {
    if (!preferencesStep) return

    if (preferencesStep === 'tone') {
      const next = { ...preferences, tone: answer }
      setPreferences(next)
      appendLine('app', 'Got it. Who are you usually writing for? (for example: founders, devs, general audience?)')
      setPreferencesStep('audience')
      return
    }

    if (preferencesStep === 'audience') {
      const next = { ...preferences, audience: answer }
      setPreferences(next)
      appendLine('app', 'What domains do you mostly work in? (for example: product, marketing, engineering?)')
      setPreferencesStep('domain')
      return
    }

    if (preferencesStep === 'domain') {
      const next = { ...preferences, domain: answer }
      setPreferences(next)
      appendLine('app', `Updated preferences: ${formatPreferencesSummary(next)}`)
      appendLine('app', 'These will be used to steer how prompts are shaped for you.')
      setPreferencesStep(null)
      void savePreferences(next)
    }
  }

  function handleHelpCommand() {
    appendLine('app', 'Available commands:')
    appendLine('app', '/help        Show this help.')
    appendLine('app', '/preferences Update your preferences (tone, audience, domain).')
    appendLine('app', '/clear       Clear terminal history (can be restored once).')
    appendLine('app', '/restore     Restore the last cleared history snapshot.')
    appendLine('app', '/discard     Discard the current prompt and flow, start fresh.')
    appendLine('app', '/history     Show recent tasks and prompts from this session.')
    appendLine('app', '/use <n>     Load task #n from the last history listing into the input.')
    appendLine(
      'app',
      'Anything else is treated as a task description. The app will use your preferences to shape prompts.'
    )
  }

  function handleClear() {
    setLastClearedLines(lines)
    setHeaderHelpShown(false)
    setLines([
      {
        id: 0,
        role: 'system',
        text: 'History cleared. Use /restore to bring it back.',
      },
    ])
    // Keep the current editable prompt so the user doesn't lose their work.
    setPendingTask(null)
    setAwaitingQuestionConsent(false)
    setClarifyingQuestions(null)
    clarifyingAnswersRef.current = []
    setCurrentQuestionIndex(0)
    setClarifyingSelectedOptionIndex(null)
    setAnsweringQuestions(false)
    setConsentSelectedIndex(null)
  }

  function handleDiscard() {
    // Hard reset of the interactive flow and editable prompt.
    setHeaderHelpShown(false)
    setLastClearedLines(null)
    setLines([
      {
        id: 0,
        role: 'system',
        text: 'Starting fresh. Describe your task and what kind of AI answer you expect.',
      },
    ])
    setEditablePrompt(null)
    setIsPromptEditable(false)
    setIsPromptFinalized(false)
    setPendingTask(null)
    setHasRunInitialTask(false)
    setAwaitingQuestionConsent(false)
    setClarifyingQuestions(null)
    clarifyingAnswersRef.current = []
    setCurrentQuestionIndex(0)
    setClarifyingSelectedOptionIndex(null)
    setAnsweringQuestions(false)
    setConsentSelectedIndex(null)
    setLastHistory(null)
  }

  function handleRestore() {
    if (!lastClearedLines) {
      appendLine('app', 'Nothing to restore yet.')
      return
    }

    setLines(lastClearedLines)
  }

  async function handleHistory() {
    try {
      const items = await listHistory(10)
      setLastHistory(items)

      if (!items.length) {
        appendLine('app', 'No history yet for this session.')
        return
      }

      appendLine('app', 'History (most recent first):')
      items.forEach((item, index) => {
        const shortTask = item.task.length > 80 ? `${item.task.slice(0, 77)}...` : item.task
        appendLine('app', `#${index + 1} — ${item.label} — ${shortTask}`)
      })
    } catch (err) {
      console.error('Failed to load history', err)
      appendLine('app', 'Something went wrong while loading history.')
    }
  }

  function handleUseFromHistory(index: number) {
    if (!lastHistory || lastHistory.length === 0) {
      appendLine('app', 'No history in memory. Run /history first.')
      return
    }
    if (index < 1 || index > lastHistory.length) {
      appendLine('app', 'No such history entry. Use /history to see available numbers.')
      return
    }

    const selected = lastHistory[index - 1]
    setValue(selected.task)
    appendLine('app', `Loaded task #${index} from history into the input.`)
  }

  function handleCommand(raw: string) {
    const normalized = raw.trim()
    const [command, ...rest] = normalized.split(/\s+/)

    switch (command) {
      case '/help': {
        if (headerHelpShown) {
          appendLine('app', 'Help is already shown. Use /clear to reset the terminal.')
          return
        }
        handleHelpCommand()
        setHeaderHelpShown(true)
        return
      }
      case '/preferences': {
        startPreferencesFlow()
        return
      }
      case '/clear': {
        handleClear()
        return
      }
      case '/restore': {
        handleRestore()
        return
      }
      case '/discard': {
        handleDiscard()
        return
      }
      case '/history': {
        void handleHistory()
        return
      }
      case '/use': {
        const arg = rest[0]
        const index = Number(arg)
        if (!arg || Number.isNaN(index)) {
          appendLine('app', 'Usage: /use <number>. Use /history to see entries.')
          return
        }
        handleUseFromHistory(index)
        return
      }
      case '/edit': {
        const instructions = rest.join(' ')
        if (!instructions.trim()) {
          appendLine(
            'app',
            'Usage: /edit <how you want the current prompt changed> (for example: "shorter", "for a CTO").'
          )
          return
        }
        if (!editablePrompt) {
          appendLine('app', 'There is no prompt to edit yet. Generate one first.')
          return
        }
        void handleEditPrompt(instructions.trim())
        return
      }
      default: {
        appendLine('app', `Unknown command: ${command}. Type /help to see what you can do.`)
      }
    }
  }

  async function startClarifyingQuestions(task: string) {
    const runId = (generationRunIdRef.current += 1)
    setIsGenerating(true)
    appendLine('app', 'Thinking about the best questions to ask...')

    try {
      const questions = await generateClarifyingQuestions({ task, preferences })

      if (runId !== generationRunIdRef.current) {
        return
      }

      setIsGenerating(false)

      if (!questions.length) {
        // If no questions were produced, fall back to generating the final prompt directly.
        await generateFinalPromptForTask(task, [])
        return
      }

      setClarifyingQuestions(questions)
      clarifyingAnswersRef.current = []
      setCurrentQuestionIndex(0)
      setClarifyingSelectedOptionIndex(questions[0].options.length > 0 ? 0 : null)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setAnsweringQuestions(true)

      appendClarifyingQuestion(questions[0], 0, questions.length)
    } catch (err) {
      if (runId === generationRunIdRef.current) {
        console.error('Failed to generate clarifying questions', err)
        appendLine(
          'app',
          'Something went wrong while generating questions. I will try to create a prompt from your task directly.'
        )
        setIsGenerating(false)
        await generateFinalPromptForTask(task, [])
      }
    }
  }

  function appendClarifyingQuestion(question: ClarifyingQuestion, index: number, total: number) {
    appendLine('app', `Question ${index + 1}/${total}: ${question.question}`)
    if (question.options && question.options.length > 0) {
      const opts = question.options.map((o) => `${o.id}) ${o.label}`).join(' | ')
      appendLine('app', `You can answer in your own words, or choose one of: ${opts}`)
    } else {
      appendLine('app', 'Answer in your own words.')
    }
  }

  async function generateFinalPromptForTask(task: string, answers: ClarifyingAnswer[]) {
    const runId = (generationRunIdRef.current += 1)
    setIsGenerating(true)
    setAnsweringQuestions(false)
    appendLine('app', 'Creating your prompt...')

    try {
      const prompt = await generateFinalPrompt({ task, preferences, answers })

      if (runId !== generationRunIdRef.current) {
        return
      }

      const finalPrompt = prompt.trim() || task
      setEditablePrompt(finalPrompt)
      setIsPromptEditable(false)
      setIsPromptFinalized(false)

      void recordGeneration({
        task,
        prompt: {
          id: 'final',
          label: 'Final prompt',
          body: finalPrompt,
        },
      })

      appendLine('app', 'Here is a prompt you can use or edit:')
      setIsGenerating(false)
    } catch (err) {
      if (runId === generationRunIdRef.current) {
        console.error('Failed to generate final prompt', err)
        appendLine('app', 'Something went wrong while generating the prompt. Try again in a moment.')
        setIsGenerating(false)
      }
    }
  }

  async function handleEditPrompt(editRequest: string) {
    if (!editablePrompt) return

    const runId = (generationRunIdRef.current += 1)
    setIsGenerating(true)
    appendLine('app', 'Editing your prompt...')

    try {
      const updated = await editPrompt({ currentPrompt: editablePrompt, editRequest, preferences })

      if (runId !== generationRunIdRef.current) {
        return
      }

      const finalPrompt = updated.trim() || editablePrompt
      setEditablePrompt(finalPrompt)
      setIsPromptEditable(true)
      setIsPromptFinalized(false)

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
        appendLine('app', 'Something went wrong while editing the prompt. Try again in a moment.')
        setIsGenerating(false)
      }
    }
  }

  async function handleTask(line: string) {
    const task = line.trim()
    if (!task) return

    // After the first full task, treat further free-text inputs as edits to the existing prompt
    // instead of restarting the clarifying-question flow, unless the user has started a new
    // conversation via /discard.
    if (hasRunInitialTask) {
      if (editablePrompt) {
        void handleEditPrompt(task)
        return
      }

      // If for some reason we don't have a prompt yet, just try to generate one directly
      // without re-asking questions.
      await generateFinalPromptForTask(task, [])
      return
    }

    setHasRunInitialTask(true)
    setPendingTask(task)
    setClarifyingQuestions(null)
    clarifyingAnswersRef.current = []
    setCurrentQuestionIndex(0)
    setClarifyingSelectedOptionIndex(null)
    setAnsweringQuestions(false)
    setConsentSelectedIndex(0)
    setEditablePrompt(null)
    setIsPromptEditable(false)
    setIsPromptFinalized(false)

    appendLine(
      'app',
      'Before I craft your prompt, would you like to answer 3 quick questions to improve the context? (yes/no)'
    )
    setAwaitingQuestionConsent(true)
    setConsentSelectedIndex(0)
  }

  function submitCurrent() {
    const raw = value
    const line = raw.trim()
    if (!line) return

    appendLine('user', raw)

    if (line.startsWith('/')) {
      handleCommand(line)
      setValue('')
      return
    }

    if (preferencesStep) {
      advancePreferences(line)
      setValue('')
      return
    }

    if (awaitingQuestionConsent && pendingTask) {
      void handleQuestionConsent(line)
      setValue('')
      return
    }

    if (
      answeringQuestions &&
      clarifyingQuestions &&
      clarifyingQuestions.length > 0 &&
      currentQuestionIndex < clarifyingQuestions.length &&
      pendingTask
    ) {
      void handleClarifyingAnswer(line)
      setValue('')
      return
    }

    void handleTask(line)
    setValue('')
  }

  function handleStopClick() {
    if (!isGenerating) return
    generationRunIdRef.current += 1
    setIsGenerating(false)
    appendLine('app', 'Stopped AI generation for the current task.')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  async function handleQuestionConsent(answer: string) {
    const normalized = answer.trim().toLowerCase()

    if (!pendingTask) {
      appendLine('app', 'No task in memory. Describe a task first.')
      setAwaitingQuestionConsent(false)
      return
    }

    if (normalized === 'yes' || normalized === 'y') {
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      await startClarifyingQuestions(pendingTask)
      return
    }

    if (normalized === 'no' || normalized === 'n') {
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      await generateFinalPromptForTask(pendingTask, [])
      return
    }

    appendLine('app', 'Please answer "yes" or "no".')
  }

  function handleClarifyingOptionClick(index: number) {
    if (!clarifyingQuestions || !pendingTask) return
    const current = clarifyingQuestions[currentQuestionIndex]
    if (!current || !current.options || index < 0 || index >= current.options.length) return
    const chosen = current.options[index]
    setClarifyingSelectedOptionIndex(index)
    void handleClarifyingAnswer(chosen.label)
  }

  async function handleClarifyingAnswer(answer: string) {
    if (!clarifyingQuestions || !pendingTask) {
      appendLine('app', 'No active questions. Describe a task first.')
      setAnsweringQuestions(false)
      return
    }

    const index = currentQuestionIndex
    if (index < 0 || index >= clarifyingQuestions.length) {
      setAnsweringQuestions(false)
      return
    }

    const question = clarifyingQuestions[index]
    const trimmedAnswer = answer.trim()

    const updated: ClarifyingAnswer[] = [
      ...clarifyingAnswersRef.current,
      {
        questionId: question.id,
        question: question.question,
        answer: trimmedAnswer,
      },
    ]
    clarifyingAnswersRef.current = updated

    const nextIndex = index + 1
    if (nextIndex < clarifyingQuestions.length) {
      setCurrentQuestionIndex(nextIndex)
      const nextQuestion = clarifyingQuestions[nextIndex]
      setClarifyingSelectedOptionIndex(nextQuestion.options.length > 0 ? 0 : null)
      appendClarifyingQuestion(nextQuestion, nextIndex, clarifyingQuestions.length)
    } else {
      setClarifyingSelectedOptionIndex(null)
      void generateFinalPromptForTask(pendingTask, updated)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Consent yes/no option navigation
    if (awaitingQuestionConsent) {
      const options = ['yes', 'no']
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const isForward = e.key === 'ArrowDown' || e.key === 'ArrowRight'
        setConsentSelectedIndex((prev) => {
          if (prev === null) {
            return isForward ? 0 : options.length - 1
          }
          const delta = isForward ? 1 : -1
          const next = (prev + delta + options.length) % options.length
          return next
        })
        return
      }

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !value.trim() && consentSelectedIndex !== null) {
        e.preventDefault()
        const chosen = options[consentSelectedIndex]
        void handleQuestionConsent(chosen)
        return
      }
    }

    // Clarifying-question option navigation
    if (
      answeringQuestions &&
      clarifyingQuestions &&
      clarifyingQuestions.length > 0 &&
      currentQuestionIndex < clarifyingQuestions.length
    ) {
      const current = clarifyingQuestions[currentQuestionIndex]
      const options = current.options ?? []

      if (options.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          const isForward = e.key === 'ArrowDown' || e.key === 'ArrowRight'
          setClarifyingSelectedOptionIndex((prev) => {
            if (prev === null) {
              return isForward ? 0 : options.length - 1
            }
            const delta = isForward ? 1 : -1
            const next = (prev + delta + options.length) % options.length
            return next
          })
          return
        }

        if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !value.trim() && clarifyingSelectedOptionIndex !== null) {
          e.preventDefault()
          void handleClarifyingOptionClick(clarifyingSelectedOptionIndex)
          return
        }
      }
    }

    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      const trimmed = value.trim()

      // Plain Enter submits instead of inserting a newline
      e.preventDefault()
      submitCurrent()
    }
    // Cmd/Ctrl+Enter: allow default newline behavior
  }

  function handleVoiceClick() {
    setIsListening((prev) => !prev)
  }

  const inputPlaceholder =
    editablePrompt !== null
      ? `Provide feedback about the generated prompt or press ${isMac ? '⌘+Enter' : 'Ctrl+Enter'} to copy`
      : 'Give us context to create an effective prompt'

  return (
    <div className="relative mx-auto flex h-[70vh] w-[85vw] max-w-6xl flex-col gap-3 rounded-2xl bg-[#050608] p-4 shadow-[0_0_160px_rgba(15,23,42,0.95)]">
      <CenteredToast message={toastMessage} />

      <TerminalHeader
        headerHelpShown={headerHelpShown}
        onHelpClick={() => {
          if (headerHelpShown) return
          appendLine('user', '/help')
          handleHelpCommand()
          setHeaderHelpShown(true)
        }}
      />

      <form onSubmit={handleFormSubmit} className="relative flex-1 text-[14px]">
        <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden border-t border-slate-800 bg-[#050608]">
          <TerminalOutputArea
            lines={lines}
            editablePrompt={editablePrompt}
            awaitingQuestionConsent={awaitingQuestionConsent}
            consentSelectedIndex={consentSelectedIndex}
            answeringQuestions={answeringQuestions}
            currentClarifyingQuestion={
              answeringQuestions &&
              clarifyingQuestions &&
              clarifyingQuestions.length > 0 &&
              currentQuestionIndex < clarifyingQuestions.length
                ? clarifyingQuestions[currentQuestionIndex]
                : null
            }
            clarifyingSelectedOptionIndex={clarifyingSelectedOptionIndex}
            editablePromptRef={editablePromptRef}
            isPromptEditable={isPromptEditable}
            isPromptFinalized={isPromptFinalized}
            scrollRef={scrollRef}
            inputRef={inputRef}
            onHelpCommandClick={(cmd) => {
              setValue(cmd)
              if (inputRef.current) inputRef.current.focus()
            }}
            onConsentOptionClick={(index) => {
              const v = index === 0 ? 'yes' : 'no'
              setConsentSelectedIndex(index)
              void handleQuestionConsent(v)
            }}
            onClarifyingOptionClick={handleClarifyingOptionClick}
            onEditableChange={(text) => {
              setEditablePrompt(text)
              autosizeEditablePrompt()
            }}
            onCopyEditable={() => void copyEditablePrompt()}
            onEditClick={() => {
              setIsPromptEditable(true)
              setIsPromptFinalized(false)
              if (editablePromptRef.current) {
                const el = editablePromptRef.current
                el.focus()
                const len = el.value.length
                el.setSelectionRange(len, len)
              }
            }}
            onApproveClick={handleApprovePrompt}
          />

          <TerminalInputBar
            value={value}
            onChange={setValue}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            inputRef={inputRef}
          />
        </div>

        <TerminalChromeButtons
          isListening={isListening}
          isGenerating={isGenerating}
          onToggleListening={handleVoiceClick}
          onStop={handleStopClick}
          onSubmit={submitCurrent}
        />
      </form>
    </div>
  )
}

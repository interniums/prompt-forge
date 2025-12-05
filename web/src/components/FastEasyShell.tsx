'use client'

import { useState } from 'react'

const textButtonClass =
  'cursor-pointer bg-transparent px-0 py-0 text-[11px] text-zinc-500 font-mono underline-offset-4 hover:text-zinc-100 hover:underline'

type TerminalRole = 'system' | 'user' | 'app'

type TerminalLine = {
  id: number
  role: TerminalRole
  text: string
}

type Preferences = {
  tone?: string
  audience?: string
  domain?: string
}

type PreferencesStep = 'tone' | 'audience' | 'domain' | null

export function FastEasyShell() {
  const [value, setValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [lines, setLines] = useState<TerminalLine[]>([{
    id: 0,
    role: 'system',
    text: 'Describe your task and what kind of AI answer you expect.',
  }])
  const [preferences, setPreferences] = useState<Preferences>({})
  const [preferencesStep, setPreferencesStep] = useState<PreferencesStep>(null)
  const [headerHelpShown, setHeaderHelpShown] = useState(false)
  const [lastClearedLines, setLastClearedLines] = useState<TerminalLine[] | null>(null)

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
    appendLine(
      'app',
      'First, what tone do you prefer? (for example: casual, neutral, or formal?)',
    )
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
    }
  }

  function handleHelpCommand() {
    appendLine('app', 'Available commands:')
    appendLine('app', '/help        Show this help.')
    appendLine('app', '/preferences Update your preferences (tone, audience, domain).')
    appendLine('app', '/clear       Clear terminal history (can be restored once).')
    appendLine('app', '/restore     Restore the last cleared history snapshot.')
    appendLine(
      'app',
      'Anything else is treated as a task description. The app will use your preferences to shape prompts.',
    )
  }

  function handleClear() {
    setLastClearedLines(lines)
    setLines([
      {
        id: 0,
        role: 'system',
        text: 'History cleared. Use /restore to bring it back.',
      },
    ])
  }

  function handleRestore() {
    if (!lastClearedLines) {
      appendLine('app', 'Nothing to restore yet.')
      return
    }

    setLines(lastClearedLines)
  }

  function handleCommand(raw: string) {
    const [command] = raw.split(/\s+/, 1)

    switch (command) {
      case '/help': {
        handleHelpCommand()
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
      default: {
        appendLine('app', `Unknown command: ${command}. Type /help to see what you can do.`)
      }
    }
  }

  function handleTask(line: string) {
    appendLine('app', 'Noted. This will eventually generate high-quality prompts tailored to your preferences.')
    appendLine('app', `For now, I am treating this as a task description: "${line}"`)
  }

  function submitCurrent() {
    const line = value.trim()
    if (!line) return

    appendLine('user', line)

    if (line.startsWith('/')) {
      handleCommand(line)
    } else if (preferencesStep) {
      advancePreferences(line)
    } else {
      handleTask(line)
    }

    setValue('')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      // Plain Enter submits instead of inserting a newline
      e.preventDefault()
      submitCurrent()
    }
    // Cmd/Ctrl+Enter: allow default newline behavior
  }

  function handleVoiceClick() {
    setIsListening((prev) => !prev)
  }

  return (
    <div className="mx-auto flex h-[60vh] w-[80vw] max-w-5xl flex-col gap-3 rounded-2xl bg-[#050608] p-4 shadow-[0_0_160px_rgba(15,23,42,0.95)]">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <button
          type="button"
          onClick={() => {
            if (headerHelpShown) return
            appendLine('user', '/help')
            handleHelpCommand()
            setHeaderHelpShown(true)
          }}
          className={textButtonClass}
        >
          Type /help for commands
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="relative flex-1 text-[14px]">
        <div className="absolute inset-0 flex flex-col overflow-hidden border-t border-slate-800 bg-[#050608]">
          <div className="terminal-scroll flex-1 space-y-1 overflow-y-auto px-3 pt-3 text-[13px] leading-relaxed text-slate-200 font-mono">
            {lines.map((line) => (
              <div key={line.id} className="whitespace-pre-wrap">
                <span className="pr-1 text-zinc-500">
                  {line.role === 'user' ? '>' : line.role === 'app' ? '·' : '#'}
                </span>
                {line.text}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 bg-[#050608]">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Give us context to create an effective prompt"
              className="terminal-input h-16 w-full resize-none bg-transparent px-3 pb-3 pt-2 text-[15px] leading-relaxed text-slate-50 outline-none placeholder:text-slate-500 font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleVoiceClick}
          aria-pressed={isListening}
          className={`absolute right-3 top-3 ${textButtonClass}`}
        >
          {isListening ? 'Listening' : 'Mic'}
        </button>

        <button
          type="submit"
          className={`absolute bottom-3 right-3 ${textButtonClass}`}
        >
          Press Enter or click here to submit
        </button>
      </form>
    </div>
  )
}

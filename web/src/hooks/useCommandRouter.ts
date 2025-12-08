'use client'

import { useCallback } from 'react'
import { COMMAND, ROLE, type TerminalRole } from '@/lib/constants'
import { recordEvent } from '@/services/eventsService'

type CommandDeps = {
  editablePrompt: string | null
  handleHelpCommand: () => void
  handleClear: () => void
  handleRestore: () => void
  handleDiscard: () => void
  handleHistory: () => void
  handleUseFromHistory: (index: number) => void
  handleEditPrompt: (instructions: string) => void
  startPreferencesFlow: () => void
  appendLine: (role: TerminalRole, text: string) => void
}

export function useCommandRouter({
  editablePrompt,
  handleHelpCommand,
  handleClear,
  handleRestore,
  handleDiscard,
  handleHistory,
  handleUseFromHistory,
  handleEditPrompt,
  startPreferencesFlow,
  appendLine,
}: CommandDeps) {
  const handleCommand = useCallback(
    (line: string) => {
      const parts = line.trim().split(/\s+/)
      const [command, ...rest] = parts
      void recordEvent('command', { command: line.trim() })

      switch (command) {
        case COMMAND.HELP: {
          handleHelpCommand()
          return
        }
        case COMMAND.PREFERENCES: {
          startPreferencesFlow()
          return
        }
        case COMMAND.CLEAR: {
          handleClear()
          return
        }
        case COMMAND.RESTORE: {
          handleRestore()
          return
        }
        case COMMAND.DISCARD: {
          handleDiscard()
          return
        }
        case COMMAND.HISTORY: {
          void handleHistory()
          return
        }
        case COMMAND.USE: {
          const arg = rest[0]
          const index = Number(arg)
          if (!arg || Number.isNaN(index)) {
            appendLine(ROLE.APP, `Usage: ${COMMAND.USE} <number>. Use ${COMMAND.HISTORY} to see entries.`)
            return
          }
          handleUseFromHistory(index)
          return
        }
        case COMMAND.EDIT: {
          const instructions = rest.join(' ')
          if (!instructions.trim()) {
            appendLine(
              ROLE.APP,
              `Usage: ${COMMAND.EDIT} <how you want the current prompt changed> (for example: "shorter", "for a CTO").`
            )
            return
          }
          if (!editablePrompt) {
            appendLine(ROLE.APP, 'There is no prompt to edit yet. Generate one first.')
            return
          }
          handleEditPrompt(instructions.trim())
          return
        }
        default: {
          appendLine(ROLE.APP, `Unknown command: ${command}. Type ${COMMAND.HELP} to see what you can do.`)
        }
      }
    },
    [
      appendLine,
      editablePrompt,
      handleClear,
      handleDiscard,
      handleEditPrompt,
      handleHelpCommand,
      handleHistory,
      handleRestore,
      handleUseFromHistory,
      startPreferencesFlow,
    ]
  )

  return { handleCommand }
}

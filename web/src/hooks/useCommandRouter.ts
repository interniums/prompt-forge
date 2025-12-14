'use client'

import { useCallback } from 'react'
import { COMMAND } from '@/lib/constants'
import { recordEvent } from '@/services/eventsService'

type CommandDeps = {
  handleDiscard: () => void
}

export function useCommandRouter({ handleDiscard }: CommandDeps) {
  const handleCommand = useCallback(
    (line: string) => {
      const command = line.trim().split(/\s+/)[0]
      void recordEvent('command', { command: line.trim() })

      switch (command) {
        case COMMAND.DISCARD: {
          handleDiscard()
          return
        }
        default: {
          // Unknown command - silently ignored
        }
      }
    },
    [handleDiscard]
  )

  return { handleCommand }
}

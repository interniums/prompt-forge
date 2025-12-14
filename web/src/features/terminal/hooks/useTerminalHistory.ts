'use client'

import { useTerminalSnapshotsController } from '@/hooks/useTerminalSnapshotsController'
import type { TerminalSnapshotActions, TerminalSnapshotState } from '@/hooks/useTerminalSnapshotsController'
import { useMemo } from 'react'

export function useTerminalHistory(state: TerminalSnapshotState, actions: TerminalSnapshotActions) {
  const { handleClear, handleDiscard, handleStartNewConversation, handleRestore, handleHistory, handleUseFromHistory } =
    useTerminalSnapshotsController(state, actions)

  return useMemo(
    () => ({
      handleClear,
      handleDiscard,
      handleStartNewConversation,
      handleRestore,
      handleHistory,
      handleUseFromHistory,
    }),
    [handleClear, handleDiscard, handleHistory, handleRestore, handleStartNewConversation, handleUseFromHistory]
  )
}

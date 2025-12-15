'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HistoryItem } from '@/lib/types'
import { listHistory } from '@/services/historyService'

export type HistoryPanelStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

type UsePromptHistoryPanelOptions = {
  open: boolean
  pageSize?: number
  onItems?: (items: HistoryItem[]) => void
}

type UsePromptHistoryPanelResult = {
  items: HistoryItem[]
  status: HistoryPanelStatus
  error: string | null
  isLoading: boolean
  loadingMore: boolean
  hasMore: boolean
  refresh: () => void
  loadMore: () => void
}

/**
 * Lazy-loads prompt history when the panel is opened.
 */
export function usePromptHistoryPanel({
  open,
  pageSize = 20,
  onItems,
}: UsePromptHistoryPanelOptions): UsePromptHistoryPanelResult {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [status, setStatus] = useState<HistoryPanelStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const isLoading = status === 'loading'

  const fetchPage = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if ((isLoading || loadingMore) && !reset) {
        return
      }

      const nextOffset = reset ? 0 : offset

      if (reset) {
        setStatus('loading')
        setError(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      try {
        const page = await listHistory({ limit: pageSize, offset: nextOffset })
        const nextItems = reset ? page : [...items, ...page]
        setItems(nextItems)
        setOffset(nextOffset + page.length)
        setHasMore(page.length === pageSize)
        setStatus(nextItems.length === 0 ? 'empty' : 'ready')
        onItems?.(nextItems)
      } catch (err) {
        console.error('Failed to load prompt history', err)
        setError('Unable to load history. Please retry.')
        setStatus('error')
      } finally {
        setLoadingMore(false)
        if (reset) {
          // If reset fetch completed, clear loading flag
          setStatus((prev) => (prev === 'loading' ? 'ready' : prev))
        }
      }
    },
    [isLoading, items, loadingMore, offset, onItems, pageSize]
  )

  const refresh = useCallback(() => {
    if (!open) return
    void fetchPage({ reset: true })
  }, [fetchPage, open])

  const loadMore = useCallback(() => {
    if (!open || !hasMore || loadingMore || isLoading) return
    void fetchPage({ reset: false })
  }, [fetchPage, hasMore, isLoading, loadingMore, open])

  useEffect(() => {
    if (open && status === 'idle' && !isLoading) {
      void fetchPage({ reset: true })
    }
  }, [fetchPage, isLoading, open, status])

  // Keep derived status consistent when a reset finishes and no items are present
  useEffect(() => {
    if (status === 'ready' && items.length === 0) {
      setStatus('empty')
    }
  }, [items.length, status])

  return useMemo(
    () => ({
      items,
      status,
      error,
      isLoading,
      loadingMore,
      hasMore,
      refresh,
      loadMore,
    }),
    [error, hasMore, isLoading, items, loadMore, loadingMore, refresh, status]
  )
}

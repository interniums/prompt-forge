'use client'

import type { HistoryItem } from '@/lib/types'
import type { HistoryPanelStatus } from '@/features/terminal/hooks/usePromptHistoryPanel'

type PromptHistoryPanelProps = {
  open: boolean
  items: HistoryItem[]
  status: HistoryPanelStatus
  error: string | null
  isLoading: boolean
  loadingMore: boolean
  hasMore: boolean
  onClose: () => void
  onSelect: (index: number) => void
  onRefresh: () => void
  onLoadMore: () => void
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const diffMs = Date.now() - date.getTime()
  if (Number.isNaN(diffMs)) return ''

  const minutes = Math.floor(diffMs / 60000)
  if (minutes <= 0) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function HistoryItemRow({
  item,
  index,
  onSelect,
}: {
  item: HistoryItem
  index: number
  onSelect: (index: number) => void
}) {
  const relative = formatRelativeTime(item.created_at)
  return (
    <button
      type="button"
      className="w-full text-left rounded-lg border border-[color:var(--pf-border)] bg-[color:var(--pf-surface)] p-3 transition hover:border-[color:var(--pf-border-strong)] hover:bg-[color:var(--pf-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer text-[color:var(--pf-foreground)]"
      onClick={() => onSelect(index)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-100 line-clamp-2">{item.task || item.label}</div>
        <div className="text-[12px] text-slate-400 shrink-0">{relative}</div>
      </div>
      <div className="mt-1 text-[12px] text-slate-400 line-clamp-2">{item.body}</div>
    </button>
  )
}

export function PromptHistoryPanel({
  open,
  items,
  status,
  error,
  isLoading,
  loadingMore,
  hasMore,
  onClose,
  onSelect,
  onRefresh,
  onLoadMore,
}: PromptHistoryPanelProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-y-0 left-0 z-40 flex w-full max-w-[320px] transform transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-[110%]'
      }`}
      aria-hidden={!open}
    >
      <div className="pointer-events-auto flex h-full w-full flex-col bg-[color:var(--pf-surface-strong)] border-r border-[color:var(--pf-border-strong)] shadow-[0_12px_28px_color-mix(in_oklab,#000_30%,transparent)] backdrop-blur-md text-[color:var(--pf-foreground)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--pf-border)]/70">
          <div>
            <div className="text-[13px] uppercase tracking-wide text-slate-500">History</div>
            <div className="text-sm text-slate-100">Past 30 days</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--pf-border)] bg-[color:var(--pf-surface)] px-3 text-[13px] font-semibold text-[color:var(--pf-foreground)] transition hover:border-[color:var(--pf-border-strong)] hover:bg-[color:var(--pf-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--pf-foreground-muted)] transition hover:bg-[color:var(--pf-surface)] hover:text-[color:var(--pf-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
              aria-label="Close history"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} fill="none">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {status === 'loading' && (
            <div className="flex items-center justify-center h-20 text-slate-400">
              <span
                className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
                aria-label="Loading"
              />
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-100">
              <div className="font-semibold">Could not load history</div>
              <div className="mt-1 text-amber-50/90">{error ?? 'Please try again.'}</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center justify-center rounded-md border border-amber-400/70 px-3 py-1.5 text-[12px] font-semibold text-amber-50 transition hover:border-amber-300 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {status === 'empty' && (
            <div className="rounded-lg border border-[color:var(--pf-border)] bg-[color:var(--pf-surface)] p-3 text-[13px] text-[color:var(--pf-foreground)]/85">
              No prompts yet. Your last 30 days of prompts will appear here.
            </div>
          )}

          {(status === 'ready' || status === 'loading') &&
            items.map((item, idx) => <HistoryItemRow key={item.id} item={item} index={idx} onSelect={onSelect} />)}
        </div>

        <div className="border-t border-[color:var(--pf-border)]/80 px-3 py-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={!hasMore || loadingMore || isLoading}
            className="inline-flex w-full items-center justify-center rounded-md border border-(--pf-border) bg-(--pf-surface) px-3 py-2 text-[13px] font-semibold text-[color:var(--pf-foreground)] transition hover:border-(--pf-border-strong) hover:bg-(--pf-surface-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : hasMore ? 'Load more' : 'No more history'}
          </button>
        </div>
      </div>
    </div>
  )
}

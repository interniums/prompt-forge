'use client'

/**
 * Skeleton loader for the terminal while session data is being fetched.
 * Maintains the same visual structure as the actual terminal.
 */
export function TerminalSkeleton() {
  return (
    <div
      className="relative mx-auto flex h-[70vh] w-[92vw] max-w-6xl flex-col gap-3 rounded-2xl bg-slate-950 p-4 shadow-[0_0_160px_rgba(15,23,42,0.95)]"
      role="status"
      aria-label="Loading terminal..."
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-800 animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-800 animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-800 animate-pulse" />
        </div>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 animate-pulse" />
      </div>

      {/* Content + input area skeleton (mirrors TerminalMain layout) */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 flex min-h-0 flex-col">
          <div className="flex-1 border-t border-slate-800 bg-slate-950">
            <div className="space-y-3 px-3 pt-3 pb-4">
              {/* Simulated terminal lines */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-slate-800 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-600 bg-slate-950 pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2">
              <div className="h-[44px] flex-1 rounded-lg bg-slate-900 animate-pulse" />
              <div className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950 animate-pulse" />
              <div className="inline-flex h-[44px] w-[48px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading terminal interface, please wait...</span>
    </div>
  )
}

'use client'

/**
 * Skeleton loader for the terminal while session data is being fetched.
 * Maintains the same visual structure as the actual terminal.
 */
export function TerminalSkeleton() {
  return (
    <div
      className="relative mx-auto flex h-[70vh] w-[92vw] max-w-6xl flex-col gap-3 rounded-2xl bg-[#050608] p-4 shadow-[0_0_160px_rgba(15,23,42,0.95)]"
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
        <div className="h-4 w-48 rounded bg-slate-800 animate-pulse" />
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 border-t border-slate-800 bg-[#050608] p-3">
        <div className="space-y-3">
          {/* Simulated terminal lines */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-3 rounded bg-slate-800 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="border-t border-slate-800 p-3">
        <div className="h-10 w-full rounded bg-slate-800/50 animate-pulse" />
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading terminal interface, please wait...</span>
    </div>
  )
}

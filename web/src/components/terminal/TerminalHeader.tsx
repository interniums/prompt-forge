'use client'

export type TerminalHeaderProps = {
  onProfileClick: () => void
}

export function TerminalHeader({ onProfileClick }: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between text-[13px] text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
      <button
        type="button"
        onClick={onProfileClick}
        className="group inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg border border-slate-700/80 bg-slate-950 text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
        title="User profile"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>
    </div>
  )
}

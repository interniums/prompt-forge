'use client'

export type TerminalHeaderProps = {
  onProfileClick: () => void
  onSettingsClick: () => void
}

export function TerminalHeader({ onProfileClick, onSettingsClick }: TerminalHeaderProps) {
  return (
    <div className="flex flex-col gap-2 text-[13px] text-slate-400 sm:flex-row sm:items-center sm:justify-between pt-4 px-4 z-10">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSettingsClick}
          className="group inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg border border-slate-700/80 bg-slate-950 text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
          title="Preferences"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.997.608 2.296.07 2.573-1.065Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
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
    </div>
  )
}

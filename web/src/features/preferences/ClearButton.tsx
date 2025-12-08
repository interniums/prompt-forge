'use client'

type ClearButtonProps = {
  onClick: () => void
  show?: boolean
  rightOffset?: string
}

export function ClearButton({ onClick, show = true, rightOffset = 'right-2' }: ClearButtonProps) {
  if (!show) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute ${rightOffset} top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors z-10 cursor-pointer`}
      aria-label="Clear"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

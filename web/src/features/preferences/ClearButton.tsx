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
      className={`absolute ${rightOffset} top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded cursor-pointer z-10 text-[color:var(--pf-foreground-muted)] hover:text-[color:var(--pf-foreground)] hover:bg-[color-mix(in_oklab,var(--pf-foreground)_10%,transparent)] transition-colors`}
      aria-label="Clear"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

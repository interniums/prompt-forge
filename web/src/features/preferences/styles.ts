'use client'

export const modalBackdropClass =
  'fixed inset-0 z-100 flex items-start justify-center bg-black/45 backdrop-blur-md transition overflow-y-auto px-4 py-6 sm:px-6 sm:py-10'

export const modalCardClass =
  'w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border bg-[var(--pf-surface)] text-[color:var(--pf-foreground)] border-[color:var(--pf-border)] ring-1 ring-[color:var(--pf-border-strong)] shadow-[0_14px_40px_color-mix(in_oklab,#000_18%,transparent)] terminal-scroll p-4 sm:p-6 safe-px safe-pt safe-pb'

const baseField =
  'w-full font-mono bg-(--pf-surface-strong) border border-(--pf-border-strong) rounded-md text-base text-[color:var(--pf-foreground)] placeholder-[color:var(--pf-foreground-muted)] shadow-[0_8px_22px_color-mix(in_oklab,#000_14%,transparent)] focus:border-(--pf-border-strong) focus:text-[color:var(--pf-foreground)] focus:outline-none'

export const preferenceInputClass = `${baseField} px-3 py-2.5 pr-16`
export const preferenceSelectTriggerClass = `${baseField} px-3 py-2.5 cursor-pointer`
export const preferenceTextareaClass = `${baseField} px-3 py-2.5 pr-12 resize-none`

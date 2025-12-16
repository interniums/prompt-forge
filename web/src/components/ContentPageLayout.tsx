import Link from 'next/link'
import type { ReactNode } from 'react'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type ContentPageLayoutProps = {
  title: string
  intro: string
  children: ReactNode
  actionHref?: string
  actionLabel?: string
  tag?: string
}

export function ContentPageLayout({
  title,
  intro,
  children,
  actionHref = '/generate',
  actionLabel = 'Back to app',
  tag,
}: ContentPageLayoutProps) {
  const headingId = `${slugify(title)}-heading`
  const introId = `${slugify(title)}-intro`

  return (
    <main
      role="main"
      aria-labelledby={headingId}
      aria-describedby={introId}
      className="relative min-h-screen safe-px py-12 sm:py-16"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_55%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.12),transparent_55%)]" />
      <div className="responsive-container flex flex-col gap-8 sm:gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            {tag ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--pf-foreground)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                }}
              >
                {tag}
              </span>
            ) : null}
            <h1
              id={headingId}
              className="text-3xl font-semibold tracking-tight"
              style={{ color: 'var(--pf-foreground)' }}
            >
              {title}
            </h1>
            <p id={introId} className="max-w-3xl text-sm leading-6" style={{ color: 'var(--pf-foreground-muted)' }}>
              {intro}
            </p>
          </div>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-(--pf-border) bg-[color:var(--pf-foreground)] px-4 text-sm font-semibold text-[color:var(--pf-background)] shadow-[0_12px_32px_color-mix(in_oklab,#000_22%,transparent)] transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-border-strong) focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
            >
              {actionLabel}
            </Link>
          ) : null}
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </main>
  )
}

type ContentSectionProps = {
  title: string
  children: ReactNode
  kicker?: string
  id?: string
}

export function ContentSection({ title, children, kicker, id }: ContentSectionProps) {
  const sectionId = id ?? slugify(title)
  const headingId = `${sectionId}-heading`

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6 shadow-[0_0_80px_rgba(0,0,0,0.35)] backdrop-blur"
      style={{
        backgroundColor: 'var(--pf-background)',
        color: 'var(--pf-foreground)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
      }}
    >
      <div className="space-y-2">
        {kicker ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--pf-foreground-muted)' }}>
            {kicker}
          </p>
        ) : null}
        <h2 id={headingId} className="text-xl font-semibold">
          {title}
        </h2>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-6" style={{ color: 'var(--pf-foreground-muted)' }}>
        {children}
      </div>
    </section>
  )
}

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
      className="relative min-h-screen px-6 py-12 sm:px-8 sm:py-16"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_55%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.12),transparent_55%)]" />
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
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
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
              style={{
                backgroundColor: 'var(--pf-foreground)',
                color: 'var(--pf-background)',
              }}
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
      className="rounded-2xl border px-6 py-6 shadow-[0_0_80px_rgba(0,0,0,0.35)] backdrop-blur"
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

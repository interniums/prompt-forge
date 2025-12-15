import Link from 'next/link'

const year = new Date().getFullYear()
const legalName = '{LEGAL_NAME_OR_COMPANY_NAME}'
const supportEmail = 'support@promptforge.app'

const linkStyles =
  'transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer'

export function SiteFooter() {
  return (
    <footer
      className="mt-12 border-t px-6 py-10 sm:px-10"
      style={{
        backgroundColor: 'rgba(12, 15, 23, 0.72)',
        borderColor: 'rgba(148, 163, 184, 0.18)',
        color: 'var(--pf-foreground)',
        backdropFilter: 'blur(12px)',
      }}
      aria-label="Site footer"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-2 text-base font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
              PF
            </span>
            <span>PromptForge</span>
          </div>
          <p className="text-sm leading-6" style={{ color: 'var(--pf-foreground-muted)' }}>
            A calm, reliable prompt builder with clarifying questions, edits, and saved preferences. Built for production use and backed by Paddle billing.
          </p>
          <p className="text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
            Need help? Email{' '}
            <a href={`mailto:${supportEmail}`} className={`${linkStyles} underline underline-offset-4`}>
              {supportEmail}
            </a>
            . We aim to reply within 1–2 business days.
          </p>
        </div>

        <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <nav aria-label="Product" className="space-y-3">
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
              <li>
                <Link href="/features" className={`${linkStyles} underline-offset-4`}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={`${linkStyles} underline-offset-4`}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/generate" className={`${linkStyles} underline-offset-4`}>
                  Launch app
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company" className="space-y-3">
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
              <li>
                <Link href="/terms" className={`${linkStyles} underline-offset-4`}>
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={`${linkStyles} underline-offset-4`}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={`${linkStyles} underline-offset-4`}>
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className={`${linkStyles} underline-offset-4`}>
                  Contact / Support
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal notices" className="space-y-3">
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
              <li>© {year} {legalName}</li>
              <li>{supportEmail}</li>
              <li>{'{BUSINESS_ADDRESS}'}</li>
              <li>{'{COUNTRY}'}</li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}


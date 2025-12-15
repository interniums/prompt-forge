import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Legal | PromptForge',
  description: 'All PromptForge legal and policy links in one place.',
}

const supportEmail = 'support@promptforge.app'

export default function LegalPage() {
  return (
    <ContentPageLayout
      title="Legal"
      intro="One hub for our terms, privacy, billing, and refund policies. Pick the doc you need or contact us if something is unclear."
      tag="Transparent and simple"
    >
      <ContentSection title="Quick links" kicker="Start here" id="quick-links">
        <ul className="space-y-3 text-sm">
          <li>
            <Link href="/terms" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Terms of Service
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              Rules for using PromptForge, billing basics, acceptable use, and liability.
            </p>
          </li>
          <li>
            <Link href="/privacy" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Privacy Policy
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              What we collect, where data lives, retention, and your choices.
            </p>
          </li>
          <li>
            <Link href="/refund-policy" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Refund Policy
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              How renewals work, eligibility windows, and how to request a refund.
            </p>
          </li>
          <li>
            <Link href="/pricing" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Pricing
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              Current plans, quotas, and billing notes managed via Paddle.
            </p>
          </li>
          <li>
            <Link href="/features" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Features
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              What the product does, deliverables, and built-in safeguards.
            </p>
          </li>
          <li>
            <Link href="/contact" className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]">
              Contact / Support
            </Link>
            <p className="text-xs text-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]">
              How to reach us and expected response times.
            </p>
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact and notices" kicker="Need help?" id="contact">
        <ul className="space-y-2 text-sm">
          <li>
            Email{' '}
            <a
              href={`mailto:${supportEmail}`}
              className="cursor-pointer underline underline-offset-4 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)]"
            >
              {supportEmail}
            </a>{' '}
            for legal or billing questions. We aim to reply within 2 business days.
          </li>
          <li>Material changes to these documents are announced in-app and, when possible, via email.</li>
        </ul>
      </ContentSection>
    </ContentPageLayout>
  )
}


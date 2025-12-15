import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy | PromptForge',
  description: 'How PromptForge collects, uses, and protects your data.',
}

const supportEmail = 'support@promptforge.app'
const legalName = '{LEGAL_NAME_OR_COMPANY_NAME}'
const country = '{COUNTRY}'
const businessAddress = '{BUSINESS_ADDRESS}'
const effectiveDate = 'December 15, 2025'

export default function PrivacyPage() {
  return (
    <ContentPageLayout
      title="Privacy Policy"
      intro="We only collect what’s required to operate PromptForge, bill you through Paddle, and help you when you reach out."
      tag={`Effective ${effectiveDate}`}
      actionHref="/docs"
      actionLabel="Back to docs"
    >
      <ContentSection title="Who we are" kicker="Data controller">
        <ul className="space-y-2">
          <li>Provider: {legalName}.</li>
          <li>Service: PromptForge (prompt builder web app).</li>
          <li>Contact: {supportEmail}.</li>
          <li>Registered country: {country}.</li>
          <li>Business address: {businessAddress}.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Quick summary" kicker="Straightforward data use">
        <ul className="space-y-2">
          <li>We keep account basics, preferences, and prompt history so the terminal works as expected.</li>
          <li>Paddle is our merchant of record; we never store full card details on PromptForge systems.</li>
          <li>
            Model requests go to our providers (e.g., OpenAI) only to generate responses—not to train their models.
          </li>
          <li>Drafts and UI state live locally in your browser; clearing storage removes them from your device.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Data we collect">
        <ul className="space-y-2">
          <li>Account: email address, authentication events, and subscription state.</li>
          <li>Product: prompts you submit, clarifying answers, edits, history, and saved preferences.</li>
          <li>
            Technical logs: IP address, device/browser info, timestamps, and error logs to keep the service reliable.
          </li>
          <li>Billing: plan selections, invoices, taxes, and payment status (handled by Paddle).</li>
        </ul>
      </ContentSection>

      <ContentSection title="How we use data">
        <ul className="space-y-2">
          <li>Operate the terminal: generate prompts, store history, and restore drafts.</li>
          <li>Secure the service: prevent abuse, enforce quotas, and monitor reliability.</li>
          <li>Support: respond to tickets, receipt updates, and account changes.</li>
          <li>Legal and compliance: meet tax, accounting, and audit requirements (primarily via Paddle records).</li>
        </ul>
      </ContentSection>

      <ContentSection title="Where data lives and who processes it">
        <ul className="space-y-2">
          <li>Supabase stores authentication data, preferences, session history, and quotas (managed PostgreSQL).</li>
          <li>
            OpenAI processes prompt content to generate clarifying questions and final prompts. Their API policies apply.
          </li>
          <li>Paddle is the merchant of record for payments; card data stays with Paddle and its processors.</li>
          <li>Your browser stores drafts and some preferences locally so you can resume work after a reload.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Cookies and local storage">
        <ul className="space-y-2">
          <li>`pf_session_id` (httpOnly) keeps your session consistent between requests.</li>
          <li>`pf_theme` remembers your theme choice (light, dim, or dark).</li>
          <li>
            Local storage: drafts (`pf_draft`), preferences cache, and UI state to restore your place after a refresh.
          </li>
          <li>We do not use third-party ad or tracking cookies.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Retention and deletion">
        <ul className="space-y-2">
          <li>Session history and preferences are retained while your account is active, subject to storage caps.</li>
          <li>Drafts are cleared when you approve a prompt or if you clear local storage.</li>
          <li>Billing records are retained as required for tax and accounting.</li>
          <li>
            Request deletion or export of your account data by emailing {supportEmail}. We honor requests unless law or
            billing records require retention.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Security">
        <ul className="space-y-2">
          <li>All traffic is encrypted with HTTPS; service keys stay server-side.</li>
          <li>We enforce Content Security Policy, referrer policy, and secure, httpOnly cookies.</li>
          <li>Access to production data is limited to essential personnel with audited access.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Your choices and rights">
        <ul className="space-y-2">
          <li>Access, correct, or delete your data by contacting us.</li>
          <li>Cancel subscriptions anytime; you retain access through the paid period.</li>
          <li>You can disable local storage for drafts, but some features may not function fully.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Email{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
          >
            {supportEmail}
          </a>{' '}
          for privacy questions. We reply within 1–2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}

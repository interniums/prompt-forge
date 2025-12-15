import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy | PromptForge',
  description: 'How PromptForge collects, uses, and protects your data.',
}

const supportEmail = 'support@promptforge.app'
const effectiveDate = 'December 15, 2025'

export default function PrivacyPage() {
  return (
    <ContentPageLayout
      title="Privacy Policy"
      intro="We collect only what we need to run PromptForge, bill you through Paddle, and support the product."
      tag={`Effective ${effectiveDate}`}
    >
      <ContentSection title="Quick summary" kicker="Straightforward data use">
        <ul className="space-y-2">
          <li>We store account details, preferences, and prompt history to run the terminal experience.</li>
          <li>Paddle processes payments; we do not store full card details.</li>
          <li>Model calls go to OpenAI; prompts are used only to generate responses and not to train our models.</li>
          <li>Drafts also live in your browser’s local storage so you can recover work if a tab closes.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Data we collect">
        <ul className="space-y-2">
          <li>Account: email address and authentication events.</li>
          <li>Product data: prompts you submit, clarifying answers, edits, histories, and saved preferences.</li>
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
          <li>Support: respond to tickets, receipts, and account changes.</li>
          <li>Legal and compliance: meet tax, accounting, and audit requirements.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Where data lives and who processes it">
        <ul className="space-y-2">
          <li>Supabase stores authentication data, preferences, session history, and quotas (PostgreSQL, hosted).</li>
          <li>
            OpenAI processes prompt content to generate clarifying questions and final prompts. Their API policies
            apply.
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
        </ul>
      </ContentSection>

      <ContentSection title="Retention and deletion">
        <ul className="space-y-2">
          <li>Session history and preferences are retained while your account is active, subject to storage caps.</li>
          <li>Drafts are cleared after you approve a prompt or when local storage is cleared.</li>
          <li>Billing records are kept as required for tax and accounting.</li>
          <li>
            Request deletion or export of your account data by emailing {supportEmail}. We honor requests unless law or
            billing records require retention.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Security">
        <ul className="space-y-2">
          <li>Data is transmitted over HTTPS. Service keys stay server-side.</li>
          <li>We apply Content Security Policy, referrer policy, and secure cookies by default.</li>
          <li>Access to production data is limited to essential personnel.</li>
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
          <a href={`mailto:${supportEmail}`} className="underline">
            {supportEmail}
          </a>{' '}
          for privacy questions. We reply within 2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}

import type { Metadata } from 'next'
import { RefundPolicyContent } from '../refund/page'

export const metadata: Metadata = {
  title: 'Refund Policy | PromptForge',
  description: 'Refunds, cancellations, and renewals for PromptForge subscriptions (via Paddle).',
  alternates: {
    canonical: '/refund-policy',
  },
}

export default function RefundPolicyPage() {
  return <RefundPolicyContent />
}


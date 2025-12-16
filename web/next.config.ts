import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const allowedSupabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : ''

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `connect-src 'self' ${allowedSupabaseHost} https://api.openai.com https://us.i.posthog.com https://*.paddle.com https://cdn.paddle.com`,
      "script-src 'self' 'unsafe-inline' https://cdn.paddle.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://cdn.simpleicons.org",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src 'self' https://*.paddle.com",
      "frame-ancestors 'self' https://*.paddle.com http://localhost http://localhost:3000 https://localhost:3000",
      "form-action 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

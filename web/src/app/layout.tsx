import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthSessionSync } from '@/components/AuthSessionSync'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PromptForge',
  description: 'A minimalistic, high-craft prompt generator for turning fuzzy goals into clear, reusable prompts.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}>
        <AuthSessionSync />
        {/* Pages control their own layout - no wrapper constraints */}
        {children}
      </body>
    </html>
  )
}

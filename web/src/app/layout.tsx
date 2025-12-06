import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "./shell/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptForge",
  description: "A minimalistic, high-craft prompt generator for turning fuzzy goals into clear, reusable prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50 overflow-hidden`}
      >
        <div className="min-h-screen flex flex-col">
          {/* Hide header on landing to keep it focused and terminal-like */}
          <Header />
          <main className="flex-1 bg-gradient-to-b from-zinc-950 to-zinc-900">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

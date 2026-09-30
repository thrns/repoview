import type { Metadata } from 'next'
import { Inter, Manrope, Source_Code_Pro } from 'next/font/google'
import './globals.css'

import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RepoView — Share private repositories without making them public',
  description: 'Create a secure, read-only repository link and understand how viewers engage with your private code.',
}

// The page CSP is nonce-based in production. Keep the app request-rendered so
// Next can attach each request's nonce to its generated scripts.
export const dynamic = 'force-dynamic'

const inter = Inter({
  variable: '--font-inter',
  display: 'swap',
  subsets: ['latin'],
  fallback: ['Helvetica Neue', 'Helvetica', 'ui-sans-serif', 'system-ui', 'sans-serif'],
})

const manrope = Manrope({
  variable: '--font-manrope',
  display: 'swap',
  subsets: ['latin'],
  fallback: ['Inter', 'Helvetica Neue', 'Helvetica', 'ui-sans-serif', 'system-ui', 'sans-serif'],
})

const sourceCodePro = Source_Code_Pro({
  variable: '--font-source-code-pro',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  fallback: ['ui-monospace', 'Menlo', 'monospace'],
})

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable} ${sourceCodePro.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

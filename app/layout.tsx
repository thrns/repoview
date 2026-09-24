import type { Metadata } from 'next'
import './globals.css'
import 'yet-another-react-lightbox/styles.css'

import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RepoView — Share private repositories without making them public',
  description: 'Create a secure, read-only repository link and understand how viewers engage with your private code.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

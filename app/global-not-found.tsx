import type { Metadata } from 'next'

import { NotFoundContent } from '@/components/shared/not-found-content'

import './globals.css'

export const metadata: Metadata = {
  title: 'Page not found | RepoView',
  description: 'The requested RepoView page is not available.',
  robots: { index: false, follow: true },
}

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main id="main" className="min-h-screen bg-background">
          <NotFoundContent />
        </main>
      </body>
    </html>
  )
}

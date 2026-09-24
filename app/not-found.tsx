import Link from 'next/link'

import { ArrowLeft, FileQuestion } from 'lucide-react'

import { Card, CardContent } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <span className="font-heading text-sm font-semibold">RepoView</span>
          </div>
          <FileQuestion className="mt-8 size-6 text-foreground-muted" aria-hidden="true" />
          <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">The requested page is not available.</p>
          <Link href="/" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to RepoView
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

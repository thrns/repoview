import Link from 'next/link'

import { ArrowLeft, FileQuestion } from 'lucide-react'

import { Button, Card, CardFooter, CardHeader } from '@/components/ui'

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-lg shadow-none">
          <CardHeader className="flex-row items-start gap-3 space-y-0 border-border-secondary px-4 py-3.5 sm:px-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light" aria-hidden="true">
              <FileQuestion className="size-4" />
            </span>
            <div className="min-w-0">
              <h1 className="type-label">Page not found</h1>
              <p className="type-small text-foreground-muted">The requested page is not available.</p>
            </div>
          </CardHeader>
          <CardFooter className="justify-start px-4 py-3.5 sm:px-5">
            <Button asChild variant="outline" size="small">
              <Link href="/">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Return to RepoView
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

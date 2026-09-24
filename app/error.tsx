'use client'

import { AlertTriangle } from 'lucide-react'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <AlertTriangle className="size-5 text-foreground-muted" aria-hidden="true" />
            <div>
              <CardTitle>Something went wrong</CardTitle>
              <p className="mt-1 text-sm text-foreground-muted">The page could not be loaded safely.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => { window.location.href = '/' }}>Return home</Button>
        </CardContent>
      </Card>
    </main>
  )
}

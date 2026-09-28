'use client'

import { AlertTriangle } from 'lucide-react'

import { Button, ErrorDisplay, PageContainer } from '@/components/ui'

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="min-h-screen bg-background">
      <PageContainer size="small" className="flex min-h-screen items-center justify-center py-12">
        <ErrorDisplay
          title="Something went wrong"
          errorMessage="The page could not be loaded safely."
          icon={<AlertTriangle className="size-4" />}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={reset}>Try again</Button>
              <Button variant="outline" onClick={() => { window.location.href = '/' }}>Return home</Button>
            </div>
          }
          className="w-full"
        />
      </PageContainer>
    </main>
  )
}

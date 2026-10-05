'use client'

import { Button } from '@/components/ui/button'
import { ErrorDisplay, PageContainer } from '@/components/ui/patterns'

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="min-h-screen bg-background">
      <PageContainer size="full" className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <ErrorDisplay
          title="Something went wrong"
          errorMessage="The page could not be loaded safely."
          className="w-full max-w-lg"
        >
          <div className="flex flex-wrap gap-2 px-3 py-3">
            <Button variant="primary" size="small" onClick={reset}>Try again</Button>
            <Button variant="outline" size="small" onClick={() => { window.location.href = '/' }}>Return home</Button>
          </div>
        </ErrorDisplay>
      </PageContainer>
    </main>
  )
}

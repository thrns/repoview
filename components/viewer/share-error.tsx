import Link from 'next/link'

import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { getShareError } from '@/lib/viewer/share-errors'
import { Admonition, Button } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'

export function ShareError({ reason }: { reason?: string }) {
  const error = getShareError(reason)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-2 px-1">
          <BrandLogo size={24} />
          <span className="font-heading text-sm font-semibold tracking-tight">RepoView</span>
        </div>
        <Admonition type="warning" icon={<AlertTriangle className="size-4 text-warning" />} title={error.title} description={error.description} className="p-4 sm:p-5">
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Return to RepoView
            </Link>
          </Button>
        </Admonition>
      </div>
    </main>
  )
}

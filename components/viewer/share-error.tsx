import Link from 'next/link'

import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { getShareError } from '@/lib/viewer/share-errors'
import { Badge, Card, CardContent } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'

export function ShareError({ reason }: { reason?: string }) {
  const error = getShareError(reason)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <BrandLogo size={36} />
            <span className="font-heading text-sm font-semibold">RepoView</span>
          </div>
          <Badge variant="outline" className="gap-2">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            RepoView share
          </Badge>
          <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight">{error.title}</h1>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">{error.description}</p>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to RepoView
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

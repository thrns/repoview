import Link from 'next/link'

import { ArrowLeft, FileQuestion } from 'lucide-react'

import { Admonition, Button, PageContainer } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen bg-background">
      <PageContainer size="small" className="flex min-h-screen items-center justify-center py-12">
        <Admonition
          title="Page not found"
          description="The requested page is not available."
          icon={<FileQuestion className="size-4" />}
          className="w-full"
        >
          <div className="mt-4 flex items-center gap-3">
            <BrandLogo size={28} />
            <Button asChild variant="outline" size="small">
              <Link href="/">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Return to RepoView
              </Link>
            </Button>
          </div>
        </Admonition>
      </PageContainer>
    </main>
  )
}

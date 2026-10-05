import type { Metadata } from 'next'

import { LandingPage } from '@/components/landing/landing-page'
import { getLandingAccount } from '@/lib/auth/landing'
import { createPublicPageMetadata, createPublicPageStructuredData, PUBLIC_SEO_PAGES, serializeJsonLd } from '@/lib/seo'

const homePage = PUBLIC_SEO_PAGES.home
export const metadata: Metadata = createPublicPageMetadata(homePage)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const account = await getLandingAccount()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(createPublicPageStructuredData(homePage)) }} />
      <LandingPage account={account ?? undefined} />
    </>
  )
}

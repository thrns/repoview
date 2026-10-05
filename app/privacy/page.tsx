import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/legal-document'
import { getLegalSections, PRIVACY_MARKDOWN } from '@/lib/legal-content'
import { createPublicPageMetadata, createPublicPageStructuredData, PUBLIC_SEO_PAGES, serializeJsonLd } from '@/lib/seo'

export const metadata: Metadata = createPublicPageMetadata(PUBLIC_SEO_PAGES.privacy)

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(createPublicPageStructuredData(PUBLIC_SEO_PAGES.privacy)) }} />
      <LegalDocument content={PRIVACY_MARKDOWN} sections={getLegalSections(PRIVACY_MARKDOWN)} />
    </>
  )
}

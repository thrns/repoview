import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/legal-document'
import { getLegalSections, TERMS_MARKDOWN } from '@/lib/legal-content'
import { createPublicPageMetadata, createPublicPageStructuredData, PUBLIC_SEO_PAGES, serializeJsonLd } from '@/lib/seo'

export const metadata: Metadata = createPublicPageMetadata(PUBLIC_SEO_PAGES.terms)

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(createPublicPageStructuredData(PUBLIC_SEO_PAGES.terms)) }} />
      <LegalDocument content={TERMS_MARKDOWN} sections={getLegalSections(TERMS_MARKDOWN)} />
    </>
  )
}

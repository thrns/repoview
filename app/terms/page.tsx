import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/legal-document'
import { getLegalSections, TERMS_MARKDOWN } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: 'Terms · RepoView',
  description: 'RepoView Terms of Service.',
}

export default function TermsPage() {
  return <LegalDocument content={TERMS_MARKDOWN} sections={getLegalSections(TERMS_MARKDOWN)} />
}

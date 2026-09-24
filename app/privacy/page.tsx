import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/legal-document'
import { getLegalSections, PRIVACY_MARKDOWN } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: 'Privacy · RepoView',
  description: 'RepoView viewer analytics and privacy disclosure.',
}

export default function PrivacyPage() {
  return <LegalDocument content={PRIVACY_MARKDOWN} sections={getLegalSections(PRIVACY_MARKDOWN)} />
}

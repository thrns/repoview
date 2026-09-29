import type { ReactNode } from 'react'

import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from '@/components/ui'

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <PageSection id={id} className="scroll-mt-8">
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>{title}</PageSectionTitle>
          <PageSectionDescription>{description}</PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>{children}</PageSectionContent>
    </PageSection>
  )
}

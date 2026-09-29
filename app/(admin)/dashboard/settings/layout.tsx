import type { ReactNode } from 'react'

import { PageContainer, PageHeader, PageHeaderDescription, PageHeaderMeta, PageHeaderSummary, PageHeaderTitle } from '@/components/ui'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader size="medium" className="sticky top-0 z-20 border-b border-border-secondary bg-background pb-8">
        <PageHeaderMeta size="medium">
          <PageHeaderSummary>
            <PageHeaderTitle>Settings</PageHeaderTitle>
            <PageHeaderDescription>Account, access, and privacy controls for your RepoView workspace.</PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>

      <PageContainer size="medium" className="overflow-x-hidden !py-0">
        {children}
      </PageContainer>
    </>
  )
}

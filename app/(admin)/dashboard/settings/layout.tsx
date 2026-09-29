import type { ReactNode } from 'react'

import { SettingsNavigation } from '@/components/admin/settings-navigation'
import { PageContainer } from '@/components/ui'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="border-b border-border-secondary bg-background">
        <PageContainer size="medium" className="!py-0">
          <SettingsNavigation />
        </PageContainer>
      </div>
      <PageContainer size="medium" className="!py-0">
        {children}
      </PageContainer>
    </div>
  )
}

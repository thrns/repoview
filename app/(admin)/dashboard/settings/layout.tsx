import type { ReactNode } from 'react'

import { SettingsNavigation } from '@/components/admin/settings-navigation'
import { PageContainer } from '@/components/ui'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <PageContainer size="medium" className="!pb-0 !pt-5 sm:!pt-6">
        <SettingsNavigation />
      </PageContainer>
      <PageContainer size="medium" className="!py-0">
        {children}
      </PageContainer>
    </div>
  )
}

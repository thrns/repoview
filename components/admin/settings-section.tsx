import type { ReactNode } from 'react'

export function SettingsSection({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return <section id={id} className="scroll-mt-8 space-y-4 py-7 lg:py-9">{children}</section>
}

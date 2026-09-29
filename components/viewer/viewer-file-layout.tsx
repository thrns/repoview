import type { ReactNode } from 'react'

export function ViewerFileLayout({ path, toolbar, children }: { path: string; toolbar: ReactNode; children: ReactNode }) {
  return (
    <section className="viewer-file-content flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      {toolbar}
      <div key={path} className="viewer-file-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none">
        {children}
      </div>
    </section>
  )
}

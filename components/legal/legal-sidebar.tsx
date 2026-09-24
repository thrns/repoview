'use client'

import { useEffect, useState } from 'react'

import type { LegalSection } from '@/lib/legal-content'

export function LegalSidebar({ sections }: { sections: LegalSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => Boolean(heading))

    if (headings.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -72% 0px', threshold: [0, 1] },
    )

    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [sections])

  return (
    <aside className="legal-sidebar" aria-label="Policy navigation">
      <div className="legal-sidebar-panel">
        <div className="legal-sidebar-heading">
          <span>On this page</span>
          <span className="legal-sidebar-count">{sections.length} sections</span>
        </div>
        <nav className="legal-sidebar-nav">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`legal-sidebar-link${activeId === section.id ? ' is-active' : ''}`}
              aria-current={activeId === section.id ? 'location' : undefined}
            >
              <span className="legal-sidebar-number">{section.number}</span>
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { Card } from '@/components/ui'

import { LandingFooter, LandingNav } from './landing-chrome'

interface AuthLayoutProps {
  headline: string
  signals: string[]
  children: ReactNode
}

export function AuthLayout({ headline, signals, children }: AuthLayoutProps) {
  return (
    <div className="landing-page auth-page">
      <LandingNav homeHref="/" minimal />
      <main id="main" tabIndex={-1} className="auth-content scroll-mt-16 outline-hidden">
        <Card className="auth-split-card">
          <aside className="auth-brand-panel" aria-label="About RepoView">
            <div className="auth-brand-mark">
              <BrandLogo size={28} className="brand-logo" />
              <span>RepoView</span>
            </div>
            <div className="auth-brand-copy">
              <p className="auth-brand-headline">{headline}</p>
              <ul className="auth-signals">
                {signals.map((signal) => (
                  <li key={signal}>
                    <Check className="auth-signal-icon" aria-hidden="true" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <section className="auth-form-side">{children}</section>
        </Card>
      </main>
      <LandingFooter homeHref="/" sectionPrefix="/" />
    </div>
  )
}

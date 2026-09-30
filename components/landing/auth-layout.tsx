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
      <main className="auth-content">
        <Card className="auth-split-card">
          <aside className="auth-brand-panel" aria-label="About RepoView">
            <div className="auth-brand-mark">
              <BrandLogo size={28} className="brand-logo" />
              <span>RepoView</span>
            </div>
            <div className="auth-brand-copy">
              <h2>{headline}</h2>
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

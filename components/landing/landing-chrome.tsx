'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'

interface LandingChromeProps {
  homeHref?: string
  minimal?: boolean
  sectionPrefix?: string
}

function sectionHref(sectionPrefix: string, section: string) {
  return sectionPrefix + '#' + section
}

export function LandingNav({ homeHref = '#top', minimal = false, sectionPrefix = '' }: LandingChromeProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  if (minimal) {
    return (
      <nav className="landing-nav" aria-label="Sign-in navigation">
        <div className="landing-container nav-inner">
          <Link href={homeHref} className="brand-mark" aria-label="RepoView home">
            <BrandLogo size={28} className="brand-logo" />
            <span className="brand-name">RepoView</span>
          </Link>
          <ThemeSwitcher />
        </div>
      </nav>
    )
  }

  return (
    <nav className="landing-nav" aria-label="Primary navigation">
      <div className="landing-container nav-inner">
        <Link href={homeHref} className="brand-mark" aria-label="RepoView home">
          <BrandLogo size={28} className="brand-logo" />
          <span className="brand-name">RepoView</span>
        </Link>

        <div className={['nav-links', mobileNavOpen ? 'nav-links-open' : ''].filter(Boolean).join(' ')} id="mobile-nav">
          <a href={sectionHref(sectionPrefix, 'recipient')} onClick={closeMobileNav}>Viewer</a>
          <a href={sectionHref(sectionPrefix, 'control')} onClick={closeMobileNav}>Controls</a>
          <a href={sectionHref(sectionPrefix, 'engagement')} onClick={closeMobileNav}>Engagement</a>
          <div className="nav-mobile-actions">
            <Link href="/login" className="nav-sign-in" onClick={closeMobileNav}>Sign in</Link>
            <ThemeSwitcher className="landing-theme-switcher" />
            <Link href="/signup" className="button button-primary" onClick={closeMobileNav}>Create workspace</Link>
          </div>
        </div>

        <div className="nav-actions">
          <ThemeSwitcher className="landing-theme-switcher" />
          <Link href="/login" className="nav-sign-in">Sign in</Link>
          <Link href="/signup" className="button button-primary">Create workspace</Link>
        </div>

        <button className="nav-menu-button" type="button" aria-expanded={mobileNavOpen} aria-controls="mobile-nav" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileNavOpen((open) => !open)}>
          {mobileNavOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>
    </nav>
  )
}

export function LandingFooter({ homeHref = '#top', sectionPrefix = '' }: LandingChromeProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-inner">
        <Link href={homeHref} className="brand-mark" aria-label="RepoView home">
          <BrandLogo size={24} className="brand-logo" />
          <span className="brand-name">RepoView</span>
        </Link>
        <div className="footer-links">
          <a href={sectionHref(sectionPrefix, 'recipient')}>Viewer</a>
          <a href={sectionHref(sectionPrefix, 'control')}>Controls</a>
          <a href={sectionHref(sectionPrefix, 'engagement')}>Engagement</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <span className="footer-note">Private source sharing, thoughtfully made.</span>
      </div>
    </footer>
  )
}

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
  return `${sectionPrefix}#${section}`
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

        <div className={`nav-links ${mobileNavOpen ? 'nav-links-open' : ''}`} id="mobile-nav">
          <a href={sectionHref(sectionPrefix, 'product')} onClick={closeMobileNav}>Product</a>
          <a href={sectionHref(sectionPrefix, 'features')} onClick={closeMobileNav}>Features</a>
          <a href={sectionHref(sectionPrefix, 'how-it-works')} onClick={closeMobileNav}>How it works</a>
          <div className="nav-mobile-actions">
            <Link href="/login" className="nav-sign-in" onClick={closeMobileNav}>Sign in</Link>
            <Link href="/login" className="button button-dark" onClick={closeMobileNav}>Get started</Link>
          </div>
        </div>

        <div className="nav-actions">
          <Link href="/login" className="nav-sign-in">Sign in</Link>
          <Link href="/login" className="button button-dark">Get started</Link>
        </div>

        <button className="nav-menu-button" type="button" aria-expanded={mobileNavOpen} aria-controls="mobile-nav" onClick={() => setMobileNavOpen((open) => !open)}>
          {mobileNavOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          <span className="sr-only">{mobileNavOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>
    </nav>
  )
}

export function LandingFooter({ homeHref = '#top', sectionPrefix = '' }: LandingChromeProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-inner">
        <Link href={homeHref} className="brand-mark" aria-label="RepoView home"><BrandLogo size={28} className="brand-logo" /><span className="brand-name">RepoView</span></Link>
        <div className="footer-links"><a href={sectionHref(sectionPrefix, 'product')}>Product</a><a href={sectionHref(sectionPrefix, 'features')}>Features</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <span className="footer-note">Private source sharing, thoughtfully made.</span>
      </div>
    </footer>
  )
}

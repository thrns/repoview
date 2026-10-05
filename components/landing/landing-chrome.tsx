import Link from 'next/link'
import { Github } from 'lucide-react'

import { AccountMenu, type AccountMenuData } from '@/components/shared/account-menu'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { Button } from '@/components/ui/button'
import { SkipToContent } from '@/components/ui/patterns'

import { LandingMobileNavMenu } from './landing-mobile-nav-menu'

interface LandingChromeProps {
  homeHref?: string
  minimal?: boolean
  sectionPrefix?: string
  account?: AccountMenuData
}

function sectionHref(sectionPrefix: string, section: string) {
  return sectionPrefix + '#' + section
}

function LandingSectionLinks({ sectionPrefix }: { sectionPrefix: string }) {
  return (
    <>
      <a href={sectionHref(sectionPrefix, 'recipient')}>Viewer experience</a>
      <a href={sectionHref(sectionPrefix, 'control')}>Share controls</a>
      <a href={sectionHref(sectionPrefix, 'engagement')}>Engagement analytics</a>
    </>
  )
}

export function LandingNav({ homeHref = '#top', minimal = false, sectionPrefix = '', account }: LandingChromeProps) {
  if (minimal) {
    return (
      <>
        <SkipToContent />
        <header className="landing-nav">
          <nav aria-label="Sign-in navigation">
            <div className="landing-container nav-inner">
              <Link href={homeHref} className="brand-mark" aria-label="RepoView home">
                <BrandLogo size={28} className="brand-logo" />
                <span className="brand-name">RepoView</span>
              </Link>
              <ThemeSwitcher />
            </div>
          </nav>
        </header>
      </>
    )
  }

  return (
    <>
      <SkipToContent />
      <header className="landing-nav">
        <nav aria-label="Primary navigation">
          <div className="landing-container nav-inner">
            <Link href={homeHref} className="brand-mark" aria-label="RepoView home">
              <BrandLogo size={28} className="brand-logo" />
              <span className="brand-name">RepoView</span>
            </Link>

            <div className="nav-links nav-links-desktop">
              <LandingSectionLinks sectionPrefix={sectionPrefix} />
            </div>

            <div className="nav-actions">
              <ThemeSwitcher className="landing-theme-switcher" />
              {account ? (
                <div className="flex items-center gap-1.5">
                  <Button asChild variant="outline" size="small"><Link href="/dashboard">Dashboard</Link></Button>
                  <AccountMenu {...account} />
                </div>
              ) : (
                <>
                  <Link href="/login" className="nav-sign-in">Sign in</Link>
                  <Button asChild variant="primary" size="small"><Link href="/signup">Create workspace</Link></Button>
                </>
              )}
            </div>

            <LandingMobileNavMenu panelId="mobile-nav">
              <LandingSectionLinks sectionPrefix={sectionPrefix} />
              <div className="nav-mobile-actions">
                {account ? (
                  <>
                    <Button asChild variant="outline" size="small"><Link href="/dashboard">Dashboard</Link></Button>
                    <ThemeSwitcher className="landing-theme-switcher" />
                    <AccountMenu {...account} />
                  </>
                ) : (
                  <>
                    <Link href="/login" className="nav-sign-in">Sign in</Link>
                    <ThemeSwitcher className="landing-theme-switcher" />
                    <Button asChild variant="primary" size="small"><Link href="/signup">Create workspace</Link></Button>
                  </>
                )}
              </div>
            </LandingMobileNavMenu>
          </div>
        </nav>
      </header>
    </>
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
        <nav className="footer-links" aria-label="Footer navigation">
          <a href={sectionHref(sectionPrefix, 'recipient')}>Viewer experience</a>
          <a href={sectionHref(sectionPrefix, 'control')}>Share controls</a>
          <a href={sectionHref(sectionPrefix, 'engagement')}>Engagement analytics</a>
          <Link href="/share-private-github-repository">Private GitHub sharing guide</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href="https://github.com/thrns/repoview" className="footer-source-link">
            RepoView source on GitHub <Github className="size-3.5" aria-hidden="true" />
          </a>
        </nav>
        <span className="footer-note">Private source sharing, thoughtfully made.</span>
      </div>
    </footer>
  )
}

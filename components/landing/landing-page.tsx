'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  FileCode2,
  FileText,
  Folder,
  GitBranch,
  Github,
  Link2,
  LockKeyhole,
  Timer,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { LandingFooter, LandingNav } from '@/components/landing/landing-chrome'

const analyticsRows = [
  { file: 'README.md', attention: '8m 02s', views: 18, percent: 88 },
  { file: 'architecture.md', attention: '2m 14s', views: 12, percent: 62 },
  { file: 'backend/api.py', attention: '1m 06s', views: 8, percent: 44 },
]

export function LandingPage() {
  const [copied, setCopied] = useState(false)

  function copyShareLink() {
    void navigator.clipboard?.writeText('https://repoview.dev/s/4wP7k2m')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="landing-page">
      <LandingNav />

      <section className="hero-section" id="top">
        <div className="landing-container hero-layout">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">Private repository sharing</span>
            <h1>Share private code.<br /><span>Keep your repo private.</span></h1>
            <p className="hero-description">Share a clean, read-only view of a private repository without making the source public.</p>
            <div className="hero-actions">
              <Link href="/dashboard/shares/new" className="button button-dark button-large">Share a repository <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            </div>
            <div className="hero-trust" aria-label="Product guarantees">
              <span><Check className="size-3.5" aria-hidden="true" /> No viewer account required</span>
              <span><Check className="size-3.5" aria-hidden="true" /> Read-only by design</span>
            </div>
          </div>

          <div className="hero-product-stage">
            <div className="hero-stage-meta"><span>Live product preview</span><span><i className="status-dot" /> owner-controlled share</span></div>
            <HeroRepositoryPreview />
          </div>
        </div>
      </section>

      <section className="chapter-section viewer-section" id="product">
        <div className="landing-container feature-grid viewer-layout">
          <div className="feature-copy">
            <span className="eyebrow">Repository viewing</span>
            <h2>Repository viewing without the noise.</h2>
            <p>README-first navigation with rendered Markdown, diagrams, images, and source code — all in a familiar review surface.</p>
            <a href="#how-it-works" className="inline-link">See how it works <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
          </div>
          <div className="feature-visual feature-visual-bleed"><RepositoryViewerPreview /></div>
        </div>
      </section>

      <section className="chapter-section share-section" id="features">
        <div className="landing-container feature-grid share-layout">
          <div className="feature-visual"><ShareLinkPreview copied={copied} onCopy={copyShareLink} /></div>
          <div className="feature-copy">
            <span className="eyebrow">Private share-link creation</span>
            <h2>One link. No viewer account required.</h2>
            <p>Choose the repository, set an expiry, and send a focused read-only link in seconds.</p>
            <div className="feature-note"><LockKeyhole className="size-4" aria-hidden="true" /><span>GitHub access stays with you.</span></div>
          </div>
        </div>
      </section>

      <section className="chapter-section analytics-section" id="viewer-activity">
        <div className="landing-container analytics-layout">
          <div className="section-heading analytics-heading">
            <div>
              <span className="eyebrow">Viewer analytics</span>
              <h2>See what caught their attention.</h2>
            </div>
            <p>Understand which parts of the work were explored, without invasive tracking or guesswork.</p>
          </div>
          <AnalyticsPreview />
        </div>
      </section>

      <section className="notification-section" id="notifications">
        <div className="landing-container notification-grid">
          <div className="notification-copy">
            <div className="notification-title-row"><Bell className="size-4" aria-hidden="true" /><span>Meaningful activity</span></div>
            <h2>Stay close to the work.</h2>
            <p>Get a quiet signal when someone meaningfully explores a share, then return to the exact activity that matters.</p>
          </div>
          <div className="notification-stack">
            <NotificationPreview title="Someone viewed Tekkscope" path="README.md" duration="2m 14s" time="now" />
            <NotificationPreview title="A share was revisited" path="architecture.md" duration="48s" time="2h ago" muted />
          </div>
        </div>
      </section>

      <section className="steps-section" id="how-it-works">
        <div className="landing-container">
          <div className="section-heading steps-heading">
            <div><span className="eyebrow">How it works</span><h2>From private repo to clear signal.</h2></div>
            <p>Keep the flow simple: connect once, share deliberately, learn from the review.</p>
          </div>
          <div className="steps-grid">
            <Step number="01" title="Connect repository" copy="Choose the GitHub repository to share." />
            <Step number="02" title="Create a link" copy="Set an expiry and generate a private link." />
            <Step number="03" title="See engagement" copy="See what was viewed and when." />
          </div>
        </div>
      </section>

      <section className="privacy-section">
        <div className="landing-container privacy-layout">
          <div className="privacy-intro">
            <div className="privacy-lockup"><span className="security-mark"><LockKeyhole className="size-4" aria-hidden="true" /></span><span>Privacy &amp; security</span></div>
            <h2>Your code stays private.</h2>
            <p>A review surface that keeps repository access server-side and the owner in control.</p>
          </div>
          <div className="privacy-points">
            <PrivacyPoint title="Read-only repository access" />
            <PrivacyPoint title="GitHub access stays private" />
            <PrivacyPoint title="No viewer account required" />
            <PrivacyPoint title="Expiring links" />
            <PrivacyPoint title="Revoke access anytime" />
            <PrivacyPoint title="Repository remains private" />
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="landing-container final-cta">
          <h2>Your best work doesn&apos;t need to be public.</h2>
          <div className="hero-actions">
            <Link href="/dashboard/shares/new" className="button button-dark button-large">Share your repository <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}

function HeroRepositoryPreview() {
  return (
    <div className="product-window hero-product-window">
      <div className="window-chrome"><span className="window-address"><LockKeyhole className="size-3" aria-hidden="true" /> repoview.dev / s / 4wP7k2m</span><span className="window-chrome-meta"><i className="status-dot" /> READ ONLY</span></div>
      <div className="repo-header"><div className="repo-title"><Github className="size-4" aria-hidden="true" /><strong>tekkscope</strong><span>/</span><strong>repoview</strong><span className="repo-private-tag"><LockKeyhole className="size-3" aria-hidden="true" /> private</span></div><div className="repo-header-actions"><span className="branch-control"><GitBranch className="size-3" aria-hidden="true" /> main <ChevronDown className="size-3" aria-hidden="true" /></span><span className="repo-viewer-tag"><Eye className="size-3" aria-hidden="true" /> Shared view</span></div></div>
      <div className="repo-layout">
        <aside className="repo-sidebar"><div className="repo-sidebar-heading"><span>Files</span><span className="file-count">14</span></div><div className="repo-tree"><RepoFile name="README.md" icon={<FileText className="size-3.5" aria-hidden="true" />} active /><RepoFile name="architecture.md" icon={<FileText className="size-3.5" aria-hidden="true" />} /><RepoFile name="backend" icon={<Folder className="size-3.5" aria-hidden="true" />} folder /><RepoFile name="api.py" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested /><RepoFile name="models.py" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested muted /><RepoFile name="frontend" icon={<Folder className="size-3.5" aria-hidden="true" />} folder /><RepoFile name="app.tsx" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested muted /></div><div className="repo-sidebar-footer"><i className="status-dot" /> Owner-controlled share</div></aside>
        <div className="repo-content-pane"><div className="repo-breadcrumb"><span>tekkscope</span><ChevronRight className="size-3" aria-hidden="true" /><strong>README.md</strong><span className="content-badge">Markdown</span></div><ReadmePreview /></div>
      </div>
    </div>
  )
}

function RepoFile({ name, icon, active, nested, muted, folder }: { name: string; icon: ReactNode; active?: boolean; nested?: boolean; muted?: boolean; folder?: boolean }) {
  return <div className={`tree-row ${active ? 'tree-row-active' : ''} ${nested ? 'tree-row-nested' : ''} ${muted ? 'tree-row-muted' : ''}`}><span className="tree-chevron">{folder ? <ChevronDown className="size-3" aria-hidden="true" /> : null}</span>{icon}<span>{name}{folder ? '/' : ''}</span></div>
}

function ReadmePreview() {
  return <div className="readme-preview"><div className="readme-eyebrow"><span className="readme-pill">README.md</span><span>updated 2 days ago</span></div><h3>Ship reliable systems, together.</h3><p className="readme-lede">A small toolkit for making complex infrastructure easier to understand, operate, and improve.</p><div className="readme-rule" /><div className="readme-columns"><div><span className="readme-label">Overview</span><p>Tekkscope helps teams turn technical context into work that moves forward.</p></div><div><span className="readme-label">Explore</span><div className="readme-link"><span><ChevronRight className="size-3" aria-hidden="true" /> architecture.md</span><ArrowUpRight className="size-3" aria-hidden="true" /></div><div className="readme-link"><span><ChevronRight className="size-3" aria-hidden="true" /> backend/api.py</span><ArrowUpRight className="size-3" aria-hidden="true" /></div></div></div><div className="readme-footer"><span><Github className="size-3" aria-hidden="true" /> source shared with RepoView</span><span>read-only</span></div></div>
}

function RepositoryViewerPreview() {
  return <div className="viewer-preview-shell"><div className="viewer-preview-top"><div><BrandLogo size={20} className="tiny-brand-mark" /><strong>RepoView</strong><span className="tiny-slash">/</span><span>tekkscope / repoview</span></div><span className="read-only-chip"><LockKeyhole className="size-3" aria-hidden="true" /> read-only</span></div><div className="viewer-preview-body"><aside className="feature-file-tree"><span className="tree-label">EXPLORER</span><div className="feature-tree-row active"><FileText className="size-3.5" aria-hidden="true" /> README.md</div><div className="feature-tree-row"><FileText className="size-3.5" aria-hidden="true" /> architecture.md</div><div className="feature-tree-row folder-row"><ChevronDown className="size-3" aria-hidden="true" /><Folder className="size-3.5" aria-hidden="true" /> backend</div><div className="feature-tree-row nested"><FileCode2 className="size-3.5" aria-hidden="true" /> api.py</div><div className="feature-tree-row nested"><FileCode2 className="size-3.5" aria-hidden="true" /> models.py</div><div className="feature-tree-row folder-row"><ChevronRight className="size-3" aria-hidden="true" /><Folder className="size-3.5" aria-hidden="true" /> frontend</div></aside><div className="feature-markdown"><div className="feature-breadcrumb"><span>tekkscope</span><ChevronRight className="size-3" aria-hidden="true" /><strong>README.md</strong></div><span className="markdown-small-label">README.md</span><h3>Ship reliable systems, together.</h3><p>Tools for making complex infrastructure easier to understand, operate, and improve.</p><div className="markdown-callout"><span><Check className="size-3" aria-hidden="true" /> Read-only share</span><p>This repository is being viewed through a private RepoView link.</p></div><div className="markdown-lines"><span /><span className="short" /><span className="medium" /><span className="shorter" /></div></div></div><div className="feature-preview-bottom"><span><Eye className="size-3" aria-hidden="true" /> Shared view</span><span><GitBranch className="size-3" aria-hidden="true" /> main</span><span>Markdown rendered</span></div></div>
}

function ShareLinkPreview({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return <div className="share-preview-card"><div className="share-preview-top"><div><span className="share-overline">Create a private link</span><h3>Share a repository</h3></div><span className="share-secure-mark"><LockKeyhole className="size-4" aria-hidden="true" /></span></div><div className="share-form"><label>Repository<span className="fake-input"><Github className="size-4" aria-hidden="true" /> <span>tekkscope / repoview</span><ChevronDown className="size-3" aria-hidden="true" /></span></label><div className="share-form-row"><label>Branch<span className="fake-input"><GitBranch className="size-3.5" aria-hidden="true" /> <span>main</span><ChevronDown className="size-3" aria-hidden="true" /></span></label><label>Expires<span className="fake-input"><Clock3 className="size-3.5" aria-hidden="true" /> <span>7 days</span></span></label></div><div className="generated-link"><span><Link2 className="size-3.5" aria-hidden="true" /> repoview.dev/s/4wP7k2m</span><span className="link-status"><i className="status-dot" /> active</span></div><button type="button" className="button share-button" onClick={onCopy}>{copied ? 'Link copied' : 'Copy private link'} <ArrowUpRight className="size-3.5" aria-hidden="true" /></button></div><div className="share-preview-footer"><span><Check className="size-3" aria-hidden="true" /> Read-only access</span><span>Revoke anytime</span></div></div>
}

function AnalyticsPreview() {
  return <div className="analytics-preview-card"><div className="analytics-preview-top"><div><span className="share-overline">Repository activity</span><h3>tekkscope / repoview</h3></div><span className="analytics-period">Last 30 days <ChevronDown className="size-3" aria-hidden="true" /></span></div><div className="metrics-grid"><Metric label="Views" value="48" icon={<Eye className="size-3.5" aria-hidden="true" />} /><Metric label="Unique viewers" value="16" icon={<Users className="size-3.5" aria-hidden="true" />} /><Metric label="Average attention" value="1m 38s" icon={<Timer className="size-3.5" aria-hidden="true" />} /><Metric label="Files viewed" value="9" icon={<FileText className="size-3.5" aria-hidden="true" />} /><Metric label="Attention per file" value="72%" icon={<Clock3 className="size-3.5" aria-hidden="true" />} /></div><div className="analytics-files-heading"><span>Files viewed</span><span>Attention per file</span></div><div className="analytics-files-list">{analyticsRows.map((row) => <div className="analytics-file-item" key={row.file}><span className="analytics-file-name"><FileCode2 className="size-3.5" aria-hidden="true" /> {row.file}</span><span className="file-attention-bar"><i style={{ width: `${row.percent}%` }} /></span><strong>{row.attention}</strong><span>{row.views} views</span></div>)}</div></div>
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="metric-box"><div className="metric-label"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong></div>
}

function NotificationPreview({ title, path, duration, time, muted = false }: { title: string; path: string; duration: string; time: string; muted?: boolean }) {
  return <div className={`notification-card ${muted ? 'notification-card-muted' : ''}`}><div className="notification-card-body"><span className="notification-active-dot" aria-hidden="true" /><div className="notification-content"><div className="notification-card-title"><strong>{title}</strong><span>{time}</span></div><div className="notification-path"><span>{path}</span><span>·</span><span>{duration}</span></div><a className="notification-session" href="#viewer-activity">View activity <ArrowUpRight className="size-3" aria-hidden="true" /></a></div></div></div>
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="step-item"><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>
}

function PrivacyPoint({ title }: { title: string }) {
  return <div className="privacy-point"><span><Check className="size-3" aria-hidden="true" /></span><span>{title}</span></div>
}

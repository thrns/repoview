'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowUpRight,
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

import { LandingFooter, LandingNav } from '@/components/landing/landing-chrome'

const analyticsRows = [
  { file: 'README.md', attention: '8m 02s', views: 18, percent: 88 },
  { file: 'architecture.md', attention: '2m 14s', views: 12, percent: 62 },
  { file: 'backend/api.py', attention: '1m 06s', views: 8, percent: 44 },
]

export function LandingPage() {
  const [copied, setCopied] = useState(false)

  function copyShareLink() {
    const clipboardWrite = typeof navigator !== 'undefined'
      ? navigator.clipboard?.writeText('https://repoview.dev/s/4wP7k2m')
      : undefined

    void clipboardWrite?.catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="landing-page">
      <LandingNav />

      <section className="hero-section" id="top">
        <div className="landing-container hero-layout">
          <div className="hero-copy">
            <h1>Give private code a <span>proper review surface.</span></h1>
            <p className="hero-description">
              RepoView turns a private repository into a scoped, read-only link that feels familiar to the person reviewing it — and gives you a useful signal when they engage.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="button button-primary button-large">
                Create a workspace
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="#recipient" className="button button-quiet button-large">See the experience</Link>
            </div>
            <ul className="hero-proof" aria-label="RepoView basics">
              <li><Check className="size-3.5" aria-hidden="true" /> Read-only by design</li>
              <li><Check className="size-3.5" aria-hidden="true" /> No viewer account</li>
              <li><Check className="size-3.5" aria-hidden="true" /> Expiry and revocation are yours</li>
            </ul>
          </div>

          <div className="hero-product-stage">
            <div className="hero-stage-meta">
              <span>What the recipient sees</span>
              <span><i className="status-dot" /> scoped share</span>
            </div>
            <HeroRepositoryPreview />
          </div>
        </div>
      </section>

      <section className="story-section recipient-section" id="recipient">
        <div className="landing-container story-layout">
          <div className="story-copy">
            <h2>A familiar repository review, without repository access.</h2>
            <p>
              Recipients open the link and start reading. They can move through the files and rendered content you chose to share, without creating an account or seeing an edit surface.
            </p>
            <ul className="experience-list">
              <ExperiencePoint icon={<Eye className="size-4" aria-hidden="true" />} title="Open and read immediately" copy="No viewer sign-in or setup for the person reviewing your work." />
              <ExperiencePoint icon={<FileText className="size-4" aria-hidden="true" />} title="Keep technical context intact" copy="Markdown, source, images, and diagrams stay in one repository-shaped view." />
              <ExperiencePoint icon={<LockKeyhole className="size-4" aria-hidden="true" />} title="Stay read-only" copy="A share provides a review surface, not repository credentials." />
            </ul>
          </div>

          <div className="story-note" aria-label="Recipient experience summary">
            <div className="story-note-heading"><span>Recipient path</span><span>read only</span></div>
            <div className="review-path">
              <ReviewPathItem icon={<Github className="size-4" aria-hidden="true" />} title="tekkscope / repoview" copy="Private repository" />
              <ReviewPathItem icon={<FileText className="size-4" aria-hidden="true" />} title="README.md" copy="Rendered first, with the authorized tree beside it" />
              <ReviewPathItem icon={<GitBranch className="size-4" aria-hidden="true" />} title="main" copy="The ref you selected" />
            </div>
            <p className="story-note-foot">The repository remains private on GitHub.</p>
          </div>
        </div>
      </section>

      <section className="story-section control-section" id="control">
        <div className="landing-container story-layout control-layout">
          <div className="story-visual">
            <ShareLinkPreview copied={copied} onCopy={copyShareLink} />
          </div>
          <div className="story-copy">
            <h2>You decide what leaves your workspace.</h2>
            <p>
              Choose the repository and ref, keep the share read-only, and decide how long the link should work before you send it.
            </p>
            <div className="control-points">
              <ControlPoint title="Read-only access" copy="Recipients can review the files you authorize, not edit them." />
              <ControlPoint title="Owner-controlled GitHub access" copy="RepoView retrieves repository content server-side." />
              <ControlPoint title="Expiry or revocation when you need it" copy="End access without changing the repository itself." />
              <ControlPoint title="No viewer account required" copy="The link is the entry point for the recipient." />
            </div>
          </div>
        </div>
      </section>

      <section className="story-section engagement-section" id="engagement">
        <div className="landing-container story-layout engagement-layout">
          <div className="story-copy">
            <h2>Come back with a useful signal.</h2>
            <p>
              See when a share was meaningfully explored and which files held attention. RepoView measures engagement without pretending to know who an anonymous viewer is.
            </p>
            <div className="signal-note">
              <span className="signal-note-icon"><Timer className="size-4" aria-hidden="true" /></span>
              <span><strong>Low-volume activity</strong><small>Follow the review, not a stream of noise.</small></span>
            </div>
          </div>
          <div className="story-visual">
            <AnalyticsPreview />
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="landing-container final-cta">
          <h2>Private code deserves a focused review.</h2>
          <p>Create a workspace and share your first repository when you are ready.</p>
          <div className="hero-actions">
            <Link href="/signup" className="button button-primary button-large">
              Create a workspace
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}

function HeroRepositoryPreview() {
  return (
    <div className="product-window hero-product-window" aria-hidden="true">
      <div className="preview-browser-bar">
        <span><LockKeyhole className="size-3" aria-hidden="true" /> Scoped link</span>
        <span className="preview-url">repoview.dev/s/4wP7k2m</span>
        <span className="preview-readonly"><i className="status-dot" /> read-only</span>
      </div>
      <div className="preview-repository-bar">
        <div className="preview-repository-name"><Github className="size-4" aria-hidden="true" /><strong>tekkscope / repoview</strong><span className="preview-private"><LockKeyhole className="size-3" aria-hidden="true" /> private</span></div>
        <span className="preview-ref"><GitBranch className="size-3" aria-hidden="true" /> main <ChevronDown className="size-3" aria-hidden="true" /></span>
      </div>
      <div className="preview-body">
        <aside className="preview-tree">
          <div className="preview-tree-heading"><span>Files</span><span>14</span></div>
          <PreviewFile name="README.md" icon={<FileText className="size-3.5" aria-hidden="true" />} active />
          <PreviewFile name="architecture.md" icon={<FileText className="size-3.5" aria-hidden="true" />} />
          <PreviewFile name="backend" icon={<Folder className="size-3.5" aria-hidden="true" />} folder />
          <PreviewFile name="api.py" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested />
          <PreviewFile name="models.py" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested />
          <PreviewFile name="frontend" icon={<Folder className="size-3.5" aria-hidden="true" />} folder />
          <PreviewFile name="app.tsx" icon={<FileCode2 className="size-3.5" aria-hidden="true" />} nested />
        </aside>
        <article className="preview-reader">
          <div className="preview-reader-path"><span>tekkscope / repoview</span><ChevronRight className="size-3" aria-hidden="true" /><strong>README.md</strong><span className="preview-format">Markdown</span></div>
          <span className="preview-file-label">README.md</span>
          <h3>Ship reliable systems, together.</h3>
          <p>A small toolkit for making complex infrastructure easier to understand, operate, and improve.</p>
          <div className="preview-rule" />
          <div className="preview-reader-grid">
            <div><span>Overview</span><p>Technical context stays close to the work being reviewed.</p></div>
            <div><span>Explore</span><p>Open the files that matter, without leaving the repository view.</p></div>
          </div>
          <div className="preview-reader-footer"><span><Check className="size-3" aria-hidden="true" /> Read-only share</span><span>main</span></div>
        </article>
      </div>
    </div>
  )
}

function PreviewFile({ name, icon, active = false, nested = false, folder = false }: { name: string; icon: ReactNode; active?: boolean; nested?: boolean; folder?: boolean }) {
  return (
    <div className={['preview-file', active ? 'preview-file-active' : '', nested ? 'preview-file-nested' : ''].filter(Boolean).join(' ')}>
      <span className="preview-file-chevron">{folder ? <ChevronDown className="size-3" aria-hidden="true" /> : null}</span>
      {icon}
      <span>{name}{folder ? '/' : ''}</span>
    </div>
  )
}

function ExperiencePoint({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <li className="experience-item">
      <span className="experience-icon">{icon}</span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </li>
  )
}

function ReviewPathItem({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="review-path-item">
      <span className="review-path-icon">{icon}</span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </div>
  )
}

function ShareLinkPreview({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <div className="share-preview-card">
      <div className="share-preview-top">
        <div><span className="share-overline">Owner control</span><h3>Create a scoped share</h3></div>
        <span className="share-secure-mark"><LockKeyhole className="size-4" aria-hidden="true" /></span>
      </div>
      <div className="share-form">
        <label>Repository<span className="fake-input"><Github className="size-4" aria-hidden="true" /><span>tekkscope / repoview</span><ChevronDown className="size-3" aria-hidden="true" /></span></label>
        <div className="share-form-row">
          <label>Ref<span className="fake-input"><GitBranch className="size-3.5" aria-hidden="true" /><span>main</span><ChevronDown className="size-3" aria-hidden="true" /></span></label>
          <label>Expiry<span className="fake-input"><Clock3 className="size-3.5" aria-hidden="true" /><span>7 days</span></span></label>
        </div>
        <div className="generated-link"><span><Link2 className="size-3.5" aria-hidden="true" /> repoview.dev/s/4wP7k2m</span><span className="link-status"><i className="status-dot" /> active</span></div>
        <button type="button" className="button button-primary share-button" onClick={onCopy}>{copied ? 'Link copied' : 'Copy private link'} <ArrowUpRight className="size-3.5" aria-hidden="true" /></button>
      </div>
      <div className="share-preview-footer"><span><Check className="size-3" aria-hidden="true" /> Read-only</span><span>Revoke anytime</span></div>
    </div>
  )
}

function ControlPoint({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="control-point">
      <span><Check className="size-3.5" aria-hidden="true" /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </div>
  )
}

function AnalyticsPreview() {
  return (
    <div className="analytics-preview-card">
      <div className="analytics-preview-top">
        <div><span className="share-overline">Share activity</span><h3>tekkscope / repoview</h3></div>
        <span className="analytics-period">Recent</span>
      </div>
      <div className="metrics-grid">
        <Metric label="Views" value="48" icon={<Eye className="size-3.5" aria-hidden="true" />} />
        <Metric label="Anonymous viewers" value="16" icon={<Users className="size-3.5" aria-hidden="true" />} />
        <Metric label="Avg. attention" value="1m 38s" icon={<Timer className="size-3.5" aria-hidden="true" />} />
      </div>
      <div className="analytics-files-heading"><span>Files opened</span><span>Attention</span></div>
      <div className="analytics-files-list">
        {analyticsRows.map((row) => (
          <div className="analytics-file-item" key={row.file}>
            <span className="analytics-file-name"><FileCode2 className="size-3.5" aria-hidden="true" /> {row.file}</span>
            <span className="file-attention-bar"><i style={{ width: row.percent + '%' }} /></span>
            <strong>{row.attention}</strong>
            <span>{row.views} views</span>
          </div>
        ))}
      </div>
      <div className="analytics-signal"><span className="signal-dot" /><span>Meaningful activity is available in your workspace.</span></div>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="metric-box">
      <div className="metric-label"><span>{label}</span><span className="metric-icon">{icon}</span></div>
      <strong>{value}</strong>
    </div>
  )
}

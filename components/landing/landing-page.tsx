import Link from 'next/link'
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
import { CopyShareLinkButton } from '@/components/landing/copy-share-link-button'
import type { AccountMenuData } from '@/components/shared/account-menu'
import { Button } from '@/components/ui/button'
import { SITE_URL } from '@/lib/seo'

const exampleShareUrl = new URL('/view/aB3xK9pQ2', SITE_URL)

const analyticsRows = [
  { file: 'README.md', attention: '8m 02s', views: 18, percent: 88 },
  { file: 'architecture.md', attention: '2m 14s', views: 12, percent: 62 },
  { file: 'backend/api.py', attention: '1m 06s', views: 8, percent: 44 },
]

export function LandingPage({ account }: { account?: AccountMenuData }) {
  return (
    <div className="landing-page">
      <LandingNav account={account} />

      <main id="main" tabIndex={-1} className="scroll-mt-16 outline-hidden">
      <section className="hero-section" id="top">
        <div className="landing-container hero-layout">
          <div className="hero-copy">
            <h1><span className="hero-heading-lead">Share private GitHub</span>{' '}<span>repositories without going public.</span></h1>
            <p className="hero-description">
              Share a private GitHub repository through a scoped, read-only link—without making it public or adding the recipient as a collaborator. Viewers do not need a RepoView account.
            </p>
            <div className="hero-actions">
              <Button asChild variant="primary" size="large" className="button-md">
                <Link href="/signup">Create a workspace <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              </Button>
            </div>
            <ul className="hero-proof" aria-label="RepoView basics">
              <li><Check className="size-3.5" aria-hidden="true" /> Read-only by design</li>
              <li><Check className="size-3.5" aria-hidden="true" /> No viewer account</li>
            </ul>
          </div>

          <div className="hero-product-stage">
            <div className="hero-stage-frame">
              <div className="hero-stage-meta">
                <span>What the recipient sees</span>
                <span><i className="status-dot" aria-hidden="true" /> scoped share</span>
              </div>
              <HeroRepositoryPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="story-section recipient-section" id="recipient">
        <div className="landing-container story-layout">
          <div className="story-copy">
            <h2>A read-only review view for private GitHub repositories.</h2>
            <p>
              Share a selected repository with a recruiter, client, collaborator, or reviewer. They can browse its files and rendered content without GitHub collaborator access. Read <Link href="/share-private-github-repository" className="text-link hover:underline">how to share a private GitHub repository</Link>.
            </p>
            <ul className="experience-list">
              <ExperiencePoint icon={<Eye className="size-4" aria-hidden="true" />} title="No viewer account required" copy="Recipients do not need a RepoView account to open a share." />
              <ExperiencePoint icon={<FileText className="size-4" aria-hidden="true" />} title="Keep technical context intact" copy="Browse source and rendered Markdown, including supported repository images and Mermaid diagrams." />
              <ExperiencePoint icon={<LockKeyhole className="size-4" aria-hidden="true" />} title="Stay read-only" copy="The link exposes only the repository content allowed by its ref and visibility rules." />
            </ul>
          </div>

          <aside className="story-note" aria-label="Recipient experience summary">
            <div className="story-note-heading"><span>Recipient path</span><span>read only</span></div>
            <div className="review-path">
              <ReviewPathItem icon={<Github className="size-4" aria-hidden="true" />} title="tekkscope / repoview" copy="Private repository" />
              <ReviewPathItem icon={<FileText className="size-4" aria-hidden="true" />} title="README.md" copy="Rendered first, with the authorized tree beside it" />
              <ReviewPathItem icon={<GitBranch className="size-4" aria-hidden="true" />} title="main" copy="The ref you selected" />
            </div>
            <p className="story-note-foot">The repository remains private on GitHub.</p>
          </aside>
        </div>
      </section>

      <section className="story-section control-section" id="control">
        <div className="landing-container story-layout control-layout">
          <div className="story-visual">
            <ShareLinkPreview />
          </div>
          <div className="story-copy">
            <h2>Choose the repository, ref, and paths the link can show.</h2>
            <p>
              Select a registered GitHub repository and ref, then optionally narrow visibility to specific paths. Set an expiry, or revoke the share from your dashboard whenever you need to end access.
            </p>
            <div className="control-points">
              <ControlPoint title="Read-only access" copy="Recipients can review the files you authorize, not edit them." />
              <ControlPoint title="Owner-controlled GitHub access" copy="RepoView retrieves private repository content through the owner's read-only GitHub App connection." />
              <ControlPoint title="Expiry or revocation when you need it" copy="Choose when a link expires, or revoke it at any time." />
              <ControlPoint title="No viewer RepoView account" copy="The recipient opens the read-only link directly in a browser." />
            </div>
          </div>
        </div>
      </section>

      <section className="story-section engagement-section" id="engagement">
        <div className="landing-container story-layout engagement-layout">
          <div className="story-copy">
            <h2>See how viewers engage with a repository share.</h2>
            <p>
              When a viewer enables optional engagement analytics, you can see which files they open and how long they spend. These are activity signals, not proof of who viewed the link or whether they were the intended recipient.
            </p>
            <div className="signal-note">
              <span className="signal-note-icon"><Timer className="size-4" aria-hidden="true" /></span>
              <span><strong>Engagement, not identity</strong><small>Analytics do not verify a viewer's identity or affiliation.</small></span>
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
              <Button asChild variant="primary" size="large" className="button-md">
                <Link href="/signup">Create a workspace <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              </Button>
          </div>
        </div>
      </section>
      </main>

      <LandingFooter />
    </div>
  )
}

function HeroRepositoryPreview() {
  return (
    <div className="product-window hero-product-window" aria-hidden="true">
      <div className="preview-browser-bar">
        <span><LockKeyhole className="size-3" aria-hidden="true" /> Scoped link</span>
        <span className="preview-url">{exampleShareUrl.host}{exampleShareUrl.pathname}</span>
        <span className="preview-readonly"><i className="status-dot" aria-hidden="true" /> read-only</span>
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
          <div className="preview-reader-title">Ship reliable systems, together.</div>
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

function ShareLinkPreview() {
  return (
    <div className="share-preview-card">
      <div className="share-preview-top">
        <div><span className="share-overline">Owner control</span><div className="share-preview-title">Create a scoped share</div></div>
        <span className="share-secure-mark"><LockKeyhole className="size-4" aria-hidden="true" /></span>
      </div>
      <div className="share-form">
        <div className="share-form-field">Repository<span className="fake-input"><Github className="size-4" aria-hidden="true" /><span>tekkscope / repoview</span><ChevronDown className="size-3" aria-hidden="true" /></span></div>
        <div className="share-form-row">
          <div className="share-form-field">Ref<span className="fake-input"><GitBranch className="size-3.5" aria-hidden="true" /><span>main</span><ChevronDown className="size-3" aria-hidden="true" /></span></div>
          <div className="share-form-field">Expiry<span className="fake-input"><Clock3 className="size-3.5" aria-hidden="true" /><span>7 days</span></span></div>
        </div>
        <div className="generated-link"><span><Link2 className="size-3.5" aria-hidden="true" /> {exampleShareUrl.host}{exampleShareUrl.pathname}</span><span className="link-status"><i className="status-dot" aria-hidden="true" /> active</span></div>
        <CopyShareLinkButton />
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
        <div><span className="share-overline">Share activity</span><div className="analytics-preview-title">tekkscope / repoview</div></div>
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
      <div className="analytics-signal"><span className="signal-dot" aria-hidden="true" /><span>Meaningful activity is available in your workspace.</span></div>
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

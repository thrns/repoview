import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Check,
  Eye,
  GitBranch,
  Github,
  Link2,
  LockKeyhole,
  ShieldAlert,
} from 'lucide-react'

import { LandingFooter, LandingNav } from '@/components/landing/landing-chrome'
import { Button } from '@/components/ui'
import { createPublicPageMetadata, createPublicPageStructuredData, PUBLIC_SEO_PAGES, serializeJsonLd } from '@/lib/seo'

const guide = PUBLIC_SEO_PAGES.privateRepositoryGuide

export const metadata: Metadata = createPublicPageMetadata(guide)

export default function SharePrivateGithubRepositoryPage() {
  return (
    <div className="landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(createPublicPageStructuredData(guide)) }} />

      <LandingNav homeHref="/" sectionPrefix="/" />

      <main id="main" tabIndex={-1} className="scroll-mt-16 outline-hidden">
      <section className="hero-section" id="top">
        <div className="landing-container hero-layout">
          <div className="hero-copy">
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="text-foreground">Share a private GitHub repository</span>
            </nav>
            <h1><span className="hero-heading-lead">How to share a</span>{' '}<span>private GitHub repository</span></h1>
            <p className="hero-description">
              If someone only needs to review code, they may not need GitHub access at all. Compare collaborator access, fine-grained personal access tokens, and a scoped read-only review link—then choose based on whether the recipient needs to browse, automate, or contribute.
            </p>
            <ul className="hero-proof" aria-label="RepoView share basics">
              <li><Check className="size-3.5" aria-hidden="true" /> Repository stays private on GitHub</li>
              <li><Check className="size-3.5" aria-hidden="true" /> No viewer account for a RepoView link</li>
            </ul>
          </div>

          <aside className="story-note" aria-labelledby="guide-contents-title">
            <div className="story-note-heading"><span id="guide-contents-title">Choose by access need</span><span>quick guide</span></div>
            <nav aria-label="On this page" className="review-path">
              <GuideJump href="#methods" icon={<Github className="size-4" aria-hidden="true" />} title="Compare the methods" copy="Repository access, API credentials, or a browser review link" />
              <GuideJump href="#repoview-flow" icon={<Link2 className="size-4" aria-hidden="true" />} title="Create a RepoView share" copy="Connect, select a ref, narrow the content, then send the link" />
              <GuideJump href="#limits-and-privacy" icon={<LockKeyhole className="size-4" aria-hidden="true" />} title="Understand the limits" copy="Read-only access, forwarding, expiry, revocation, and analytics" />
              <GuideJump href="#pre-sharing-checklist" icon={<ShieldAlert className="size-4" aria-hidden="true" />} title="Check content first" copy="Review secrets, production data, and information you cannot disclose" />
              <GuideJump href="#use-cases" icon={<Eye className="size-4" aria-hidden="true" />} title="Choose for your reviewer" copy="Recruiters, clients, investors, technical reviewers, and collaborators" />
            </nav>
            <p className="story-note-foot">For someone who needs to change code, use a GitHub access workflow instead of a read-only viewer.</p>
          </aside>
        </div>
      </section>

      <section className="story-section recipient-section" aria-label="Sharing method guide">
        <div className="landing-container">
          <article className="markdown-content">
            <h2 id="purpose" className="markdown-heading">What you are trying to accomplish</h2>
            <p className="markdown-paragraph">
              Most people looking for a way to share a private GitHub repository want one person to inspect a specific piece of work without making the repository public or setting up a lasting collaboration. The practical question is what the recipient needs to do: browse selected files, make authenticated GitHub requests, or contribute changes.
            </p>
            <p className="markdown-paragraph">
              A collaborator invitation is for repository access. A personal access token is for authenticating a person or integration to GitHub. A RepoView link is for browser-based review of the repository and ref you authorize. These approaches are not interchangeable.
            </p>

            <h2 id="methods" className="markdown-heading">Three ways to share private GitHub code</h2>
            <div className="markdown-table-scroll" role="region" aria-label="Comparison of private repository sharing methods" tabIndex={0}>
              <table className="share-guide-comparison-table">
                <thead>
                  <tr>
                    <th className="markdown-table-cell markdown-table-header" scope="col">Method</th>
                    <th className="markdown-table-cell markdown-table-header" scope="col">Use it when</th>
                    <th className="markdown-table-cell markdown-table-header" scope="col">What the recipient gets</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="markdown-table-cell font-semibold" scope="row">GitHub collaborator</th>
                    <td className="markdown-table-cell">They need ongoing repository access or must work in GitHub.</td>
                    <td className="markdown-table-cell">Access through GitHub, subject to the repository and organization permissions you grant.</td>
                  </tr>
                  <tr>
                    <th className="markdown-table-cell font-semibold" scope="row">Fine-grained PAT</th>
                    <td className="markdown-table-cell">An authorized user or integration needs GitHub API or HTTPS Git access.</td>
                    <td className="markdown-table-cell">A credential for its creator—not a share link and not a way to grant another person new access.</td>
                  </tr>
                  <tr>
                    <th className="markdown-table-cell font-semibold" scope="row">RepoView review link</th>
                    <td className="markdown-table-cell">Someone needs to browse approved code without joining the repository.</td>
                    <td className="markdown-table-cell">A browser view of the authorized repository, ref, and visible paths; no RepoView or GitHub viewer account is required.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 id="collaborators" className="markdown-heading">GitHub collaborators: for ongoing repository work</h3>
            <p className="markdown-paragraph">
              Invite a person through GitHub when they need repository-level access—for example, to clone or fetch the code, use GitHub's collaboration tools, or contribute through the workflow your repository allows. The invitation and permission level are managed in GitHub, and the person accepts the invitation there. Organization rules may also control who can be invited and what access they receive. See GitHub's guide to <a className="markdown-link" href="https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository">inviting collaborators to a personal repository</a>.
            </p>
            <p className="markdown-paragraph">
              This can be inappropriate for a recruiter, prospective client, or one-time reviewer who only needs to inspect a project. It creates a GitHub access relationship and an invitation to manage, even when the actual task is just to read a selected snapshot of work. If the repository belongs to an employer or client, the owner may also be subject to access policies or confidentiality terms that do not permit adding an outside reviewer.
            </p>

            <h3 id="personal-access-tokens" className="markdown-heading">Fine-grained personal access tokens: for API or Git operations</h3>
            <p className="markdown-paragraph">
              A fine-grained personal access token (PAT) authenticates its creator to GitHub. GitHub lets the creator limit a token to a resource owner, selected repositories, specific permissions, and an expiry where available. A token cannot grant access beyond what its creator can already access. GitHub describes PATs as credentials and recommends treating them like passwords; see its guides to <a className="markdown-link" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">managing personal access tokens</a> and <a className="markdown-link" href="https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens">fine-grained token permissions</a>.
            </p>
            <p className="markdown-paragraph">
              A PAT can be relevant when an authorized account needs a script or integration to call GitHub, but it is not a good way to send repository access to a recruiter. Do not put your own token in an email, document, or share link. If another person needs direct GitHub access, grant that person access through GitHub and let them use their own approved credentials.
            </p>

            <h3 id="read-only-link" className="markdown-heading">A scoped review link: for browser-based read-only review</h3>
            <p className="markdown-paragraph">
              RepoView is designed for the narrower case where a reviewer needs to browse code, not join the GitHub repository. The owner connects a GitHub App installation with read-only Contents access, chooses a registered repository and ref, and creates a share. The repository remains private on GitHub; RepoView serves the content allowed by the repository and share visibility rules. The recipient opens the link in a browser without a RepoView or GitHub account.
            </p>
            <p className="markdown-paragraph">
              This is a fit for a read-only review, not for cloning, pushing changes, or opening a pull request as a contributor. If the recipient needs those GitHub workflows, invite them through GitHub under the permissions and policies that apply to the repository.
            </p>
          </article>
        </div>
      </section>

      <section className="story-section control-section" id="repoview-flow">
        <div className="landing-container story-layout control-layout">
          <article className="markdown-content">
            <h2 id="create-share" className="markdown-heading">How RepoView sharing works</h2>
            <p className="markdown-paragraph">The owner controls the source and scope. The recipient receives a link to browse only the content authorized for that share.</p>
            <ol className="markdown-list">
              <li className="markdown-list-item"><strong>Connect GitHub and select a repository.</strong> Create a RepoView workspace, connect a GitHub App installation, and enable a repository the installation can access.</li>
              <li className="markdown-list-item"><strong>Choose the ref.</strong> Select the branch or ref that the recipient should review.</li>
              <li className="markdown-list-item"><strong>Set the visible paths and expiry.</strong> Keep the repository's default visibility rules or narrow the share with hidden or allow-only path patterns. Choose an expiry if you want access to end automatically. Downloads are disabled unless the owner enables them.</li>
              <li className="markdown-list-item"><strong>Create and send the scoped share.</strong> RepoView creates a link for that repository and ref. A recipient label can help you organize shares, but it does not verify who opens one.</li>
              <li className="markdown-list-item"><strong>The recipient opens the link and browses.</strong> They can navigate the authorized file tree and view supported source, rendered Markdown, repository images, and diagrams in a read-only browser experience.</li>
              <li className="markdown-list-item"><strong>Review activity and end access.</strong> From the owner dashboard, inspect the signals available for the share, set or change its expiry where available, or revoke it.</li>
            </ol>
            <p className="markdown-paragraph">
              RepoView retrieves private repository content server-side through the owner's GitHub App connection. The viewer gets a share session, not the owner's GitHub credentials or an invitation to the repository.
            </p>
          </article>

          <aside className="story-note" aria-label="What a RepoView share controls">
            <div className="story-note-heading"><span>Share scope</span><span>owner managed</span></div>
            <div className="review-path">
              <div className="review-path-item"><span className="review-path-icon"><Github className="size-4" aria-hidden="true" /></span><span><strong>Repository</strong><small>One registered GitHub repository selected by the owner</small></span></div>
              <div className="review-path-item"><span className="review-path-icon"><GitBranch className="size-4" aria-hidden="true" /></span><span><strong>Ref and paths</strong><small>A selected branch or ref, further narrowed by visibility rules</small></span></div>
              <div className="review-path-item"><span className="review-path-icon"><LockKeyhole className="size-4" aria-hidden="true" /></span><span><strong>Expiry and revocation</strong><small>End access automatically or revoke the share from the dashboard</small></span></div>
            </div>
            <p className="story-note-foot">Visibility rules are checked by the server before file content is returned.</p>
          </aside>
        </div>
      </section>

      <section className="story-section engagement-section" id="limits-and-privacy">
        <div className="landing-container story-layout engagement-layout">
          <article className="markdown-content">
            <h2 id="limits" className="markdown-heading">Read-only access has limits</h2>
            <p className="markdown-paragraph">
              “Read-only” means the viewer cannot edit the GitHub repository through RepoView. It does not make the content copy-proof: a person who can read code may still copy text, take screenshots, or retain information they saw. If the owner enables downloads, eligible text files can also be downloaded. Do not share material that must remain inaccessible to the recipient.
            </p>

            <h3 id="bearer-links" className="markdown-heading">A share URL is a bearer link</h3>
            <p className="markdown-paragraph">
              Anyone who obtains or is forwarded the link may be able to open it while it is valid. A recipient name, company, or role attached to a share is an owner-facing label, not identity verification. Link previews, scanners, automated systems, and multiple devices can also affect open activity. Treat the URL as confidential and send it only through a channel appropriate for the content.
            </p>

            <h3 id="expiry-revocation" className="markdown-heading">Expiry and revocation end link access</h3>
            <p className="markdown-paragraph">
              A share can be configured with an expiry or revoked from the owner's dashboard. Those controls stop future access through the RepoView share. They cannot retrieve a file someone already copied, downloaded, or photographed, and revoking a share does not rotate an API key or other credential that was exposed in the repository.
            </p>

            <h3 id="analytics-privacy" className="markdown-heading">Analytics are optional signals, not proof</h3>
            <p className="markdown-paragraph">
              Where a viewer enables optional engagement analytics, the owner may see signals such as files or directories viewed, searches, copy or download events, and active viewing time. What is available depends on the viewer's privacy choice and the owner's settings; necessary access and security processing may still occur when optional analytics are off. Global Privacy Control keeps optional analytics off for that request.
            </p>
            <p className="markdown-paragraph">
              These signals can be incomplete or affected by link forwarding, browser previews, bots, shared networks, or privacy tools. They do not prove who opened the link, which company a viewer works for, their location, intent, interest, or opinion. Read the <Link href="/privacy" className="markdown-link">RepoView Privacy Policy</Link> for the data categories and controls, and the <Link href="/terms" className="markdown-link">Terms of Service</Link> for the limits on shares and analytics.
            </p>
          </article>

          <aside className="story-note" aria-labelledby="checklist-title" id="pre-sharing-checklist">
            <div className="story-note-heading"><span id="checklist-title">Before you share</span><span>owner checklist</span></div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Review the exact repository and ref. Remove or exclude anything the recipient should not see:</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-foreground-light marker:text-foreground-lighter">
              <li>Secrets, API keys, access tokens, private keys, and signing secrets</li>
              <li><code className="markdown-inline-code">.env</code> files and other environment or credential files</li>
              <li>Database credentials and production customer or user data</li>
              <li>Confidential employer or client code, documents, or designs</li>
              <li>Personal, regulated, or otherwise restricted data</li>
              <li>Any file you are not authorized to disclose</li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Some sensitive path patterns are hidden by default, but no pattern can catch every secret or confidentiality obligation. Review the content yourself. If a credential is exposed, revoke it at its source.</p>
          </aside>
        </div>
      </section>

      <section className="story-section recipient-section" id="use-cases">
        <div className="landing-container">
          <article className="markdown-content">
            <h2 id="choose-for-recipient" className="markdown-heading">Choose the method for the recipient</h2>
            <p className="markdown-paragraph">Use a review link when reading is enough. Use GitHub access when the person needs to work with the repository itself.</p>
            <div className="markdown-table-scroll" role="region" aria-label="Suggested sharing approach by recipient" tabIndex={0}>
              <table className="share-guide-comparison-table">
                <thead>
                  <tr>
                    <th className="markdown-table-cell markdown-table-header" scope="col">Recipient</th>
                    <th className="markdown-table-cell markdown-table-header" scope="col">A reasonable starting point</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Recruiter</th><td className="markdown-table-cell">A RepoView link for a portfolio project you own and are allowed to show. No viewer account is required.</td></tr>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Hiring manager</th><td className="markdown-table-cell">A scoped review link to the relevant ref and paths; use GitHub access if they need to clone, run, or contribute.</td></tr>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Client</th><td className="markdown-table-cell">A link to approved deliverable code for inspection. Invite them through GitHub only when they need direct repository access and the agreement permits it.</td></tr>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Investor</th><td className="markdown-table-cell">A narrow share of approved product or architecture material. Do not read engagement signals as proof of investment interest.</td></tr>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Technical reviewer</th><td className="markdown-table-cell">A read-only link to the branch/ref under review; collaborator access if review requires GitHub issues, pull requests, or a local checkout.</td></tr>
                  <tr><th className="markdown-table-cell font-semibold" scope="row">Collaborator</th><td className="markdown-table-cell">GitHub collaborator access for ongoing contribution. A RepoView link can still work for a read-only preview.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="markdown-paragraph">
              When in doubt, share the smallest authorized slice that lets the recipient do the job, set an expiry if the review is temporary, and use an authenticated GitHub workflow when a bearer link is not an appropriate control.
            </p>
          </article>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="landing-container final-cta">
          <h2>Need a browser-based review link?</h2>
          <p>Create a workspace, connect GitHub, and choose the repository and ref to share.</p>
          <div className="hero-actions">
            <Button asChild variant="primary" size="large" className="button-md">
              <Link href="/signup">Create a workspace</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            <Link href="/" className="text-link hover:underline">RepoView home</Link>
            {' · '}
            <Link href="/privacy" className="text-link hover:underline">Privacy</Link>
            {' · '}
            <Link href="/terms" className="text-link hover:underline">Terms</Link>
          </p>
        </div>
      </section>
      </main>

      <LandingFooter homeHref="/" sectionPrefix="/" />
    </div>
  )
}

function GuideJump({ href, icon, title, copy }: { href: string; icon: ReactNode; title: string; copy: string }) {
  return (
    <a href={href} className="review-path-item text-foreground no-underline hover:text-foreground">
      <span className="review-path-icon">{icon}</span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </a>
  )
}

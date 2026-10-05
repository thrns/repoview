import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import sitemap from '../app/sitemap'
import manifest from '../app/manifest'
import {
  createPublicPageMetadata,
  createPublicPageStructuredData,
  NOINDEX_ROBOTS,
  PUBLIC_SEO_PAGES,
  serializeJsonLd,
  SITE_URL,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_SIZE,
  SOCIAL_IMAGE_URL,
} from '../lib/seo'

const privateRoutePrefixes = ['/s/', '/view/', '/dashboard/', '/system-admin/', '/onboarding/', '/workspace/']

describe('public SEO metadata', () => {
  it('defines only the genuinely public, indexable pages', () => {
    expect(Object.values(PUBLIC_SEO_PAGES).map(({ path }) => path)).toEqual(['/', '/share-private-github-repository', '/privacy', '/terms'])

    expect(PUBLIC_SEO_PAGES.home.title).toBe('Share Private GitHub Repositories | RepoView')
    expect(PUBLIC_SEO_PAGES.home.description).toContain('scoped read-only links')
    expect(PUBLIC_SEO_PAGES.home.description).toContain('engagement signals')

    for (const page of Object.values(PUBLIC_SEO_PAGES)) {
      const metadata = createPublicPageMetadata(page)
      expect(metadata.title).toBeTruthy()
      expect(metadata.description).toBeTruthy()
      expect(metadata.robots).toMatchObject({ index: true, follow: true })
      expect(metadata.alternates?.canonical).toBe(new URL(page.path, SITE_URL).toString())
      expect(metadata.openGraph?.url).toBe(new URL(page.path, SITE_URL).toString())
      expect(metadata.openGraph).toMatchObject({
        type: page.path === PUBLIC_SEO_PAGES.privateRepositoryGuide.path ? 'article' : 'website',
        siteName: 'RepoView',
        images: [{ url: SOCIAL_IMAGE_URL, width: 1200, height: 630, alt: SOCIAL_IMAGE_ALT }],
      })
      expect(metadata.twitter).toMatchObject({
        card: 'summary_large_image',
        title: page.title,
        description: page.description,
        images: [{ url: SOCIAL_IMAGE_URL, width: 1200, height: 630, alt: SOCIAL_IMAGE_ALT }],
      })
      expect(privateRoutePrefixes.some((prefix) => page.path.startsWith(prefix))).toBe(false)
    }

    const guideMetadata = createPublicPageMetadata(PUBLIC_SEO_PAGES.privateRepositoryGuide)
    expect(guideMetadata.title).toBe('How to Share a Private GitHub Repository | RepoView')
    expect(guideMetadata.openGraph).toMatchObject({ type: 'article' })
    expect(guideMetadata.description).toContain('fine-grained personal access tokens')
  })

  it('emits parseable and accurate JSON-LD for each indexable page', () => {
    for (const page of Object.values(PUBLIC_SEO_PAGES)) {
      const parsed = JSON.parse(serializeJsonLd(createPublicPageStructuredData(page))) as {
        '@graph'?: Array<Record<string, unknown>>
        '@type'?: string
        url?: string
      }
      const nodes = parsed['@graph'] ?? [parsed]
      const webPages = nodes.filter((node) => node['@type'] === 'WebPage')

      expect(webPages).toHaveLength(1)
      expect(webPages[0]).toMatchObject({
        url: new URL(page.path, SITE_URL).toString(),
        name: page.title,
        description: page.description,
        inLanguage: 'en',
      })
      expect(JSON.stringify(parsed)).not.toMatch(/Organization|SoftwareApplication|aggregateRating|Review|Rating/)
    }

    const homepage = createPublicPageStructuredData(PUBLIC_SEO_PAGES.home) as {
      '@graph': Array<Record<string, unknown>>
    }
    const homeNodes = homepage['@graph']
    const website = homeNodes.find((node) => node['@type'] === 'WebSite')
    const developer = homeNodes.find((node) => node['@type'] === 'Person')

    expect(website).toMatchObject({
      url: `${SITE_URL}/`,
      name: 'RepoView',
      creator: { '@id': `${SITE_URL}/#developer` },
    })
    expect(developer).toMatchObject({
      '@id': `${SITE_URL}/#developer`,
      name: 'Tharun Pranav Sakthivel',
    })
    expect(homeNodes.some((node) => node['@type'] === 'Organization')).toBe(false)

    const guide = createPublicPageStructuredData(PUBLIC_SEO_PAGES.privateRepositoryGuide) as {
      '@graph': Array<Record<string, unknown>>
    }
    const guideNodes = guide['@graph']
    const guidePage = guideNodes.find((node) => node['@type'] === 'WebPage')
    const breadcrumbs = guideNodes.find((node) => node['@type'] === 'BreadcrumbList')

    expect(guidePage).toMatchObject({ breadcrumb: { '@id': `${SITE_URL}/share-private-github-repository#breadcrumb` } })
    expect(breadcrumbs).toMatchObject({
      itemListElement: [
        { position: 1, name: 'Home', item: SITE_URL + '/' },
        {
          position: 2,
          name: 'Share a private GitHub repository',
          item: `${SITE_URL}/share-private-github-repository`,
        },
      ],
    })

    for (const page of [PUBLIC_SEO_PAGES.privacy, PUBLIC_SEO_PAGES.terms]) {
      const data = createPublicPageStructuredData(page) as { '@type'?: string }
      expect(data['@type']).toBe('WebPage')
    }
  })

  it('provides a branded manifest and dimensioned social and app icon assets', () => {
    expect(manifest()).toMatchObject({
      name: 'RepoView',
      short_name: 'RepoView',
      start_url: '/',
      background_color: '#FAFAFA',
      theme_color: '#FAFAFA',
      icons: [
        { src: '/repoview-app-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/repoview-app-icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })

    const dimensions = (url: URL) => {
      const image = readFileSync(url)
      return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
    }

    expect(dimensions(new URL('../app/apple-icon.png', import.meta.url))).toEqual({ width: 180, height: 180 })
    expect(dimensions(new URL('../public/repoview-app-icon-192.png', import.meta.url))).toEqual({ width: 192, height: 192 })
    expect(dimensions(new URL('../public/repoview-app-icon-512.png', import.meta.url))).toEqual({ width: 512, height: 512 })
    expect(dimensions(new URL('../public/repoview-private-repository-sharing-social-preview.png', import.meta.url))).toEqual(SOCIAL_IMAGE_SIZE)
  })

  it('uses matching production canonicals and sitemap URLs without trailing slash variants', () => {
    expect(SITE_URL).toBe('https://repoview.thrn.im')
    const expected = Object.values(PUBLIC_SEO_PAGES).map(({ path }) => new URL(path, SITE_URL).toString())
    const entries = sitemap()

    expect(entries.map(({ url }) => url)).toEqual(expected)
    for (const { url } of entries) {
      expect(new URL(url).origin).toBe(SITE_URL)
      expect(privateRoutePrefixes.some((prefix) => new URL(url).pathname.startsWith(prefix))).toBe(false)
      if (new URL(url).pathname !== '/') expect(new URL(url).pathname.endsWith('/')).toBe(false)
    }
  })

  it('defaults unknown routes to noindex and keeps share paths out of public navigation', () => {
    expect(NOINDEX_ROBOTS).toEqual({ index: false, follow: false, noarchive: true })

    const navigation = readFileSync(new URL('../components/landing/landing-chrome.tsx', import.meta.url), 'utf8')
    const landingPage = readFileSync(new URL('../components/landing/landing-page.tsx', import.meta.url), 'utf8')
    const copyShareLinkButton = readFileSync(new URL('../components/landing/copy-share-link-button.tsx', import.meta.url), 'utf8')
    expect(landingPage).toContain('Share private GitHub</span>{\' \'}<span>repositories without going public.')
    expect(landingPage).toContain('how to share a private GitHub repository')
    expect(landingPage).not.toMatch(/<h3(?:\s|>)/)
    expect(navigation).toContain('/share-private-github-repository')
    expect(navigation).not.toMatch(/(?:href|to)=\{?['"`][^'"`]*(?:\/view\/|\/s\/)/)
    expect(landingPage).toContain('<LandingNav account={account} />')
    expect(landingPage).not.toContain('repoview.dev')
    expect(copyShareLinkButton).not.toContain('repoview.dev')
  })
})

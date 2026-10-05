import type { Metadata } from 'next'

export const SITE_URL = 'https://repoview.thrn.im'
export const SOCIAL_IMAGE_URL = `${SITE_URL}/repoview-private-repository-sharing-social-preview.png`
export const SOCIAL_IMAGE_ALT = 'RepoView: share private GitHub repositories with scoped, read-only review links.'
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const

// The repository's commit history identifies the developer by name. Do not
// publish a private email address or infer an organization from the GitHub repo.
const DEVELOPER_NAME = 'Tharun Pranav Sakthivel'

export const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  noarchive: true,
}

export const PUBLIC_SEO_PAGES = {
  home: {
    path: '/',
    title: 'Share Private GitHub Repositories | RepoView',
    description: 'Share private GitHub repositories with scoped read-only links. Keep them private with no added collaborator or viewer RepoView account. See optional engagement signals.',
  },
  privateRepositoryGuide: {
    path: '/share-private-github-repository',
    title: 'How to Share a Private GitHub Repository | RepoView',
    description: 'Compare GitHub collaborators, fine-grained personal access tokens, and read-only review links. Learn how to scope access and revoke a share.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy | RepoView',
    description: 'Learn how RepoView handles viewer analytics, personal data, data retention, and privacy controls.',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service | RepoView',
    description: 'Read the terms governing RepoView accounts, private repository sharing, and use of the service.',
  },
} as const

type PublicSeoPage = (typeof PUBLIC_SEO_PAGES)[keyof typeof PUBLIC_SEO_PAGES]

export function createPublicPageMetadata(page: PublicSeoPage): Metadata {
  const canonicalUrl = getPublicCanonicalUrl(page.path)
  const socialImage = {
    url: SOCIAL_IMAGE_URL,
    width: SOCIAL_IMAGE_SIZE.width,
    height: SOCIAL_IMAGE_SIZE.height,
    alt: SOCIAL_IMAGE_ALT,
  }

  return {
    title: page.title,
    description: page.description,
    robots: { index: true, follow: true, noarchive: false },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: page.path === PUBLIC_SEO_PAGES.privateRepositoryGuide.path ? 'article' : 'website',
      url: canonicalUrl,
      siteName: 'RepoView',
      title: page.title,
      description: page.description,
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: [socialImage],
    },
  }
}

export function getPublicCanonicalUrl(path: PublicSeoPage['path']) {
  return new URL(path, SITE_URL).toString()
}

export function createPublicPageStructuredData(page: PublicSeoPage): object {
  const canonicalUrl = getPublicCanonicalUrl(page.path)
  const webPage = {
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: page.title,
    description: page.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  }

  if (page.path === PUBLIC_SEO_PAGES.home.path) {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: getPublicCanonicalUrl('/'),
          name: 'RepoView',
          description: page.description,
          inLanguage: 'en',
          creator: { '@id': `${SITE_URL}/#developer` },
        },
        {
          '@type': 'Person',
          '@id': `${SITE_URL}/#developer`,
          name: DEVELOPER_NAME,
        },
        webPage,
      ],
    }
  }

  if (page.path === PUBLIC_SEO_PAGES.privateRepositoryGuide.path) {
    const breadcrumbId = `${canonicalUrl}#breadcrumb`
    return {
      '@context': 'https://schema.org',
      '@graph': [
        { ...webPage, breadcrumb: { '@id': breadcrumbId } },
        {
          '@type': 'BreadcrumbList',
          '@id': breadcrumbId,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: getPublicCanonicalUrl('/') },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Share a private GitHub repository',
              item: canonicalUrl,
            },
          ],
        },
      ],
    }
  }

  return { '@context': 'https://schema.org', ...webPage }
}

export function serializeJsonLd(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

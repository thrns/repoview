import type { MetadataRoute } from 'next'

import { getPublicCanonicalUrl, PUBLIC_SEO_PAGES } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(PUBLIC_SEO_PAGES).map(({ path }) => ({
    url: getPublicCanonicalUrl(path),
  }))
}

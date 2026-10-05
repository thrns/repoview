import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/s/',
        '/view/',
        '/dashboard',
        '/system-admin',
        '/onboarding',
        '/workspace',
        '/login',
        '/signup',
        '/auth/callback',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

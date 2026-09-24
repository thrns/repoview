import { describe, expect, it } from 'vitest'

import { buildViewNotificationEmail } from '../lib/notifications/view-email'

describe('view notification email', () => {
  it('builds a concise useful text and HTML message without secret credentials', () => {
    const email = buildViewNotificationEmail({
      recipientLabel: 'Stripe <interview>',
      repositoryName: 'octocat/hello-world',
      ref: 'heads/main',
      confirmedAt: '2026-09-21T19:42:00.000Z',
      browser: 'Chrome',
      os: 'macOS',
      deviceType: 'desktop',
      country: 'CA',
      shareId: '22222222-2222-4222-8222-222222222222',
      appUrl: 'https://code.example.com',
    })

    expect(email.subject).toBe('RepoView: Stripe <interview> viewed octocat/hello-world')
    expect(email.text).toContain('Share: Stripe <interview>')
    expect(email.text).toContain('Repository: octocat/hello-world')
    expect(email.text).toContain('View activity: https://code.example.com/dashboard/shares/22222222-2222-4222-8222-222222222222')
    expect(email.html).toContain('Stripe &lt;interview&gt;')
    expect(email.html).toContain('href="https://code.example.com/dashboard/shares/22222222-2222-4222-8222-222222222222"')
    expect(email.text).not.toContain('share-token')
    expect(email.text).not.toContain('session-token')
    expect(email.text).not.toContain('192.0.2.1')
  })

  it('uses safe placeholders and resists HTML/header injection', () => {
    const email = buildViewNotificationEmail({
      recipientLabel: 'Recipient\nBcc: attacker@example.com',
      repositoryName: '<private>',
      ref: 'main',
      confirmedAt: 'not-a-date',
      browser: null,
      os: null,
      deviceType: null,
      country: null,
      shareId: 'share-id',
      appUrl: 'https://code.example.com',
    })

    expect(email.subject).not.toContain('\n')
    expect(email.html).toContain('&lt;private&gt;')
    expect(email.html).not.toContain('<private>')
    expect(email.text).toContain('Viewed: Unknown time')
  })
})

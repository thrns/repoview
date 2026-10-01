import { describe, expect, it } from 'vitest'

import { buildSessionSummaryEmail, buildViewNotificationEmail } from '../lib/notifications/view-email'

describe('view notification email', () => {
  it('builds a concise useful text and HTML message without secret credentials', () => {
    const email = buildViewNotificationEmail({
      recipientLabel: 'Stripe <interview>',
      repositoryName: 'octocat/hello-world',
      ref: 'heads/main',
      confirmedAt: '2026-10-01T05:20:00.000Z',
      entryPath: '/view/Ab3k9Qx2',
      browser: 'Chrome',
      os: 'macOS',
      deviceType: 'desktop',
      country: 'CA',
      city: 'Vancouver',
      region: 'BC',
      referrer: 'example.com',
      isProbableBot: false,
      vpnIndication: true,
      proxyIndication: false,
      torIndication: null,
      datacenterIndication: false,
      securitySignals: { possible_link_forwarding: true, new_network: true, concurrent_sessions: 2 },
      shareId: '22222222-2222-4222-8222-222222222222',
      appUrl: 'https://code.example.com',
    })

    expect(email.subject).toBe('RepoView: Stripe <interview> viewed octocat/hello-world')
    expect(email.text).toContain('Share: Stripe <interview>')
    expect(email.text).toContain('Visit: First visit')
    expect(email.text).toContain('Repository: octocat/hello-world')
    expect(email.text).toContain('Entry path: /view/Ab3k9Qx2')
    expect(email.text).toContain('Approx. location: Vancouver, BC, CA')
    expect(email.text).toContain('Security/context (inferred):')
    expect(email.text).toContain('Possible link forwarding: Yes (inferred)')
    expect(email.text).toContain('View activity: https://code.example.com/dashboard/shares/22222222-2222-4222-8222-222222222222')
    expect(email.html).toContain('Stripe &lt;interview&gt;')
    expect(email.html).toContain('href="https://code.example.com/dashboard/shares/22222222-2222-4222-8222-222222222222"')
    expect(email.html).toContain('#34B27B')
    expect(email.html).toContain('#09090B')
    expect(email.html).toContain('#E4E4E7')
    expect(email.html).toContain('#F4F4F5')
    expect(email.html).not.toMatch(/#2F80ED|#2f80ed/i)
    expect(email.html).not.toContain('#101828')
    expect(email.html).toContain('octocat/hello-world')
    expect(email.html).toContain('FIRST VISIT · VISIT #1')
    expect(email.html).toMatch(/view details/i)
    expect(email.html).toMatch(/security context/i)
    expect(email.html).toContain('Oct 1, 2026 · 5:20 AM UTC')
    expect(email.html).toContain('VPN signal: Yes (inferred)')
    expect(email.html).not.toContain('Security/context (inferred):')
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
      isProbableBot: false,
      shareId: 'share-id',
      appUrl: 'https://code.example.com',
    })

    expect(email.subject).not.toContain('\n')
    expect(email.html).toContain('&lt;private&gt;')
    expect(email.html).not.toContain('<private>')
    expect(email.text).toContain('Viewed: Unknown time')
  })

  it('builds the session summary in the shared product email shell', () => {
    const email = buildSessionSummaryEmail({
      recipientLabel: 'Generic share',
      viewerLabel: 'Anonymous Viewer #42',
      visitLabel: 'Returning visit · 2 visits',
      repositoryName: 'thrns/tracebox',
      ref: 'heads/main',
      endedAt: '2026-10-01T05:20:00.000Z',
      duration: '51 min',
      filesViewed: 31,
      directoriesViewed: 2,
      searches: 1,
      copies: 0,
      downloads: 0,
      topFiles: ['README.md', 'backend/pyproject.toml'],
      firstFile: 'README.md',
      lastFile: 'backend/pyproject.toml',
      securityAlerts: [],
      shareId: 'share-id',
      appUrl: 'https://code.example.com',
    })

    expect(email.html).toContain('RepoView</td>')
    expect(email.html).toContain('Session summary')
    expect(email.html).toContain('PRIVATE SHARE')
    expect(email.html).toContain('VISIT #2')
    expect(email.html).toContain('Session complete')
    expect(email.html).toContain('Viewing activity for thrns/tracebox has ended.')
    expect(email.html).toContain('thrns/tracebox')
    expect(email.html).toContain('heads/main')
    expect(email.html).toContain('Duration')
    expect(email.html).toContain('Files viewed')
    expect(email.html).toContain('Directories')
    expect(email.html).toContain('Searches')
    expect(email.html).toContain('backend/pyproject.toml')
    expect(email.html).toContain('Oct 1, 2026 · 5:20 AM UTC')
    expect(email.html).toContain('href="https://code.example.com/dashboard/shares/share-id"')
    expect(email.html).toContain('#34B27B')
    expect(email.html).toContain('#09090B')
    expect(email.html).toContain('#E4E4E7')
    expect(email.html).toContain('#F4F4F5')
    expect(email.html).not.toMatch(/#2F80ED|#2f80ed/i)
    expect(email.html).not.toContain('#101828')
  })

  it('escapes session summary data and renders inferred warnings as a compact block', () => {
    const email = buildSessionSummaryEmail({
      recipientLabel: 'Private share',
      viewerLabel: 'Anonymous Viewer',
      visitLabel: 'First visit',
      repositoryName: '<private>',
      ref: 'heads/main',
      endedAt: 'Unknown time',
      duration: 'Unknown',
      filesViewed: 0,
      directoriesViewed: 0,
      searches: 0,
      copies: 0,
      downloads: 0,
      topFiles: ['<script>alert(1)</script>'],
      firstFile: null,
      lastFile: null,
      securityAlerts: ['New network (inferred)'],
      shareId: 'share-id',
      appUrl: 'https://code.example.com',
    })

    expect(email.html).toContain('&lt;private&gt;')
    expect(email.html).not.toContain('<private>')
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(email.html).toContain('Inferred security signals')
    expect(email.html).toContain('New network (inferred)')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('VISIT #1')
  })
})

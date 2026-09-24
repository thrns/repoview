import { describe, expect, it } from 'vitest'

import { getShareError } from '../lib/viewer/share-errors'

describe('share error states', () => {
  it('maps known reasons to useful non-sensitive copy', () => {
    expect(getShareError('expired')).toEqual({
      title: 'This link has expired',
      description: 'Ask the owner for a new share link if you still need access.',
    })
    expect(getShareError('repository_unavailable').description).not.toMatch(/GitHub|token|database/i)
  })

  it('falls back safely for unknown reasons', () => {
    expect(getShareError('internal-stack-trace').title).toBe('This share is temporarily unavailable')
  })
})

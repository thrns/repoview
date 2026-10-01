import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { summarizeDatabaseError } from '../lib/viewer/diagnostics'

describe('database diagnostics', () => {
  it('keeps SQL diagnostics while redacting credentials and long tokens', () => {
    expect(summarizeDatabaseError({
      code: '42P10',
      message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
      details: 'postgresql://admin:private-password@db.example.test/repoview?token=secret',
      hint: 'password=private-password authorization=Bearer private-token-value service_role_key=secret-key',
    })).toEqual({
      errorCode: '42P10',
      errorMessage: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
      errorDetails: '[redacted-url]',
      errorHint: 'password=[redacted] authorization=[redacted] service_role_key=[redacted]',
    })
  })
})

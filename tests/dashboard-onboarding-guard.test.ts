import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const dashboardPage = readFileSync('app/(admin)/dashboard/page.tsx', 'utf8')

describe('dashboard onboarding guard', () => {
  it('redirects incomplete accounts before loading dashboard data', () => {
    expect(dashboardPage).toContain("if (!onboarding.isComplete) redirect('/onboarding')")
    expect(dashboardPage).toContain("if (isRedirectError(error)) throw error")
  })
})

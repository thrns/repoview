import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { renderSourceCode } from '../components/viewer/source-code-renderer'

describe('source code renderer', () => {
  it('renders syntax-highlighted dual-theme HTML on the server', async () => {
    const html = await renderSourceCode('const answer = 42', 'src/index.ts')

    expect(html).toContain('github-light-default')
    expect(html).toContain('github-dark-default')
    expect(html).toContain('class="line"')
    expect(html).toContain('const')
  })

  it('preserves whitespace and escapes source text', async () => {
    const html = await renderSourceCode('  <script>\n\talert(1)\n</script>', 'notes.custom')

    expect(html).toContain('&#x3C;script>')
    expect(html).toContain('alert')
    expect(html).toContain('tabindex="0"')
  })
})

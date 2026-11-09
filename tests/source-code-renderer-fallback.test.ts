import { describe, expect, it, vi } from 'vitest'

const { codeToHtmlMock } = vi.hoisted(() => ({ codeToHtmlMock: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('shiki', () => ({ codeToHtml: codeToHtmlMock }))

import { renderSourceCodeLanguage } from '../components/viewer/source-code-renderer'

describe('server source code renderer fallback', () => {
  it('escapes plaintext if both syntax and text highlighting fail', async () => {
    const code = '  <script>\n\talert(1)\n</script>'
    codeToHtmlMock.mockRejectedValue(new Error('Shiki unavailable'))

    const html = await renderSourceCodeLanguage(code, 'yaml')

    expect(codeToHtmlMock).toHaveBeenCalledTimes(2)
    expect(html).toContain('<pre class="shiki plain-source"><code>')
    expect(html).toContain('  &lt;script&gt;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('\n\talert(1)\n')
    expect(html).not.toContain('<script>')
  })
})

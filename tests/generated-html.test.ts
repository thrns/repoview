import { describe, expect, it } from 'vitest'

import { isSafeGeneratedHtml, safeGeneratedHtml } from '../lib/viewer/generated-html'

describe('generated renderer HTML boundary', () => {
  it('accepts Shiki-style escaped markup', () => {
    const html = '<pre class="shiki"><code><span class="line">&#x3C;script>alert(1)</span></code></pre>'

    expect(safeGeneratedHtml(html)).toBe(html)
  })

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<span onclick="alert(1)">source</span>',
    '<a href="javascript:alert(1)">source</a>',
    '<img src="data:text/html,<script>alert(1)</script>">',
  ])('rejects unsafe generated markup: %s', (html) => {
    expect(isSafeGeneratedHtml(html)).toBe(false)
    expect(safeGeneratedHtml(html)).toBeNull()
  })
})

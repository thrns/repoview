// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientSourceCodeRenderer } from '../components/viewer/client-source-code-renderer'

describe('client source code renderer safety fallback', () => {
  let container: HTMLDivElement
  let root: Root | null = null

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    vi.unstubAllGlobals()
  })

  it('rejects unsafe server-provided HTML and shows escaped plaintext', () => {
    const code = '<script>\n  unsafe()\n\t</script>'

    act(() => {
      root = createRoot(container)
      root.render(<ClientSourceCodeRenderer code={code} highlightedHtml={'<pre><script>alert(1)</script></pre>'} />)
    })

    const pre = container.querySelector<HTMLPreElement>('.plain-source')
    expect(pre).not.toBeNull()
    expect(pre?.classList.contains('shiki')).toBe(true)
    expect(pre?.querySelector('code')?.innerHTML).toContain('&lt;script&gt;')
    expect(pre?.querySelector('script')).toBeNull()
  })
})

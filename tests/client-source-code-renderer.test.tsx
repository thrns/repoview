// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientSourceCodeRenderer } from '../components/viewer/client-source-code-renderer'

describe('client source code renderer', () => {
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

  it('renders server-provided highlighted HTML', () => {
    const code = 'export const answer = 42'
    const highlightedHtml = '<pre class="shiki"><code><span class="line">export const answer = 42</span></code></pre>'

    act(() => {
      root = createRoot(container)
      root.render(<ClientSourceCodeRenderer code={code} highlightedHtml={highlightedHtml} />)
    })

    expect(container.querySelector('.source-code .shiki .line')?.textContent).toBe(code)
    expect(container.textContent).toBe(code)
  })

  it('renders escaped plaintext when no server highlight is available', () => {
    const code = '<script>\n  unsafe()\n\t</script>'

    act(() => {
      root = createRoot(container)
      root.render(<ClientSourceCodeRenderer code={code} />)
    })

    const pre = container.querySelector<HTMLPreElement>('.plain-source')
    expect(pre?.classList.contains('shiki')).toBe(true)
    expect(pre?.querySelector('code')?.textContent).toBe(code)
    expect(pre?.querySelector('script')).toBeNull()
  })
})

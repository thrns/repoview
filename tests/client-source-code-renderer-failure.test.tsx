// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { codeToHtmlMock } = vi.hoisted(() => ({ codeToHtmlMock: vi.fn() }))
vi.mock('shiki', () => ({ codeToHtml: codeToHtmlMock }))

import { ClientSourceCodeRenderer } from '../components/viewer/client-source-code-renderer'

describe('client source code renderer fallback', () => {
  let container: HTMLDivElement
  let root: Root | null = null

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    codeToHtmlMock.mockReset()
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    vi.unstubAllGlobals()
  })

  it('shows escaped plaintext with preserved whitespace if Shiki initialization fails', async () => {
    const code = '<script>\n  unsafe()\n\t</script>'
    codeToHtmlMock.mockRejectedValue(new Error('WebAssembly initialization failed'))

    await act(async () => {
      root = createRoot(container)
      root.render(<ClientSourceCodeRenderer code={code} filename="source.custom" />)
    })
    await act(async () => vi.waitFor(() => expect(container.querySelector('.plain-source code')?.textContent).toBe(code)))

    const pre = container.querySelector<HTMLPreElement>('.plain-source')
    expect(pre).not.toBeNull()
    expect(pre?.classList.contains('shiki')).toBe(true)
    expect(pre?.querySelector('code')?.innerHTML).toContain('&lt;script&gt;')
    expect(pre?.querySelector('script')).toBeNull()
    expect(codeToHtmlMock).toHaveBeenCalledTimes(1)
  })

  it('does not let a slow result from an earlier file replace the current file', async () => {
    const resolveByCode: Record<string, ((html: string) => void) | undefined> = {}
    codeToHtmlMock.mockImplementation((code: string) => new Promise<string>((resolve) => {
      resolveByCode[code] = resolve
    }))

    await act(async () => {
      root = createRoot(container)
      root.render(<ClientSourceCodeRenderer code="old file" filename="old.ts" />)
    })
    await vi.waitFor(() => expect(resolveByCode['old file']).toBeDefined())

    await act(async () => {
      root?.render(<ClientSourceCodeRenderer code="new file" filename="new.ts" />)
    })
    await vi.waitFor(() => expect(resolveByCode['new file']).toBeDefined())

    await act(async () => {
      resolveByCode['new file']?.('<pre class="shiki"><code><span class="line">new file</span></code></pre>')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(container.querySelector('.shiki')?.textContent).toContain('new file')

    await act(async () => {
      resolveByCode['old file']?.('<pre class="shiki"><code><span class="line">old file</span></code></pre>')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(container.querySelector('.shiki')?.textContent).toContain('new file')
    expect(container.querySelector('.shiki')?.textContent).not.toContain('old file')
  })
})

// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../components/viewer/viewer-analytics', () => ({
  useViewerAnalytics: () => ({ track: vi.fn() }),
}))

import { MarkdownRendererClient } from '../components/viewer/markdown-renderer-client'

describe('client Markdown image URLs', () => {
  let root: Root | null = null
  let container: HTMLDivElement
  let completeDescriptor: PropertyDescriptor | undefined

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    if (completeDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDescriptor)
    } else {
      Reflect.deleteProperty(HTMLImageElement.prototype, 'complete')
    }
    vi.unstubAllGlobals()
  })

  it('keeps repository images on the protected route and disables referrers for external images', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    completeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete')
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => false })

    await act(async () => {
      root = createRoot(container)
      root.render(
        <MarkdownRendererClient
          source="![Repository image](docs/hero.png) ![External image](https://images.example.test/hero.png)"
          shareId="share-123"
          documentPath="README.md"
        />,
      )
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

    const repositoryImage = container.querySelector<HTMLImageElement>('img[alt="Repository image"]')
    const externalImage = container.querySelector<HTMLImageElement>('img[alt="External image"]')
    expect(repositoryImage?.getAttribute('src')).toBe('/api/assets/share-123/docs/hero.png')
    expect(repositoryImage?.getAttribute('referrerpolicy')).toBeNull()
    expect(externalImage?.getAttribute('src')).toBe('https://images.example.test/hero.png')
    expect(externalImage?.getAttribute('referrerpolicy')).toBe('no-referrer')
  })
})

// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('yet-another-react-lightbox', () => ({ default: () => null }))
vi.mock('yet-another-react-lightbox/plugins/fullscreen', () => ({ default: {} }))
vi.mock('yet-another-react-lightbox/plugins/zoom', () => ({ default: {} }))
vi.mock('../components/viewer/viewer-analytics', () => ({
  useViewerAnalytics: () => ({ track: vi.fn() }),
}))

import { MarkdownImage } from '../components/viewer/markdown-image'

describe('MarkdownImage loading state', () => {
  let container: HTMLDivElement
  let root: Root | null = null
  let completeDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    completeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete')
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => false,
    })
  })

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
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function renderImage(props: { onLoad?: () => void; onError?: () => void } = {}) {
    await act(async () => {
      root = createRoot(container)
      root.render(
        <MarkdownImage
          src="/api/assets/share-123/docs/diagram.png"
          alt="Architecture diagram"
          onLoad={props.onLoad}
          onError={props.onError}
        />,
      )
    })
    return container.querySelector('img')
  }

  it('keeps the skeleton until load, then crossfades the image in', async () => {
    vi.useFakeTimers()
    const onLoad = vi.fn()
    const image = await renderImage({ onLoad })

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(image?.classList.contains('markdown-image-pending')).toBe(true)
    expect(image?.getAttribute('src')).toBe('/api/assets/share-123/docs/diagram.png')

    await act(async () => {
      image?.dispatchEvent(new Event('load'))
    })

    expect(onLoad).toHaveBeenCalledOnce()
    expect(container.querySelector('.markdown-image-skeleton-fade')).not.toBeNull()
    expect(image?.classList.contains('markdown-image-ready')).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180)
    })

    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it('removes the skeleton immediately on error and forwards the error event', async () => {
    const onError = vi.fn()
    const image = await renderImage({ onError })

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()

    await act(async () => {
      image?.dispatchEvent(new Event('error'))
    })

    expect(onError).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(image?.classList.contains('markdown-image-error')).toBe(true)
  })
})

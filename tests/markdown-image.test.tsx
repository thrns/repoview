// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { analyticsTrack, lightboxRender } = vi.hoisted(() => ({
  analyticsTrack: vi.fn(),
  lightboxRender: vi.fn(),
}))

vi.mock('../components/viewer/markdown-image-lightbox', () => ({
  default: (props: { src: string; alt: string }) => {
    lightboxRender(props.src, props.alt)
    return <div data-lightbox-open="true" />
  },
}))
vi.mock('../components/viewer/viewer-analytics', () => ({
  useViewerAnalytics: () => ({ track: analyticsTrack }),
}))

import { MarkdownImage } from '../components/viewer/markdown-image'

describe('MarkdownImage loading state', () => {
  let container: HTMLDivElement
  let root: Root | null = null
  let completeDescriptor: PropertyDescriptor | undefined
  let naturalWidthDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    completeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete')
    naturalWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => false,
    })
    analyticsTrack.mockClear()
    lightboxRender.mockClear()
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    restoreProperty('complete', completeDescriptor)
    restoreProperty('naturalWidth', naturalWidthDescriptor)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function renderImage({ src = '/api/assets/share-123/docs/diagram.png', width, height, onLoad, onError }: {
    src?: string
    width?: number | string
    height?: number | string
    onLoad?: () => void
    onError?: () => void
  } = {}) {
    await act(async () => {
      root = createRoot(container)
      root.render(
        <MarkdownImage
          src={src}
          alt="Architecture diagram"
          width={width}
          height={height}
          analyticsPath="README.md"
          onLoad={onLoad}
          onError={onError}
        />,
      )
    })
    return container.querySelector('img')
  }

  async function updateImage(src: string) {
    await act(async () => {
      root?.render(<MarkdownImage src={src} alt="Updated diagram" />)
    })
  }

  it('shows the design-system skeleton while keeping the image mounted', async () => {
    const image = await renderImage()

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(image?.classList.contains('markdown-image-pending')).toBe(true)
    expect(image?.getAttribute('src')).toBe('/api/assets/share-123/docs/diagram.png')
    expect(container.querySelector('.markdown-image-frame')?.getAttribute('style')).toBeNull()
  })

  it('reserves metadata dimensions and aspect ratio while the image loads', async () => {
    await renderImage({ width: 640, height: 480 })

    const frame = container.querySelector('.markdown-image-frame')
    expect(frame?.getAttribute('style')).toContain('aspect-ratio: 640 / 480')
    expect(frame?.getAttribute('style')).toContain('width: min(640px, 100%)')
  })

  it('removes the skeleton on load, forwards the event, and tracks the image view', async () => {
    const onLoad = vi.fn()
    const image = await renderImage({ onLoad })

    await act(async () => {
      image?.dispatchEvent(new Event('load'))
    })

    expect(onLoad).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(image?.classList.contains('markdown-image-ready')).toBe(true)
    expect(analyticsTrack).toHaveBeenCalledOnce()
    expect(analyticsTrack).toHaveBeenCalledWith('image_viewed', 'README.md', { source: 'markdown' })
  })

  it('removes the skeleton and broken image on error', async () => {
    const onError = vi.fn()
    const image = await renderImage({ onError })

    await act(async () => {
      image?.dispatchEvent(new Event('error'))
    })

    expect(onError).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.markdown-image-unavailable')?.textContent).toBe('Image unavailable')
  })

  it('resets to loading when src changes', async () => {
    await renderImage()
    await act(async () => {
      container.querySelector('img')?.dispatchEvent(new Event('load'))
    })
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()

    await updateImage('/api/assets/share-123/docs/next-diagram.png')

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/assets/share-123/docs/next-diagram.png')
  })

  it('loads the lightbox only after a large image is clicked', async () => {
    await renderImage()
    expect(lightboxRender).not.toHaveBeenCalled()

    await act(async () => {
      container.querySelector('button')?.click()
    })
    await act(async () => {
      await vi.waitFor(() => expect(lightboxRender).toHaveBeenCalledWith('/api/assets/share-123/docs/diagram.png', 'Architecture diagram'), { timeout: 5000 })
    })

    expect(lightboxRender).toHaveBeenCalledOnce()
  })
})

function restoreProperty(name: 'complete' | 'naturalWidth', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(HTMLImageElement.prototype, name, descriptor)
  } else {
    Reflect.deleteProperty(HTMLImageElement.prototype, name)
  }
}

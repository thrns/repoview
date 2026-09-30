import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('yet-another-react-lightbox', () => ({ default: () => null }))
vi.mock('yet-another-react-lightbox/plugins/fullscreen', () => ({ default: {} }))
vi.mock('yet-another-react-lightbox/plugins/zoom', () => ({ default: {} }))
vi.mock('yet-another-react-lightbox/styles.css', () => ({}))

import MarkdownImageLightbox from '../components/viewer/markdown-image-lightbox'

describe('MarkdownImageLightbox', () => {
  it('opens the existing lightbox with zoom and fullscreen for the selected image', () => {
    const close = vi.fn()
    const element = MarkdownImageLightbox({ src: 'https://example.test/image.png', alt: 'Example image', close }) as ReactElement<{
      open: boolean
      close: () => void
      slides: Array<{ src: string; alt: string }>
      plugins: unknown[]
    }>

    expect(element.props.open).toBe(true)
    expect(element.props.close).toBe(close)
    expect(element.props.slides).toEqual([{ src: 'https://example.test/image.png', alt: 'Example image' }])
    expect(element.props.plugins).toHaveLength(2)
  })
})

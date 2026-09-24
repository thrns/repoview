'use client'

import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { useState, type ImgHTMLAttributes } from 'react'
import { useViewerAnalytics } from './viewer-analytics'

interface MarkdownImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  analyticsPath?: string
}

export function MarkdownImage({ src, alt = '', width, height, className, analyticsPath, ...props }: MarkdownImageProps) {
  const [open, setOpen] = useState(false)
  const analytics = useViewerAnalytics()

  if (!src) return null

  const isSmall = isSmallImage({ src, alt, width, height })
  const image = (
    <img
      {...props}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={['markdown-image', className].filter(Boolean).join(' ')}
      data-markdown-image-size={isSmall ? 'small' : 'large'}
      loading="lazy"
      decoding="async"
      onLoad={(event) => {
        props.onLoad?.(event)
        analytics.track('image_viewed', analyticsPath ?? null, { source: 'markdown' })
      }}
    />
  )

  if (isSmall) {
    return <span className="markdown-image-inline">{image}</span>
  }

  return (
    <>
      <button
        type="button"
        className="markdown-image-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Open ${alt || 'image'} in lightbox`}
      >
        {image}
      </button>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src, alt }]}
        plugins={[Zoom, Fullscreen]}
        carousel={{ finite: true }}
        labels={{ Close: 'Close image', "Enter Fullscreen": 'Open fullscreen', "Exit Fullscreen": 'Exit fullscreen' }}
      />
    </>
  )
}

function normalizeDimension(value: string | number | undefined) {
  if (typeof value === 'number') return value
  if (!value || value.endsWith('%')) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isSmallImage({ src, alt, width, height }: { src: string; alt: string; width?: string | number; height?: string | number }) {
  const explicitWidth = normalizeDimension(width)
  const explicitHeight = normalizeDimension(height)
  if ((explicitWidth !== undefined && explicitWidth <= 180) || (explicitHeight !== undefined && explicitHeight <= 96)) {
    return true
  }

  return /(?:badge|shield|logo|icon|favicon|avatar|status)(?:[-_./]|$)/i.test(`${src} ${alt}`)
}

'use client'

import { lazy, Suspense, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { Skeleton } from '@/components/ui'
import { useViewerAnalytics } from './viewer-analytics'

const MarkdownImageLightbox = lazy(() => import('./markdown-image-lightbox'))

interface MarkdownImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  analyticsPath?: string
}

interface MarkdownImageState {
  src: string
  status: 'loading' | 'loaded' | 'error'
}

export function MarkdownImage({ src, alt = '', width, height, className, analyticsPath, ...props }: MarkdownImageProps) {
  const [open, setOpen] = useState(false)
  const [imageState, setImageState] = useState<MarkdownImageState | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const analytics = useViewerAnalytics()

  const isSmall = src ? isSmallImage({ src, alt, width, height }) : false
  const currentStatus = src && imageState?.src === src ? imageState.status : 'loading'
  const isLoading = currentStatus === 'loading'
  const isLoaded = currentStatus === 'loaded'
  const isError = currentStatus === 'error'
  const explicitWidth = normalizeDimension(width)
  const explicitHeight = normalizeDimension(height)
  const hasAspectRatio = explicitWidth !== undefined && explicitWidth > 0 && explicitHeight !== undefined && explicitHeight > 0
  const frameStyle = hasAspectRatio
    ? { aspectRatio: `${explicitWidth} / ${explicitHeight}`, width: `min(${explicitWidth}px, 100%)` }
    : undefined

  useEffect(() => {
    if (!src) {
      setImageState(null)
      return
    }

    setOpen(false)
    setImageState({ src, status: 'loading' })

    const image = imageRef.current
    if (image?.complete) {
      setImageState({ src, status: image.naturalWidth > 0 ? 'loaded' : 'error' })
    }
  }, [src])

  if (!src) return null

  const imageFrame = (
    <span
      className="markdown-image-frame"
      data-markdown-image-size={isSmall ? 'small' : 'large'}
      style={frameStyle}
      aria-busy={isLoading}
    >
      {isLoading ? <Skeleton className="markdown-image-skeleton" /> : null}
      {isError ? (
        <span className="markdown-image-unavailable" role="img" aria-label={alt ? `${alt} unavailable` : 'Image unavailable'}>
          Image unavailable
        </span>
      ) : (
        <img
          {...props}
          ref={imageRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={[
            'markdown-image',
            className,
            isLoading ? 'markdown-image-pending' : null,
            isLoaded ? 'markdown-image-ready' : null,
          ].filter(Boolean).join(' ')}
          data-markdown-image-size={isSmall ? 'small' : 'large'}
          loading="lazy"
          decoding="async"
          onLoad={(event) => {
            setImageState({ src, status: 'loaded' })
            props.onLoad?.(event)
            analytics.track('image_viewed', analyticsPath ?? null, { source: 'markdown' })
          }}
          onError={(event) => {
            setImageState({ src, status: 'error' })
            props.onError?.(event)
          }}
        />
      )}
    </span>
  )

  if (isSmall) {
    return <span className="markdown-image-inline">{imageFrame}</span>
  }

  if (isError) {
    return <span className="markdown-image-failed">{imageFrame}</span>
  }

  return (
    <>
      <button
        type="button"
        className="markdown-image-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Open ${alt || 'image'} in lightbox`}
      >
        {imageFrame}
      </button>
      {open ? (
        <Suspense fallback={null}>
          <MarkdownImageLightbox src={src} alt={alt} close={() => setOpen(false)} />
        </Suspense>
      ) : null}
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

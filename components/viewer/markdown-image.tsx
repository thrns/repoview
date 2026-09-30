'use client'

import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { Skeleton } from '@/components/ui'
import { useViewerAnalytics } from './viewer-analytics'

interface MarkdownImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  analyticsPath?: string
}

interface MarkdownImageState {
  src: string
  status: 'loaded' | 'error'
  transitionComplete: boolean
  aspectRatio?: string
}

export function MarkdownImage({ src, alt = '', width, height, className, analyticsPath, ...props }: MarkdownImageProps) {
  const [open, setOpen] = useState(false)
  const [imageState, setImageState] = useState<MarkdownImageState | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const analytics = useViewerAnalytics()

  const isSmall = src ? isSmallImage({ src, alt, width, height }) : false
  const currentImageState = src && imageState?.src === src ? imageState : null
  const isLoading = Boolean(src) && currentImageState === null
  const isLoaded = currentImageState?.status === 'loaded'
  const isError = currentImageState?.status === 'error'
  const showSkeleton = isLoading || (isLoaded && !currentImageState.transitionComplete)
  const explicitWidth = normalizeDimension(width)
  const explicitHeight = normalizeDimension(height)
  const aspectRatio = explicitWidth !== undefined && explicitWidth > 0 && explicitHeight !== undefined && explicitHeight > 0
    ? `${explicitWidth} / ${explicitHeight}`
    : currentImageState?.aspectRatio ?? '16 / 9'

  useEffect(() => {
    if (!src) return

    const image = imageRef.current
    if (!image?.complete) return

    setImageState({
      src,
      status: image.naturalWidth > 0 ? 'loaded' : 'error',
      transitionComplete: image.naturalWidth === 0,
      aspectRatio: image.naturalWidth > 0 ? `${image.naturalWidth} / ${image.naturalHeight}` : undefined,
    })
  }, [src])

  useEffect(() => {
    if (!src || !currentImageState || currentImageState.status !== 'loaded' || currentImageState.transitionComplete) return

    const timer = window.setTimeout(() => {
      setImageState((state) => state?.src === src && state.status === 'loaded'
        ? { ...state, transitionComplete: true }
        : state)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [currentImageState, src])

  if (!src) return null

  const imageFrame = (
    <span
      className="markdown-image-frame"
      data-markdown-image-size={isSmall ? 'small' : 'large'}
      style={{ aspectRatio }}
      aria-busy={isLoading}
    >
      {showSkeleton ? (
        <Skeleton className={`markdown-image-skeleton${isLoaded ? ' markdown-image-skeleton-fade' : ''}`} />
      ) : null}
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
          isError ? 'markdown-image-error' : null,
        ].filter(Boolean).join(' ')}
        data-markdown-image-size={isSmall ? 'small' : 'large'}
        loading="lazy"
        decoding="async"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget
          setImageState({
            src,
            status: 'loaded',
            transitionComplete: false,
            aspectRatio: naturalWidth > 0 && naturalHeight > 0 ? `${naturalWidth} / ${naturalHeight}` : undefined,
          })
          props.onLoad?.(event)
          analytics.track('image_viewed', analyticsPath ?? null, { source: 'markdown' })
        }}
        onError={(event) => {
          setImageState({ src, status: 'error', transitionComplete: true })
          props.onError?.(event)
        }}
      />
    </span>
  )

  if (isSmall) {
    return <span className="markdown-image-inline">{imageFrame}</span>
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

'use client'

import { AlertTriangle, Expand, Focus, Minus, Move, Plus, RefreshCcw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { sanitizeMermaidSvg } from '../../lib/viewer/mermaid-sanitize'
import { useViewerAnalytics } from './viewer-analytics'

type DiagramView = { scale: number; x: number; y: number }

const renderedDiagramCache = new Map<string, string>()
const MAX_RENDERED_DIAGRAMS = 24
let mermaidModulePromise: ReturnType<typeof importMermaid> | undefined
let configuredTheme: 'light' | 'dark' | undefined

export function clearMermaidDiagramCache() {
  renderedDiagramCache.clear()
}

export function MermaidDiagram({ chart, analyticsPath }: { chart: string; analyticsPath?: string }) {
  const { resolvedTheme } = useTheme()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const analytics = useViewerAnalytics()
  const cacheKey = `${theme}\0${chart}`
  const [isVisible, setIsVisible] = useState(false)
  const [svg, setSvg] = useState(() => renderedDiagramCache.get(cacheKey) ?? null)
  const [error, setError] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [view, setView] = useState<DiagramView>({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setIsVisible(true)
      observer.disconnect()
    }, { rootMargin: '640px 0px' })

    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 })
    setError(false)
    setIsRendering(false)
    const cachedSvg = renderedDiagramCache.get(cacheKey)
    setSvg(cachedSvg ?? null)
    if (cachedSvg || !isVisible) return

    let cancelled = false
    setIsRendering(true)

    async function renderDiagram() {
      try {
        const mermaid = await getMermaid()
        configureMermaid(mermaid, theme)
        const result = await mermaid.render(`repo-view-mermaid-${id}`, chart)
        if (cancelled) return
        const sanitizedSvg = sanitizeMermaidSvg(result.svg)
        if (!sanitizedSvg) {
          setError(true)
          setIsRendering(false)
          return
        }

        renderedDiagramCache.set(cacheKey, sanitizedSvg)
        while (renderedDiagramCache.size > MAX_RENDERED_DIAGRAMS) {
          const oldestKey = renderedDiagramCache.keys().next().value
          if (!oldestKey) break
          renderedDiagramCache.delete(oldestKey)
        }
        setSvg(sanitizedSvg)
        setIsRendering(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setIsRendering(false)
        }
      }
    }

    void renderDiagram()
    return () => {
      cancelled = true
    }
  }, [cacheKey, chart, id, isVisible, theme])

  useEffect(() => {
    if (isVisible) analytics.track('mermaid_viewed', analyticsPath ?? null, { source: 'markdown' })
  }, [analytics, analyticsPath, isVisible])

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 })
  }, [])

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current
    const canvas = canvasRef.current
    if (!viewport || !canvas) {
      resetView()
      return
    }

    const diagram = canvas.querySelector('svg')
    if (!diagram) {
      resetView()
      return
    }

    const diagramWidth = diagram.getBoundingClientRect().width
    const diagramHeight = diagram.getBoundingClientRect().height
    const availableWidth = Math.max(240, viewport.clientWidth - 48)
    const availableHeight = Math.max(160, viewport.clientHeight - 48)
    const fittedScale = diagramWidth > 0 && diagramHeight > 0
      ? Math.min(1, availableWidth / diagramWidth, availableHeight / diagramHeight)
      : 1
    setView({ scale: fittedScale, x: 0, y: 0 })
  }, [resetView])

  useEffect(() => {
    if (!svg) return
    const frameId = window.requestAnimationFrame(fitToView)
    return () => window.cancelAnimationFrame(frameId)
  }, [fitToView, svg])

  function zoomBy(delta: number) {
    setView((current) => ({ ...current, scale: clamp(current.scale + delta, 0.1, 3) }))
  }

  async function toggleFullscreen() {
    const host = hostRef.current
    if (!host) return
    if (document.fullscreenElement) {
      await document.exitFullscreen?.()
      return
    }
    await host.requestFullscreen?.()
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return
    setView((current) => ({ ...current, x: pointer.originX + event.clientX - pointer.x, y: pointer.originY + event.clientY - pointer.y }))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerRef.current?.pointerId !== event.pointerId) return
    pointerRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <div ref={hostRef} className="markdown-mermaid">
      <div className="markdown-mermaid-toolbar" aria-label="Diagram controls">
        <span className="markdown-mermaid-hint"><Move className="size-3" aria-hidden="true" /> Drag to pan</span>
        <div className="markdown-mermaid-controls">
          <button type="button" className="markdown-diagram-control" onClick={() => zoomBy(-0.2)} aria-label="Zoom out" title="Zoom out">
            <Minus className="size-3.5" aria-hidden="true" />
          </button>
          <span className="markdown-diagram-zoom" aria-live="polite">{Math.round(view.scale * 100)}%</span>
          <button type="button" className="markdown-diagram-control" onClick={() => zoomBy(0.2)} aria-label="Zoom in" title="Zoom in">
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
          <span className="markdown-diagram-control-divider" aria-hidden="true" />
          <button type="button" className="markdown-diagram-control" onClick={fitToView} aria-label="Fit diagram to view" title="Fit to view">
            <Focus className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" className="markdown-diagram-control" onClick={resetView} aria-label="Reset diagram view" title="Reset view">
            <RefreshCcw className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" className="markdown-diagram-control" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen" title="Fullscreen">
            <Expand className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="markdown-mermaid-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: pointerRef.current ? 'grabbing' : 'grab' }}
      >
        {!isVisible || isRendering ? <div className="markdown-mermaid-loading" aria-label="Rendering diagram"><span /><span /><span /></div> : null}
        {error ? (
          <div className="markdown-mermaid-fallback" role="status">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted"><AlertTriangle className="size-3.5" aria-hidden="true" />Diagram could not be rendered</div>
            <pre><code>{chart}</code></pre>
          </div>
        ) : svg ? (
          <div
            ref={canvasRef}
            className="markdown-mermaid-canvas"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>
    </div>
  )
}

async function importMermaid() {
  const { default: mermaid } = await import('mermaid')
  return mermaid
}

async function getMermaid() {
  mermaidModulePromise ??= importMermaid()
  return mermaidModulePromise
}

function configureMermaid(mermaid: Awaited<ReturnType<typeof importMermaid>>, theme: 'light' | 'dark') {
  if (configuredTheme === theme) return

  const isDark = theme === 'dark'
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: 'base',
    layout: 'elk',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      background: isDark ? '#101114' : '#ffffff',
      primaryColor: isDark ? '#1c1f24' : '#f7f7f8',
      primaryTextColor: isDark ? '#f5f5f5' : '#17181b',
      primaryBorderColor: isDark ? '#3b3f49' : '#d7d9de',
      lineColor: isDark ? '#9aa1ae' : '#6b7280',
      secondaryColor: isDark ? '#171a20' : '#fbfbfc',
      secondaryTextColor: isDark ? '#d8dce3' : '#30333a',
      tertiaryColor: isDark ? '#20242b' : '#f1f2f4',
      tertiaryTextColor: isDark ? '#d8dce3' : '#30333a',
      clusterBkg: isDark ? '#15181d' : '#fafafa',
      clusterBorder: isDark ? '#353a44' : '#dfe1e6',
      edgeLabelBackground: isDark ? '#101114' : '#ffffff',
      fontSize: '14px',
      nodeBorder: isDark ? '#3b3f49' : '#d7d9de',
    },
    flowchart: {
      htmlLabels: false,
      curve: 'basis',
      padding: 18,
      nodeSpacing: 42,
      rankSpacing: 54,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
      actorMargin: 48,
      boxMargin: 12,
      messageMargin: 38,
    },
  })
  configuredTheme = theme
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'

import { VIEWER_ID_STORAGE_KEY } from '../../lib/analytics/constants'
import { startViewTracker } from '../../lib/viewer/view-tracker'
import type { ViewerAnalyticsEvent, ViewerAnalyticsEventType, ViewerClientContext, ViewerSessionSnapshot } from '../../lib/viewer/analytics-types'

type ViewerAnalyticsContextValue = {
  track: (eventType: ViewerAnalyticsEventType, path?: string | null, metadata?: Record<string, string | number | boolean | null>) => void
  setCurrentPath: (path: string | null) => void
  clientContext: ViewerClientContext
  markConfirmed: () => void
  getSessionSnapshot: () => ViewerSessionSnapshot
}

const ViewerAnalyticsContext = createContext<ViewerAnalyticsContextValue | null>(null)

export function ViewerAnalyticsProvider({ shareId, initialPath, children }: { shareId: string; initialPath: string | null; children: ReactNode }) {
  const queueRef = useRef<ViewerAnalyticsEvent[]>([])
  const confirmedRef = useRef(false)
  const pendingRef = useRef(false)
  const currentPathRef = useRef(initialPath)
  const entryPathRef = useRef(typeof window === 'undefined' ? null : window.location.pathname)
  const sequenceRef = useRef(0)
  const activeMsRef = useRef(0)
  const idleMsRef = useRef(0)
  const visibilityChangesRef = useRef(0)
  const focusChangesRef = useRef(0)
  const lastVisibilityRef = useRef(typeof document === 'undefined' ? 'hidden' : document.visibilityState)
  const clientContextRef = useRef<ViewerClientContext>(getClientContext())
  const previousPathRef = useRef<string | null>(null)
  const fileTimeRef = useRef(new Map<string, { activeMs: number; idleMs: number }>())

  const send = useCallback((ended = false) => {
    if (!confirmedRef.current || (pendingRef.current && !ended) || queueRef.current.length === 0) return
    const events = queueRef.current.splice(0, 50)
    pendingRef.current = true
    const session: ViewerSessionSnapshot = {
      activeMs: activeMsRef.current,
      idleMs: idleMsRef.current,
      entryPath: entryPathRef.current,
      exitPath: currentPathRef.current,
      visibilityChanges: visibilityChangesRef.current,
      focusChanges: focusChangesRef.current,
      ...(ended ? { ended: true } : {}),
    }
    void fetch('/api/view/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shareId, events, clientContext: clientContextRef.current, session }),
      keepalive: ended,
    }).then((response) => {
      if (!response.ok) queueRef.current.unshift(...events)
    }).catch(() => queueRef.current.unshift(...events)).finally(() => {
      pendingRef.current = false
    })
  }, [shareId])

  const track = useCallback((eventType: ViewerAnalyticsEventType, path: string | null = null, metadata: Record<string, string | number | boolean | null> = {}) => {
    queueRef.current.push({ eventType, path, metadata, clientSequence: sequenceRef.current++ })
    if (confirmedRef.current && queueRef.current.length >= 8) send()
  }, [send])

  const flushFileDwell = useCallback((path: string | null) => {
    if (!path) return
    const dwell = fileTimeRef.current.get(path) ?? { activeMs: 0, idleMs: 0 }
    track('file_viewed', path, {
      active_ms: dwell.activeMs,
      idle_ms: dwell.idleMs,
      dwell_ms: dwell.activeMs + dwell.idleMs,
    })
    fileTimeRef.current.delete(path)
  }, [track])

  const setCurrentPath = useCallback((path: string | null) => {
    if (path && currentPathRef.current && path !== currentPathRef.current) {
      flushFileDwell(currentPathRef.current)
    }
    currentPathRef.current = path
  }, [flushFileDwell])

  const markConfirmed = useCallback(() => {
    confirmedRef.current = true
    send()
  }, [send])

  const getSessionSnapshot = useCallback((): ViewerSessionSnapshot => ({
    activeMs: activeMsRef.current,
    idleMs: idleMsRef.current,
    entryPath: entryPathRef.current,
    exitPath: currentPathRef.current,
    visibilityChanges: visibilityChangesRef.current,
    focusChanges: focusChangesRef.current,
  }), [])

  const value = useMemo<ViewerAnalyticsContextValue>(() => ({ track, setCurrentPath, clientContext: clientContextRef.current, markConfirmed, getSessionSnapshot }), [getSessionSnapshot, markConfirmed, setCurrentPath, track])

  useEffect(() => {
    try {
      const viewerId = document.cookie.split('; ').find((cookie) => cookie.startsWith('repoview_viewer_id='))?.split('=').slice(1).join('=')
      if (viewerId) window.localStorage.setItem(VIEWER_ID_STORAGE_KEY, decodeURIComponent(viewerId))
    } catch {
      // Local storage may be unavailable; the first-party cookie remains authoritative.
    }

    track('repository_opened', initialPath, { entry_page: window.location.pathname })
    const interval = window.setInterval(() => {
      const active = document.visibilityState === 'visible' && document.hasFocus()
      if (active) activeMsRef.current += 5_000
      else idleMsRef.current += 5_000
      const path = currentPathRef.current
      if (path) {
        const dwell = fileTimeRef.current.get(path) ?? { activeMs: 0, idleMs: 0 }
        if (active) dwell.activeMs += 5_000
        else dwell.idleMs += 5_000
        fileTimeRef.current.set(path, dwell)
      }
    }, 5_000)

    const handleVisibility = () => {
      if (lastVisibilityRef.current !== document.visibilityState) {
        visibilityChangesRef.current += 1
        lastVisibilityRef.current = document.visibilityState
        track('tab_visibility_changed', currentPathRef.current, { state: document.visibilityState })
      }
    }
    const handleFocus = () => {
      focusChangesRef.current += 1
      track('focus_changed', currentPathRef.current, { focused: document.hasFocus() })
    }
    const handlePageHide = () => {
      flushFileDwell(currentPathRef.current)
      track('session_ended', currentPathRef.current, { reason: 'pagehide' })
      send(true)
    }
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (!target?.href) return
      try {
        const url = new URL(target.href, window.location.href)
        if (url.origin !== window.location.origin) track('external_link_clicked', currentPathRef.current, { host: url.hostname.slice(0, 255) })
      } catch {
        // Ignore malformed links.
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleFocus)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('click', handleDocumentClick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleFocus)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [flushFileDwell, initialPath, send, track])

  useEffect(() => {
    if (initialPath && previousPathRef.current !== initialPath) {
      track('file_opened', initialPath, { entry_page: initialPath })
    }
    previousPathRef.current = initialPath
    setCurrentPath(initialPath)
  }, [initialPath, setCurrentPath, track])

  useEffect(() => {
    const handleScroll = () => {
      const path = currentPathRef.current
      if (!path) return
      const percent = Math.min(100, Math.max(0, Math.round(((window.scrollY + window.innerHeight) / Math.max(document.documentElement.scrollHeight, window.innerHeight)) * 100)))
      const bucket = percent >= 100 ? 100 : percent >= 90 ? 90 : percent >= 75 ? 75 : percent >= 50 ? 50 : percent >= 25 ? 25 : 0
      if (bucket > 0) track('scroll_depth', path, { percent: bucket })
    }
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) return
      const startLine = getLineNumber(selection.anchorNode)
      const endLine = getLineNumber(selection.focusNode)
      if (startLine === null || endLine === null) return
      track('code_selected', currentPathRef.current, { start_line: Math.min(startLine, endLine), end_line: Math.max(startLine, endLine) })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('selectionchange', handleSelection)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('selectionchange', handleSelection)
    }
  }, [track])

  useEffect(() => {
    const timer = window.setInterval(() => send(), 8_000)
    return () => window.clearInterval(timer)
  }, [send])

  return <ViewerAnalyticsContext.Provider value={value}>{children}<ViewTrackerBridge shareId={shareId} /></ViewerAnalyticsContext.Provider>
}

function ViewTrackerBridge({ shareId }: { shareId: string }) {
  const analytics = useViewerAnalytics()
  const analyticsRef = useRef(analytics)
  analyticsRef.current = analytics
  useEffect(() => startViewTracker({
    shareId,
    confirmPayload: { entryPath: window.location.pathname, clientContext: analytics.clientContext },
    onConfirmed: () => analyticsRef.current.markConfirmed(),
    getHeartbeatPayload: () => analyticsRef.current.getSessionSnapshot(),
  }), [analytics.clientContext, shareId])
  return null
}

export function useViewerAnalytics() {
  const value = useContext(ViewerAnalyticsContext)
  return value ?? {
    track: () => undefined,
    setCurrentPath: () => undefined,
    clientContext: {},
    markConfirmed: () => undefined,
    getSessionSnapshot: () => ({ activeMs: 0, idleMs: 0, visibilityChanges: 0, focusChanges: 0 }),
  }
}

function getClientContext(): ViewerClientContext {
  if (typeof window === 'undefined') return {}
  const ua = navigator.userAgent
  return {
    deviceType: /Tablet|iPad|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobile|Android.*(?:Mobile|Mobi)|iPhone|iPod/i.test(ua) ? 'mobile' : 'desktop',
    browser: getBrowser(ua),
    browserVersion: ua.match(/(?:Edg|OPR|Chrome|CriOS|Firefox|FxiOS|Version|SamsungBrowser)\/([\d.]+)/i)?.[1] ?? null,
    renderingEngine: /Gecko\//i.test(ua) && /Firefox\//i.test(ua) ? 'Gecko' : /AppleWebKit\//i.test(ua) ? 'WebKit/Blink' : null,
    os: getOs(ua),
    osVersion: ua.match(/(?:Windows NT|Android|Mac OS X|CPU (?:iPhone )?OS)\s?([\d_\.]+)/i)?.[1]?.replaceAll('_', '.') ?? null,
    architecture: getArchitecture(),
    primaryLanguage: navigator.language ?? null,
    languages: navigator.languages ? [...navigator.languages].slice(0, 20) : [],
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type ?? null,
    logicalCpuCount: navigator.hardwareConcurrency ?? null,
    approximateMemoryGb: 'deviceMemory' in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) || null : null,
    touchCapable: navigator.maxTouchPoints > 0,
    darkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? null,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? null,
  }
}

function getBrowser(userAgent: string) {
  if (/SamsungBrowser\//i.test(userAgent)) return 'Samsung Internet'
  if (/Edg\//i.test(userAgent)) return 'Edge'
  if (/OPR\//i.test(userAgent)) return 'Opera'
  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) return 'Chrome'
  if (/Firefox\//i.test(userAgent) || /FxiOS\//i.test(userAgent)) return 'Firefox'
  if (/Safari\//i.test(userAgent) && !/Chrome|Chromium|CriOS|Android/i.test(userAgent)) return 'Safari'
  return null
}

function getOs(userAgent: string) {
  if (/CrOS/i.test(userAgent)) return 'ChromeOS'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/Windows/i.test(userAgent)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS'
  if (/Linux/i.test(userAgent)) return 'Linux'
  return null
}

function getArchitecture() {
  const userAgentData = (navigator as Navigator & { userAgentData?: { architecture?: string; bitness?: string } }).userAgentData
  return userAgentData?.architecture && userAgentData.bitness ? `${userAgentData.architecture}/${userAgentData.bitness}` : null
}

function getLineNumber(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  const line = element?.closest('.line')
  if (!line) return null
  const lines = [...document.querySelectorAll('.source-code .line')]
  const index = lines.indexOf(line)
  return index >= 0 ? index + 1 : null
}

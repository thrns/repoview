'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { VIEWER_ID_STORAGE_KEY } from '../../lib/analytics/constants'
import { startViewTracker } from '../../lib/viewer/view-tracker'
import type { ViewerAnalyticsMode } from '../../lib/viewer/privacy'
import type { ViewerAnalyticsEvent, ViewerAnalyticsEventType, ViewerClientContext, ViewerSessionSnapshot } from '../../lib/viewer/analytics-types'

type ViewerAnalyticsContextValue = {
  track: (eventType: ViewerAnalyticsEventType, path?: string | null, metadata?: Record<string, string | number | boolean | null>) => void
  setCurrentPath: (path: string | null) => void
  clientContext: ViewerClientContext
  markConfirmed: () => void
  getSessionSnapshot: () => ViewerSessionSnapshot
  analyticsMode: ViewerAnalyticsMode
  gpcApplied: boolean
  setAnalyticsPreference: (mode: ViewerAnalyticsMode, gpcApplied?: boolean) => void
}

const ViewerAnalyticsContext = createContext<ViewerAnalyticsContextValue | null>(null)

export function ViewerAnalyticsProvider({ shareId, initialPath, analyticsMode: initialAnalyticsMode, gpcApplied: initialGpcApplied, children }: { shareId: string; initialPath: string | null; analyticsMode: ViewerAnalyticsMode; gpcApplied: boolean; children: ReactNode }) {
  const queueRef = useRef<ViewerAnalyticsEvent[]>([])
  const confirmedRef = useRef(false)
  const pendingRef = useRef(false)
  const currentPathRef = useRef(initialPath)
  const entryPathRef = useRef(typeof window === 'undefined' ? null : window.location.pathname)
  const sequenceRef = useRef(0)
  const activeMsRef = useRef(0)
  const [analyticsMode, setAnalyticsModeState] = useState<ViewerAnalyticsMode>(initialAnalyticsMode)
  const [gpcApplied, setGpcApplied] = useState(initialGpcApplied)
  const analyticsModeRef = useRef(initialAnalyticsMode)
  const gpcAppliedRef = useRef(initialGpcApplied)
  const clientContextRef = useRef<ViewerClientContext>(initialAnalyticsMode === 'optional' && !initialGpcApplied ? getClientContext() : {})
  const previousPathRef = useRef<string | null>(null)
  const fileTimeRef = useRef(new Map<string, { activeMs: number }>())

  const send = useCallback((ended = false) => {
    if (analyticsModeRef.current !== 'optional' || gpcAppliedRef.current || !confirmedRef.current || (pendingRef.current && !ended) || queueRef.current.length === 0) return
    const events = queueRef.current.splice(0, 50)
    pendingRef.current = true
    const session: ViewerSessionSnapshot = {
      activeMs: activeMsRef.current,
      entryPath: entryPathRef.current,
      exitPath: currentPathRef.current,
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
    if (analyticsModeRef.current !== 'optional' || gpcAppliedRef.current) return
    queueRef.current.push({ eventType, path, metadata, clientSequence: sequenceRef.current++ })
    if (confirmedRef.current && queueRef.current.length >= 8) send()
  }, [send])

  const flushFileDwell = useCallback((path: string | null) => {
    if (!path) return
    const dwell = fileTimeRef.current.get(path) ?? { activeMs: 0 }
    track('file_viewed', path, {
      active_ms: dwell.activeMs,
      dwell_ms: dwell.activeMs,
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

  const setAnalyticsPreference = useCallback((nextMode: ViewerAnalyticsMode, nextGpcApplied = false) => {
    analyticsModeRef.current = nextMode
    gpcAppliedRef.current = nextGpcApplied
    setAnalyticsModeState(nextMode)
    setGpcApplied(nextGpcApplied)
    if (nextMode === 'optional' && !nextGpcApplied) {
      clientContextRef.current = getClientContext()
      return
    }
    queueRef.current = []
    try {
      window.localStorage.removeItem(VIEWER_ID_STORAGE_KEY)
    } catch {
      // Local storage may be unavailable.
    }
  }, [])

  const getSessionSnapshot = useCallback((): ViewerSessionSnapshot => ({
    activeMs: activeMsRef.current,
    entryPath: entryPathRef.current,
    exitPath: currentPathRef.current,
  }), [])

  const value = useMemo<ViewerAnalyticsContextValue>(() => ({ track, setCurrentPath, clientContext: clientContextRef.current, markConfirmed, getSessionSnapshot, analyticsMode, gpcApplied, setAnalyticsPreference }), [analyticsMode, gpcApplied, getSessionSnapshot, markConfirmed, setAnalyticsPreference, setCurrentPath, track])

  useEffect(() => {
    if (analyticsModeRef.current === 'necessary' || gpcAppliedRef.current) {
      try {
        window.localStorage.removeItem(VIEWER_ID_STORAGE_KEY)
      } catch {
        // Local storage may be unavailable.
      }
    }
    const browserGpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    if (!browserGpc || gpcAppliedRef.current) return
    setAnalyticsPreference('necessary', true)
    void fetch('/api/view/privacy', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shareId, analyticsMode: 'necessary' }),
    }).catch(() => undefined)
  }, [setAnalyticsPreference, shareId])

  useEffect(() => {
    if (analyticsModeRef.current === 'optional' && !gpcAppliedRef.current) {
      track('repository_opened', initialPath, { entry_page: window.location.pathname })
    }
    const interval = window.setInterval(() => {
      if (analyticsModeRef.current !== 'optional' || gpcAppliedRef.current) return
      const active = document.visibilityState === 'visible' && document.hasFocus()
      if (active) activeMsRef.current += 5_000
      const path = currentPathRef.current
      if (path) {
        const dwell = fileTimeRef.current.get(path) ?? { activeMs: 0 }
        if (active) dwell.activeMs += 5_000
        fileTimeRef.current.set(path, dwell)
      }
    }, 5_000)

    const handlePageHide = () => {
      flushFileDwell(currentPathRef.current)
      track('session_ended', currentPathRef.current, { reason: 'pagehide' })
      send(true)
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', handlePageHide)
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
    confirmPayload: {
      entryPath: window.location.pathname,
      ...(analytics.analyticsMode === 'optional' && !analytics.gpcApplied ? { clientContext: analytics.clientContext } : {}),
    },
    onConfirmed: () => analyticsRef.current.markConfirmed(),
    getHeartbeatPayload: () => analyticsRef.current.getSessionSnapshot(),
  }), [analytics.analyticsMode, analytics.clientContext, analytics.gpcApplied, shareId])
  return null
}

export function useViewerAnalytics() {
  const value = useContext(ViewerAnalyticsContext)
  return value ?? {
    track: () => undefined,
    setCurrentPath: () => undefined,
    clientContext: {},
    markConfirmed: () => undefined,
    getSessionSnapshot: () => ({ activeMs: 0 }),
    analyticsMode: 'necessary',
    gpcApplied: false,
    setAnalyticsPreference: () => undefined,
  }
}

function getClientContext(): ViewerClientContext {
  if (typeof window === 'undefined') return {}
  const ua = navigator.userAgent
  return {
    deviceType: /Tablet|iPad|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobile|Android.*(?:Mobile|Mobi)|iPhone|iPod/i.test(ua) ? 'mobile' : 'desktop',
    browser: getBrowser(ua),
    os: getOs(ua),
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

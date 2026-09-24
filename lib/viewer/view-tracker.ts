export const VIEW_CONFIRMATION_DELAY_MS = 5_000
export const VIEW_HEARTBEAT_INTERVAL_MS = 30_000

type TrackerDocument = {
  readonly visibilityState: DocumentVisibilityState
  addEventListener: Document['addEventListener']
  removeEventListener: Document['removeEventListener']
}

type TrackerWindow = {
  setTimeout: Window['setTimeout']
  clearTimeout: Window['clearTimeout']
  setInterval: Window['setInterval']
  clearInterval: Window['clearInterval']
}

type ViewTrackerOptions = {
  shareId: string
  documentRef?: TrackerDocument
  windowRef?: TrackerWindow
  fetchImpl?: typeof fetch
  confirmPayload?: Record<string, unknown>
  onConfirmed?: () => void
  getHeartbeatPayload?: () => Record<string, unknown>
}

export function startViewTracker({ shareId, documentRef = document, windowRef = window, fetchImpl = fetch, confirmPayload, onConfirmed, getHeartbeatPayload }: ViewTrackerOptions) {
  let timer: number | null = null
  let stopped = false
  let confirming = false
  let confirmed = false
  let heartbeatTimer: number | null = null
  let heartbeatPending = false

  const clearTimer = () => {
    if (timer !== null) {
      windowRef.clearTimeout(timer)
      timer = null
    }
  }

  const removeInteractionListeners = () => {
    documentRef.removeEventListener('pointerdown', handleInteraction)
    documentRef.removeEventListener('keydown', handleInteraction)
    documentRef.removeEventListener('scroll', handleInteraction)
  }

  const clearHeartbeat = () => {
    if (heartbeatTimer !== null) {
      windowRef.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const sendHeartbeat = async () => {
    if (stopped || !confirmed || heartbeatPending || documentRef.visibilityState !== 'visible') {
      return
    }

    heartbeatPending = true
    try {
      await fetchImpl('/api/view/heartbeat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shareId, ...(getHeartbeatPayload?.() ?? {}) }),
        keepalive: true,
      })
    } catch {
      // A missed heartbeat should not interrupt the viewer session.
    } finally {
      heartbeatPending = false
    }
  }

  const startHeartbeat = () => {
    clearHeartbeat()
    if (stopped || !confirmed || documentRef.visibilityState !== 'visible') {
      return
    }
    heartbeatTimer = windowRef.setInterval(() => {
      void sendHeartbeat()
    }, VIEW_HEARTBEAT_INTERVAL_MS)
  }

  const confirmView = async () => {
    if (stopped || confirming || confirmed || documentRef.visibilityState !== 'visible') {
      return
    }

    confirming = true
    try {
      const response = await fetchImpl('/api/view/confirm', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shareId, ...(confirmPayload ?? {}) }),
        keepalive: true,
      })

      if (stopped) {
        return
      }
      if (!response.ok) {
        confirming = false
        return
      }

      confirmed = true
      clearTimer()
      removeInteractionListeners()
      startHeartbeat()
      onConfirmed?.()
    } catch {
      confirming = false
    }
  }

  const scheduleConfirmation = () => {
    clearTimer()
    if (stopped || confirmed || documentRef.visibilityState !== 'visible') {
      return
    }
    timer = windowRef.setTimeout(() => {
      timer = null
      void confirmView()
    }, VIEW_CONFIRMATION_DELAY_MS)
  }

  function handleVisibilityChange() {
    if (confirmed) {
      if (documentRef.visibilityState === 'visible') {
        startHeartbeat()
      } else {
        clearHeartbeat()
      }
      return
    }
    scheduleConfirmation()
  }

  function handleInteraction(event: Event) {
    if (event.isTrusted === false || documentRef.visibilityState !== 'visible') {
      return
    }
    void confirmView()
  }

  documentRef.addEventListener('visibilitychange', handleVisibilityChange)
  documentRef.addEventListener('pointerdown', handleInteraction)
  documentRef.addEventListener('keydown', handleInteraction)
  documentRef.addEventListener('scroll', handleInteraction, { passive: true })
  scheduleConfirmation()

  return () => {
    stopped = true
    clearTimer()
    clearHeartbeat()
    removeInteractionListeners()
    documentRef.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

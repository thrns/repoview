import { describe, expect, it, vi } from 'vitest'

import {
  startViewTracker,
  VIEW_CONFIRMATION_DELAY_MS,
  VIEW_HEARTBEAT_INTERVAL_MS,
} from '../lib/viewer/view-tracker'

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'hidden'
}

function createClock() {
  let nextId = 1
  const callbacks = new Map<number, () => void>()
  const intervalCallbacks = new Map<number, () => void>()
  return {
    windowRef: {
      setTimeout: vi.fn((callback: TimerHandler, delay?: number) => {
        expect(delay).toBe(VIEW_CONFIRMATION_DELAY_MS)
        const id = nextId++
        callbacks.set(id, callback as () => void)
        return id
      }),
      clearTimeout: vi.fn((id: number) => callbacks.delete(id)),
      setInterval: vi.fn((callback: TimerHandler, delay?: number) => {
        expect(delay).toBe(VIEW_HEARTBEAT_INTERVAL_MS)
        const id = nextId++
        intervalCallbacks.set(id, callback as () => void)
        return id
      }),
      clearInterval: vi.fn((id: number) => intervalCallbacks.delete(id)),
    },
    runTimers() {
      for (const [id, callback] of callbacks) {
        callbacks.delete(id)
        callback()
      }
    },
    runIntervals() {
      for (const callback of intervalCallbacks.values()) {
        callback()
      }
    },
  }
}

function trustedEvent(type: string) {
  const event = new Event(type)
  Object.defineProperty(event, 'isTrusted', { value: true })
  return event
}

describe('ViewTracker', () => {
  it('waits for visible time and confirms without collecting event details', async () => {
    const documentRef = new FakeDocument()
    const clock = createClock()
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const stop = startViewTracker({ shareId: 'share-123', documentRef, windowRef: clock.windowRef, fetchImpl })

    documentRef.visibilityState = 'visible'
    documentRef.dispatchEvent(new Event('visibilitychange'))
    expect(fetchImpl).not.toHaveBeenCalled()

    clock.runTimers()
    await Promise.resolve()

    expect(fetchImpl).toHaveBeenCalledWith('/api/view/confirm', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ shareId: 'share-123' }),
    }))
    clock.runIntervals()
    await Promise.resolve()
    expect(fetchImpl).toHaveBeenCalledWith('/api/view/heartbeat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ shareId: 'share-123' }),
    }))
    stop()
  })

  it('does not confirm while hidden and confirms on genuine interaction once visible', async () => {
    const documentRef = new FakeDocument()
    const clock = createClock()
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const stop = startViewTracker({ shareId: 'share-456', documentRef, windowRef: clock.windowRef, fetchImpl })

    clock.runTimers()
    expect(fetchImpl).not.toHaveBeenCalled()

    documentRef.visibilityState = 'visible'
    documentRef.dispatchEvent(trustedEvent('visibilitychange'))
    documentRef.dispatchEvent(trustedEvent('pointerdown'))
    await Promise.resolve()

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    documentRef.dispatchEvent(trustedEvent('keydown'))
    await Promise.resolve()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    clock.runIntervals()
    await Promise.resolve()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl).toHaveBeenLastCalledWith('/api/view/heartbeat', expect.any(Object))
    documentRef.visibilityState = 'hidden'
    documentRef.dispatchEvent(trustedEvent('visibilitychange'))
    clock.runIntervals()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    stop()
  })

  it('ignores synthetic interactions and removes listeners when stopped', async () => {
    const documentRef = new FakeDocument()
    const clock = createClock()
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const stop = startViewTracker({ shareId: 'share-789', documentRef, windowRef: clock.windowRef, fetchImpl })

    documentRef.visibilityState = 'visible'
    documentRef.dispatchEvent(new Event('visibilitychange'))
    documentRef.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve()
    expect(fetchImpl).not.toHaveBeenCalled()

    stop()
    clock.runTimers()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

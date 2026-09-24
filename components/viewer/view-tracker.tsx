'use client'

import { useEffect } from 'react'

import { startViewTracker } from '@/lib/viewer/view-tracker'

export function ViewTracker({ shareId }: { shareId: string }) {
  useEffect(() => startViewTracker({ shareId }), [shareId])

  return null
}

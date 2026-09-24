'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { ViewerRootState } from '@/lib/viewer/root-model'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

export interface ViewerWorkspaceContextValue {
  tree: ViewerTreeState
  root: ViewerRootState
  selectedPath: string | null
  openPath: (path: string) => void
  prefetchPath: (path: string) => void
}

const ViewerWorkspaceContext = createContext<ViewerWorkspaceContextValue | null>(null)

export function ViewerWorkspaceProvider({ value, children }: { value: ViewerWorkspaceContextValue; children: ReactNode }) {
  return <ViewerWorkspaceContext.Provider value={value}>{children}</ViewerWorkspaceContext.Provider>
}

export function useViewerWorkspace() {
  const value = useContext(ViewerWorkspaceContext)
  if (!value) {
    throw new Error('useViewerWorkspace must be used inside ViewerWorkspaceProvider')
  }
  return value
}

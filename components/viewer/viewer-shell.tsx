'use client'

import { GitBranch, Menu } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Badge, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui'
import type { ViewerRootState } from '@/lib/viewer/root-model'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { ViewerFileTree } from './viewer-file-tree'
import type { ViewerFilePreviewState } from './viewer-file-preview'
import { ViewerWorkspaceProvider } from './viewer-workspace-context'
import { ViewerAnalyticsProvider } from './viewer-analytics'
import { ViewerPrivacySettings } from './viewer-privacy-settings'

interface ViewerShellProps {
  children: ReactNode
  shareId: string
  repositoryName: string
  refName: string
  allowDownload: boolean
  analyticsMode: 'necessary' | 'optional'
  gpcApplied: boolean
  root: ViewerRootState
  tree: ViewerTreeState
}

type CachedFile = ViewerFilePreviewState | Promise<ViewerFilePreviewState>

const ViewerFileContent = dynamic(() => import('./viewer-file-content').then((module) => module.ViewerFileContent), {
  ssr: false,
  loading: () => <ViewerFileLoading path="Preparing preview…" />,
})

export function ViewerShell({ children, shareId, repositoryName, refName, allowDownload, analyticsMode, gpcApplied, root, tree }: ViewerShellProps) {
  const pathname = usePathname()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [activeFile, setActiveFile] = useState<{ path: string; file: ViewerFilePreviewState } | null>(null)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const pathnameSelectedPath = getBlobPath(pathname, shareId)
  const initialPathRef = useRef(pathnameSelectedPath)
  const requestSequenceRef = useRef(0)
  const cacheScope = `${shareId}\0${repositoryName}\0${refName}`
  const cacheScopeRef = useRef(cacheScope)
  const fileCacheRef = useRef(new Map<string, CachedFile>())

  if (cacheScopeRef.current !== cacheScope) {
    cacheScopeRef.current = cacheScope
    fileCacheRef.current.clear()
  }

  const activePath = selectedPath ?? pathnameSelectedPath ?? getRootPath(pathname, shareId, root)
  const getCacheKey = useCallback((path: string) => `${cacheScope}\0${path}`, [cacheScope])

  useEffect(() => {
    if (root.status !== 'ready' || !root.readme) return
    const key = getCacheKey(root.readme.path)
    if (!fileCacheRef.current.has(key)) {
      fileCacheRef.current.set(key, { kind: 'text', ...root.readme })
    }
  }, [getCacheKey, root])

  const requestFile = useCallback((path: string) => {
    const key = getCacheKey(path)
    const cached = fileCacheRef.current.get(key)
    if (cached) {
      return cached instanceof Promise ? cached : Promise.resolve(cached)
    }

    const request = fetchViewerFile(shareId, path)
    fileCacheRef.current.set(key, request)
    void request.catch(() => {
      if (fileCacheRef.current.get(key) === request) {
        fileCacheRef.current.delete(key)
      }
    })
    return request
  }, [getCacheKey, shareId])

  const prefetchPath = useCallback((path: string) => {
    const key = getCacheKey(path)
    if (fileCacheRef.current.has(key)) return
    void requestFile(path).catch(() => undefined)
  }, [getCacheKey, requestFile])

  const showPath = useCallback((path: string) => {
    const requestId = ++requestSequenceRef.current
    const cached = fileCacheRef.current.get(getCacheKey(path))
    setSelectedPath(path)
    setActiveFile(null)
    setLoadingPath(path)

    void (cached instanceof Promise ? cached : requestFile(path)).then((file) => {
      if (requestId !== requestSequenceRef.current) return
      setActiveFile({ path, file })
      setLoadingPath(null)
    }).catch(() => {
      if (requestId !== requestSequenceRef.current) return
      setActiveFile({ path, file: unavailableFile(path) })
      setLoadingPath(null)
    })
  }, [getCacheKey, requestFile])

  const openPath = useCallback((path: string) => {
    const currentPath = getBlobPath(window.location.pathname, shareId)
    if (currentPath === path) return

    window.history.pushState({ repoViewPath: path }, '', getFileHref(shareId, path))
    showPath(path)
  }, [shareId, showPath])

  useEffect(() => {
    const handlePopState = () => {
      const path = getBlobPath(window.location.pathname, shareId)
      requestSequenceRef.current += 1

      if (!path || path === initialPathRef.current) {
        setSelectedPath(null)
        setActiveFile(null)
        setLoadingPath(null)
        return
      }

      showPath(path)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [shareId, showPath])

  useEffect(() => {
    if (tree.status !== 'ready') return
    const candidates = tree.nodes
      .filter((node) => node.kind === 'file' && node.path !== (root.status === 'ready' ? root.readme?.path : undefined))
      .filter((node) => node.size === undefined || node.size <= 300_000)
      .slice(0, 4)
      .map((node) => node.path)
    const timer = window.setTimeout(() => {
      void import('./viewer-file-content')
      candidates.forEach(prefetchPath)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [prefetchPath, root, tree])

  return (
    <ViewerAnalyticsProvider shareId={shareId} initialPath={activePath} analyticsMode={analyticsMode} gpcApplied={gpcApplied}>
      <ViewerWorkspaceProvider value={{ tree, root, selectedPath, openPath, prefetchPath }}>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background">
          <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger size="icon" variant="ghost" aria-label="Open file tree">
                  <Menu className="size-4" aria-hidden="true" />
                </SheetTrigger>
                <SheetContent side="left" className="h-full overscroll-none p-0">
                  <SheetHeader className="border-b border-border/80 p-5">
                    <SheetTitle>Explorer</SheetTitle>
                    <SheetDescription>{repositoryName}</SheetDescription>
                  </SheetHeader>
                  <ViewerFileTree tree={tree} selectedPath={activePath} onSelectPath={openPath} onPrefetchPath={prefetchPath} />
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <BrandLogo size={28} />
              <span className="hidden font-heading text-sm font-semibold tracking-tight sm:inline">RepoView</span>
              <span aria-hidden="true" className="hidden text-foreground-muted sm:inline">/</span>
              <span className="truncate font-mono text-[13px] font-medium text-foreground">{repositoryName}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ViewerPrivacySettings shareId={shareId} />
              <Link href="/terms" className="hidden text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline sm:inline">Terms</Link>
              <Badge variant="outline" className="hidden items-center gap-1.5 rounded px-2 font-mono text-[11px] sm:inline-flex">
                <GitBranch className="size-3.5" aria-hidden="true" />
                {refName}
              </Badge>
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <aside className="fixed bottom-0 left-0 top-12 z-30 hidden w-64 overflow-hidden overscroll-none border-r border-border bg-background md:flex md:flex-col">
            <ViewerFileTree tree={tree} selectedPath={activePath} onSelectPath={openPath} onPrefetchPath={prefetchPath} />
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain md:ml-64">
            {activeFile ? <ViewerFileContent file={activeFile.file} shareId={shareId} tree={tree} onOpenPath={openPath} allowDownload={allowDownload} /> : loadingPath ? <ViewerFileLoading path={loadingPath} /> : children}
          </main>
        </div>
      </div>
      </ViewerWorkspaceProvider>
    </ViewerAnalyticsProvider>
  )
}

function ViewerFileLoading({ path }: { path: string }) {
  return (
    <section className="repository-file-page min-h-[calc(100vh-3rem)]" aria-busy="true" aria-label={`Loading ${path}`}>
      <div className="border-b border-border px-3 py-3 sm:px-5">
        <p className="font-mono text-xs text-foreground-muted">{path}</p>
      </div>
      <div className="source-code space-y-3 p-6 sm:p-8">
        {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-4 animate-pulse rounded bg-muted/50" style={{ width: `${55 + (index % 4) * 10}%` }} />)}
      </div>
    </section>
  )
}

async function fetchViewerFile(shareId: string, path: string): Promise<ViewerFilePreviewState> {
  const url = `/api/view/file/${encodeURIComponent(shareId)}?path=${encodeURIComponent(path)}`
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } })
  if (response.status === 404) return unavailableFile(path, 'not-found')
  if (!response.ok) throw new Error(`File request failed with ${response.status}`)

  const payload = await response.json() as { file?: ViewerFilePreviewState }
  if (!payload.file) throw new Error('File response did not include a preview')
  return payload.file
}

function unavailableFile(path: string, reason: 'not-found' | 'unavailable' = 'unavailable'): ViewerFilePreviewState {
  return { kind: 'unavailable', path, size: 0, reason, message: 'Preview unavailable.' }
}

function getRootPath(pathname: string | null, shareId: string, root: ViewerRootState) {
  if (pathname === `/view/${shareId}` && root.status === 'ready') {
    return root.readme?.path ?? null
  }
  return null
}

function getBlobPath(pathname: string | null, shareId: string) {
  if (!pathname) return null

  const marker = `/view/${shareId}/blob/`
  if (!pathname.startsWith(marker)) return null

  const encodedPath = pathname.slice(marker.length)
  if (!encodedPath) return null

  try {
    return encodedPath.split('/').map((segment) => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

function getFileHref(shareId: string, path: string) {
  return `/view/${encodeURIComponent(shareId)}/blob/${path.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`
}

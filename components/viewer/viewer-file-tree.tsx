'use client'

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  ListCollapse,
  ListTree,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { Button, Input, ScrollArea } from '@/components/ui'
import type { ViewerTreeNode, ViewerTreeState } from '@/lib/viewer/tree-model'

import { cn } from '@/components/ui/utils'

import { RepositoryFileIcon } from './repository-file-icon'
import { useViewerAnalytics } from './viewer-analytics'

interface ViewerFileTreeProps {
  tree: ViewerTreeState
  selectedPath: string | null
  onSelectPath: (path: string) => void
  onPrefetchPath?: (path: string) => void
  className?: string
}

export function ViewerFileTree({ tree, selectedPath, onSelectPath, onPrefetchPath, className }: ViewerFileTreeProps) {
  const [query, setQuery] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => getInitialExpandedPaths(tree))
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const analytics = useViewerAnalytics()

  const readyTree = tree.status === 'ready' ? tree.nodes : []
  const nodeByPath = useMemo(() => new Map(readyTree.map((node) => [node.path, node])), [readyTree])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleNodes = useMemo(
    () => getVisibleNodes(readyTree, nodeByPath, expandedPaths, normalizedQuery),
    [expandedPaths, nodeByPath, normalizedQuery, readyTree],
  )
  const visiblePaths = useMemo(() => new Set(visibleNodes.map((node) => node.path)), [visibleNodes])
  const fileCount = readyTree.filter((node) => node.kind === 'file').length

  useEffect(() => {
    if (!normalizedQuery) return
    const timer = window.setTimeout(() => analytics.track('search', null, { query_length: normalizedQuery.length }), 450)
    return () => window.clearTimeout(timer)
  }, [analytics, normalizedQuery])

  useEffect(() => {
    if (!selectedPath || !nodeByPath.has(selectedPath)) return
    setExpandedPaths((current) => {
      const next = new Set(current)
      let parentPath = nodeByPath.get(selectedPath)?.parentPath ?? null
      while (parentPath) {
        next.add(parentPath)
        parentPath = nodeByPath.get(parentPath)?.parentPath ?? null
      }
      return next
    })
  }, [nodeByPath, selectedPath])

  const focusPath = (path: string | undefined) => {
    if (!path) {
      return
    }

    setFocusedPath(path)
    requestAnimationFrame(() => rowRefs.current[path]?.focus())
  }

  const togglePath = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
    analytics.track('directory_opened', path, { expanded: !expandedPaths.has(path) })
  }

  const expandAll = () => {
    setExpandedPaths(new Set(readyTree.filter((node) => node.kind === 'directory').map((node) => node.path)))
  }

  const collapseAll = () => {
    setExpandedPaths(new Set())
  }

  const handleTreeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: ViewerTreeNode, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusPath(visibleNodes[index + 1]?.path)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusPath(visibleNodes[index - 1]?.path)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusPath(visibleNodes[0]?.path)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusPath(visibleNodes.at(-1)?.path)
      return
    }

    if (event.key === 'ArrowRight' && node.kind === 'directory') {
      event.preventDefault()
      if (!expandedPaths.has(node.path)) {
        togglePath(node.path)
        return
      }

      focusPath(visibleNodes[index + 1]?.path)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (node.kind === 'directory' && expandedPaths.has(node.path)) {
        togglePath(node.path)
        return
      }

      focusPath(node.parentPath ?? undefined)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (node.kind === 'directory') {
        togglePath(node.path)
      } else {
        onSelectPath(node.path)
      }
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="space-y-1.5 border-b border-border px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <FolderTree className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Explorer</p>
              <p className="mt-0.5 text-[11px] text-foreground-muted" aria-live="polite">
                {tree.status === 'ready' ? `${fileCount} ${fileCount === 1 ? 'file' : 'files'}` : 'Unavailable'}
              </p>
            </div>
          </div>
          {tree.status === 'ready' ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Expand all folders"
                title="Expand all folders"
                onClick={expandAll}
                className="!size-7 rounded-[6px] p-0 text-foreground-muted hover:bg-[#F3F4F6] hover:text-foreground dark:hover:bg-accent"
              >
                <ListTree className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Collapse all folders"
                title="Collapse all folders"
                onClick={collapseAll}
                className="!size-7 rounded-[6px] p-0 text-foreground-muted hover:bg-[#F3F4F6] hover:text-foreground dark:hover:bg-accent"
              >
                <ListCollapse className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
        {tree.status === 'ready' ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-foreground-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files…"
              aria-label="Search files"
              className="h-9 rounded-lg border-border bg-muted/50 pl-8 pr-9 text-xs !shadow-none"
            />
            <kbd aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none text-foreground-muted">/</kbd>
          </div>
        ) : null}
      </div>

      {tree.status === 'error' ? (
        <TreeError reason={tree.reason} />
      ) : (
        <ScrollArea className="min-h-0 flex-1 overscroll-none">
          <div role="tree" aria-label="Authorized files" className="space-y-0.5 p-1.5">
            {visibleNodes.map((node, index) => {
              const isSelected = node.kind === 'file' && selectedPath === node.path
              const isFocused = focusedPath === node.path || (!focusedPath && index === 0) || (!visiblePaths.has(focusedPath ?? '') && index === 0)

              return (
                <button
                  key={node.path}
                  ref={(element) => { rowRefs.current[node.path] = element }}
                  type="button"
                  role="treeitem"
                  tabIndex={isFocused ? 0 : -1}
                  aria-level={node.path.split('/').length}
                  aria-expanded={node.kind === 'directory' ? expandedPaths.has(node.path) : undefined}
                  aria-selected={node.kind === 'file' ? isSelected : undefined}
                  title={node.path}
                  onClick={() => {
                    if (node.kind === 'directory') {
                      togglePath(node.path)
                    } else {
                      if (normalizedQuery) analytics.track('search_result_clicked', node.path, { query_length: normalizedQuery.length })
                      onSelectPath(node.path)
                    }
                  }}
                  onMouseEnter={() => node.kind === 'file' && onPrefetchPath?.(node.path)}
                  onFocus={() => {
                    setFocusedPath(node.path)
                    if (node.kind === 'file') onPrefetchPath?.(node.path)
                  }}
                  onKeyDown={(event) => handleTreeKeyDown(event, node, index)}
                  className={cn(
                    'relative flex min-h-8 w-full items-center gap-1.5 rounded px-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected ? 'bg-primary/10 text-foreground before:absolute before:inset-y-0.5 before:left-0 before:w-0.5 before:bg-primary' : 'text-foreground-muted hover:bg-accent/60 hover:text-foreground',
                  )}
                  style={{ paddingLeft: `${8 + (node.path.split('/').length - 1) * 14}px` }}
                >
                  {node.kind === 'directory' ? (
                    expandedPaths.has(node.path) ? <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <RepositoryFileIcon node={node} expanded={expandedPaths.has(node.path)} className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{node.name}</span>
                </button>
              )
            })}
            {visibleNodes.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs leading-5 text-foreground-muted">
                No authorized files are available.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function TreeError({ reason }: { reason: 'truncated' | 'ref-unavailable' | 'rate-limited' | 'access' | 'unavailable' }) {
  const message = reason === 'truncated'
    ? 'This repository is too large to index in one preview. Try again after narrowing the share.'
    : reason === 'ref-unavailable'
      ? 'The selected branch or ref is no longer available.'
      : reason === 'rate-limited'
        ? 'GitHub’s file service is rate-limited. Try again later.'
        : reason === 'access'
          ? 'The configured GitHub App can no longer read this repository.'
          : 'The authorized file tree could not be loaded. Please try the link again later.'

  return (
    <div role="status" className="p-4 text-xs leading-5 text-foreground-muted">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
        Files are temporarily unavailable
      </div>
      <p className="mt-2">{message}</p>
    </div>
  )
}

function getInitialExpandedPaths(tree: ViewerTreeState) {
  if (tree.status !== 'ready') {
    return new Set<string>()
  }

  return new Set(tree.nodes.filter((node) => node.kind === 'directory' && node.parentPath === null).map((node) => node.path))
}

function getVisibleNodes(nodes: ViewerTreeNode[], nodeByPath: Map<string, ViewerTreeNode>, expandedPaths: Set<string>, query: string) {
  if (query) {
    const matchingPaths = new Set(
      nodes
        .filter((node) => `${node.name} ${node.path}`.toLocaleLowerCase().includes(query))
        .map((node) => node.path),
    )

    for (const node of nodes) {
      let parentPath = node.parentPath
      while (parentPath) {
        if (!matchingPaths.has(node.path)) {
          break
        }
        matchingPaths.add(parentPath)
        parentPath = nodeByPath.get(parentPath)?.parentPath ?? null
      }
    }

    return nodes.filter((node) => matchingPaths.has(node.path))
  }

  return nodes.filter((node) => {
    let parentPath = node.parentPath
    while (parentPath) {
      if (!expandedPaths.has(parentPath)) {
        return false
      }
      parentPath = nodeByPath.get(parentPath)?.parentPath ?? null
    }
    return true
  })
}

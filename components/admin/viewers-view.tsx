'use client'

import { ArrowRight, ChevronDown, MapPin, Search, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Button, Select } from '@/components/ui'
import type { ViewerDashboardItem } from '@/lib/dashboard/viewers'
import { ActiveFilterSummary, OwnerFilterDialog, OwnerFilterField, OwnerPageHeader, OwnerSearchField } from './owner-workspace-controls'

type ViewerFilter = 'all' | 'returning' | 'single'
type ViewerSort = 'recent' | 'sessions' | 'engagement'

export function ViewersView({ items }: { items: ViewerDashboardItem[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ViewerFilter>('all')
  const [sort, setSort] = useState<ViewerSort>('recent')

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'returning' ? item.visits > 1 : item.visits === 1)
      if (!matchesFilter) return false
      if (!normalizedQuery) return true
      return [item.displayName, item.recipientLabel, item.company, item.repositoryName, item.location, item.deviceContext].some((value) => value?.toLowerCase().includes(normalizedQuery))
    }).sort((left, right) => {
      if (sort === 'sessions') return right.visits - left.visits || right.totalViewingSeconds - left.totalViewingSeconds
      if (sort === 'engagement') return right.totalViewingSeconds - left.totalViewingSeconds || right.filesViewed - left.filesViewed
      return new Date(right.lastSeenAt || 0).getTime() - new Date(left.lastSeenAt || 0).getTime()
    })
  }, [filter, items, query, sort])

  const activeFilterCount = [filter !== 'all', sort !== 'recent'].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    setFilter('all')
    setSort('recent')
  }

  function clearFilterValues() {
    setFilter('all')
    setSort('recent')
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <OwnerPageHeader title="Viewers" description="Understand anonymous engagement across shares without claiming to know a viewer's real identity." meta={<>{items.length} anonymous {items.length === 1 ? 'viewer' : 'viewers'}</>} />

      <div className="flex max-w-3xl items-start gap-2 text-xs leading-5 text-foreground-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" /><p><span className="font-medium text-foreground">Privacy boundary.</span> Viewer IDs are anonymous and unverified; location and device data are approximate context.</p></div>

      <section aria-labelledby="viewer-list">
        <h2 id="viewer-list" className="sr-only">Viewer list</h2>
        <div className="space-y-3 border-b border-border/70 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><OwnerSearchField value={query} onChange={setQuery} label="Search viewers" placeholder="Search viewers, shares, or repositories" /><OwnerFilterDialog title="Viewer filters and view" description="Keep the list focused on returning viewers or sort it by engagement." activeCount={activeFilterCount} onClear={clearFilterValues}><OwnerFilterField label="Viewer type"><Select aria-label="Filter viewers" value={filter} onChange={(event) => setFilter(event.target.value as ViewerFilter)}><option value="all">All viewers</option><option value="returning">Returning viewers</option><option value="single">One session</option></Select></OwnerFilterField><OwnerFilterField label="Sort viewers"><Select aria-label="Sort viewers" value={sort} onChange={(event) => setSort(event.target.value as ViewerSort)}><option value="recent">Last seen</option><option value="sessions">Most sessions</option><option value="engagement">Most engagement</option></Select></OwnerFilterField></OwnerFilterDialog><p className="shrink-0 text-xs tabular-nums text-foreground-muted sm:ml-auto"><span className="text-foreground">{filteredItems.length}</span> shown</p></div>
          <ActiveFilterSummary filters={[...(filter !== 'all' ? [{ label: 'Type', value: filter === 'returning' ? 'Returning' : 'One session', onClear: () => setFilter('all') }] : []), ...(sort !== 'recent' ? [{ label: 'Sort', value: sort === 'sessions' ? 'Most sessions' : 'Most engagement', onClear: () => setSort('recent') }] : [])]} onClear={clearFilterValues} />
        </div>

        <div className="mt-4">{items.length === 0 ? <EmptyViewers /> : filteredItems.length === 0 ? <FilteredEmpty onClear={clearFilters} /> : <ViewerList items={filteredItems} />}</div>
      </section>
    </section>
  )
}

function ViewerList({ items }: { items: ViewerDashboardItem[] }) {
  return <ul className="divide-y divide-border/70 border-y border-border/70" aria-labelledby="viewer-list">{items.map((item) => <ViewerRow key={item.viewerId} item={item} />)}</ul>
}

function ViewerRow({ item }: { item: ViewerDashboardItem }) {
  return <li className="px-0 py-4 transition-colors hover:bg-muted/20"><div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(12rem,1fr)_minmax(10rem,.8fr)_auto] sm:items-center sm:gap-5"><Link href={`/dashboard/viewers/${item.viewerId}`} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="truncate font-mono text-sm font-semibold tracking-[-0.01em] text-foreground" title={item.displayName}>{item.displayName}</p><p className="mt-1 truncate text-sm text-foreground" title={item.recipientLabel || 'Generic share'}>{item.recipientLabel || 'Generic share'}</p><p className="mt-1 truncate font-mono text-xs text-foreground-muted" title={item.repositoryName || 'Repository unavailable'}>{item.repositoryName || 'Repository unavailable'}</p></Link><div className="grid grid-cols-2 gap-4 text-sm sm:block"><div><p className="text-xs text-foreground-muted">Sessions</p><p className="mt-1 font-mono tabular-nums">{item.visits}</p></div><div className="mt-3 sm:mt-4"><p className="text-xs text-foreground-muted">Last seen</p><p className="mt-1 text-xs text-foreground-muted">{item.lastSeenAt ? <time dateTime={item.lastSeenAt} title={formatDate(item.lastSeenAt)}>{formatRelativeDate(item.lastSeenAt)}</time> : 'Not available'}</p></div></div><div className="text-sm sm:text-right"><p className="text-xs text-foreground-muted">Engagement</p><p className="mt-1 font-mono tabular-nums">{formatDuration(item.totalViewingSeconds)}</p><p className="mt-1 text-xs text-foreground-muted">{item.filesViewed} {item.filesViewed === 1 ? 'file' : 'files'} viewed</p></div><div className="relative flex items-center justify-between gap-3 sm:flex-col sm:items-end"><details className="group max-w-full sm:text-right"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground-muted outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">Context <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="mt-2 space-y-1 text-left text-xs text-foreground-muted sm:absolute sm:right-10 sm:z-10 sm:w-56 sm:rounded-md sm:border sm:border-border sm:bg-popover sm:p-3 sm:shadow-lg"><p className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{item.location || 'Location not available'}</p><p className="truncate" title={item.deviceContext || undefined}>{item.deviceContext || 'Device context not available'}</p><p className="mt-2 text-[11px]">Approximate, unverified context.</p></div></details><Link href={`/dashboard/viewers/${item.viewerId}`} aria-label={`View details for ${item.displayName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-link hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Details <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div></div></li>
}

function EmptyViewers() { return <div className="border-y border-dashed border-border px-5 py-12 sm:px-7"><div className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground-muted"><Users className="size-4" aria-hidden="true" /></div><h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">No viewers yet</h2><p className="mt-1.5 max-w-lg text-sm leading-6 text-foreground-muted">Share a private repository link to see anonymous engagement appear here.</p><p className="mt-3 text-xs text-foreground-muted">Viewer IDs are created after a confirmed browser session.</p></div> }
function FilteredEmpty({ onClear }: { onClear: () => void }) { return <div className="border-y border-dashed border-border px-6 py-12 text-center"><Search className="mx-auto size-5 text-foreground-muted" aria-hidden="true" /><h2 className="mt-3 font-heading text-lg font-semibold">No viewers match</h2><p className="mt-1 text-sm text-foreground-muted">Try another search or clear the current filters.</p><Button type="button" variant="outline" size="small" className="mt-5" onClick={onClear}>Clear filters</Button></div> }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m`; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` }
function formatRelativeDate(value: string) { const date = new Date(value); const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)); if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`; return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

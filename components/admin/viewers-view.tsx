'use client'

import { ArrowRight, ChevronDown, Clock3, Eye, MapPin, Search, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Button, PageContainer, Select } from '@/components/ui'
import type { ViewerDashboardItem } from '@/lib/dashboard/viewers'
import { ActiveFilterSummary, OwnerEmptyState, OwnerFilterDialog, OwnerFilterField, OwnerListHeader, OwnerListSurface, OwnerListToolbar, OwnerPageToolbar, OwnerSearchField } from './owner-workspace-controls'

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
    <PageContainer size="default" className="space-y-7">
      <OwnerPageToolbar meta={<>{items.length} anonymous {items.length === 1 ? 'viewer' : 'viewers'}</>} />

      <div className="flex max-w-3xl items-start gap-2.5 rounded-lg border border-border/70 bg-card/70 px-3 py-2.5 text-xs leading-5 text-foreground-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /><p><span className="font-medium text-foreground">Privacy boundary.</span> Viewer IDs are anonymous and unverified; location and device data are approximate context.</p></div>

      <section aria-labelledby="viewer-list">
        <h2 id="viewer-list" className="sr-only">Viewer list</h2>
        <OwnerListSurface>
          <OwnerListHeader icon={<Users className="size-4" aria-hidden="true" />} title="Viewer activity" description="Compare anonymous sessions by return rate, time, and files viewed." meta={<>{filteredItems.length} shown</>} />
          <OwnerListToolbar className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><OwnerSearchField value={query} onChange={setQuery} label="Search viewers" placeholder="Search viewers, shares, or repositories" /><OwnerFilterDialog title="Viewer filters and view" description="Keep the list focused on returning viewers or sort it by engagement." activeCount={activeFilterCount} onClear={clearFilterValues}><OwnerFilterField label="Viewer type"><Select aria-label="Filter viewers" value={filter} onChange={(event) => setFilter(event.target.value as ViewerFilter)}><option value="all">All viewers</option><option value="returning">Returning viewers</option><option value="single">One session</option></Select></OwnerFilterField><OwnerFilterField label="Sort viewers"><Select aria-label="Sort viewers" value={sort} onChange={(event) => setSort(event.target.value as ViewerSort)}><option value="recent">Last seen</option><option value="sessions">Most sessions</option><option value="engagement">Most engagement</option></Select></OwnerFilterField></OwnerFilterDialog></div>
          <ActiveFilterSummary filters={[...(filter !== 'all' ? [{ label: 'Type', value: filter === 'returning' ? 'Returning' : 'One session', onClear: () => setFilter('all') }] : []), ...(sort !== 'recent' ? [{ label: 'Sort', value: sort === 'sessions' ? 'Most sessions' : 'Most engagement', onClear: () => setSort('recent') }] : [])]} onClear={clearFilterValues} />
          </OwnerListToolbar>

          {items.length === 0 ? <EmptyViewers /> : filteredItems.length === 0 ? <FilteredEmpty onClear={clearFilters} /> : <ViewerList items={filteredItems} />}
        </OwnerListSurface>
      </section>
    </PageContainer>
  )
}

function ViewerList({ items }: { items: ViewerDashboardItem[] }) {
  return <ul className="divide-y divide-border/70" aria-labelledby="viewer-list">{items.map((item) => <ViewerRow key={item.viewerId} item={item} />)}</ul>
}

function ViewerRow({ item }: { item: ViewerDashboardItem }) {
  return <li className="group px-4 py-4 transition-colors hover:bg-accent/30 sm:px-5"><div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(12rem,1fr)_minmax(10rem,.8fr)_auto] sm:items-center sm:gap-5"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light"><Users className="size-3.5" aria-hidden="true" /></span><Link href={`/dashboard/viewers/${item.viewerId}`} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="truncate font-mono text-sm font-semibold tracking-tight text-foreground" title={item.displayName}>{item.displayName}</p><p className="mt-1 truncate text-sm text-foreground" title={item.recipientLabel || 'Generic share'}>{item.recipientLabel || 'Generic share'}</p><p className="mt-1 truncate font-mono text-xs text-foreground-muted" title={item.repositoryName || 'Repository unavailable'}>{item.repositoryName || 'Repository unavailable'}</p></Link></div><div className="grid grid-cols-2 gap-4 text-sm sm:block"><div><p className="flex items-center gap-1.5 text-xs text-foreground-muted"><Users className="size-3 text-foreground-light" aria-hidden="true" /> Sessions</p><p className="mt-1 font-mono tabular-nums">{item.visits}</p></div><div className="mt-3 sm:mt-4"><p className="flex items-center gap-1.5 text-xs text-foreground-muted"><Eye className="size-3 text-foreground-muted" aria-hidden="true" /> Last seen</p><p className="mt-1 text-xs text-foreground-muted">{item.lastSeenAt ? <time dateTime={item.lastSeenAt} title={formatDate(item.lastSeenAt)}>{formatRelativeDate(item.lastSeenAt)}</time> : 'Not available'}</p></div></div><div className="text-sm sm:text-right"><p className="flex items-center gap-1.5 text-xs text-foreground-muted sm:justify-end"><Clock3 className="size-3 text-foreground-light" aria-hidden="true" /> Engagement</p><p className="mt-1 font-mono tabular-nums">{formatDuration(item.totalViewingSeconds)}</p><p className="mt-1 text-xs text-foreground-muted">{item.filesViewed} {item.filesViewed === 1 ? 'file' : 'files'} viewed</p></div><div className="relative flex items-center justify-between gap-3 sm:flex-col sm:items-end"><details className="group max-w-full sm:text-right"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground-muted outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">Context <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="mt-2 space-y-1 text-left text-xs text-foreground-muted sm:absolute sm:right-10 sm:z-10 sm:w-56 sm:rounded-md sm:border sm:border-border sm:bg-popover sm:p-3 sm:shadow-lg"><p className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{item.location || 'Location not available'}</p><p className="truncate" title={item.deviceContext || undefined}>{item.deviceContext || 'Device context not available'}</p><p className="mt-2 text-xs">Approximate, unverified context.</p></div></details><Link href={`/dashboard/viewers/${item.viewerId}`} aria-label={`View details for ${item.displayName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-link hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Details <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div></div></li>
}

function EmptyViewers() { return <OwnerEmptyState icon={<Users className="size-4" aria-hidden="true" />} title="No viewers yet" description="Share a private repository link to see anonymous engagement appear here." action={<Link href="/dashboard/shares" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open shares <ArrowRight className="size-3.5" aria-hidden="true" /></Link>} /> }
function FilteredEmpty({ onClear }: { onClear: () => void }) { return <OwnerEmptyState icon={<Search className="size-4" aria-hidden="true" />} title="No viewers match" description="Try another search or clear the current filters." action={<Button type="button" variant="outline" size="small" onClick={onClear}>Clear filters</Button>} /> }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m`; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` }
function formatRelativeDate(value: string) { const date = new Date(value); const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)); if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`; return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

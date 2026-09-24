'use client'

import { ArrowRight, MapPin, Search, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import type { ViewerDashboardItem } from '@/lib/dashboard/viewers'

export function ViewersView({ items }: { items: ViewerDashboardItem[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Viewers</h1>
          <span className="font-mono text-xs tabular-nums text-foreground-muted">
            {items.length} anonymous {items.length === 1 ? 'viewer' : 'viewers'}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">Understand anonymous engagement across shares without claiming to know a viewer&apos;s real identity.</p>
      </header>

      <div className="mt-5 flex max-w-3xl items-start gap-2 text-xs leading-5 text-foreground-muted">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p><span className="font-medium text-foreground">Privacy boundary.</span> Recipient labels are unverified; location and device data are approximate context.</p>
      </div>

      <section className="mt-7" aria-label="Viewer list">
        {items.length === 0 ? <EmptyViewers /> : <ViewerTable items={items} />}
      </section>
    </section>
  )
}

function ViewerTable({ items }: { items: ViewerDashboardItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'returning' | 'single'>('all')

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'returning' ? item.visits > 1 : item.visits === 1)
      if (!matchesFilter) return false
      if (!normalizedQuery) return true
      return [item.displayName, item.recipientLabel, item.company, item.repositoryName, item.location, item.deviceContext].some((value) => value?.toLowerCase().includes(normalizedQuery))
    })
  }, [filter, items, query])

  function openViewer(viewerId: string) {
    router.push(`/dashboard/viewers/${viewerId}`)
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-foreground-muted"><span className="font-mono tabular-nums text-foreground">{filteredItems.length}</span> shown</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block min-w-0 sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search viewers" aria-label="Search viewers" className="h-8 pl-8 text-xs" />
          </label>
          <Select aria-label="Filter viewers" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-8 sm:w-36">
            <option value="all">All viewers</option>
            <option value="returning">Returning</option>
            <option value="single">One session</option>
          </Select>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        {filteredItems.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-foreground-muted">No viewers match those filters.</p>
        ) : (
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[26%]">Viewer</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.viewerId}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${item.displayName}`}
                  className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest('a,button')) return
                    openViewer(item.viewerId)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openViewer(item.viewerId)
                    }
                  }}
                >
                  <TableCell>
                    <Link href={`/dashboard/viewers/${item.viewerId}`} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <p className="font-mono text-sm font-semibold tracking-tight text-foreground">{item.displayName}</p>
                      <p className="mt-1 text-xs text-foreground-muted">Unverified</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-36">
                      <p className="text-sm text-foreground">{item.recipientLabel || 'Generic share'}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-foreground-muted">{item.company || item.repositoryName || 'Private repository'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{item.visits}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-foreground-muted">
                    {item.lastSeenAt ? <time dateTime={item.lastSeenAt} title={formatDate(item.lastSeenAt)}>{formatRelativeDate(item.lastSeenAt)}</time> : 'Not available'}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-36 text-xs text-foreground-muted">
                      <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{item.location || 'Not available'}</span>
                      <span className="mt-1 block truncate text-[11px]">{item.deviceContext || 'Context not available'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="whitespace-nowrap">
                      <p className="font-mono text-xs tabular-nums text-foreground">{formatDuration(item.totalViewingSeconds)}</p>
                      <p className="mt-1 text-[11px] text-foreground-muted">{item.filesViewed} {item.filesViewed === 1 ? 'file' : 'files'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/viewers/${item.viewerId}`} aria-label={`View details for ${item.displayName}`} className="inline-flex size-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}

function EmptyViewers() {
  return (
    <div className="w-full max-w-2xl rounded-lg border border-border bg-card px-5 py-9 sm:px-7">
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground-muted">
        <Users className="size-4" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">No viewers yet</h2>
      <p className="mt-1.5 max-w-lg text-sm leading-6 text-foreground-muted">Share a private repository link to see anonymous engagement appear here.</p>
      <p className="mt-3 text-xs text-foreground-muted">Viewer IDs are created after a confirmed browser session.</p>
    </div>
  )
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function formatRelativeDate(value: string) {
  const date = new Date(value)
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

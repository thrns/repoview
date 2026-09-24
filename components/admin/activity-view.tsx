'use client'

import {
  Activity,
  Bell,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock3,
  Download,
  Eye,
  ExternalLink,
  FileCode2,
  FileText,
  FolderOpen,
  Link2,
  Play,
  Search,
  SlidersHorizontal,
  Square,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { Badge, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Input, Select } from '@/components/ui'
import type { ActivityFilter, DashboardActivityItem } from '@/lib/dashboard/activity'

type EventFilter = 'all' | 'view' | 'file_opened' | 'copy' | 'download' | 'share' | 'session' | 'notification'
type DateFilter = 'default' | 'all' | 'today' | '7d' | '30d'

type ActivitySession = {
  id: string
  items: DashboardActivityItem[]
  lastActivity: string
}

type DisplayEvent =
  | { kind: 'event'; item: DashboardActivityItem }
  | { kind: 'file_summary'; items: DashboardActivityItem[] }

export function ActivityView({ items, filter }: { items: DashboardActivityItem[]; filter: ActivityFilter }) {
  const initialEventFilter: EventFilter = filter === 'views' ? 'view' : filter === 'notifications' ? 'notification' : 'all'
  const [query, setQuery] = useState('')
  const [repository, setRepository] = useState('all')
  const [share, setShare] = useState('all')
  const [viewer, setViewer] = useState('all')
  const [eventFilter, setEventFilter] = useState<EventFilter>(initialEventFilter)
  const [dateFilter, setDateFilter] = useState<DateFilter>('default')
  const [visibleCount, setVisibleCount] = useState(6)
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string> | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const repositories = useMemo(() => uniqueOptions(items.map((item) => item.repositoryName)), [items])
  const shares = useMemo(() => uniqueOptions(items.map((item) => item.recipientLabel)), [items])
  const viewers = useMemo(() => uniqueOptions(items.map((item) => viewerLabel(item))), [items])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const cutoff = dateCutoff(dateFilter, now)

    return items.filter((item) => {
      if (repository !== 'all' && item.repositoryName !== repository) return false
      if (share !== 'all' && item.recipientLabel !== share) return false
      if (viewer !== 'all' && viewerLabel(item) !== viewer) return false
      if (eventFilter !== 'all' && !matchesEventFilter(item, eventFilter)) return false
      if (cutoff && new Date(item.occurredAt).getTime() < cutoff) return false
      if (!normalizedQuery) return true
      return [viewerLabel(item), item.recipientLabel, item.repositoryName, item.path, formatEventText(item)].some((value) => value?.toLowerCase().includes(normalizedQuery))
    })
  }, [dateFilter, eventFilter, items, now, query, repository, share, viewer])

  const sessions = useMemo(() => groupActivity(filteredItems), [filteredItems])
  const visibleSessions = sessions.slice(0, visibleCount)
  const activeFilterCount = [repository, share, viewer, eventFilter].filter((value) => value !== 'all').length + (dateFilter !== 'default' ? 1 : 0)
  const totalEventCount = filteredItems.length

  function toggleSession(sessionId: string) {
    setCollapsedSessions((current) => {
      const next = new Set(current ?? sessions.map((session) => session.id).slice(0, 2))
      if (current === null && sessions[0]?.id === sessionId) {
        next.delete(sessionId)
      } else if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  function clearFilters() {
    setQuery('')
    setRepository('all')
    setShare('all')
    setViewer('all')
    setEventFilter('all')
    setDateFilter('default')
    setVisibleCount(6)
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-10 lg:pb-14">
      <div className="sticky top-14 z-30 -mx-6 bg-background/95 px-6 pb-4 pt-7 backdrop-blur-sm lg:top-0 lg:-mx-10 lg:px-10 lg:pb-5 lg:pt-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Activity</h1>
              <span className="font-mono text-[11px] tabular-nums text-foreground-muted">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">A quiet audit trail of how private repositories are being reviewed.</p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-foreground-muted sm:inline-flex"><Clock3 className="size-3.5" aria-hidden="true" /> Latest activity first</span>
        </header>

        <ActivityToolbar
          query={query}
          repository={repository}
          share={share}
          viewer={viewer}
          eventFilter={eventFilter}
          dateFilter={dateFilter}
          repositories={repositories}
          shares={shares}
          viewers={viewers}
          activeFilterCount={activeFilterCount}
          setQuery={setQuery}
          setRepository={setRepository}
          setShare={setShare}
          setViewer={setViewer}
          setEventFilter={setEventFilter}
          setDateFilter={setDateFilter}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-b border-border/70 pb-3">
        <p className="text-xs text-foreground-muted"><span className="font-mono tabular-nums text-foreground">{sessions.length}</span> {sessions.length === 1 ? 'session' : 'sessions'} <span className="px-1 text-foreground-muted/50">·</span> <span className="font-mono tabular-nums text-foreground">{totalEventCount}</span> {totalEventCount === 1 ? 'event' : 'events'}</p>
        {activeFilterCount > 0 || query ? <button type="button" onClick={clearFilters} className="text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">Clear filters</button> : null}
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border border-border bg-card" aria-label="Activity sessions">
        {visibleSessions.length === 0 ? (
          <EmptyActivity hasFilters={Boolean(activeFilterCount || query)} onClear={clearFilters} />
        ) : (
          visibleSessions.map((session, index) => (
            <SessionBlock
              key={session.id}
              session={session}
              index={index}
              isOpen={collapsedSessions === null ? index < 2 : !collapsedSessions.has(session.id)}
              now={now}
              onToggle={() => toggleSession(session.id)}
            />
          ))
        )}
      </section>

      {visibleSessions.length < sessions.length ? (
        <div className="flex justify-center pt-5">
          <button type="button" onClick={() => setVisibleCount((count) => count + 6)} className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Load 6 more sessions <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  )
}

function ActivityToolbar({
  query,
  repository,
  share,
  viewer,
  eventFilter,
  dateFilter,
  repositories,
  shares,
  viewers,
  activeFilterCount,
  setQuery,
  setRepository,
  setShare,
  setViewer,
  setEventFilter,
  setDateFilter,
}: {
  query: string
  repository: string
  share: string
  viewer: string
  eventFilter: EventFilter
  dateFilter: DateFilter
  repositories: string[]
  shares: string[]
  viewers: string[]
  activeFilterCount: number
  setQuery: (value: string) => void
  setRepository: (value: string) => void
  setShare: (value: string) => void
  setViewer: (value: string) => void
  setEventFilter: (value: EventFilter) => void
  setDateFilter: (value: DateFilter) => void
}) {
  return (
    <div className="mt-5 flex items-center gap-2">
      <label className="relative min-w-0 flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity" aria-label="Search activity" className="h-9 pl-8 text-xs" />
      </label>

      <div className="hidden min-w-0 flex-1 gap-2 lg:flex">
        <FilterSelect ariaLabel="Filter by repository" value={repository} onChange={setRepository} placeholder="Repository" options={repositories} />
        <FilterSelect ariaLabel="Filter by share" value={share} onChange={setShare} placeholder="Share" options={shares} />
        <FilterSelect ariaLabel="Filter by viewer" value={viewer} onChange={setViewer} placeholder="Viewer" options={viewers} />
        <EventSelect value={eventFilter} onChange={setEventFilter} />
        <DateSelect value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-9 gap-1.5 px-2.5 text-xs" aria-label="Open activity filters">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            <span>Filters</span>
            {activeFilterCount > 0 ? <Badge className="ml-0.5 px-1.5 py-0 text-[10px]">{activeFilterCount}</Badge> : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="right-0 mt-1 w-[min(21rem,calc(100vw-3rem))] space-y-3 p-3">
            <FilterSelect ariaLabel="Filter by repository" value={repository} onChange={setRepository} placeholder="Repository" options={repositories} fullWidth />
            <FilterSelect ariaLabel="Filter by share" value={share} onChange={setShare} placeholder="Share" options={shares} fullWidth />
            <FilterSelect ariaLabel="Filter by viewer" value={viewer} onChange={setViewer} placeholder="Viewer" options={viewers} fullWidth />
            <EventSelect value={eventFilter} onChange={setEventFilter} fullWidth />
            <DateSelect value={dateFilter} onChange={setDateFilter} fullWidth />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function FilterSelect({ ariaLabel, value, onChange, placeholder, options, fullWidth = false }: { ariaLabel: string; value: string; onChange: (value: string) => void; placeholder: string; options: string[]; fullWidth?: boolean }) {
  return (
    <Select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} className={`h-9 min-w-0 text-xs ${fullWidth ? 'w-full' : 'flex-1'}`}>
      <option value="all">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </Select>
  )
}

function EventSelect({ value, onChange, fullWidth = false }: { value: EventFilter; onChange: (value: EventFilter) => void; fullWidth?: boolean }) {
  return (
    <Select aria-label="Filter by event type" value={value} onChange={(event) => onChange(event.target.value as EventFilter)} className={`h-9 min-w-0 text-xs ${fullWidth ? 'w-full' : 'flex-1'}`}>
      <option value="all">Event type</option>
      <option value="view">Views</option>
      <option value="file_opened">File opens</option>
      <option value="copy">Copies</option>
      <option value="download">Downloads</option>
      <option value="share">Share opens</option>
      <option value="session">Session events</option>
      <option value="notification">Notifications</option>
    </Select>
  )
}

function DateSelect({ value, onChange, fullWidth = false }: { value: DateFilter; onChange: (value: DateFilter) => void; fullWidth?: boolean }) {
  return (
    <Select aria-label="Filter by date" value={value} onChange={(event) => onChange(event.target.value as DateFilter)} className={`h-9 min-w-0 text-xs ${fullWidth ? 'w-full' : 'flex-1'}`}>
      <option value="default">Date</option>
      <option value="today">Today</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="all">All time</option>
    </Select>
  )
}

function SessionBlock({ session, index, isOpen, now, onToggle }: { session: ActivitySession; index: number; isOpen: boolean; now: number; onToggle: () => void }) {
  const first = session.items[0]
  const last = session.items.at(-1) ?? first
  const duration = formatSessionDuration(first, last)
  const viewer = first.viewerCode ? `Anonymous #${first.viewerCode}` : 'Unidentified session'
  const hasAnalytics = Boolean(first.viewerId)
  const displayEvents = summarizeEvents(session.items)
  const headerLabel = `${viewer}, ${first.recipientLabel}, ${first.repositoryName}`

  return (
    <article className="border-b border-border/70 last:border-b-0">
      <div className="flex items-stretch gap-1 px-4 py-3.5 sm:px-5">
        {hasAnalytics ? (
          <Link href={`/dashboard/viewers/${first.viewerId}`} className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open analytics for ${headerLabel}`}>
            <SessionHeaderContent first={first} viewer={viewer} duration={duration} eventCount={session.items.length} lastActivity={session.lastActivity} now={now} />
          </Link>
        ) : (
          <button type="button" onClick={onToggle} className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={isOpen}>
            <SessionHeaderContent first={first} viewer={viewer} duration={duration} eventCount={session.items.length} lastActivity={session.lastActivity} now={now} />
          </button>
        )}
        <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-label={isOpen ? `Collapse ${headerLabel}` : `Expand ${headerLabel}`} className="mt-0.5 flex size-8 shrink-0 items-center justify-center self-start rounded-md text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {isOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-2.5 sm:px-5">
          <div className="ml-0 divide-y divide-border/60 sm:ml-9">
            {displayEvents.map((event) => <EventRow key={event.kind === 'event' ? event.item.id : `summary-${event.items[0].id}`} event={event} />)}
          </div>
          {index === 0 ? <p className="mt-3 flex items-center gap-1.5 text-[11px] text-foreground-muted sm:ml-9"><ExternalLink className="size-3" aria-hidden="true" /> Select the viewer ID above to open full session analytics.</p> : null}
        </div>
      ) : null}
    </article>
  )
}

function SessionHeaderContent({ first, viewer, duration, eventCount, lastActivity, now }: { first: DashboardActivityItem; viewer: string; duration: string; eventCount: number; lastActivity: string; now: number }) {
  const context = [first.browser, first.deviceType, first.country].filter(Boolean).join(' · ')
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-[-0.01em] text-foreground"><UserRound className="size-3.5 text-foreground-muted" aria-hidden="true" />{viewer}</span>
        <span className="text-foreground-muted/50" aria-hidden="true">/</span>
        <span className="truncate text-sm text-foreground">{first.recipientLabel}</span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-muted">
        <span className="truncate font-mono">{first.repositoryName}</span>
        {context ? <><span className="text-foreground-muted/50" aria-hidden="true">·</span><span>{context}</span></> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tabular-nums text-foreground-muted">
        <span>{duration}</span>
        <span>{eventCount} {eventCount === 1 ? 'event' : 'events'}</span>
        <time dateTime={lastActivity} title={formatExactDate(lastActivity)}>{formatRelative(lastActivity, now)}</time>
      </div>
    </div>
  )
}

function EventRow({ event }: { event: DisplayEvent }) {
  if (event.kind === 'file_summary') {
    const uniquePaths = [...new Set(event.items.map((item) => item.path).filter((path): path is string => Boolean(path)))]
    return (
      <details className="group py-2.5">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="flex size-5 shrink-0 items-center justify-center text-foreground-muted"><Eye className="size-3.5" aria-hidden="true" /></span>
          <span className="font-medium text-foreground">Viewed {uniquePaths.length || event.items.length} {uniquePaths.length === 1 ? 'file' : 'files'}</span>
          <ChevronRight className="ml-auto size-3.5 text-foreground-muted transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <div className="ml-7 mt-2 space-y-1 border-l border-border/70 pl-3">
          {event.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-[11px] text-foreground-muted"><span className="truncate font-mono">{item.path || 'Repository view'}</span><time className="shrink-0" dateTime={item.occurredAt} title={formatExactDate(item.occurredAt)}>{formatShortTime(item.occurredAt)}</time></div>)}
        </div>
      </details>
    )
  }

  const item = event.item
  const text = eventText(item)
  return (
    <div className="flex items-start gap-2 py-2.5 text-xs">
      <span className="flex size-5 shrink-0 items-center justify-center text-foreground-muted"><EventIcon item={item} /></span>
      <p className="min-w-0 flex-1 leading-5 text-foreground">
        <span className="font-medium">{text.label}</span>{text.target ? <> <span className="font-mono text-[11px] text-foreground-muted">{text.target}</span></> : null}
      </p>
      <time className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-foreground-muted" dateTime={item.occurredAt} title={formatExactDate(item.occurredAt)}>{formatShortTime(item.occurredAt)}</time>
    </div>
  )
}

function EventIcon({ item }: { item: DashboardActivityItem }) {
  const Icon = item.category === 'notification'
    ? Bell
    : item.eventType === 'copy'
      ? Clipboard
      : item.eventType === 'download'
        ? Download
        : item.eventType === 'link_opened'
          ? Link2
          : item.eventType === 'external_link_clicked'
            ? ExternalLink
            : item.eventType === 'session_ended'
              ? Square
              : item.eventType === 'view_confirmed' || item.eventType === 'repository_opened'
                ? Play
                : item.eventType === 'directory_opened' || item.eventType === 'directory_viewed'
                  ? FolderOpen
                  : item.eventType === 'file_opened'
                    ? FileCode2
                    : item.eventType === 'markdown_viewed'
                      ? FileText
                      : item.eventType === 'file_viewed' || item.eventType === 'raw_file_viewed' || item.eventType === 'image_viewed' || item.eventType === 'mermaid_viewed'
                        ? Eye
                        : Activity
  return <Icon className="size-3.5" aria-hidden="true" />
}

function EmptyActivity({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex size-8 items-center justify-center rounded-md bg-muted text-foreground-muted"><Activity className="size-4" aria-hidden="true" /></div>
      <p className="mt-3 text-sm font-medium text-foreground">{hasFilters ? 'No activity matches these filters.' : 'No activity recorded yet.'}</p>
      <p className="mt-1 text-xs text-foreground-muted">{hasFilters ? 'Try a broader search or reset the filters.' : 'Confirmed viewer sessions will appear here.'}</p>
      {hasFilters ? <button type="button" onClick={onClear} className="mt-4 text-xs font-medium text-foreground underline underline-offset-4 hover:text-foreground-muted">Reset filters</button> : null}
    </div>
  )
}

function groupActivity(items: DashboardActivityItem[]): ActivitySession[] {
  const grouped = new Map<string, DashboardActivityItem[]>()
  for (const item of items) grouped.set(item.sessionId, [...(grouped.get(item.sessionId) ?? []), item])
  return [...grouped.entries()]
    .map(([id, sessionItems]) => {
      const sortedItems = [...sessionItems].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
      return { id, items: sortedItems, lastActivity: sortedItems.at(-1)?.occurredAt ?? sortedItems[0].occurredAt }
    })
    .sort((left, right) => new Date(right.lastActivity).getTime() - new Date(left.lastActivity).getTime())
}

function summarizeEvents(items: DashboardActivityItem[]): DisplayEvent[] {
  const result: DisplayEvent[] = []
  let index = 0
  while (index < items.length) {
    const item = items[index]
    if (isFileView(item)) {
      const run = [item]
      while (index + run.length < items.length && isFileView(items[index + run.length])) run.push(items[index + run.length])
      if (run.length >= 3) result.push({ kind: 'file_summary', items: run })
      else run.forEach((runItem) => result.push({ kind: 'event', item: runItem }))
      index += run.length
      continue
    }
    result.push({ kind: 'event', item })
    index += 1
  }
  return result
}

function eventText(item: DashboardActivityItem) {
  const lineCount = metadataNumber(item.metadata, 'line_count')
  if (item.category === 'notification') return { label: `Notification ${item.status || 'queued'}`, target: null }
  if (item.eventType === 'copy') return { label: lineCount ? `Copied ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}` : 'Copied code', target: item.path }
  if (item.eventType === 'download') return { label: 'Downloaded', target: item.path || 'repository file' }
  if (item.eventType === 'file_opened') return { label: 'Opened', target: item.path || 'repository' }
  if (item.eventType === 'file_viewed' || item.eventType === 'markdown_viewed' || item.eventType === 'raw_file_viewed' || item.eventType === 'image_viewed' || item.eventType === 'mermaid_viewed') return { label: 'Viewed', target: item.path || 'repository file' }
  if (item.eventType === 'directory_opened' || item.eventType === 'directory_viewed') return { label: 'Viewed directory', target: item.path || 'repository root' }
  if (item.eventType === 'link_opened') return { label: 'Share opened', target: null }
  if (item.eventType === 'view_confirmed' || item.eventType === 'repository_opened') return { label: 'Session started', target: item.path }
  if (item.eventType === 'session_ended') return { label: 'Session ended', target: null }
  if (item.eventType === 'external_link_clicked') return { label: 'Opened external link', target: item.path }
  if (item.eventType === 'search_result_clicked') return { label: 'Selected search result', target: item.path }
  if (item.eventType === 'code_selected') return { label: 'Selected code', target: item.path }
  return { label: formatEventType(item.eventType), target: item.path }
}

function formatEventText(item: DashboardActivityItem) {
  const text = eventText(item)
  return `${text.label} ${text.target ?? ''}`.trim()
}

function formatEventType(eventType: string) {
  return eventType.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function matchesEventFilter(item: DashboardActivityItem, filter: EventFilter) {
  if (filter === 'view') return item.category === 'view' && !['copy', 'download', 'link_opened', 'session_ended'].includes(item.eventType)
  if (filter === 'file_opened') return item.eventType === 'file_opened'
  if (filter === 'copy') return item.eventType === 'copy'
  if (filter === 'download') return item.eventType === 'download'
  if (filter === 'share') return item.eventType === 'link_opened'
  if (filter === 'session') return ['view_confirmed', 'repository_opened', 'session_ended'].includes(item.eventType)
  if (filter === 'notification') return item.category === 'notification'
  return true
}

function isFileView(item: DashboardActivityItem) {
  return ['file_viewed', 'markdown_viewed', 'raw_file_viewed', 'image_viewed', 'mermaid_viewed'].includes(item.eventType)
}

function formatSessionDuration(first: DashboardActivityItem, last: DashboardActivityItem) {
  if (first.sessionActiveMs > 0) return formatDuration(first.sessionActiveMs / 1000)
  const elapsedSeconds = Math.max(0, Math.round((new Date(last.occurredAt).getTime() - new Date(first.sessionStartedAt || first.occurredAt).getTime()) / 1000))
  return formatDuration(elapsedSeconds)
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function formatRelative(value: string, now: number) {
  if (!now) return formatShortDate(value)
  const diff = Math.max(0, now - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatExactDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function dateCutoff(filter: DateFilter, now: number) {
  if (!now || filter === 'default' || filter === 'all') return null
  const start = new Date(now)
  if (filter === 'today') {
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(start.getDate() - (filter === '7d' ? 7 : 30))
  }
  return start.getTime()
}

function metadataNumber(metadata: DashboardActivityItem['metadata'], key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = metadata[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right))
}

function viewerLabel(item: DashboardActivityItem) {
  return item.viewerCode ? `Anonymous #${item.viewerCode}` : 'Unidentified session'
}

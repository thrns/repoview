'use client'

import { BarChart3, Copy, Eye, GitBranch, Link2, MoreHorizontal, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { RevokeShareButton } from '@/components/admin/revoke-share-button'
import { UpdateShareExpiryButton } from '@/components/admin/update-share-expiry-button'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import type { Tables } from '@/lib/supabase/database.types'
import type { ShareStatus } from '@/lib/shares/dashboard'

export interface ShareListItem {
  share: Pick<Tables<'shares'>, 'id' | 'share_code' | 'recipient_label' | 'ref' | 'expires_at' | 'note' | 'created_at'>
  repository: Pick<Tables<'repositories'>, 'github_owner' | 'github_repo'> | null
  status: ShareStatus
  confirmedViews: number
  lastViewedAt: string | null
}

type StatusFilter = 'all' | 'active' | 'expired' | 'revoked' | 'unavailable'
type ExpiryFilter = 'all' | 'never' | 'upcoming' | 'expired'
type ActivityFilter = 'all' | 'active' | 'quiet'
type SortKey = 'recent' | 'oldest' | 'recipient' | 'repository' | 'status' | 'expiry' | 'activity'

export function SharesView({ items }: { items: ShareListItem[] }) {
  const [query, setQuery] = useState('')
  const [repositoryFilter, setRepositoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [notice, setNotice] = useState<string | null>(null)

  const repositories = useMemo(() => {
    return [...new Set(items.map((item) => getRepositoryName(item)))].sort((a, b) => a.localeCompare(b))
  }, [items])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const nextItems = items.filter((item) => {
      const recipient = item.share.recipient_label || 'Generic share'
      const repository = getRepositoryName(item)
      const matchesQuery = !normalizedQuery || [recipient, repository, item.share.ref, item.share.note ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesRepository = repositoryFilter === 'all' || repository === repositoryFilter
      const matchesStatus = statusFilter === 'all' || getDisplayStatus(item.status) === statusFilter
      const matchesExpiry = expiryFilter === 'all' || getExpiryKind(item.share.expires_at) === expiryFilter
      const matchesActivity = activityFilter === 'all'
        || (activityFilter === 'active' && item.confirmedViews > 0)
        || (activityFilter === 'quiet' && item.confirmedViews === 0)

      return matchesQuery && matchesRepository && matchesStatus && matchesExpiry && matchesActivity
    })

    return nextItems.sort((a, b) => compareItems(a, b, sort))
  }, [activityFilter, expiryFilter, items, query, repositoryFilter, sort, statusFilter])

  const activeFilterCount = [
    repositoryFilter !== 'all',
    statusFilter !== 'all',
    expiryFilter !== 'all',
    activityFilter !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    setRepositoryFilter('all')
    setStatusFilter('all')
    setExpiryFilter('all')
    setActivityFilter('all')
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 lg:px-10 lg:py-7">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Shares</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground-muted">Manage recipient-specific repository previews.</p>
        </div>
        <Link href="/dashboard/shares/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="size-4" aria-hidden="true" />
            New share
        </Link>
      </header>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 px-0.5 text-xs">
          <h2 className="font-medium text-foreground">Shared links</h2>
          <span className="tabular-nums text-foreground-muted">
            {filteredItems.length === items.length ? `${items.length} ${items.length === 1 ? 'share' : 'shares'}` : `Showing ${filteredItems.length} of ${items.length}`}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-y border-border/70 py-2">
          <label className="relative min-w-0 flex-1 basis-full sm:basis-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shares"
              aria-label="Search shares"
              className="h-8 w-full pl-8 text-xs shadow-none"
            />
          </label>
          <div className="hidden items-center gap-2 lg:flex">
            <ShareFilterSelect ariaLabel="Filter by repository" value={repositoryFilter} onChange={(value) => setRepositoryFilter(value)}>
              <option value="all">Repository</option>
              {repositories.map((repository) => <option key={repository} value={repository}>{repository}</option>)}
            </ShareFilterSelect>
            <ShareFilterSelect ariaLabel="Filter by status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="unavailable">Unavailable</option>
            </ShareFilterSelect>
            <ShareFilterSelect ariaLabel="Filter by expiry" value={expiryFilter} onChange={(value) => setExpiryFilter(value as ExpiryFilter)}>
              <option value="all">Expiry</option>
              <option value="upcoming">Has expiry</option>
              <option value="never">Never expires</option>
              <option value="expired">Expired</option>
            </ShareFilterSelect>
            <ShareFilterSelect ariaLabel="Filter by activity" value={activityFilter} onChange={(value) => setActivityFilter(value as ActivityFilter)}>
              <option value="all">Activity</option>
              <option value="active">Has activity</option>
              <option value="quiet">No activity</option>
            </ShareFilterSelect>
          </div>
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 gap-1.5 px-2.5 text-xs">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                Filters
                {activeFilterCount > 0 ? <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">{activeFilterCount}</span> : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="right-0 mt-1 w-[min(18rem,calc(100vw-2.5rem))] p-3">
                <div className="space-y-3" role="group" aria-label="Share filters">
                  <FilterField label="Repository">
                    <ShareFilterSelect ariaLabel="Filter by repository" value={repositoryFilter} onChange={(value) => setRepositoryFilter(value)} fullWidth>
                      <option value="all">All repositories</option>
                      {repositories.map((repository) => <option key={repository} value={repository}>{repository}</option>)}
                    </ShareFilterSelect>
                  </FilterField>
                  <FilterField label="Status">
                    <ShareFilterSelect ariaLabel="Filter by status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} fullWidth>
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                      <option value="unavailable">Unavailable</option>
                    </ShareFilterSelect>
                  </FilterField>
                  <FilterField label="Expiry">
                    <ShareFilterSelect ariaLabel="Filter by expiry" value={expiryFilter} onChange={(value) => setExpiryFilter(value as ExpiryFilter)} fullWidth>
                      <option value="all">All expiry</option>
                      <option value="upcoming">Has expiry</option>
                      <option value="never">Never expires</option>
                      <option value="expired">Expired</option>
                    </ShareFilterSelect>
                  </FilterField>
                  <FilterField label="Activity">
                    <ShareFilterSelect ariaLabel="Filter by activity" value={activityFilter} onChange={(value) => setActivityFilter(value as ActivityFilter)} fullWidth>
                      <option value="all">All activity</option>
                      <option value="active">Has activity</option>
                      <option value="quiet">No activity</option>
                    </ShareFilterSelect>
                  </FilterField>
                  {activeFilterCount > 0 ? <button type="button" className="text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline" onClick={clearFilters}>Clear filters</button> : null}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Select aria-label="Sort shares" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-8 w-auto min-w-0 max-w-full px-2.5 pr-7 text-xs shadow-none">
            <option value="recent">Sort</option>
            <option value="oldest">Oldest first</option>
            <option value="recipient">Recipient</option>
            <option value="repository">Repository</option>
            <option value="status">Status</option>
            <option value="expiry">Expiry</option>
            <option value="activity">Activity</option>
          </Select>
        </div>

        {notice ? (
          <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground-muted" role="status">
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 rounded-sm p-0.5 text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dismiss notice">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {items.length === 0 ? <EmptyShares /> : filteredItems.length === 0 ? <EmptyFilterState onClear={clearFilters} /> : <SharesTable items={filteredItems} onCopyLink={() => setNotice('Recipient URLs are shown only once. Open View analytics and choose Rotate link to issue a new copyable URL.')} />}
      </div>
    </section>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-foreground"><span className="mb-1.5 block text-foreground-muted">{label}</span>{children}</label>
}

function ShareFilterSelect({ ariaLabel, value, onChange, children, fullWidth = false }: { ariaLabel: string; value: string; onChange: (value: string) => void; children: React.ReactNode; fullWidth?: boolean }) {
  return <Select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} className={`h-8 ${fullWidth ? 'w-full' : 'w-auto'} min-w-0 px-2.5 pr-7 text-xs shadow-none`}>{children}</Select>
}

function SharesTable({ items, onCopyLink }: { items: ShareListItem[]; onCopyLink: () => void }) {
  return (
    <div className="overflow-hidden rounded-sm border border-border/70 bg-background">
      <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain">
        <Table className="min-w-[860px] table-fixed">
          <TableHeader className="bg-background [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:border-border/70 [&_th]:bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 w-[27%] px-4 text-[10px]">Recipient</TableHead>
              <TableHead className="h-9 w-[30%] px-4 text-[10px]">Repository</TableHead>
              <TableHead className="h-9 w-[14%] px-4 text-[10px]">Status</TableHead>
              <TableHead className="h-9 w-[15%] px-4 text-right text-[10px]">Activity</TableHead>
              <TableHead className="h-9 w-[12%] px-4 text-right text-[10px]">Expiry</TableHead>
              <TableHead className="w-12 px-3"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => <ShareRow key={item.share.id} item={item} onCopyLink={onCopyLink} />)}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ShareRow({ item, onCopyLink }: { item: ShareListItem; onCopyLink: () => void }) {
  const detailHref = `/dashboard/shares/${item.share.id}`
  const repositoryName = getRepositoryName(item)
  const router = useRouter()

  function openDetails() {
    router.push(detailHref)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDetails()
    }
  }

  return (
    <TableRow
      tabIndex={0}
      role="link"
      aria-label={`Open analytics for ${item.share.recipient_label || 'Generic share'}`}
      onClick={openDetails}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer border-border/70 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <TableCell className="px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-[-0.01em] text-foreground">{item.share.recipient_label || 'Generic share'}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-foreground-muted" title={item.share.note || `ref ${item.share.share_code}`}>
            {item.share.note || `ref ${item.share.share_code}`} <span aria-hidden="true">·</span> <time dateTime={item.share.created_at} title={formatExactDate(item.share.created_at)}>{formatShortDate(item.share.created_at)}</time>
          </p>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-[-0.01em] text-foreground">{repositoryName}</p>
          <p className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[11px] text-foreground-muted" title={item.share.ref}>
            <GitBranch className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.share.ref}</span>
          </p>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2.5"><ShareStatusBadge status={item.status} /></TableCell>
      <TableCell className="px-4 py-2.5 text-right">
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-foreground-muted">
            <span className={`size-1.5 rounded-full ${item.confirmedViews > 0 ? 'bg-foreground-muted' : 'bg-foreground-muted/35'}`} aria-hidden="true" />
            <Eye className="size-3.5" aria-hidden="true" />
            {item.confirmedViews} {item.confirmedViews === 1 ? 'view' : 'views'}
          </span>
          <span className="text-[11px] text-foreground-muted" title={item.lastViewedAt ? formatExactDate(item.lastViewedAt) : undefined}>{item.lastViewedAt ? formatRelative(item.lastViewedAt) : 'No activity'}</span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2.5 text-right">
        <span className={`whitespace-nowrap text-xs ${getExpiryKind(item.share.expires_at) === 'expired' ? 'text-foreground-muted' : 'text-foreground-muted/70'}`} title={item.share.expires_at ? formatExactDate(item.share.expires_at) : undefined}>
          {formatExpiry(item.share.expires_at)}
        </span>
      </TableCell>
      <TableCell className="px-2.5 py-1.5">
        <ShareRowActions item={item} onCopyLink={onCopyLink} />
      </TableCell>
    </TableRow>
  )
}

function ShareRowActions({ item, onCopyLink }: { item: ShareListItem; onCopyLink: () => void }) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null)
      return
    }

    if (!triggerRef.current) return

    function updateMenuPosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const triggerBounds = trigger.getBoundingClientRect()
      const menuWidth = 192
      const viewportPadding = 8
      const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)

      setMenuPosition({
        top: triggerBounds.bottom,
        left: Math.min(Math.max(viewportPadding, triggerBounds.right - menuWidth), maxLeft),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${item.share.recipient_label || 'Generic share'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground-muted opacity-60 transition-colors hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:bg-accent/70 group-hover:opacity-100"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      {open && menuPosition ? createPortal(
        <div ref={menuRef} role="menu" style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed z-[70] mt-1 w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <button type="button" role="menuitem" onClick={() => { onCopyLink(); setOpen(false) }} className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-xs text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="The original recipient URL is not recoverable after creation">
            <Copy className="size-3.5" aria-hidden="true" />
            Copy link
          </button>
          <div className="my-1 h-px bg-border" role="separator" />
          <div className="[&>div>button]:h-8 [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:px-2 [&>div>button]:text-xs">
            <UpdateShareExpiryButton shareId={item.share.id} currentExpiresAt={item.share.expires_at} compact />
          </div>
          <Link href={`/dashboard/shares/${item.share.id}`} role="menuitem" onClick={() => setOpen(false)} className="flex h-8 items-center gap-2 rounded-sm px-2 text-xs text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            View analytics
          </Link>
          <div className="my-1 h-px bg-border" role="separator" />
          <div className="[&>div>button]:h-8 [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:px-2 [&>div>button]:text-xs [&>div>button]:text-destructive [&>div>button]:hover:bg-destructive/10 [&>div>button]:hover:text-destructive">
            <RevokeShareButton shareId={item.share.id} disabled={item.status === 'revoked'} compact />
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

export function ShareStatusBadge({ status, className = '' }: { status: ShareStatus; className?: string }) {
  const labels: Record<ShareStatus, string> = {
    active: 'Active',
    'expiring-soon': 'Active',
    expired: 'Expired',
    revoked: 'Revoked',
    'repository-disabled': 'Unavailable',
  }

  return (
    <Badge variant="outline" className={`gap-1.5 whitespace-nowrap border-border/80 px-2 text-[11px] ${className}`}>
      <span className="size-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
      {labels[status]}
    </Badge>
  )
}

function EmptyShares() {
  return (
    <div className="rounded-md border border-dashed border-border px-6 py-14 text-center">
      <Link2 className="mx-auto size-7 text-foreground-muted" aria-hidden="true" />
      <h2 className="mt-3 font-heading text-lg font-semibold tracking-tight">No shares yet</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-foreground-muted">Create a recipient-specific share when you are ready to show a private repository preview.</p>
      <Link href="/dashboard/shares/new" className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus className="size-4" aria-hidden="true" />
        Create your first share
      </Link>
    </div>
  )
}

function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-border px-6 py-14 text-center">
      <Search className="mx-auto size-6 text-foreground-muted" aria-hidden="true" />
      <h2 className="mt-3 font-heading text-lg font-semibold tracking-tight">No matching shares</h2>
      <p className="mt-1.5 text-sm text-foreground-muted">Try a different search or clear the current filters.</p>
      <Button type="button" variant="outline" size="small" className="mt-5" onClick={onClear}>Clear filters</Button>
    </div>
  )
}

function getRepositoryName(item: ShareListItem) {
  return item.repository ? `${item.repository.github_owner}/${item.repository.github_repo}` : 'Repository unavailable'
}

function getDisplayStatus(status: ShareStatus): StatusFilter {
  if (status === 'revoked') return 'revoked'
  if (status === 'expired') return 'expired'
  if (status === 'repository-disabled') return 'unavailable'
  return 'active'
}

function getExpiryKind(value: string | null): Exclude<ExpiryFilter, 'all'> {
  if (!value) return 'never'
  return new Date(value).getTime() <= Date.now() ? 'expired' : 'upcoming'
}

function formatExpiry(value: string | null) {
  if (!value) return 'Never'
  const difference = new Date(value).getTime() - Date.now()
  const days = Math.ceil(Math.abs(difference) / (24 * 60 * 60 * 1000))
  return difference <= 0 ? `Expired ${Math.max(1, days)}d ago` : `Expires in ${Math.max(1, days)}d`
}

function formatRelative(value: string) {
  const difference = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(difference / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatExactDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function compareItems(a: ShareListItem, b: ShareListItem, sort: SortKey) {
  if (sort === 'recipient') return compareText(a.share.recipient_label || 'Generic share', b.share.recipient_label || 'Generic share')
  if (sort === 'repository') return compareText(getRepositoryName(a), getRepositoryName(b))
  if (sort === 'status') return compareText(getDisplayStatus(a.status), getDisplayStatus(b.status))
  if (sort === 'expiry') return expiryTime(a.share.expires_at) - expiryTime(b.share.expires_at)
  if (sort === 'activity') return (new Date(b.lastViewedAt || 0).getTime() - new Date(a.lastViewedAt || 0).getTime()) || b.confirmedViews - a.confirmedViews
  if (sort === 'oldest') return new Date(a.share.created_at).getTime() - new Date(b.share.created_at).getTime()
  return new Date(b.share.created_at).getTime() - new Date(a.share.created_at).getTime()
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function expiryTime(value: string | null) {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
}

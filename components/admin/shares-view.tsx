'use client'

import { BarChart3, Eye, GitBranch, Link2, MoreHorizontal, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { RevokeShareButton } from '@/components/admin/revoke-share-button'
import { RotateShareButton } from '@/components/admin/rotate-share-button'
import { UpdateShareExpiryButton } from '@/components/admin/update-share-expiry-button'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select } from '@/components/ui'
import type { Tables } from '@/lib/supabase/database.types'
import type { ShareStatus } from '@/lib/shares/dashboard'
import { ActiveFilterSummary, OwnerEmptyState, OwnerFilterDialog, OwnerFilterField, OwnerListHeader, OwnerListSurface, OwnerListToolbar, OwnerPageHeader, OwnerSearchField } from './owner-workspace-controls'

export interface ShareListItem {
  share: Pick<Tables<'shares'>, 'id' | 'share_code' | 'share_type' | 'recipient_label' | 'ref' | 'expires_at' | 'note' | 'created_at'>
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

  const repositories = useMemo(() => [...new Set(items.map(getRepositoryName))].sort((a, b) => a.localeCompare(b)), [items])
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const recipient = getShareLabel(item)
      const repository = getRepositoryName(item)
      const matchesQuery = !normalizedQuery || [recipient, repository, item.share.ref, item.share.note ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesRepository = repositoryFilter === 'all' || repository === repositoryFilter
      const matchesStatus = statusFilter === 'all' || getDisplayStatus(item.status) === statusFilter
      const matchesExpiry = expiryFilter === 'all' || getExpiryKind(item.share.expires_at) === expiryFilter
      const matchesActivity = activityFilter === 'all' || (activityFilter === 'active' && item.confirmedViews > 0) || (activityFilter === 'quiet' && item.confirmedViews === 0)
      return matchesQuery && matchesRepository && matchesStatus && matchesExpiry && matchesActivity
    }).sort((a, b) => compareItems(a, b, sort))
  }, [activityFilter, expiryFilter, items, query, repositoryFilter, sort, statusFilter])

  const activeFilterCount = [repositoryFilter !== 'all', statusFilter !== 'all', expiryFilter !== 'all', activityFilter !== 'all', sort !== 'recent'].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    setRepositoryFilter('all')
    setStatusFilter('all')
    setExpiryFilter('all')
    setActivityFilter('all')
    setSort('recent')
  }

  function clearFilterValues() {
    setRepositoryFilter('all')
    setStatusFilter('all')
    setExpiryFilter('all')
    setActivityFilter('all')
    setSort('recent')
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <OwnerPageHeader title="Shares" description="Manage recipient-specific repository previews." meta={<>{items.length} {items.length === 1 ? 'share' : 'shares'}</>} actions={<Link href="/dashboard/shares/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden="true" /> New share</Link>} />

      <section aria-labelledby="shared-links">
        <OwnerListSurface>
          <OwnerListHeader icon={<Link2 className="size-4" aria-hidden="true" />} title="Share inventory" description="Track who each preview is for, how it is being used, and when it ends." meta={<>{filteredItems.length} shown</>} />
          <OwnerListToolbar className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><OwnerSearchField value={query} onChange={setQuery} label="Search shares" placeholder="Search recipient, repository, ref, or note" /><OwnerFilterDialog title="Share filters and view" description="Filter by repository, lifecycle, expiry, and engagement; change the order from the same surface." activeCount={activeFilterCount} onClear={clearFilterValues}><OwnerFilterField label="Repository"><Select value={repositoryFilter} onChange={(event) => setRepositoryFilter(event.target.value)} aria-label="Filter shares by repository"><option value="all">All repositories</option>{repositories.map((repository) => <option key={repository} value={repository}>{repository}</option>)}</Select></OwnerFilterField><OwnerFilterField label="Status"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter shares by status"><option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="unavailable">Unavailable</option></Select></OwnerFilterField><OwnerFilterField label="Expiry"><Select value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as ExpiryFilter)} aria-label="Filter shares by expiry"><option value="all">All expiry</option><option value="upcoming">Has expiry</option><option value="never">Never expires</option><option value="expired">Expired</option></Select></OwnerFilterField><OwnerFilterField label="Activity"><Select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)} aria-label="Filter shares by activity"><option value="all">All activity</option><option value="active">Has activity</option><option value="quiet">No activity</option></Select></OwnerFilterField><OwnerFilterField label="Sort"><Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort shares"><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="activity">Recent activity</option><option value="expiry">Expiry</option><option value="recipient">Recipient</option><option value="repository">Repository</option><option value="status">Status</option></Select></OwnerFilterField></OwnerFilterDialog></div>
          <ActiveFilterSummary filters={[...(repositoryFilter !== 'all' ? [{ label: 'Repository', value: repositoryFilter, onClear: () => setRepositoryFilter('all') }] : []), ...(statusFilter !== 'all' ? [{ label: 'Status', value: statusLabel(statusFilter), onClear: () => setStatusFilter('all') }] : []), ...(expiryFilter !== 'all' ? [{ label: 'Expiry', value: expiryLabel(expiryFilter), onClear: () => setExpiryFilter('all') }] : []), ...(activityFilter !== 'all' ? [{ label: 'Activity', value: activityLabel(activityFilter), onClear: () => setActivityFilter('all') }] : []), ...(sort !== 'recent' ? [{ label: 'Sort', value: sortLabel(sort), onClear: () => setSort('recent') }] : [])]} onClear={clearFilterValues} />
          </OwnerListToolbar>

          {items.length === 0 ? <EmptyShares /> : filteredItems.length === 0 ? <EmptyFilterState onClear={clearFilters} /> : <SharesList items={filteredItems} />}
        </OwnerListSurface>
      </section>
    </section>
  )
}

function SharesList({ items }: { items: ShareListItem[] }) {
  return <ul className="divide-y divide-border/70" aria-label="Shares">{items.map((item) => <ShareRow key={item.share.id} item={item} />)}</ul>
}

function ShareRow({ item }: { item: ShareListItem }) {
  const repositoryName = getRepositoryName(item)
  const shareLabel = getShareLabel(item)
  const detailHref = `/dashboard/shares/${item.share.id}`
  return <li className="group px-4 py-3.5 transition-colors hover:bg-accent/30 sm:px-5"><div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:items-center sm:gap-4"><Link href={detailHref} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary-soft text-primary-readable"><Link2 className="size-3.5" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground" title={shareLabel}>{shareLabel}</p><p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-foreground-muted"><span className="truncate font-mono" title={repositoryName}>{repositoryName}</span><span aria-hidden="true">·</span><span className="inline-flex min-w-0 items-center gap-1 truncate font-mono" title={item.share.ref}><GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{item.share.ref}</span></span></p><p className="mt-1 truncate text-[11px] text-foreground-muted" title={item.share.note || `Created ${formatExactDate(item.share.created_at)}`}>{item.share.note || `Created ${formatShortDate(item.share.created_at)}`}</p></div></div></Link><div><p className="mb-1 text-[11px] text-foreground-muted sm:sr-only">Status</p><ShareStatusBadge status={item.status} /></div><div className="text-left sm:text-right"><p className="mb-1 text-[11px] text-foreground-muted sm:sr-only">Activity</p><span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-foreground"><Eye className="size-3.5 text-foreground-muted" aria-hidden="true" />{item.confirmedViews} {item.confirmedViews === 1 ? 'view' : 'views'}</span><span className="mt-1 block text-[11px] text-foreground-muted" title={item.lastViewedAt ? formatExactDate(item.lastViewedAt) : undefined}>{item.lastViewedAt ? formatRelative(item.lastViewedAt) : 'No activity'}</span></div><div className="text-left sm:text-right"><p className="mb-1 text-[11px] text-foreground-muted sm:sr-only">Expiry</p><span className="text-xs text-foreground-muted" title={item.share.expires_at ? formatExactDate(item.share.expires_at) : undefined}>{formatExpiry(item.share.expires_at)}</span></div><ShareRowActions item={item} /></div></li>
}

function ShareRowActions({ item }: { item: ShareListItem }) {
  return <DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${getShareLabel(item)}`} className="h-9 w-9 border-transparent bg-transparent px-0 text-foreground-muted hover:bg-accent hover:text-foreground"><MoreHorizontal className="size-4" aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent className="right-0 mt-1 w-56 p-1.5"><DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium text-foreground-muted">Share actions</DropdownMenuLabel><Link href={`/dashboard/shares/${item.share.id}`} role="menuitem" className="flex min-h-9 items-center gap-2 rounded-sm px-2 text-sm text-foreground-muted hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"><BarChart3 className="size-4" aria-hidden="true" /> View analytics</Link><DropdownMenuSeparator /><div className="[&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:gap-2 [&>button]:px-2 [&>button]:text-sm"><RotateShareButton shareId={item.share.id} revoked={item.status === 'revoked'} compact /></div><div className="[&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:gap-2 [&>button]:px-2 [&>button]:text-sm"><UpdateShareExpiryButton shareId={item.share.id} currentExpiresAt={item.share.expires_at} compact /></div><DropdownMenuSeparator /><div className="[&>div>button]:h-9 [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:gap-2 [&>div>button]:px-2 [&>div>button]:text-sm [&>div>button]:text-destructive [&>div>button]:hover:bg-destructive/10 [&>div>button]:hover:text-destructive"><RevokeShareButton shareId={item.share.id} disabled={item.status === 'revoked'} compact /></div></DropdownMenuContent></DropdownMenu>
}

export function ShareStatusBadge({ status, className = '' }: { status: ShareStatus; className?: string }) {
  const labels: Record<ShareStatus, string> = { active: 'Active', 'expiring-soon': 'Expiring soon', expired: 'Expired', revoked: 'Revoked', 'repository-disabled': 'Unavailable' }
  const variants: Record<ShareStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = { active: 'success', 'expiring-soon': 'warning', expired: 'secondary', revoked: 'destructive', 'repository-disabled': 'warning' }
  return <Badge variant={variants[status]} className={`gap-1.5 whitespace-nowrap text-[11px] ${className}`}><span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />{labels[status]}</Badge>
}

function EmptyShares() { return <OwnerEmptyState icon={<Link2 className="size-4" aria-hidden="true" />} title="No shares yet" description="Create a recipient-specific share when you are ready to show a private repository preview." action={<Link href="/dashboard/shares/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden="true" /> Create your first share</Link>} /> }
function EmptyFilterState({ onClear }: { onClear: () => void }) { return <OwnerEmptyState icon={<Search className="size-4" aria-hidden="true" />} title="No matching shares" description="Try another search or clear the current filters." action={<Button type="button" variant="outline" size="small" onClick={onClear}>Clear filters</Button>} /> }

function getShareLabel(item: ShareListItem) { return item.share.recipient_label || (item.share.share_type === 'recipient' ? 'Recipient share' : 'Generic share') }
function getRepositoryName(item: ShareListItem) { return item.repository ? `${item.repository.github_owner}/${item.repository.github_repo}` : 'Repository unavailable' }
function getDisplayStatus(status: ShareStatus): StatusFilter { if (status === 'revoked') return 'revoked'; if (status === 'expired') return 'expired'; if (status === 'repository-disabled') return 'unavailable'; return 'active' }
function getExpiryKind(value: string | null): Exclude<ExpiryFilter, 'all'> { if (!value) return 'never'; return new Date(value).getTime() <= Date.now() ? 'expired' : 'upcoming' }
function formatExpiry(value: string | null) { if (!value) return 'Never'; const difference = new Date(value).getTime() - Date.now(); const days = Math.ceil(Math.abs(difference) / 86400000); return difference <= 0 ? `Expired ${Math.max(1, days)}d ago` : `Expires in ${Math.max(1, days)}d` }
function formatRelative(value: string) { const difference = Math.max(0, Date.now() - new Date(value).getTime()); const minutes = Math.floor(difference / 60000); if (minutes < 1) return 'just now'; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago` }
function formatShortDate(value: string) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) }
function formatExactDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function compareItems(a: ShareListItem, b: ShareListItem, sort: SortKey) { if (sort === 'recipient') return compareText(getShareLabel(a), getShareLabel(b)); if (sort === 'repository') return compareText(getRepositoryName(a), getRepositoryName(b)); if (sort === 'status') return compareText(getDisplayStatus(a.status), getDisplayStatus(b.status)); if (sort === 'expiry') return expiryTime(a.share.expires_at) - expiryTime(b.share.expires_at); if (sort === 'activity') return (new Date(b.lastViewedAt || 0).getTime() - new Date(a.lastViewedAt || 0).getTime()) || b.confirmedViews - a.confirmedViews; if (sort === 'oldest') return new Date(a.share.created_at).getTime() - new Date(b.share.created_at).getTime(); return new Date(b.share.created_at).getTime() - new Date(a.share.created_at).getTime() }
function compareText(a: string, b: string) { return a.localeCompare(b, undefined, { sensitivity: 'base' }) }
function expiryTime(value: string | null) { return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY }
function statusLabel(value: StatusFilter) { return { all: 'All', active: 'Active', expired: 'Expired', revoked: 'Revoked', unavailable: 'Unavailable' }[value] }
function expiryLabel(value: ExpiryFilter) { return { all: 'All', upcoming: 'Has expiry', never: 'Never expires', expired: 'Expired' }[value] }
function activityLabel(value: ActivityFilter) { return { all: 'All', active: 'Has activity', quiet: 'No activity' }[value] }
function sortLabel(value: SortKey) { return { recent: 'Newest first', oldest: 'Oldest first', activity: 'Recent activity', expiry: 'Expiry', recipient: 'Recipient', repository: 'Repository', status: 'Status' }[value] }

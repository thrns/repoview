'use client'

import { Link2, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { RevokeShareButton } from '@/components/admin/revoke-share-button'
import { RotateShareButton } from '@/components/admin/rotate-share-button'
import {
  Badge,
  Button,
  Card,
  PageContainer,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeadSort,
  TableRow,
} from '@/components/ui'
import type { Tables } from '@/lib/supabase/database.types'
import type { ShareStatus } from '@/lib/shares/dashboard'
import { ActiveFilterSummary, OwnerEmptyState, OwnerFilterDialog, OwnerFilterField, OwnerSearchField } from './owner-workspace-controls'

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
type SortDirection = 'asc' | 'desc'
type TableSortColumn = 'share' | 'status' | 'engagement' | 'expires'

export function SharesView({ items }: { items: ShareListItem[] }) {
  const [query, setQuery] = useState('')
  const [repositoryFilter, setRepositoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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
    }).sort((a, b) => compareItems(a, b, sort, sortDirection))
  }, [activityFilter, expiryFilter, items, query, repositoryFilter, sort, sortDirection, statusFilter])

  const activeFilterCount = [repositoryFilter !== 'all', statusFilter !== 'all', expiryFilter !== 'all', activityFilter !== 'all', sort !== 'recent'].filter(Boolean).length
  const tableSort = getTableSort(sort, sortDirection)

  function selectSort(nextSort: SortKey) {
    setSort(nextSort)
    setSortDirection(defaultSortDirection(nextSort))
  }

  function handleTableSortChange(column: string) {
    const nextSort = tableSortKey(column as TableSortColumn)
    if (!nextSort) return
    if (sort === nextSort) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSort(nextSort)
    setSortDirection('asc')
  }

  function clearFilters() {
    setQuery('')
    setRepositoryFilter('all')
    setStatusFilter('all')
    setExpiryFilter('all')
    setActivityFilter('all')
    selectSort('recent')
  }

  function clearFilterValues() {
    setRepositoryFilter('all')
    setStatusFilter('all')
    setExpiryFilter('all')
    setActivityFilter('all')
    selectSort('recent')
  }

  return (
    <PageContainer size="large" className="space-y-6">
      <section aria-label="Shares inventory">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <OwnerSearchField value={query} onChange={setQuery} label="Search shares" placeholder="Search recipient, repository, ref, or note" className="lg:min-w-64" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <OwnerFilterDialog title="Share filters and view" description="Filter by repository, lifecycle, expiry, and engagement; change the order from the same surface." activeCount={activeFilterCount} onClear={clearFilterValues}>
                <OwnerFilterField label="Repository"><Select value={repositoryFilter} onChange={(event) => setRepositoryFilter(event.target.value)} aria-label="Filter shares by repository"><option value="all">All repositories</option>{repositories.map((repository) => <option key={repository} value={repository}>{repository}</option>)}</Select></OwnerFilterField>
                <OwnerFilterField label="Status"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter shares by status"><option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="unavailable">Unavailable</option></Select></OwnerFilterField>
                <OwnerFilterField label="Expiry"><Select value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as ExpiryFilter)} aria-label="Filter shares by expiry"><option value="all">All expiry</option><option value="upcoming">Has expiry</option><option value="never">Never expires</option><option value="expired">Expired</option></Select></OwnerFilterField>
                <OwnerFilterField label="Activity"><Select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)} aria-label="Filter shares by activity"><option value="all">All activity</option><option value="active">Has activity</option><option value="quiet">No activity</option></Select></OwnerFilterField>
                <OwnerFilterField label="Sort"><Select value={sort} onChange={(event) => selectSort(event.target.value as SortKey)} aria-label="Sort shares"><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="activity">Recent activity</option><option value="expiry">Expiry</option><option value="recipient">Recipient</option><option value="repository">Repository</option><option value="status">Status</option></Select></OwnerFilterField>
              </OwnerFilterDialog>
            </div>
          </div>
          <ActiveFilterSummary filters={[...(repositoryFilter !== 'all' ? [{ label: 'Repository', value: repositoryFilter, onClear: () => setRepositoryFilter('all') }] : []), ...(statusFilter !== 'all' ? [{ label: 'Status', value: statusLabel(statusFilter), onClear: () => setStatusFilter('all') }] : []), ...(expiryFilter !== 'all' ? [{ label: 'Expiry', value: expiryLabel(expiryFilter), onClear: () => setExpiryFilter('all') }] : []), ...(activityFilter !== 'all' ? [{ label: 'Activity', value: activityLabel(activityFilter), onClear: () => setActivityFilter('all') }] : []), ...(sort !== 'recent' ? [{ label: 'Sort', value: sortLabel(sort), onClear: () => selectSort('recent') }] : [])]} onClear={clearFilterValues} />
        </div>

        <Card className="mt-4 overflow-visible">
          <Table wrapperClassName="overflow-visible" className="shares-table min-w-0 table-fixed">
            <caption className="sr-only">Repository shares and their engagement status</caption>
            <colgroup><col /><col className="w-[9rem]" /><col className="w-[10rem]" /><col className="w-[7.5rem]" /><col className="w-28" /></colgroup>
            <TableHeader>
              <TableRow>
                <TableHead aria-sort={tableSort.column === 'share' ? tableSort.ariaSort : 'none'}><TableHeadSort column="share" currentSort={tableSort.value} onSortChange={handleTableSortChange}>Share</TableHeadSort></TableHead>
                <TableHead aria-sort={tableSort.column === 'status' ? tableSort.ariaSort : 'none'}><TableHeadSort column="status" currentSort={tableSort.value} onSortChange={handleTableSortChange}>Status</TableHeadSort></TableHead>
                <TableHead className="text-right" aria-sort={tableSort.column === 'engagement' ? tableSort.ariaSort : 'none'}><TableHeadSort column="engagement" currentSort={tableSort.value} onSortChange={handleTableSortChange} className="w-full justify-end">Engagement</TableHeadSort></TableHead>
                <TableHead aria-sort={tableSort.column === 'expires' ? tableSort.ariaSort : 'none'}><TableHeadSort column="expires" currentSort={tableSort.value} onSortChange={handleTableSortChange}>Expires</TableHeadSort></TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow className="[&>td]:hover:bg-inherit"><TableCell colSpan={5}><EmptyShares /></TableCell></TableRow> : filteredItems.length === 0 ? <TableRow className="[&>td]:hover:bg-inherit"><TableCell colSpan={5}><EmptyFilterState onClear={clearFilters} /></TableCell></TableRow> : filteredItems.map((item) => <ShareRow key={item.share.id} item={item} />)}
            </TableBody>
          </Table>
        </Card>
      </section>
    </PageContainer>
  )
}

function ShareRow({ item }: { item: ShareListItem }) {
  const repositoryName = getRepositoryName(item)
  const shareLabel = getShareLabel(item)
  const detailHref = `/dashboard/shares/${item.share.id}`
  return (
    <TableRow>
      <TableCell className="min-w-0">
        <Link href={detailHref} className="block min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-100">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground" title={shareLabel}>{shareLabel}</span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-foreground-muted">
            <span className="truncate font-mono" title={repositoryName}>{repositoryName}</span>
            <span aria-hidden="true" className="text-foreground-muted/60">·</span>
            <span className="truncate font-mono" title={item.share.ref}>{item.share.ref}</span>
          </span>
        </Link>
      </TableCell>
      <TableCell><ShareStatusBadge status={item.status} /></TableCell>
      <TableCell className="text-right">
        <span className="block text-sm font-medium tabular-nums text-foreground">{item.confirmedViews} {item.confirmedViews === 1 ? 'view' : 'views'}</span>
        <span className="mt-1 block truncate text-xs text-foreground-muted" title={item.lastViewedAt ? formatExactDate(item.lastViewedAt) : undefined}>{item.lastViewedAt ? `Viewed ${formatRelative(item.lastViewedAt)}` : 'No activity'}</span>
      </TableCell>
      <TableCell><span className="whitespace-nowrap text-xs text-foreground-muted" title={item.share.expires_at ? formatExactDate(item.share.expires_at) : undefined}>{formatExpiry(item.share.expires_at)}</span></TableCell>
      <TableCell className="w-32 whitespace-nowrap text-right"><ShareRowActions item={item} /></TableCell>
    </TableRow>
  )
}

function ShareRowActions({ item }: { item: ShareListItem }) {
  const canGenerateLink = item.status !== 'expired'

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="flex size-8 items-center justify-center">
        {canGenerateLink ? <RotateShareButton shareId={item.share.id} revoked={item.status === 'revoked'} iconOnly /> : null}
      </span>
      <span className="flex size-8 items-center justify-center">
        {item.status === 'revoked' ? null : <RevokeShareButton shareId={item.share.id} iconOnly />}
      </span>
    </div>
  )
}

export function ShareStatusBadge({ status, className = '' }: { status: ShareStatus; className?: string }) {
  const labels: Record<ShareStatus, string> = { active: 'Active', 'expiring-soon': 'Expiring soon', expired: 'Expired', revoked: 'Revoked', 'repository-disabled': 'Unavailable' }
  const variants: Record<ShareStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = { active: 'success', 'expiring-soon': 'warning', expired: 'secondary', revoked: 'destructive', 'repository-disabled': 'warning' }
  return <Badge variant={variants[status]} className={`whitespace-nowrap ${className}`}>{labels[status]}</Badge>
}

function EmptyShares() { return <OwnerEmptyState icon={<Link2 className="size-4" aria-hidden="true" />} title="No shares yet" description="Create a recipient-specific share when you are ready to show a private repository preview." action={<Link href="/dashboard/shares/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-default px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-default/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden="true" /> Create your first share</Link>} /> }
function EmptyFilterState({ onClear }: { onClear: () => void }) { return <OwnerEmptyState icon={<Search className="size-4" aria-hidden="true" />} title="No matching shares" description="Try another search or clear the current filters." action={<Button type="button" variant="outline" size="small" onClick={onClear}>Clear filters</Button>} /> }

function getShareLabel(item: ShareListItem) { return item.share.recipient_label || (item.share.share_type === 'recipient' ? 'Recipient share' : 'Generic share') }
function getRepositoryName(item: ShareListItem) { return item.repository ? `${item.repository.github_owner}/${item.repository.github_repo}` : 'Repository unavailable' }
function getDisplayStatus(status: ShareStatus): StatusFilter { if (status === 'revoked') return 'revoked'; if (status === 'expired') return 'expired'; if (status === 'repository-disabled') return 'unavailable'; return 'active' }
function getExpiryKind(value: string | null): Exclude<ExpiryFilter, 'all'> { if (!value) return 'never'; return new Date(value).getTime() <= Date.now() ? 'expired' : 'upcoming' }
function formatExpiry(value: string | null) { if (!value) return 'Never'; const difference = new Date(value).getTime() - Date.now(); if (difference <= 0) return 'Expired'; const days = Math.ceil(difference / 86400000); return days <= 7 ? `In ${days}d` : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) }
function formatRelative(value: string) { const difference = Math.max(0, Date.now() - new Date(value).getTime()); const minutes = Math.floor(difference / 60000); if (minutes < 1) return 'just now'; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago` }
function formatExactDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function compareItems(a: ShareListItem, b: ShareListItem, sort: SortKey, direction: SortDirection) { const multiplier = direction === 'asc' ? 1 : -1; if (sort === 'recipient') return compareText(getShareLabel(a), getShareLabel(b)) * multiplier; if (sort === 'repository') return compareText(getRepositoryName(a), getRepositoryName(b)) * multiplier; if (sort === 'status') return compareText(getDisplayStatus(a.status), getDisplayStatus(b.status)) * multiplier; if (sort === 'expiry') return (expiryTime(a.share.expires_at) - expiryTime(b.share.expires_at)) * multiplier; if (sort === 'activity') return ((new Date(a.lastViewedAt || 0).getTime() - new Date(b.lastViewedAt || 0).getTime()) || (a.confirmedViews - b.confirmedViews)) * multiplier; return (new Date(a.share.created_at).getTime() - new Date(b.share.created_at).getTime()) * multiplier }
function compareText(a: string, b: string) { return a.localeCompare(b, undefined, { sensitivity: 'base' }) }
function expiryTime(value: string | null) { return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY }
function defaultSortDirection(value: SortKey): SortDirection { return value === 'recent' || value === 'activity' ? 'desc' : 'asc' }
function tableSortKey(column: TableSortColumn): SortKey | null { const keys: Record<TableSortColumn, SortKey> = { share: 'recipient', status: 'status', engagement: 'activity', expires: 'expiry' }; return keys[column] }
function getTableSort(sort: SortKey, direction: SortDirection) { const column = sort === 'recipient' ? 'share' : sort === 'status' ? 'status' : sort === 'activity' ? 'engagement' : sort === 'expiry' ? 'expires' : null; return { column, value: column ? `${column}:${direction}` : 'none:none', ariaSort: direction === 'asc' ? 'ascending' as const : 'descending' as const } }
function statusLabel(value: StatusFilter) { return { all: 'All', active: 'Active', expired: 'Expired', revoked: 'Revoked', unavailable: 'Unavailable' }[value] }
function expiryLabel(value: ExpiryFilter) { return { all: 'All', upcoming: 'Has expiry', never: 'Never expires', expired: 'Expired' }[value] }
function activityLabel(value: ActivityFilter) { return { all: 'All', active: 'Has activity', quiet: 'No activity' }[value] }
function sortLabel(value: SortKey) { return { recent: 'Newest first', oldest: 'Oldest first', activity: 'Recent activity', expiry: 'Expiry', recipient: 'Recipient', repository: 'Repository', status: 'Status' }[value] }

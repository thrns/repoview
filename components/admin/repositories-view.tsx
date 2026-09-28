'use client'

import { Check, ChevronDown, EllipsisVertical, Github, PowerOff, Settings2 } from 'lucide-react'
import { Fragment, useMemo, useState, useTransition, type FormEvent } from 'react'

import {
  setRepositoriesEnabled,
  setRepositoryEnabled,
  updateRepositoriesRules,
} from '@/app/(admin)/dashboard/repositories/actions'
import type { GitHubRepositorySummary } from '@/lib/github/types'
import type { RepositoryRecord } from '@/lib/repositories/registry'
import type { VisibilityRules } from '@/lib/security/visibility'
import { cn } from '@/components/ui'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  PageContainer,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeadSort,
  TableRow,
  Textarea,
} from '@/components/ui'
import { ActiveFilterSummary, OwnerEmptyState, OwnerFilterDialog, OwnerFilterField, OwnerPageHeader, OwnerSearchField } from './owner-workspace-controls'
import { RepositoryRulesEditor } from './repository-rules-editor'

export interface RepositoryDashboardItem {
  github: GitHubRepositorySummary
  local: RepositoryRecord | null
  rules: VisibilityRules | null
}

type StatusFilter = 'all' | 'shareable' | 'disabled' | 'archived'
type VisibilityFilter = 'all' | 'private' | 'public'
type SortMode = 'name-asc' | 'name-desc' | 'branch' | 'status'

export function RepositoriesView({ items }: { items: RepositoryDashboardItem[] }) {
  const [isPending, startTransition] = useTransition()
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [pendingKeys, setPendingKeys] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [error, setError] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items
      .filter((item) => {
        const enabled = getEnabled(item, overrides)
        const shareable = isShareable(item, enabled)
        const matchesQuery = !normalizedQuery || [item.github.fullName, item.github.description ?? '', item.github.defaultBranch]
          .some((value) => value.toLowerCase().includes(normalizedQuery))
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'shareable' && shareable)
          || (statusFilter === 'disabled' && !enabled)
          || (statusFilter === 'archived' && item.github.archived)
        const matchesVisibility = visibilityFilter === 'all'
          || (visibilityFilter === 'private' && item.github.private)
          || (visibilityFilter === 'public' && !item.github.private)
        return matchesQuery && matchesStatus && matchesVisibility
      })
      .sort((left, right) => {
        if (sortMode === 'branch') return left.github.defaultBranch.localeCompare(right.github.defaultBranch)
        if (sortMode === 'status') return statusRank(left, overrides) - statusRank(right, overrides) || left.github.fullName.localeCompare(right.github.fullName)
        const result = left.github.fullName.localeCompare(right.github.fullName)
        return sortMode === 'name-desc' ? result * -1 : result
      })
  }, [items, overrides, query, sortMode, statusFilter, visibilityFilter])

  const selectedItems = items.filter((item) => selectedKeys.includes(repositoryKey(item)))
  const selectedPolicyItems = selectedItems.filter((item) => item.local && item.rules)
  const toggleableSelectedItems = selectedItems.filter((item) => !item.github.disabled && !item.github.archived)
  const enableableSelectedItems = toggleableSelectedItems.filter((item) => !getEnabled(item, overrides))
  const disableableSelectedItems = toggleableSelectedItems.filter((item) => getEnabled(item, overrides))
  const visibleKeys = filteredItems.map(repositoryKey)
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key))
  const someVisibleSelected = visibleKeys.some((key) => selectedKeys.includes(key))
  const activeFilterCount = [statusFilter !== 'all', visibilityFilter !== 'all', sortMode !== 'name-asc'].filter(Boolean).length

  function toggleRepository(item: RepositoryDashboardItem, enabled: boolean) {
    const key = repositoryKey(item)
    const previousValue = getEnabled(item, overrides)
    setError(null)
    setOverrides((current) => ({ ...current, [key]: enabled }))
    setPendingKeys((current) => current.includes(key) ? current : [...current, key])

    startTransition(async () => {
      try {
        await setRepositoryEnabled({
          repositoryId: item.local?.id,
          installationRecordId: item.github.installationRecordId,
          githubRepositoryId: item.github.githubRepositoryId,
          githubNodeId: item.github.githubNodeId,
          owner: item.github.owner,
          repo: item.github.name,
          enabled,
        })
      } catch (actionError) {
        setOverrides((current) => ({ ...current, [key]: previousValue }))
        setError(actionError instanceof Error ? actionError.message : 'Repository status could not be updated.')
      } finally {
        setPendingKeys((current) => current.filter((pendingKey) => pendingKey !== key))
      }
    })
  }

  function bulkToggle(repositories: RepositoryDashboardItem[], enabled: boolean) {
    if (repositories.length === 0) return
    const keys = repositories.map(repositoryKey)
    const previousValues = Object.fromEntries(repositories.map((item) => [repositoryKey(item), getEnabled(item, overrides)]))
    setError(null)
    setPendingKeys((current) => [...new Set([...current, ...keys])])
    setOverrides((current) => Object.fromEntries([...Object.entries(current), ...keys.map((key) => [key, enabled])]))

    startTransition(async () => {
      try {
        await setRepositoriesEnabled({
          repositories: repositories.map((item) => ({
            repositoryId: item.local?.id,
            installationRecordId: item.github.installationRecordId,
            githubRepositoryId: item.github.githubRepositoryId,
            githubNodeId: item.github.githubNodeId,
            owner: item.github.owner,
            repo: item.github.name,
            enabled,
          })),
        })
        setSelectedKeys([])
      } catch (actionError) {
        setOverrides((current) => Object.fromEntries([...Object.entries(current), ...Object.entries(previousValues)]))
        setError(actionError instanceof Error ? actionError.message : 'Repository statuses could not be updated.')
      } finally {
        setPendingKeys((current) => current.filter((pendingKey) => !keys.includes(pendingKey)))
      }
    })
  }

  function clearFilters() {
    setQuery('')
    setStatusFilter('all')
    setVisibilityFilter('all')
    setSortMode('name-asc')
  }

  function clearFilterValues() {
    setStatusFilter('all')
    setVisibilityFilter('all')
    setSortMode('name-asc')
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  function toggleAllVisible() {
    setSelectedKeys((current) => allVisibleSelected
      ? current.filter((key) => !visibleKeys.includes(key))
      : [...new Set([...current, ...visibleKeys])])
  }

  function handleSortChange(column: string) {
    if (column !== 'repository') return
    setSortMode((current) => current === 'name-asc' ? 'name-desc' : 'name-asc')
  }

  const repositorySort = sortMode === 'name-asc' ? 'repository:asc' : sortMode === 'name-desc' ? 'repository:desc' : ''

  return (
    <PageContainer size="large" className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
      <OwnerPageHeader title="Repositories" description="Choose which installation-accessible repositories can be used to create RepoView shares." meta={<>{items.length} available</>} />

      {error ? <Alert className="shrink-0 border-destructive/40 bg-destructive/5 py-3"><AlertTitle>Could not update repositories</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <OwnerSearchField value={query} onChange={setQuery} label="Search repositories" placeholder="Search repositories" />
          <OwnerFilterDialog title="Repository filters and view" description="Narrow the repositories or change the order without crowding the table." activeCount={activeFilterCount} onClear={clearFilterValues}>
            <OwnerFilterField label="Status"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter repositories by status"><option value="all">All statuses</option><option value="shareable">Ready to share</option><option value="disabled">Disabled</option><option value="archived">Archived</option></Select></OwnerFilterField>
            <OwnerFilterField label="GitHub visibility"><Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)} aria-label="Filter repositories by visibility"><option value="all">All visibility</option><option value="private">Private</option><option value="public">Public</option></Select></OwnerFilterField>
            <OwnerFilterField label="Sort repositories"><Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort repositories"><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="status">Sharing state</option><option value="branch">Default branch</option></Select></OwnerFilterField>
          </OwnerFilterDialog>
        </div>
        <ActiveFilterSummary filters={[
          ...(statusFilter !== 'all' ? [{ label: 'Status', value: statusLabel(statusFilter), onClear: () => setStatusFilter('all') }] : []),
          ...(visibilityFilter !== 'all' ? [{ label: 'Visibility', value: visibilityFilter, onClear: () => setVisibilityFilter('all') }] : []),
          ...(sortMode !== 'name-asc' ? [{ label: 'Sort', value: sortLabel(sortMode), onClear: () => setSortMode('name-asc') }] : []),
        ]} onClear={clearFilterValues} />
      </div>

      <Card className="min-h-0 flex-1 overflow-hidden">
        {selectedKeys.length > 0 ? <div className="flex flex-col gap-3 border-b border-border-secondary bg-surface-200/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-2 text-sm"><span className="flex size-5 items-center justify-center rounded-sm bg-brand-default text-brand-foreground" aria-hidden="true"><Check className="size-3" /></span><span><span className="font-semibold tabular-nums">{selectedKeys.length}</span> selected</span></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="default" size="small" disabled={isPending || enableableSelectedItems.length === 0} onClick={() => bulkToggle(enableableSelectedItems, true)} icon={<Check className="size-3.5" />}>Enable</Button><Button type="button" variant="outline" size="small" disabled={isPending || disableableSelectedItems.length === 0} onClick={() => bulkToggle(disableableSelectedItems, false)}>Disable</Button>{selectedPolicyItems.length > 0 ? <BulkPolicyEditor repositories={selectedPolicyItems} onSaved={() => setSelectedKeys([])} /> : null}<Button type="button" variant="ghost" size="small" onClick={() => setSelectedKeys([])}>Clear</Button></div></div> : null}

        <Table className="min-w-[820px] table-fixed">
          <caption className="sr-only">Repositories available to the RepoView GitHub App installation</caption>
          <colgroup>
            <col className="w-11" />
            <col className="w-[42%]" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-40" />
            <col className="w-20" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1"><span className="relative inline-flex"><Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} disabled={visibleKeys.length === 0} aria-checked={someVisibleSelected && !allVisibleSelected ? 'mixed' : allVisibleSelected ? 'true' : 'false'} aria-label="Select all visible repositories" />{someVisibleSelected && !allVisibleSelected ? <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-foreground" aria-hidden="true" /> : null}</span></TableHead>
              <TableHead aria-sort={sortMode === 'name-asc' ? 'ascending' : sortMode === 'name-desc' ? 'descending' : 'none'}><TableHeadSort column="repository" currentSort={repositorySort} onSortChange={handleSortChange}>Repository</TableHeadSort></TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Sharing</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow className="[&>td]:hover:bg-inherit"><TableCell colSpan={6} className="px-6 py-0"><EmptyRepositories /></TableCell></TableRow> : filteredItems.length === 0 ? <TableRow className="[&>td]:hover:bg-inherit"><TableCell colSpan={6} className="px-6 py-0"><FilteredEmpty onClear={clearFilters} /></TableCell></TableRow> : filteredItems.map((item) => {
              const key = repositoryKey(item)
              return <RepositoryTableRows key={key} item={item} enabled={getEnabled(item, overrides)} selected={selectedKeys.includes(key)} pending={pendingKeys.includes(key)} expanded={expandedKeys.includes(key)} onSelect={() => toggleSelected(key)} onToggle={(next) => toggleRepository(item, next)} onExpand={() => setExpandedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} />
            })}
          </TableBody>
        </Table>
      </Card>

      <footer className="flex shrink-0 flex-col gap-1 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between"><p>Archived or GitHub-disabled repositories remain visible for diagnosis but cannot be enabled for new shares.</p><p>Changes save automatically</p></footer>
    </PageContainer>
  )
}

function RepositoryTableRows({ item, enabled, selected, pending, expanded, onSelect, onToggle, onExpand }: { item: RepositoryDashboardItem; enabled: boolean; selected: boolean; pending: boolean; expanded: boolean; onSelect: () => void; onToggle: (enabled: boolean) => void; onExpand: () => void }) {
  const [policyOpen, setPolicyOpen] = useState(false)
  const blocked = item.github.disabled || item.github.archived
  const state = repositoryState(item, enabled)
  const rules = repositoryRulesSummary(item)
  const canEditPolicy = Boolean(item.local && item.rules)
  const hasOverflowActions = !blocked && (enabled || canEditPolicy)

  return (
    <Fragment>
      <TableRow data-state={selected ? 'selected' : undefined} aria-busy={pending || undefined}>
        <TableCell className="w-1 py-2"><Checkbox checked={selected} onChange={onSelect} aria-label={`Select ${item.github.fullName}`} /></TableCell>
        <TableCell className="min-w-0 max-w-0 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Github className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold leading-4 tracking-tight text-foreground" title={item.github.fullName}>{item.github.fullName}</p>
              <p className="truncate text-xs leading-4 text-foreground-muted" title={item.github.description ?? undefined}>{item.github.description || 'No description'}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap py-2 text-sm text-foreground-light">{item.github.private ? 'Private' : 'Public'}</TableCell>
        <TableCell className="py-2"><Badge variant={state.variant}>{state.label}</Badge></TableCell>
        <TableCell className="min-w-0 py-2"><span className={cn('block truncate text-sm', rules.muted ? 'text-foreground-muted' : 'text-foreground-light')} title={rules.title}>{rules.label}</span></TableCell>
        <TableCell className="w-1 whitespace-nowrap py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            {!blocked && !enabled ? <Button type="button" variant="outline" size="tiny" className="h-8 px-2.5" disabled={pending} loading={pending} onClick={() => onToggle(true)}>Enable</Button> : null}
            {hasOverflowActions ? <DropdownMenu>
              <DropdownMenuTrigger aria-label={`More actions for ${item.github.fullName}`} className="size-8 border-transparent bg-transparent p-0 text-foreground-muted shadow-none hover:border-transparent hover:bg-surface-200 hover:text-foreground focus-visible:ring-offset-background"><EllipsisVertical className="size-4" aria-hidden="true" /></DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {enabled ? <DropdownMenuItem className="gap-2" disabled={pending} onClick={() => onToggle(false)}><PowerOff className="size-3.5" aria-hidden="true" /><span>Disable sharing</span></DropdownMenuItem> : null}
                {canEditPolicy ? <DropdownMenuItem className="gap-2" onClick={() => setPolicyOpen(true)}><Settings2 className="size-3.5" aria-hidden="true" /><span>Edit visibility policy</span></DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu> : null}
            <Button type="button" variant="ghost" size="icon" className="size-8 text-foreground-muted" aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${item.github.fullName}`} onClick={onExpand}><ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" /></Button>
          </div>
          {canEditPolicy ? <RepositoryRulesEditor repositoryId={item.local!.id} repositoryName={item.github.fullName} rules={item.rules!} open={policyOpen} onOpenChange={setPolicyOpen} hideTrigger /> : null}
        </TableCell>
      </TableRow>
      {expanded ? <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="bg-surface-200/45 px-4 py-3 sm:px-5"><RepositoryDetails item={item} enabled={enabled} onEditPolicy={canEditPolicy ? () => setPolicyOpen(true) : undefined} /></TableCell></TableRow> : null}
    </Fragment>
  )
}

function RepositoryDetails({ item, enabled, onEditPolicy }: { item: RepositoryDashboardItem; enabled: boolean; onEditPolicy?: () => void }) {
  const state = repositoryState(item, enabled)
  const rules = repositoryRulesSummary(item)
  return <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] sm:items-start"><DetailField label="Default branch" value={item.github.defaultBranch} mono /><DetailField label="GitHub installation" value={state.detail} /><div className="min-w-0"><p className="text-xs text-foreground-muted">Visibility policy</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2"><span className="truncate text-sm text-foreground-light" title={rules.title}>{rules.detail}</span>{onEditPolicy ? <Button type="button" variant="text" size="tiny" className="h-7 px-0 text-xs" onClick={onEditPolicy}>Edit policy</Button> : null}</div></div></div>
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-foreground-muted">{label}</p><p className={cn('mt-1 truncate text-sm text-foreground-light', mono && 'font-mono text-xs')} title={value}>{value}</p></div>
}

function repositoryState(item: RepositoryDashboardItem, enabled: boolean) {
  if (item.github.archived) return { label: 'Archived', detail: 'Archived in GitHub', variant: 'secondary' as const }
  if (item.github.disabled) return { label: 'Unavailable', detail: 'Disabled by GitHub', variant: 'destructive' as const }
  if (isShareable(item, enabled)) return { label: 'Ready', detail: 'Enabled in RepoView', variant: 'success' as const }
  return { label: 'Disabled', detail: 'Not enabled in RepoView', variant: 'secondary' as const }
}

function repositoryRulesSummary(item: RepositoryDashboardItem) {
  if (!item.local || !item.rules) return { label: 'Available after enabling', detail: 'Available after enabling', title: 'Visibility policy becomes available after enabling this repository.', muted: true }
  if (item.rules.hidden.length === 0 && item.rules.allowOnly.length === 0) return { label: 'Default', detail: 'Default visibility rules', title: 'Default visibility rules', muted: false }
  const parts = [
    item.rules.hidden.length > 0 ? `${item.rules.hidden.length} hidden` : null,
    item.rules.allowOnly.length > 0 ? `${item.rules.allowOnly.length} allow-only` : null,
  ].filter(Boolean)
  const label = parts.join(' · ')
  return { label, detail: `${label} patterns`, title: `${label} visibility rules`, muted: false }
}

function statusLabel(value: StatusFilter) { return { all: 'All', shareable: 'Ready to share', disabled: 'Disabled', archived: 'Archived' }[value] }
function sortLabel(value: SortMode) { return { 'name-asc': 'Name A–Z', 'name-desc': 'Name Z–A', status: 'Sharing state', branch: 'Default branch' }[value] }
function statusRank(item: RepositoryDashboardItem, overrides: Record<string, boolean>) { const enabled = getEnabled(item, overrides); if (isShareable(item, enabled)) return 0; if (item.github.disabled || item.github.archived) return 2; return 1 }
function getEnabled(item: RepositoryDashboardItem, overrides: Record<string, boolean>) { return overrides[repositoryKey(item)] ?? item.local?.enabled ?? false }
function repositoryKey(item: RepositoryDashboardItem) { return String(item.github.githubRepositoryId) }
function isShareable(item: RepositoryDashboardItem, enabled: boolean) { return enabled && !item.github.disabled && !item.github.archived }

function EmptyRepositories() { return <OwnerEmptyState icon={<Github className="size-4" aria-hidden="true" />} title="No repositories available" description="Install the GitHub App on at least one selected repository, then return here to enable sharing." align="center" /> }
function FilteredEmpty({ onClear }: { onClear: () => void }) { return <OwnerEmptyState icon={<Settings2 className="size-4" aria-hidden="true" />} title="No repositories match" description="Try another search or clear the current filters." action={<Button type="button" variant="outline" size="small" onClick={onClear}>Clear filters</Button>} /> }

function BulkPolicyEditor({ repositories, onSaved }: { repositories: RepositoryDashboardItem[]; onSaved: () => void }) {
  const [hidden, setHidden] = useState('')
  const [allowOnly, setAllowOnly] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateRepositoriesRules({ repositoryIds: repositories.flatMap((item) => item.local ? [item.local.id] : []), hidden: toPatterns(hidden), allowOnly: toPatterns(allowOnly) })
        setSaved(true)
        onSaved()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Visibility policies could not be saved.')
      }
    })
  }

  return <Dialog><DialogTrigger variant="outline" size="small" className="min-w-28 justify-center" icon={<Settings2 className="size-3.5" />}>Edit policy</DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit visibility policy</DialogTitle><DialogDescription>Apply the same share policy to {repositories.length} selected {repositories.length === 1 ? 'repository' : 'repositories'}.</DialogDescription></DialogHeader><form onSubmit={saveRules}><div className="space-y-5 py-5"><div className="space-y-2"><Label htmlFor="bulk-hidden">Hidden patterns</Label><Textarea id="bulk-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/.env*\n**/secrets/**" rows={6} /><p className="text-xs text-foreground-muted">Hidden paths are never fetched for a viewer.</p></div><div className="space-y-2"><Label htmlFor="bulk-allow-only">Allow-only patterns</Label><Textarea id="bulk-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={4} /><p className="text-xs text-foreground-muted">When present, a path must match at least one allow-only pattern.</p></div>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}{saved ? <p className="text-sm text-success" role="status">Visibility policies saved.</p> : null}</div><DialogFooter><DialogClose>Cancel</DialogClose><Button type="submit" variant="primary" loading={isPending}>Save policies</Button></DialogFooter></form></DialogContent></Dialog>
}

function toPatterns(value: string) { return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean) }

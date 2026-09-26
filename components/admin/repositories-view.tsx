'use client'

import { Check, ChevronDown, Github, Settings2 } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

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
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { ActiveFilterSummary, OwnerFilterDialog, OwnerFilterField, OwnerPageHeader, OwnerSearchField } from './owner-workspace-controls'
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

  return (
    <section className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1400px] flex-1 flex-col gap-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <OwnerPageHeader title="Repositories" description="Choose which installation-accessible repositories can be used to create RepoView shares." meta={<>{items.length} available</>} />

      {error ? <Alert className="shrink-0 border-destructive/40 bg-destructive/5 py-3"><AlertTitle>Could not update repositories</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-3 border-b border-border/70 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <OwnerSearchField value={query} onChange={setQuery} label="Search repositories" placeholder="Search repositories" />
            <OwnerFilterDialog title="Repository filters and view" description="Narrow the inventory or change the order without crowding the main list." activeCount={activeFilterCount} onClear={clearFilterValues}>
              <OwnerFilterField label="Status"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter repositories by status"><option value="all">All statuses</option><option value="shareable">Ready to share</option><option value="disabled">Disabled</option><option value="archived">Archived</option></Select></OwnerFilterField>
              <OwnerFilterField label="GitHub visibility"><Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)} aria-label="Filter repositories by GitHub visibility"><option value="all">All visibility</option><option value="private">Private</option><option value="public">Public</option></Select></OwnerFilterField>
              <OwnerFilterField label="Sort repositories"><Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort repositories"><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="status">Sharing state</option><option value="branch">Default branch</option></Select></OwnerFilterField>
            </OwnerFilterDialog>
            <p className="shrink-0 text-xs tabular-nums text-foreground-muted sm:ml-auto"><span className="text-foreground">{filteredItems.length}</span> of {items.length}</p>
          </div>
          <ActiveFilterSummary filters={[
            ...(statusFilter !== 'all' ? [{ label: 'Status', value: statusLabel(statusFilter), onClear: () => setStatusFilter('all') }] : []),
            ...(visibilityFilter !== 'all' ? [{ label: 'Visibility', value: visibilityFilter, onClear: () => setVisibilityFilter('all') }] : []),
            ...(sortMode !== 'name-asc' ? [{ label: 'Sort', value: sortLabel(sortMode), onClear: () => setSortMode('name-asc') }] : []),
          ]} onClear={clearFilterValues} />
        </div>

        {selectedKeys.length > 0 ? <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/30 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm"><span className="flex size-5 items-center justify-center rounded-sm bg-primary text-primary-foreground" aria-hidden="true"><Check className="size-3" /></span><span><span className="font-semibold">{selectedKeys.length}</span> selected</span></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="primary" size="small" disabled={isPending || enableableSelectedItems.length === 0} onClick={() => bulkToggle(enableableSelectedItems, true)} icon={<Check className="size-3.5" />}>Enable</Button><Button type="button" variant="outline" size="small" disabled={isPending || disableableSelectedItems.length === 0} onClick={() => bulkToggle(disableableSelectedItems, false)}>Disable</Button>{selectedPolicyItems.length > 0 ? <BulkPolicyEditor repositories={selectedPolicyItems} onSaved={() => setSelectedKeys([])} /> : null}<Button type="button" variant="ghost" size="small" onClick={() => setSelectedKeys([])}>Clear</Button></div></div> : null}

        {items.length === 0 ? <EmptyRepositories /> : filteredItems.length === 0 ? <FilteredEmpty onClear={clearFilters} /> : <div className="min-h-0 flex-1 overflow-auto overscroll-contain"><div className="flex items-center justify-between gap-3 border-b border-border/70 py-2.5 text-xs text-foreground-muted"><label className="inline-flex min-h-9 items-center gap-2"><Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible repositories" /><span>Select visible</span>{someVisibleSelected && !allVisibleSelected ? <span className="text-foreground-muted/70">(partial)</span> : null}</label><span>Sharing state is saved automatically</span></div><ul className="divide-y divide-border/70" aria-label="Repositories available to the RepoView GitHub App installation">{filteredItems.map((item) => { const key = repositoryKey(item); return <RepositoryRow key={key} item={item} enabled={getEnabled(item, overrides)} selected={selectedKeys.includes(key)} pending={pendingKeys.includes(key)} expanded={expandedKeys.includes(key)} onSelect={() => toggleSelected(key)} onToggle={(next) => toggleRepository(item, next)} onExpand={() => setExpandedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} /> })}</ul></div>}
      </div>

      <footer className="flex shrink-0 flex-col gap-1 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between"><p>Archived or GitHub-disabled repositories remain visible for diagnosis but cannot be enabled for new shares.</p><p>Changes save automatically</p></footer>
    </section>
  )
}

function RepositoryRow({ item, enabled, selected, pending, expanded, onSelect, onToggle, onExpand }: { item: RepositoryDashboardItem; enabled: boolean; selected: boolean; pending: boolean; expanded: boolean; onSelect: () => void; onToggle: (enabled: boolean) => void; onExpand: () => void }) {
  const shareable = isShareable(item, enabled)
  const blocked = item.github.disabled || item.github.archived
  const state = repositoryState(item, enabled)
  return <li className={cn('group', selected && 'bg-accent/35')}><div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-1 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-0"><Checkbox checked={selected} onChange={onSelect} aria-label={`Select ${item.github.fullName}`} className="mt-1 sm:mt-0" /><div className="min-w-0"><div className="flex min-w-0 items-start gap-3"><div className="hidden size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/45 text-foreground-muted sm:flex"><Github className="size-3.5" aria-hidden="true" /></div><div className="min-w-0"><p className="truncate font-mono text-sm font-semibold tracking-[-0.01em]" title={item.github.fullName}>{item.github.fullName}</p><p className="mt-1 truncate text-xs text-foreground-muted" title={item.github.description ?? undefined}>{item.github.description || 'No repository description'}</p></div></div><div className="mt-2 flex flex-wrap items-center gap-2 pl-0 text-xs sm:pl-11"><Badge variant={state.variant}>{state.label}</Badge><span className="text-foreground-muted">{item.github.private ? 'Private' : 'Public'}</span></div></div><div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-stretch"><Button type="button" variant={blocked ? 'outline' : shareable ? 'outline' : 'primary'} size="small" className="min-w-32 justify-center" disabled={blocked || pending} loading={pending} onClick={() => onToggle(!enabled)}>{blocked ? (item.github.archived ? 'Archived' : 'Unavailable') : enabled ? 'Disable sharing' : 'Enable sharing'}</Button><button type="button" onClick={onExpand} aria-expanded={expanded} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="sm:hidden">Details</span><span className="hidden sm:inline">{expanded ? 'Hide details' : 'Details'}</span><ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden="true" /></button></div></div>{expanded ? <RepositoryDetails item={item} enabled={enabled} onExpand={onExpand} /> : null}</li>
}

function RepositoryDetails({ item, enabled, onExpand }: { item: RepositoryDashboardItem; enabled: boolean; onExpand: () => void }) {
  const state = repositoryState(item, enabled)
  return <div className="border-t border-border/60 bg-muted/15 px-4 py-4 sm:px-12"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><DetailField label="Default branch" value={item.github.defaultBranch} mono /><DetailField label="GitHub visibility" value={item.github.private ? 'Private' : 'Public'} /><DetailField label="Installation state" value={state.detail} /><div className="min-w-0"><p className="text-xs text-foreground-muted">Visibility policy</p>{item.local && item.rules ? <div className="mt-1 flex items-center gap-2"><span className="truncate text-sm" title={`${item.rules.hidden.length} hidden patterns${item.rules.allowOnly.length > 0 ? ` · ${item.rules.allowOnly.length} allow-only` : ''}`}>{item.rules.hidden.length} hidden{item.rules.allowOnly.length > 0 ? ` · ${item.rules.allowOnly.length} allow-only` : ''}</span><RepositoryRulesEditor repositoryId={item.local.id} repositoryName={item.github.fullName} rules={item.rules} /></div> : <p className="mt-1 text-sm text-foreground-muted">Available after enabling</p>}</div></div><button type="button" onClick={onExpand} className="mt-4 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hide repository details</button></div>
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-foreground-muted">{label}</p><p className={cn('mt-1 truncate text-sm', mono && 'font-mono text-xs')} title={value}>{value}</p></div>
}

function repositoryState(item: RepositoryDashboardItem, enabled: boolean) {
  if (item.github.archived) return { label: 'Archived', detail: 'Archived in GitHub', variant: 'secondary' as const }
  if (item.github.disabled) return { label: 'Unavailable', detail: 'Disabled by GitHub', variant: 'destructive' as const }
  if (isShareable(item, enabled)) return { label: 'Ready to share', detail: 'Enabled in RepoView', variant: 'success' as const }
  return { label: 'Disabled', detail: 'Not enabled in RepoView', variant: 'secondary' as const }
}

function statusLabel(value: StatusFilter) { return { all: 'All', shareable: 'Ready to share', disabled: 'Disabled', archived: 'Archived' }[value] }
function sortLabel(value: SortMode) { return { 'name-asc': 'Name A–Z', 'name-desc': 'Name Z–A', status: 'Sharing state', branch: 'Default branch' }[value] }
function statusRank(item: RepositoryDashboardItem, overrides: Record<string, boolean>) { const enabled = getEnabled(item, overrides); if (isShareable(item, enabled)) return 0; if (item.github.disabled || item.github.archived) return 2; return 1 }
function getEnabled(item: RepositoryDashboardItem, overrides: Record<string, boolean>) { return overrides[repositoryKey(item)] ?? item.local?.enabled ?? false }
function repositoryKey(item: RepositoryDashboardItem) { return String(item.github.githubRepositoryId) }
function isShareable(item: RepositoryDashboardItem, enabled: boolean) { return enabled && !item.github.disabled && !item.github.archived }

function EmptyRepositories() { return <div className="px-6 py-16 text-center"><Github className="mx-auto size-6 text-foreground-muted" aria-hidden="true" /><h2 className="mt-3 font-heading text-lg font-semibold">No repositories available</h2><p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">Install the GitHub App on at least one selected repository, then return here to enable sharing.</p></div> }
function FilteredEmpty({ onClear }: { onClear: () => void }) { return <div className="px-6 py-16 text-center"><Settings2 className="mx-auto size-6 text-foreground-muted" aria-hidden="true" /><h2 className="mt-3 font-heading text-lg font-semibold">No repositories match</h2><p className="mt-1 text-sm text-foreground-muted">Try another search or clear the current filters.</p><Button type="button" variant="outline" size="small" className="mt-5" onClick={onClear}>Clear filters</Button></div> }

function BulkPolicyEditor({ repositories, onSaved }: { repositories: RepositoryDashboardItem[]; onSaved: () => void }) {
  const [hidden, setHidden] = useState('')
  const [allowOnly, setAllowOnly] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  function saveRules(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(null); setSaved(false); startTransition(async () => { try { await updateRepositoriesRules({ repositoryIds: repositories.flatMap((item) => item.local ? [item.local.id] : []), hidden: toPatterns(hidden), allowOnly: toPatterns(allowOnly) }); setSaved(true); onSaved() } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Visibility policies could not be saved.') } }) }
  return <Dialog><DialogTrigger variant="outline" size="small" className="min-w-28 justify-center" icon={<Settings2 className="size-3.5" />}>Edit policy</DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit visibility policy</DialogTitle><DialogDescription>Apply the same share policy to {repositories.length} selected {repositories.length === 1 ? 'repository' : 'repositories'}.</DialogDescription></DialogHeader><form onSubmit={saveRules}><div className="space-y-5 py-5"><div className="space-y-2"><Label htmlFor="bulk-hidden">Hidden patterns</Label><Textarea id="bulk-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/.env*\n**/secrets/**" rows={6} /><p className="text-xs text-foreground-muted">Hidden paths are never fetched for a viewer.</p></div><div className="space-y-2"><Label htmlFor="bulk-allow-only">Allow-only patterns</Label><Textarea id="bulk-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={4} /><p className="text-xs text-foreground-muted">When present, a path must match at least one allow-only pattern.</p></div>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}{saved ? <p className="text-sm text-success" role="status">Visibility policies saved.</p> : null}</div><DialogFooter><DialogClose>Cancel</DialogClose><Button type="submit" variant="primary" loading={isPending}>Save policies</Button></DialogFooter></form></DialogContent></Dialog>
}

function toPatterns(value: string) { return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean) }

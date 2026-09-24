'use client'

import {
  Archive,
  Check,
  ChevronDown,
  GitBranch,
  Github,
  ListFilter,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
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
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { RepositoryRulesEditor } from './repository-rules-editor'

export interface RepositoryDashboardItem {
  github: GitHubRepositorySummary
  local: RepositoryRecord | null
  rules: VisibilityRules | null
}

interface RepositoriesViewProps {
  items: RepositoryDashboardItem[]
}

type StatusFilter = 'all' | 'shareable' | 'disabled' | 'archived'
type VisibilityFilter = 'all' | 'private' | 'public'
type SortMode = 'name-asc' | 'name-desc' | 'branch' | 'status'

export function RepositoriesView({ items }: RepositoriesViewProps) {
  const [isPending, startTransition] = useTransition()
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [pendingKeys, setPendingKeys] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [error, setError] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items
      .filter((item) => {
        const enabled = overrides[repositoryKey(item)] ?? item.local?.enabled ?? false
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
        if (sortMode === 'status') {
          const leftStatus = isShareable(left, overrides[repositoryKey(left)] ?? left.local?.enabled ?? false) ? 0 : left.github.archived ? 2 : 1
          const rightStatus = isShareable(right, overrides[repositoryKey(right)] ?? right.local?.enabled ?? false) ? 0 : right.github.archived ? 2 : 1
          return leftStatus - rightStatus || left.github.fullName.localeCompare(right.github.fullName)
        }
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

  function toggleRepository(item: RepositoryDashboardItem, enabled: boolean) {
    const key = repositoryKey(item)
    const previousValue = getEnabled(item, overrides)
    setError(null)
    setOverrides((current) => ({ ...current, [key]: enabled }))
    setPendingKeys([key])

    startTransition(async () => {
      try {
        await setRepositoryEnabled({
          repositoryId: item.local?.id,
          installationRecordId: item.github.installationRecordId,
          owner: item.github.owner,
          repo: item.github.name,
          enabled,
        })
      } catch (actionError) {
        setOverrides((current) => ({ ...current, [key]: previousValue }))
        setError(actionError instanceof Error ? actionError.message : 'Repository status could not be updated.')
      } finally {
        setPendingKeys([])
      }
    })
  }

  function bulkToggle(repositories: RepositoryDashboardItem[], enabled: boolean) {
    if (repositories.length === 0) return
    const keys = repositories.map(repositoryKey)
    const previousValues = Object.fromEntries(repositories.map((item) => [repositoryKey(item), getEnabled(item, overrides)]))
    setError(null)
    setPendingKeys(keys)
    setOverrides((current) => Object.fromEntries([
      ...Object.entries(current),
      ...keys.map((key) => [key, enabled]),
    ]))

    startTransition(async () => {
      try {
        await setRepositoriesEnabled({
          repositories: repositories.map((item) => ({
            repositoryId: item.local?.id,
            installationRecordId: item.github.installationRecordId,
            owner: item.github.owner,
            repo: item.github.name,
            enabled,
          })),
        })
        setSelectedKeys([])
      } catch (actionError) {
        setOverrides((current) => Object.fromEntries([
          ...Object.entries(current),
          ...Object.entries(previousValues),
        ]))
        setError(actionError instanceof Error ? actionError.message : 'Repository statuses could not be updated.')
      } finally {
        setPendingKeys([])
      }
    })
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  function toggleAllVisible() {
    setSelectedKeys((current) => allVisibleSelected
      ? current.filter((key) => !visibleKeys.includes(key))
      : [...new Set([...current, ...visibleKeys])])
  }

  function clearFilters() {
    setQuery('')
    setStatusFilter('all')
    setVisibilityFilter('all')
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-foreground-muted">
            <Github className="size-3.5" aria-hidden="true" />
            GitHub App installation
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Repositories</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
            Choose which installation-accessible repositories can be used to create RepoView shares.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:pb-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-foreground-muted">Inventory</span>
          <Badge variant="outline" className="tabular-nums">{items.length} available</Badge>
        </div>
      </header>

      {error ? (
        <Alert className="border-destructive/40 bg-destructive/5 py-3">
          <AlertTitle>Could not update repositories</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-none">
        <div className="border-b border-border/60 bg-muted/15 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories" aria-label="Search repositories" className="h-9 pl-8 shadow-none" />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-40">
                <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
                <Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)} aria-label="Filter by visibility" className="h-9 pl-8 pr-8 text-xs shadow-none">
                  <option value="all">All visibility</option>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </Select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
              </div>
              <div className="relative min-w-0 sm:w-40">
                <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
                <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort repositories" className="h-9 pl-8 pr-8 text-xs shadow-none">
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="branch">Default branch</option>
                  <option value="status">Share status</option>
                </Select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Repository status filter">
              <StatusTab active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={items.length}>All</StatusTab>
              <StatusTab active={statusFilter === 'shareable'} onClick={() => setStatusFilter('shareable')} count={items.filter((item) => isShareable(item, getEnabled(item, overrides))).length}>Shareable</StatusTab>
              <StatusTab active={statusFilter === 'disabled'} onClick={() => setStatusFilter('disabled')} count={items.filter((item) => !getEnabled(item, overrides)).length}>Disabled</StatusTab>
              <StatusTab active={statusFilter === 'archived'} onClick={() => setStatusFilter('archived')} count={items.filter((item) => item.github.archived).length}>Archived</StatusTab>
            </div>
            <p className="shrink-0 text-xs text-foreground-muted">Showing <span className="font-mono tabular-nums text-foreground">{filteredItems.length}</span> of <span className="font-mono tabular-nums text-foreground">{items.length}</span></p>
          </div>
        </div>

        {selectedKeys.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/35 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex size-5 items-center justify-center rounded-sm bg-foreground text-background" aria-hidden="true"><Check className="size-3" /></span>
              <span><span className="font-semibold text-foreground">{selectedKeys.length}</span> selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="small" disabled={isPending || enableableSelectedItems.length === 0} onClick={() => bulkToggle(enableableSelectedItems, true)} icon={<Check className="size-3.5" />}>Enable</Button>
              <Button type="button" variant="outline" size="small" disabled={isPending || disableableSelectedItems.length === 0} onClick={() => bulkToggle(disableableSelectedItems, false)} icon={<span className="text-base leading-none">−</span>}>Disable</Button>
              {selectedPolicyItems.length > 0 ? <BulkPolicyEditor repositories={selectedPolicyItems} onSaved={() => setSelectedKeys([])} /> : <Button type="button" variant="outline" size="small" disabled icon={<Settings2 className="size-3.5" />}>Edit policy</Button>}
              <Button type="button" variant="ghost" size="small" onClick={() => setSelectedKeys([])}>Clear</Button>
            </div>
          </div>
        ) : null}

        {items.length === 0 ? (
          <EmptyRepositories />
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Search className="mx-auto size-5 text-foreground-muted" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-sm font-semibold">No repositories match these filters</h2>
            <p className="mt-1 text-sm text-foreground-muted">Try a different search or clear the current filters.</p>
            <Button type="button" variant="outline" size="small" className="mt-4" onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : (
          <div className="max-h-[min(70vh,680px)] overflow-auto">
            <table className="w-full min-w-[1060px] table-fixed text-sm">
              <caption className="sr-only">Repositories available to the RepoView GitHub App installation</caption>
              <colgroup>
                <col className="w-10" />
                <col className="w-[29%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <tr className="border-b border-border/70">
                  <th scope="col" className="px-4 py-2.5 text-left"><Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} aria-label={someVisibleSelected && !allVisibleSelected ? 'Select all visible repositories' : 'Select all visible repositories'} /></th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Repository</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Default branch</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Visibility</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Share access</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">Policy</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const key = repositoryKey(item)
                  const enabled = getEnabled(item, overrides)
                  const shareable = isShareable(item, enabled)
                  const rowPending = pendingKeys.includes(key)

                  return (
                    <tr key={key} className={cn('group border-b border-border/60 transition-colors hover:bg-muted/30 last:border-0', selectedKeys.includes(key) && 'bg-muted/35')}>
                      <td className="px-4 py-3.5 align-middle"><Checkbox checked={selectedKeys.includes(key)} onChange={() => toggleSelected(key)} aria-label={`Select ${item.github.fullName}`} /></td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/45 text-foreground-muted"><Github className="size-3.5" aria-hidden="true" /></div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[13px] font-semibold tracking-[-0.01em] text-foreground" title={item.github.fullName}>{item.github.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-foreground-muted" title={item.github.description ?? undefined}>{item.github.owner}{item.github.description ? ` · ${item.github.description}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle"><span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground-muted"><GitBranch className="size-3.5" aria-hidden="true" />{item.github.defaultBranch}</span></td>
                      <td className="px-3 py-3.5 align-middle"><Badge variant="outline" className="gap-1.5 font-normal"><span className={cn('size-1.5 rounded-full', item.github.private ? 'bg-foreground-muted' : 'bg-foreground/70')} aria-hidden="true" />{item.github.private ? 'Private' : 'Public'}</Badge></td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
                          {item.github.archived ? <Badge variant="outline" className="gap-1"><Archive className="size-3" aria-hidden="true" />Archived</Badge> : null}
                          {item.github.disabled ? <Badge variant="outline">Unavailable</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <ShareToggle checked={enabled} disabled={isPending || item.github.disabled || item.github.archived} onChange={(event) => toggleRepository(item, event.target.checked)} label={`${enabled ? 'Disable' : 'Enable'} sharing for ${item.github.fullName}`} />
                          <div className="min-w-0"><Badge variant={shareable ? 'success' : 'secondary'}>{shareable ? 'Shareable' : 'Not shareable'}</Badge><p className="mt-1 truncate text-[11px] text-foreground-muted">{rowPending ? 'Saving…' : shareable ? 'Ready for new shares' : 'Enable to share'}</p></div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        {item.local && item.rules ? <div className="flex min-w-0 items-center gap-2"><span className="min-w-0 truncate text-[11px] text-foreground-muted" title={`${item.rules.hidden.length} hidden patterns${item.rules.allowOnly.length > 0 ? ` · ${item.rules.allowOnly.length} allow-only` : ''}`}>{item.rules.hidden.length} hidden{item.rules.allowOnly.length > 0 ? ` · ${item.rules.allowOnly.length} allow-only` : ''}</span><RepositoryRulesEditor repositoryId={item.local.id} repositoryName={item.github.fullName} rules={item.rules} /></div> : <span className="text-[11px] text-foreground-muted">Available after enabling</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-1 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Archived or GitHub-disabled repositories remain visible for diagnosis but cannot be enabled for new shares.</p>
        <p className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Changes save automatically</p>
      </footer>
    </section>
  )
}

function StatusTab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-foreground text-background' : 'text-foreground-muted hover:bg-muted hover:text-foreground')}>{children}<span className={cn('font-mono text-[10px] tabular-nums', active ? 'text-background/70' : 'text-foreground-muted/75')}>{count}</span></button>
}

function ShareToggle({ checked, disabled, onChange, label }: { checked: boolean; disabled: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; label: string }) {
  return <label className={cn('inline-flex shrink-0 cursor-pointer items-center rounded-full', disabled && 'cursor-not-allowed opacity-50')}><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only" aria-label={label} /><span className="relative block h-5 w-9 rounded-full border border-input bg-muted transition-colors before:absolute before:left-0.5 before:top-0.5 before:size-3.5 before:rounded-full before:bg-background before:shadow-sm before:transition-transform peer-checked:bg-primary peer-checked:before:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring" aria-hidden="true" /></label>
}

function EmptyRepositories() {
  return <div className="px-6 py-16 text-center"><Github className="mx-auto size-6 text-foreground-muted" aria-hidden="true" /><h2 className="mt-3 font-heading text-sm font-semibold">No repositories available</h2><p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">Install the GitHub App on at least one selected repository, then return here to enable sharing.</p></div>
}

function getEnabled(item: RepositoryDashboardItem, overrides: Record<string, boolean>) {
  return overrides[repositoryKey(item)] ?? item.local?.enabled ?? false
}

function repositoryKey(item: RepositoryDashboardItem) {
  return `${item.github.installationRecordId}:${item.github.fullName}`
}

function isShareable(item: RepositoryDashboardItem, enabled: boolean) {
  return enabled && !item.github.disabled && !item.github.archived
}

function BulkPolicyEditor({ repositories, onSaved }: { repositories: RepositoryDashboardItem[]; onSaved: () => void }) {
  const [hidden, setHidden] = useState('')
  const [allowOnly, setAllowOnly] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveRules(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <Dialog>
      <DialogTrigger variant="outline" size="small" className="min-w-28 justify-center" icon={<Settings2 className="size-3.5" />}>Edit policy</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Edit visibility policy</DialogTitle><DialogDescription>Apply the same share policy to {repositories.length} selected {repositories.length === 1 ? 'repository' : 'repositories'}.</DialogDescription></DialogHeader>
        <form onSubmit={saveRules}>
          <div className="space-y-5 py-5">
            <div className="space-y-2"><Label htmlFor="bulk-hidden">Hidden patterns</Label><Textarea id="bulk-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/.env*\n**/secrets/**" rows={6} /><p className="text-xs text-foreground-muted">Hidden paths are never fetched for a viewer.</p></div>
            <div className="space-y-2"><Label htmlFor="bulk-allow-only">Allow-only patterns</Label><Textarea id="bulk-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={4} /><p className="text-xs text-foreground-muted">When present, a path must match at least one allow-only pattern.</p></div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            {saved ? <p className="text-sm text-success" role="status">Visibility policies saved.</p> : null}
          </div>
          <DialogFooter><DialogClose>Cancel</DialogClose><Button type="submit" variant="primary" loading={isPending}>Save policies</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toPatterns(value: string) {
  return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean)
}

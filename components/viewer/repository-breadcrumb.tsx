export function RepositoryBreadcrumb({ shareId, path, currentLabel }: { shareId: string; path?: string; currentLabel?: string }) {
  const segments = path?.split('/').filter(Boolean) ?? []
  const compactPath = segments.length > 2 ? `…/${segments.slice(-2).join('/')}` : segments.join('/')
  void shareId

  return (
    <nav aria-label={`Repository path${path ? `: ${path}` : ''}`} className="flex min-w-0 items-center overflow-hidden text-xs text-foreground-muted sm:text-sm">
      <span className="hidden shrink-0 sm:inline">Repository</span>
      {segments.length > 0 ? <span aria-hidden="true" className="mx-1 shrink-0 text-foreground-muted sm:mx-1.5">/</span> : null}
      <span className="min-w-0 truncate font-mono font-medium text-foreground sm:hidden" title={path}>{currentLabel || compactPath || 'Repository root'}</span>
      <span className="hidden min-w-0 items-center gap-1 sm:flex">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          return (
            <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <span aria-hidden="true" className="text-foreground-muted">/</span> : null}
              <span className={isLast || currentLabel ? 'min-w-0 truncate font-mono font-medium text-foreground' : 'min-w-0 truncate font-mono'} title={segment} aria-current={isLast ? 'page' : undefined}>{isLast && currentLabel ? currentLabel : segment}</span>
            </span>
          )
        })}
        {currentLabel && !segments.length ? <span className="font-mono font-medium text-foreground">{currentLabel}</span> : null}
      </span>
    </nav>
  )
}

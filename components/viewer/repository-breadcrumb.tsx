export function RepositoryBreadcrumb({ shareId, path, currentLabel }: { shareId: string; path?: string; currentLabel?: string }) {
  const segments = path?.split('/').filter(Boolean) ?? []
  void shareId

  return (
    <nav aria-label="Repository path" className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-foreground-muted sm:text-sm">
      <span className="shrink-0">Repository</span>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        return (
          <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
            <span aria-hidden="true" className="text-foreground-muted">/</span>
            <span className={isLast || currentLabel ? 'min-w-0 truncate font-mono font-medium text-foreground' : 'min-w-0 truncate font-mono'} title={segment}>{isLast && currentLabel ? currentLabel : segment}</span>
          </span>
        )
      })}
      {currentLabel && !segments.length ? (
        <>
          <span aria-hidden="true" className="text-foreground-muted">/</span>
          <span className="truncate font-mono font-medium text-foreground">{currentLabel}</span>
        </>
      ) : null}
    </nav>
  )
}

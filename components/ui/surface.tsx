import { type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react'

import { cn } from './utils'

export function Separator({ className, orientation = 'horizontal', ...props }: HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return <div role="separator" aria-orientation={orientation} className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'shrink-0 bg-border', className)} {...props} />
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" {...props} />
}

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-auto', className)} {...props} />
}

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="status" className={cn('relative w-full rounded-lg border border-border bg-card p-4 text-sm text-foreground', className)} {...props} />
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('mb-1 font-medium', className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-foreground-muted', className)} {...props} />
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <div className="w-full overflow-x-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <thead className={cn('[&_tr]:border-b', className)} {...props} /> }
export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} /> }
export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <tfoot className={cn('border-t bg-muted/50 font-medium', className)} {...props} /> }
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...props} /> }
export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) { return <th className={cn('h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-foreground-muted', className)} {...props} /> }
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn('p-3 align-middle', className)} {...props} /> }

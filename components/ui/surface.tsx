import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { type HTMLAttributes, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from 'react'

import { cn } from './utils'

export function Separator({ className, orientation = 'horizontal', ...props }: HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return <div role="separator" aria-orientation={orientation} className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'shrink-0 bg-border', className)} {...props} />
}

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-auto', className)} {...props} />
}

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="status" className={cn('relative w-full rounded-md border border-border bg-surface-100 p-4 text-sm text-foreground', className)} {...props} />
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('mb-1 font-medium', className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-foreground-muted', className)} {...props} />
}

export function Table({ className, wrapperClassName, ...props }: HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }) {
  return <div className={cn('w-full overflow-x-auto', wrapperClassName)}><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <thead className={cn('bg-surface-200/70 [&_tr]:border-b', className)} {...props} /> }
export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} /> }
export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <tfoot className={cn('border-t border-border-secondary bg-surface-200/70 font-medium', className)} {...props} /> }
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn('border-b border-border-secondary transition-colors hover:bg-surface-200/70 data-[state=selected]:bg-surface-200', className)} {...props} /> }
export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) { return <th className={cn('h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-semibold tracking-wide text-foreground-lighter', className)} {...props} /> }
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn('px-3 py-3 align-middle', className)} {...props} /> }

export function TableHeadSort({
  column,
  currentSort,
  onSortChange,
  children,
  className,
}: {
  column: string
  currentSort: string
  onSortChange: (column: string) => void
  children: ReactNode
  className?: string
}) {
  const [currentColumn, currentOrder] = currentSort.split(':')
  const isCurrent = currentColumn === column && (currentOrder === 'asc' || currentOrder === 'desc')
  const Icon = isCurrent ? currentOrder === 'asc' ? ArrowUp : ArrowDown : ChevronsUpDown

  return (
    <button
      type="button"
      onClick={() => onSortChange(column)}
      className={cn('group inline-flex min-h-8 items-center gap-1.5 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-200', className)}
      aria-label={`Sort by ${children}`}
    >
      <span>{children}</span>
      <Icon className={cn('size-3.5 shrink-0', !isCurrent && 'opacity-0 transition-opacity group-hover:opacity-70')} aria-hidden="true" />
    </button>
  )
}

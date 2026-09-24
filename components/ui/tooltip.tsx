import { type HTMLAttributes, type ReactNode } from 'react'

export function TooltipProvider({ children }: { children: ReactNode }) { return <>{children}</> }
export function Tooltip({ children }: { children: ReactNode }) { return <span className="group relative inline-flex">{children}</span> }
export function TooltipTrigger({ children, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span {...props}>{children}</span> }
export function TooltipContent({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span role="tooltip" className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${className ?? ''}`} {...props}>{children}</span> }

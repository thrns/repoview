'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui'

export function ThemeSwitcher({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const currentTheme = theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark') ? 'dark' : 'light'
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
  const currentLabel = currentTheme === 'dark' ? 'Dark theme' : 'Light theme'
  const nextLabel = nextTheme === 'dark' ? 'Switch to dark theme' : 'Switch to light theme'
  const Icon = currentTheme === 'dark' ? Moon : Sun

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`${currentLabel}. ${nextLabel}`}
      title={`${currentLabel} · ${nextLabel}`}
      onClick={() => setTheme(nextTheme)}
      className={className ?? 'text-foreground-muted hover:text-foreground'}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  )
}

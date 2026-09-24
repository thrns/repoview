import Image from 'next/image'

import { cn } from '@/components/ui'

interface BrandLogoProps {
  alt?: string
  className?: string
  priority?: boolean
  size?: number
}

export function BrandLogo({ alt = '', className, priority = false, size = 28 }: BrandLogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <Image
        src="/repoview-logo.svg"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="block h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/repoview-logo-white.svg"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  )
}

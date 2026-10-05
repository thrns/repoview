import Image from 'next/image'

import { cn } from '@/components/ui/utils'

interface BrandLogoProps {
  alt?: string
  className?: string
  preload?: boolean
  size?: number
}

export function BrandLogo({ alt = '', className, preload = false, size = 28 }: BrandLogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <Image
        src="/repoview-logo-light.svg"
        alt={alt}
        width={size}
        height={size}
        preload={preload}
        className="block h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/repoview-logo-dark.svg"
        alt={alt}
        width={size}
        height={size}
        preload={preload}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  )
}

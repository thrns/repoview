'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SITE_URL } from '@/lib/seo'

const EXAMPLE_SHARE_URL = new URL('/view/aB3xK9pQ2', SITE_URL).toString()

export function CopyShareLinkButton() {
  const [copied, setCopied] = useState(false)

  function copyShareLink() {
    const clipboardWrite = typeof navigator !== 'undefined'
      ? navigator.clipboard?.writeText(EXAMPLE_SHARE_URL)
      : undefined

    void clipboardWrite?.catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="large"
      className="button-md share-button"
      onClick={copyShareLink}
      iconRight={<ArrowUpRight className="size-3.5" aria-hidden="true" />}
    >
      {copied ? 'Link copied' : 'Copy private link'}
    </Button>
  )
}

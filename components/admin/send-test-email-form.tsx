'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui'
import { sendTestEmail } from '@/app/(admin)/dashboard/settings/actions'

export function SendTestEmailForm() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean | null>(null)

  function handleSend() {
    setMessage(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const result = await sendTestEmail()
        setSuccess(result.sent)
        setMessage(result.sent ? 'Test email sent.' : result.error)
      } catch {
        setSuccess(false)
        setMessage('The test email could not be sent.')
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <Button type="button" variant="outline" loading={pending} onClick={handleSend}>
        Send test email
      </Button>
      {message ? (
        <p className={`text-sm ${success ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`} role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}

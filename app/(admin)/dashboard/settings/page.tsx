import { Mail } from 'lucide-react'

import { SendTestEmailForm } from '@/components/admin/send-test-email-form'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10 lg:px-10 lg:py-14">
      <header className="space-y-3">
        <Badge variant="outline">Workspace settings</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
          Validate the owner notification channel without exposing SMTP credentials to the browser.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b border-border sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-primary">
              <Mail className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <CardTitle>Email delivery</CardTitle>
              <CardDescription>Send a one-off test message to the configured notification inbox.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
            The test uses the server-side Gmail App Password transport. Credentials and provider diagnostics stay on the server.
          </p>
          <SendTestEmailForm />
        </CardContent>
      </Card>
    </section>
  )
}

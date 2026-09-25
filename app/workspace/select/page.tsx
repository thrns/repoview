import { redirect } from 'next/navigation'

import { selectActiveWorkspace } from '@/app/workspace/actions'
import { getUserWorkspaceMemberships } from '@/lib/auth/workspace'
import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function WorkspaceSelectionPage() {
  let workspaces
  try {
    ({ workspaces } = await getUserWorkspaceMemberships())
  } catch {
    redirect('/login')
  }

  if (workspaces.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-6 py-12">
        <Card className="w-full">
          <CardContent className="space-y-3 p-6">
            <Alert className="border-destructive/40">
              <AlertTitle>No active workspace available</AlertTitle>
              <AlertDescription>Your account is not currently a member of an active RepoView workspace.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (workspaces.length === 1) redirect('/dashboard')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-6 py-12">
      <Card className="w-full">
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground-muted">Workspace access</p>
            <h1 className="mt-2 font-heading text-2xl font-semibold">Choose a workspace</h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">RepoView keeps repositories, shares, settings, analytics, and notifications scoped to the workspace you select.</p>
          </div>
          <form action={selectActiveWorkspace} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium" htmlFor="workspaceId">
              Active workspace
              <select id="workspaceId" name="workspaceId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Select a workspace</option>
                {workspaces.map(({ workspace, membership }) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {membership.role}</option>)}
              </select>
            </label>
            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Continue</button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

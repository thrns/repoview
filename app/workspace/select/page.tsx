import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { selectActiveWorkspace } from '@/app/workspace/actions'
import { getUserWorkspaceMemberships } from '@/lib/auth/workspace'
import { Admonition, Button, Card, CardContent, PageContainer, Select } from '@/components/ui'
import { NOINDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = { robots: NOINDEX_ROBOTS }
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
      <PageContainer size="small" className="flex min-h-dvh items-center py-12">
        <Card className="w-full">
          <CardContent className="space-y-3 p-6">
            <Admonition type="destructive" title="No active workspace available" description="Your account is not currently a member of an active RepoView workspace." />
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (workspaces.length === 1) redirect('/dashboard')

  return (
    <PageContainer size="small" className="flex min-h-dvh items-center py-12">
      <Card className="w-full">
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-muted">Workspace access</p>
            <h1 className="mt-2 font-heading text-2xl font-semibold">Choose a workspace</h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">RepoView keeps repositories, shares, settings, analytics, and notifications scoped to the workspace you select.</p>
          </div>
          <form action={selectActiveWorkspace} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium" htmlFor="workspaceId">
              Active workspace
              <Select id="workspaceId" name="workspaceId" required>
                <option value="">Select a workspace</option>
                {workspaces.map(({ workspace, membership }) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {membership.role}</option>)}
              </Select>
            </label>
            <Button type="submit" variant="primary">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

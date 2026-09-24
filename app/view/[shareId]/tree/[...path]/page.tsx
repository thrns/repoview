import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ViewerDirectoryPage({ params }: { params: Promise<{ shareId: string; path: string[] }> }) {
  const { shareId } = await params
  redirect(`/view/${shareId}`)
}

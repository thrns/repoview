'use client'

import { AlertTriangle } from 'lucide-react'
import Image from 'next/image'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f8fa] text-[#1f2937]">
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg rounded-xl border border-[#d9dee7] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Image src="/repoview-logo.svg" alt="RepoView" width={32} height={32} />
              <AlertTriangle className="mt-0.5 size-5 text-[#667085]" aria-hidden="true" />
              <div>
                <h1 className="text-lg font-semibold">Something went wrong</h1>
                <p className="mt-2 text-sm leading-6 text-[#667085]">RepoView could not load this page safely.</p>
                <button className="mt-5 rounded-md bg-[#1f2937] px-4 py-2 text-sm font-medium text-white" onClick={reset}>Try again</button>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}

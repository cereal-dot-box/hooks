import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

import { PackageRow } from '#/components/package-row'
import { Tabs } from '#/components/tabs'
import { PACKAGES } from '#/data/packages'
import { getLeaderboard } from '#/data/server-fns'
import type { LeaderboardSort } from '#/data/types'

const SORTS: LeaderboardSort[] = ['all-time', 'trending', 'hot']

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    sort: z.enum(['all-time', 'trending', 'hot']).optional(),
  }),
  loaderDeps: ({ search }) => ({ sort: (search.sort ?? 'all-time') as LeaderboardSort }),
  loader: async ({ deps }) => {
    const packages = await getLeaderboard({ data: deps.sort })
    return { packages, sort: deps.sort }
  },
  component: Home,
})

function Home() {
  const { packages, sort } = Route.useLoaderData()

  return (
    <main className="page">
      <header className="page__hero">
        <p className="page__hero-lede">
          Hook packages for Claude Code and Codex.
        </p>
        <div className="page__hero-sub">
          <span>{PACKAGES.length} packages</span>
          <span>·</span>
          <span>installed with one command, removed cleanly</span>
        </div>
      </header>

      <Tabs
        activeKey={sort}
        tabs={SORTS.map((s) => ({
          key: s,
          label: s,
          to: '/',
          search: { sort: s === 'all-time' ? undefined : s },
        }))}
      />

      <ol className="package-list">
        {packages.map((pkg, i) => (
          <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
        ))}
      </ol>
    </main>
  )
}

import { createFileRoute, notFound } from '@tanstack/react-router'

import { Breadcrumb } from '#/components/breadcrumb'
import { PackageRow } from '#/components/package-row'
import { AGENTS } from '#/data/packages'
import { getPackagesByAgent } from '#/data/server-fns'
import type { AgentName } from '#/data/types'

function isAgentName(value: string): value is AgentName {
  return value === 'claude-code' || value === 'codex'
}

export const Route = createFileRoute('/agent/$agent')({
  loader: async ({ params }) => {
    if (!isAgentName(params.agent)) {
      throw notFound()
    }
    return {
      agent: params.agent,
      info: AGENTS.find((a) => a.name === params.agent),
      packages: await getPackagesByAgent({ data: { agent: params.agent } }),
    }
  },
  component: AgentRoute,
})

function AgentRoute() {
  const { agent, info, packages } = Route.useLoaderData()

  return (
    <main className="page">
      <Breadcrumb
        items={[
          { node: 'agents' },
          { node: info?.label ?? agent, current: true },
        ]}
      />
      <header className="page__hero">
        <p className="eyebrow">filter: agent</p>
        <p className="page__hero-lede">{info?.label ?? agent}</p>
        <p className="page__hero-sub">
          <span>{info?.description}</span>
          <span>·</span>
          <span>
            {packages.length} package{packages.length === 1 ? '' : 's'}
          </span>
        </p>
      </header>

      {packages.length === 0 ? (
        <p className="empty">No packages target this agent yet.</p>
      ) : (
        <ol className="package-list">
          {packages.map((pkg, i) => (
            <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
          ))}
        </ol>
      )}
    </main>
  )
}

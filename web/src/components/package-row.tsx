import { Link } from '@tanstack/react-router'

import { LifecycleSpine } from './lifecycle-spine'
import { AGENTS } from '#/data/packages'
import type { AgentName, Package } from '#/data/types'
import { compactCount, timeAgo } from '#/lib/format'

type Props = {
  pkg: Package
  rank?: number
}

export function PackageRow({ pkg, rank }: Props) {
  const events = Array.from(new Set(pkg.hooks.map((h) => h.event)))
  const supportedAgents = computeSupportedAgents(pkg)

  return (
    <li className="package-row">
      {rank !== undefined && (
        <div className="package-row__rank" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </div>
      )}
      <div className="package-row__body">
        <div className="package-row__head">
          <Link
            to={`/${pkg.owner}/${pkg.repo}/${pkg.name}`}
            className="package-row__title"
            preload="intent"
          >
            {pkg.name}
          </Link>
          <div className="package-row__spine">
            <LifecycleSpine events={events} variant="preview" />
          </div>
        </div>
        <p className="package-row__desc">{pkg.description}</p>
        <div className="package-row__meta">
          <span className="package-row__meta-item">
            by <strong>{pkg.owner}</strong>
          </span>
          <span className="package-row__meta-item">
            <strong>{compactCount(scoreForLeaderboard(pkg))}</strong> installs
          </span>
          <span className="package-row__meta-item package-row__agents">
            {AGENTS.map((a) => (
              <span
                key={a.name}
                className="package-row__agent"
                data-on={supportedAgents.includes(a.name)}
              >
                {a.name}
              </span>
            ))}
          </span>
          <span className="package-row__meta-item">
            updated {timeAgo(pkg.updatedAt)}
          </span>
        </div>
      </div>
    </li>
  )
}

function computeSupportedAgents(pkg: Package): AgentName[] {
  const all: AgentName[] = ['claude-code', 'codex']
  return all.filter((name) =>
    pkg.hooks.every((h) => !h.agents || h.agents.includes(name)),
  )
}

// For a row's install count display we always show the all-time number, even
// when the leaderboard is sorted by another column — it's the most stable
// signal of a package's footprint.
function scoreForLeaderboard(pkg: Package): number {
  return pkg.installCountAllTime
}

import { Link } from '@tanstack/react-router'

import type { Package } from '#/data/types'
import { compactCount, signedCount } from '#/lib/format'

/** Animation delay for staggered fade-in, capped at 400ms (rank * 30). */
function stagger(rank: number): number {
  return Math.min(rank * 30, 400)
}

type Props = {
  pkg: Package
  rank?: number
}

export function PackageRow({ pkg, rank }: Props) {
  const events = Array.from(new Set(pkg.hooks.map((h) => h.event)))

  return (
    <li
      className="row"
      style={rank !== undefined ? { animationDelay: `${stagger(rank)}ms` } : undefined}
    >
      {rank !== undefined && (
        <span className="row__rank" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <div className="row__main">
        <div className="row__title">
          <Link
            to="/$owner/$repo/$package"
            params={{ owner: pkg.owner, repo: pkg.repo, package: pkg.name }}
            className="row__name"
            preload="intent"
          >
            {pkg.name}
          </Link>
          {events.map((event) => (
            <span key={event} className="row__event">
              {event}
            </span>
          ))}
        </div>
        <div className="row__repo">
          <span>{pkg.owner}</span>
          <span className="row__repo-sep">/</span>
          <span>{pkg.repo}</span>
        </div>
      </div>
      <div className="row__num">
        <span className="row__num-label">installs</span>
        {compactCount(pkg.installCountAllTime)}
      </div>
      <div className="row__delta">
        <span className="row__num-label">7d</span>
        {signedCount(pkg.installCountTrending)}
      </div>
    </li>
  )
}

type RepoProps = {
  repo: {
    owner: string
    repo: string
    hookNames: string[]
    events: string[]
    installCountAllTime: number
    installCountTrending: number
  }
  rank?: number
}

export function RepoRow({ repo, rank }: RepoProps) {
  const hookLabel =
    repo.hookNames.length === 1 ? '1 hook' : `${repo.hookNames.length} hooks`

  return (
    <li
      className="row"
      style={rank !== undefined ? { animationDelay: `${stagger(rank)}ms` } : undefined}
    >
      {rank !== undefined && (
        <span className="row__rank" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <div className="row__main">
        <div className="row__title">
          <Link
            to="/$owner/$repo"
            params={{ owner: repo.owner, repo: repo.repo }}
            className="row__name"
            preload="intent"
          >
            {repo.owner}/{repo.repo}
          </Link>
          {repo.events.map((event) => (
            <span key={event} className="row__event">
              {event}
            </span>
          ))}
        </div>
        <div className="row__repo">
          <span>{hookLabel}</span>
        </div>
      </div>
      <div className="row__num">
        <span className="row__num-label">installs</span>
        {compactCount(repo.installCountAllTime)}
      </div>
      <div className="row__delta">
        <span className="row__num-label">7d</span>
        {signedCount(repo.installCountTrending)}
      </div>
    </li>
  )
}

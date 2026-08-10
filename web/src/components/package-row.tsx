import { Link } from '@tanstack/react-router'

import type { Package } from '#/data/types'
import { compactCount } from '#/lib/format'

type Props = {
  pkg: Package
  rank?: number
}

export function PackageRow({ pkg, rank }: Props) {
  const events = Array.from(new Set(pkg.hooks.map((h) => h.event)))

  return (
    <li className="row">
      {rank !== undefined && (
        <div className="row__rank" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </div>
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
          <span className="row__events">
            {events.map((event) => (
              <span key={event} className="row__event">
                {event}
              </span>
            ))}
          </span>
        </div>
        <div className="row__repo">
          <span>{pkg.owner}</span>
          <span className="row__repo-sep">/</span>
          <span>{pkg.repo}</span>
        </div>
      </div>
      <div className="row__num row__num--strong">
        <span className="row__num-label">installs</span>
        {compactCount(pkg.installCountAllTime)}
      </div>
    </li>
  )
}
